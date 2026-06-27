import { NextResponse } from "next/server";
import { revalidateAdminContent } from "../../../../../lib/cacheInvalidation";
import { normalizeResourceVisibility } from "../../../../../lib/resourceVisibility";
import { deleteR2Object, toR2ObjectReference, uploadR2File } from "../../../../../lib/r2Storage";
import {
  getSafeFileExtension,
  resolveAdminUploadContext,
  toSafeFileName,
} from "../../_shared/upload";

const maxMaterialBytes = 25 * 1024 * 1024;
const allowedMaterialTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const allowedMaterialExtensions = /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|jpe?g|png|webp)$/i;

function isAllowedMaterialFile(file: File) {
  return allowedMaterialTypes.has(file.type) || allowedMaterialExtensions.test(file.name);
}

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

    if (!isAllowedMaterialFile(file)) {
      return NextResponse.json({ error: "Upload a PDF, Office document, spreadsheet, presentation, JPG, PNG, or WebP file" }, { status: 400 });
    }

    if (file.size <= 0 || file.size > maxMaterialBytes) {
      return NextResponse.json({ error: "Material file must be 25MB or smaller" }, { status: 400 });
    }

    const baseName = toSafeFileName(file.name.replace(/\.[a-z0-9]{1,10}$/i, "") || "material");
    const storagePath = `materials/${courseId}/${Date.now()}-${baseName}${getSafeFileExtension(file.name)}`;
    const fileReference = toR2ObjectReference(storagePath);

    await uploadR2File({
      key: storagePath,
      file,
      contentType: file.type || "application/octet-stream",
    });

    const { data: inserted, error: insertError } = await service
      .from("materials")
      .insert({
        course_id: courseId,
        institute_id: instituteId,
        title: materialTitle || file.name,
        file_url: fileReference,
        visibility,
      })
      .select("id, title, course_id, file_url, visibility")
      .single();

    if (insertError) {
      await deleteR2Object(fileReference);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    revalidateAdminContent("learning");

    return NextResponse.json({ material: inserted });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to upload material" },
      { status: 500 }
    );
  }
}
