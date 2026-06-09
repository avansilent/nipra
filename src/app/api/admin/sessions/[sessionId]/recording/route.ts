import { NextResponse } from "next/server";
import {
  getBunnyStreamApiKey,
  getDefaultBunnyStreamLibraryId,
  isValidBunnyLibraryId,
  isValidBunnyVideoId,
} from "../../../../../../lib/bunnyStream";
import { getAdminRouteContext } from "../../../../../../lib/admin/route";
import {
  adminJsonError,
  getAdminSession,
  stringField,
  type RouteParams,
} from "../../../../../../lib/admin/onlineClasses";

type BunnyCreateVideoResponse = {
  guid?: string;
  videoId?: string;
  id?: string;
  message?: string;
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

  const payload = (await response.json().catch(() => ({}))) as BunnyCreateVideoResponse;
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
    throw new Error(payload.message ?? "Unable to upload recording to Bunny Stream.");
  }
}

function safeExternalUrl(value: unknown) {
  const nextValue = stringField(value);
  if (!nextValue) {
    return null;
  }

  try {
    const url = new URL(nextValue);
    if (url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export async function GET(_request: Request, contextParams: RouteParams<"sessionId">) {
  try {
    const { sessionId } = await contextParams.params;
    const context = await getAdminRouteContext();
    const session = await getAdminSession(context, sessionId);

    const { data: recording, error } = await context.serviceClient
      .from("session_recordings")
      .select("id, session_id, recording_provider, title, bunny_video_id, bunny_library_id, external_url, available_from, created_at, updated_at")
      .eq("session_id", session.id)
      .eq("institute_id", context.instituteId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ recording });
  } catch (error) {
    return adminJsonError(error, "Unable to load session recording");
  }
}

export async function POST(request: Request, contextParams: RouteParams<"sessionId">) {
  try {
    const { sessionId } = await contextParams.params;
    const context = await getAdminRouteContext();
    const session = await getAdminSession(context, sessionId);
    const formData = await request.formData();
    const title = stringField(formData.get("title")) || `${session.title} recording`;
    const externalUrl = safeExternalUrl(formData.get("external_url") ?? formData.get("externalUrl"));
    const file = formData.get("file");
    const requestedLibraryId = stringField(formData.get("library_id") ?? formData.get("libraryId")) || getDefaultBunnyStreamLibraryId();
    let videoId = stringField(formData.get("video_id") ?? formData.get("videoId"));

    if (externalUrl && !(file instanceof File) && !videoId) {
      const { data: recording, error } = await context.serviceClient
        .from("session_recordings")
        .upsert(
          {
            institute_id: context.instituteId,
            session_id: session.id,
            recording_provider: "external_link",
            title,
            external_url: externalUrl,
            bunny_video_id: null,
            bunny_library_id: null,
            available_from: new Date().toISOString(),
          },
          { onConflict: "session_id" }
        )
        .select("id, session_id, recording_provider, title, bunny_video_id, bunny_library_id, external_url, available_from, created_at, updated_at")
        .single();

      if (error || !recording) {
        return NextResponse.json({ error: error?.message ?? "Unable to save recording" }, { status: 500 });
      }

      return NextResponse.json({ recording });
    }

    if (!requestedLibraryId || !isValidBunnyLibraryId(requestedLibraryId)) {
      return NextResponse.json({ error: "Add a valid Bunny Stream library ID" }, { status: 400 });
    }

    const videoFile = file instanceof File && file.size > 0 ? file : null;
    if (videoFile) {
      if (videoFile.type && !videoFile.type.startsWith("video/")) {
        return NextResponse.json({ error: "Choose a valid video file" }, { status: 400 });
      }

      const apiKey = getBunnyStreamApiKey();
      if (!apiKey) {
        return NextResponse.json({ error: "BUNNY_STREAM_API_KEY is required to upload recordings" }, { status: 400 });
      }

      if (!videoId) {
        videoId = await createBunnyVideo(requestedLibraryId, title, apiKey);
      }

      if (!isValidBunnyVideoId(videoId)) {
        return NextResponse.json({ error: "Add a valid Bunny Stream video ID" }, { status: 400 });
      }

      await uploadBunnyVideo(requestedLibraryId, videoId, videoFile, apiKey);
    }

    if (!videoId || !isValidBunnyVideoId(videoId)) {
      return NextResponse.json({ error: "Add a Bunny video ID or upload a video file" }, { status: 400 });
    }

    const { data: recording, error } = await context.serviceClient
      .from("session_recordings")
      .upsert(
        {
          institute_id: context.instituteId,
          session_id: session.id,
          recording_provider: "bunny_stream",
          title,
          bunny_video_id: videoId,
          bunny_library_id: requestedLibraryId,
          external_url: null,
          available_from: new Date().toISOString(),
        },
        { onConflict: "session_id" }
      )
      .select("id, session_id, recording_provider, title, bunny_video_id, bunny_library_id, external_url, available_from, created_at, updated_at")
      .single();

    if (error || !recording) {
      return NextResponse.json({ error: error?.message ?? "Unable to save recording" }, { status: 500 });
    }

    return NextResponse.json({ recording });
  } catch (error) {
    return adminJsonError(error, "Unable to save session recording");
  }
}

export async function DELETE(_request: Request, contextParams: RouteParams<"sessionId">) {
  try {
    const { sessionId } = await contextParams.params;
    const context = await getAdminRouteContext();
    const session = await getAdminSession(context, sessionId);

    const { error } = await context.serviceClient
      .from("session_recordings")
      .delete()
      .eq("session_id", session.id)
      .eq("institute_id", context.instituteId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return adminJsonError(error, "Unable to delete session recording");
  }
}
