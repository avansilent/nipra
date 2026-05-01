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
    const noteTitle = String(formData.get("title") ?? "").trim();
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
      return NextResponse.json({ error: "PDF file is required" }, { status: 400 });
    }

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    const { data: bucket } = await service.storage.getBucket("notes");
    if (!bucket) {
      await service.storage.createBucket("notes", { public: false });
    }

    const baseName = toSafeFileName(file.name.replace(/\.pdf$/i, "") || "note");
    const storagePath = `${courseId}/${Date.now()}-${baseName}${getSafeFileExtension(file.name, ".pdf")}`;

    const { error: uploadError } = await service.storage
      .from("notes")
      .upload(storagePath, file, {
        contentType: file.type || "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: inserted, error: insertError } = await service
      .from("notes")
      .insert({
        course_id: courseId,
        institute_id: instituteId,
        title: noteTitle || file.name,
        file_url: storagePath,
        visibility,
      })
      .select("id, title, course_id, file_url, visibility")
      .single();

    if (insertError) {
      await service.storage.from("notes").remove([storagePath]);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ note: inserted });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to upload note" },
      { status: 500 }
    );
  }
}
