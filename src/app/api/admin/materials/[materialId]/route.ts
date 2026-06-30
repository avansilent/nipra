import { NextResponse } from "next/server";
import { getAdminRouteContext } from "../../../../../lib/admin/route";
import { revalidateAdminContent } from "../../../../../lib/cacheInvalidation";
import { deleteCloudflareStreamVideo } from "../../../../../lib/cloudflareStream";
import { normalizeResourceVisibility } from "../../../../../lib/resourceVisibility";
import { deleteR2Object } from "../../../../../lib/r2Storage";
import { isCloudflareStreamReference, isVideoReference } from "../../../../../lib/storageReferences";

type RouteParams = {
  params: Promise<{ materialId: string }>;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function PATCH(request: Request, contextParams: RouteParams) {
  try {
    const { materialId } = await contextParams.params;

    if (!isUuid(materialId)) {
      return NextResponse.json({ error: "Invalid material" }, { status: 400 });
    }

    const context = await getAdminRouteContext();
    const body = (await request.json().catch(() => ({}))) as {
      title?: unknown;
      courseId?: unknown;
      visibility?: unknown;
    };
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const courseId = typeof body.courseId === "string" ? body.courseId.trim() : "";
    const visibility = normalizeResourceVisibility(typeof body.visibility === "string" ? body.visibility : "");

    if (!title) {
      return NextResponse.json({ error: "File title is required" }, { status: 400 });
    }

    if (!isUuid(courseId)) {
      return NextResponse.json({ error: "Select a valid course" }, { status: 400 });
    }

    const [{ data: course, error: courseError }, { data: material, error: materialError }] = await Promise.all([
      context.serviceClient
        .from("courses")
        .select("id")
        .eq("id", courseId)
        .eq("institute_id", context.instituteId)
        .maybeSingle(),
      context.serviceClient
        .from("materials")
        .select("id, file_url")
        .eq("id", materialId)
        .eq("institute_id", context.instituteId)
        .maybeSingle(),
    ]);

    const firstError = courseError ?? materialError;
    if (firstError) {
      return NextResponse.json({ error: firstError.message }, { status: 500 });
    }

    if (!course) {
      return NextResponse.json({ error: "Course not found for your institute" }, { status: 404 });
    }

    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    if (visibility === "public" && isVideoReference(material.file_url)) {
      return NextResponse.json({ error: "Videos can only be shown inside the student portal" }, { status: 400 });
    }

    const { data: updated, error: updateError } = await context.serviceClient
      .from("materials")
      .update({ title, course_id: courseId, visibility })
      .eq("id", materialId)
      .eq("institute_id", context.instituteId)
      .select("id, title, course_id, file_url, visibility, created_at")
      .maybeSingle();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    revalidateAdminContent("learning");

    return NextResponse.json(
      { material: updated },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update material";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, contextParams: RouteParams) {
  try {
    const { materialId } = await contextParams.params;

    if (!isUuid(materialId)) {
      return NextResponse.json({ error: "Invalid material" }, { status: 400 });
    }

    const context = await getAdminRouteContext();
    const { data: material, error: loadError } = await context.serviceClient
      .from("materials")
      .select("id, file_url")
      .eq("id", materialId)
      .eq("institute_id", context.instituteId)
      .maybeSingle();

    if (loadError) {
      return NextResponse.json({ error: loadError.message }, { status: 500 });
    }

    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    const { error: deleteError } = await context.serviceClient
      .from("materials")
      .delete()
      .eq("id", material.id)
      .eq("institute_id", context.instituteId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (isCloudflareStreamReference(material.file_url)) {
      await deleteCloudflareStreamVideo(material.file_url);
    } else {
      await deleteR2Object(material.file_url);
    }

    revalidateAdminContent("learning");

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete material";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
