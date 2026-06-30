import { NextResponse } from "next/server";
import { getAdminRouteContext } from "../../../../../lib/admin/route";
import { revalidateAdminContent } from "../../../../../lib/cacheInvalidation";
import { normalizeResourceVisibility } from "../../../../../lib/resourceVisibility";
import { deleteR2Object } from "../../../../../lib/r2Storage";

type RouteParams = {
  params: Promise<{ noteId: string }>;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function PATCH(request: Request, contextParams: RouteParams) {
  try {
    const { noteId } = await contextParams.params;

    if (!isUuid(noteId)) {
      return NextResponse.json({ error: "Invalid note" }, { status: 400 });
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
      return NextResponse.json({ error: "Note title is required" }, { status: 400 });
    }

    if (!isUuid(courseId)) {
      return NextResponse.json({ error: "Select a valid course" }, { status: 400 });
    }

    const { data: course, error: courseError } = await context.serviceClient
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .eq("institute_id", context.instituteId)
      .maybeSingle();

    if (courseError) {
      return NextResponse.json({ error: courseError.message }, { status: 500 });
    }

    if (!course) {
      return NextResponse.json({ error: "Course not found for your institute" }, { status: 404 });
    }

    const { data: updated, error: updateError } = await context.serviceClient
      .from("notes")
      .update({ title, course_id: courseId, visibility })
      .eq("id", noteId)
      .eq("institute_id", context.instituteId)
      .select("id, title, course_id, file_url, visibility, created_at")
      .maybeSingle();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    revalidateAdminContent("learning");

    return NextResponse.json(
      { note: updated },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update note";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, contextParams: RouteParams) {
  try {
    const { noteId } = await contextParams.params;

    if (!isUuid(noteId)) {
      return NextResponse.json({ error: "Invalid note" }, { status: 400 });
    }

    const context = await getAdminRouteContext();
    const { data: note, error: loadError } = await context.serviceClient
      .from("notes")
      .select("id, file_url")
      .eq("id", noteId)
      .eq("institute_id", context.instituteId)
      .maybeSingle();

    if (loadError) {
      return NextResponse.json({ error: loadError.message }, { status: 500 });
    }

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const { error: deleteError } = await context.serviceClient
      .from("notes")
      .delete()
      .eq("id", note.id)
      .eq("institute_id", context.instituteId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    await deleteR2Object(note.file_url);

    revalidateAdminContent("learning");

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete note";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
