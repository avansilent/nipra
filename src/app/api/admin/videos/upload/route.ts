import { NextResponse } from "next/server";
import { revalidateAdminContent } from "../../../../../lib/cacheInvalidation";
import { deleteCloudflareStreamVideo, uploadCloudflareStreamFile } from "../../../../../lib/cloudflareStream";
import { normalizeResourceVisibility } from "../../../../../lib/resourceVisibility";
import { resolveAdminUploadContext } from "../../_shared/upload";

const maxVideoUploadBytes = 500 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const uploadContext = await resolveAdminUploadContext();
    if ("error" in uploadContext) {
      return uploadContext.error;
    }

    const { instituteId, service } = uploadContext;
    const formData = await request.formData();
    const courseId = String(formData.get("courseId") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const requestedVisibility = normalizeResourceVisibility(String(formData.get("visibility") ?? ""));
    const visibility = requestedVisibility === "public" ? "student" : requestedVisibility;
    const file = formData.get("file");

    if (!courseId || !title) {
      return NextResponse.json({ error: "Course and video title are required." }, { status: 400 });
    }

    const { data: course } = await service
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .eq("institute_id", instituteId)
      .maybeSingle();

    if (!course) {
      return NextResponse.json({ error: "Course not found for your institute." }, { status: 404 });
    }

    const videoFile = file instanceof File && file.size > 0 ? file : null;
    if (!videoFile) {
      return NextResponse.json({ error: "Choose a video file." }, { status: 400 });
    }

    if (videoFile.type && !videoFile.type.startsWith("video/")) {
      return NextResponse.json({ error: "Choose a valid video file." }, { status: 400 });
    }

    if (videoFile.size > maxVideoUploadBytes) {
      return NextResponse.json({ error: "Video file must be 500MB or smaller." }, { status: 400 });
    }

    const fileReference = await uploadCloudflareStreamFile({
      file: videoFile,
      title,
      courseId,
      instituteId,
    });

    const { data: inserted, error: insertError } = await service
      .from("materials")
      .insert({
        course_id: courseId,
        institute_id: instituteId,
        title,
        file_url: fileReference,
        visibility,
      })
      .select("id, title, course_id, file_url, visibility, created_at")
      .single();

    if (insertError) {
      await deleteCloudflareStreamVideo(fileReference);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    revalidateAdminContent("learning");

    return NextResponse.json({ video: inserted });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to publish video." },
      { status: 500 }
    );
  }
}
