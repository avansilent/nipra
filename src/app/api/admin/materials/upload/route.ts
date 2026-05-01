import { NextResponse } from "next/server";
import { normalizeResourceVisibility } from "../../../../../lib/resourceVisibility";
import {
  getSafeFileExtension,
  resolveAdminUploadContext,
  toSafeFileName,
} from "../../_shared/upload";

export async function POST(request: Request) {
  try {
    const uploadContext = await resolveAdminUploadContext();
    if ("error" in uploadContext) {
      return uploadContext.error;
    }

    const { instituteId, service } = uploadContext;

    const formData = await request.formData();
    const courseId = String(formData.get("courseId") ?? "").trim();
    const materialTitle = String(formData.get("title") ?? "").trim();
    const visibility = normalizeResourceVisibility(String(formData.get("visibility") ?? ""));
    const file = formData.get("file");

    if (!courseId) {
      return NextResponse.json({ error: "Course is required" }, { status: 400 });
    }

    const { data: course } = await service
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .eq("institute_id", instituteId)
      .maybeSingle();

    if (!course) {
      return NextResponse.json({ error: "Course not found for your institute" }, { status: 404 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A file is required" }, { status: 400 });
    }

    const { data: bucket } = await service.storage.getBucket("materials");
    if (!bucket) {
      await service.storage.createBucket("materials", { public: false });
    }

    const baseName = toSafeFileName(file.name.replace(/\.[a-z0-9]{1,10}$/i, "") || "material");
    const storagePath = `${courseId}/${Date.now()}-${baseName}${getSafeFileExtension(file.name)}`;

    const { error: uploadError } = await service.storage
      .from("materials")
      .upload(storagePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: inserted, error: insertError } = await service
      .from("materials")
      .insert({
        course_id: courseId,
        institute_id: instituteId,
        title: materialTitle || file.name,
        file_url: storagePath,
        visibility,
      })
      .select("id, title, course_id, file_url, visibility")
      .single();

    if (insertError) {
      await service.storage.from("materials").remove([storagePath]);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ material: inserted });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to upload material" },
      { status: 500 }
    );
  }
}
