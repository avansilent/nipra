import { NextResponse } from "next/server";
import { normalizeResourceVisibility } from "../../../../../lib/resourceVisibility";
import {
  createBunnyStreamReference,
  getBunnyStreamApiKey,
  getDefaultBunnyStreamLibraryId,
  isValidBunnyLibraryId,
  isValidBunnyVideoId,
} from "../../../../../lib/bunnyStream";
import { resolveAdminUploadContext } from "../../_shared/upload";

type BunnyCreateVideoResponse = {
  guid?: string;
  videoId?: string;
  id?: string;
  title?: string;
};

async function createBunnyVideo(libraryId: string, title: string, apiKey: string) {
  const response = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
    method: "POST",
    headers: {
      AccessKey: apiKey,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });

  const payload = (await response.json().catch(() => ({}))) as BunnyCreateVideoResponse & { message?: string };
  if (!response.ok) {
    throw new Error(payload.message ?? "Unable to create Bunny Stream video.");
  }

  const videoId = payload.guid ?? payload.videoId ?? payload.id;
  if (!videoId || !isValidBunnyVideoId(videoId)) {
    throw new Error("Bunny Stream did not return a valid video ID.");
  }

  return videoId;
}

async function uploadBunnyVideo(libraryId: string, videoId: string, file: File, apiKey: string) {
  const response = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`, {
    method: "PUT",
    headers: {
      AccessKey: apiKey,
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  const payload = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) {
    throw new Error(payload.message ?? "Unable to upload video to Bunny Stream.");
  }
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
    const title = String(formData.get("title") ?? "").trim();
    const requestedVisibility = normalizeResourceVisibility(String(formData.get("visibility") ?? ""));
    const visibility = requestedVisibility === "public" ? "student" : requestedVisibility;
    const requestedLibraryId = String(formData.get("libraryId") ?? "").trim() || getDefaultBunnyStreamLibraryId();
    const requestedVideoId = String(formData.get("videoId") ?? "").trim();
    const file = formData.get("file");

    if (!courseId || !title) {
      return NextResponse.json({ error: "Course and video title are required." }, { status: 400 });
    }

    if (!requestedLibraryId || !isValidBunnyLibraryId(requestedLibraryId)) {
      return NextResponse.json({ error: "Add a valid Bunny Stream library ID." }, { status: 400 });
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
    let videoId = requestedVideoId;

    if (videoFile) {
      if (videoFile.type && !videoFile.type.startsWith("video/")) {
        return NextResponse.json({ error: "Choose a valid video file." }, { status: 400 });
      }

      const apiKey = getBunnyStreamApiKey();
      if (!apiKey) {
        return NextResponse.json(
          { error: "BUNNY_STREAM_API_KEY is required to upload video files. You can still publish an existing Bunny video ID." },
          { status: 400 }
        );
      }

      if (!videoId) {
        videoId = await createBunnyVideo(requestedLibraryId, title, apiKey);
      }

      if (!isValidBunnyVideoId(videoId)) {
        return NextResponse.json({ error: "Add a valid Bunny Stream video ID." }, { status: 400 });
      }

      await uploadBunnyVideo(requestedLibraryId, videoId, videoFile, apiKey);
    }

    if (!videoId || !isValidBunnyVideoId(videoId)) {
      return NextResponse.json({ error: "Add a valid Bunny Stream video ID or choose a video file." }, { status: 400 });
    }

    const { data: inserted, error: insertError } = await service
      .from("materials")
      .insert({
        course_id: courseId,
        institute_id: instituteId,
        title,
        file_url: createBunnyStreamReference({ libraryId: requestedLibraryId, videoId }),
        visibility,
      })
      .select("id, title, course_id, file_url, visibility, created_at")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ video: inserted });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to publish video." },
      { status: 500 }
    );
  }
}
