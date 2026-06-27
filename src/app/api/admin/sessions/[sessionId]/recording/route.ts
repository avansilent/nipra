import { NextResponse } from "next/server";
import { getAdminRouteContext } from "../../../../../../lib/admin/route";
import { revalidateAdminContent } from "../../../../../../lib/cacheInvalidation";
import { deleteCloudflareStreamVideo, uploadCloudflareStreamFile } from "../../../../../../lib/cloudflareStream";
import { deleteR2Object } from "../../../../../../lib/r2Storage";
import { isCloudflareStreamReference } from "../../../../../../lib/storageReferences";
import {
  adminJsonError,
  getAdminSession,
  stringField,
  type RouteParams,
} from "../../../../../../lib/admin/onlineClasses";

const maxVideoUploadBytes = 500 * 1024 * 1024;

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
    const videoFile = file instanceof File && file.size > 0 ? file : null;

    if (!externalUrl && !videoFile) {
      return NextResponse.json({ error: "Add a recording link or upload a video file" }, { status: 400 });
    }

    if (externalUrl && !videoFile) {
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

      revalidateAdminContent("learning");

      return NextResponse.json({ recording });
    }

    if (!videoFile) {
      return NextResponse.json({ error: "Choose a valid video file" }, { status: 400 });
    }

    if (videoFile.type && !videoFile.type.startsWith("video/")) {
      return NextResponse.json({ error: "Choose a valid video file" }, { status: 400 });
    }

    if (videoFile.size > maxVideoUploadBytes) {
      return NextResponse.json({ error: "Video file must be 500MB or smaller" }, { status: 400 });
    }

    const fileReference = await uploadCloudflareStreamFile({
      file: videoFile,
      title,
      courseId: session.course_id,
      instituteId: context.instituteId,
    });

    const { data: recording, error } = await context.serviceClient
      .from("session_recordings")
      .upsert(
        {
          institute_id: context.instituteId,
          session_id: session.id,
          recording_provider: "external_link",
          title,
          bunny_video_id: null,
          bunny_library_id: null,
          external_url: fileReference,
          available_from: new Date().toISOString(),
        },
        { onConflict: "session_id" }
      )
      .select("id, session_id, recording_provider, title, bunny_video_id, bunny_library_id, external_url, available_from, created_at, updated_at")
      .single();

    if (error || !recording) {
      await deleteCloudflareStreamVideo(fileReference);
      return NextResponse.json({ error: error?.message ?? "Unable to save recording" }, { status: 500 });
    }

    revalidateAdminContent("learning");

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

    const { data: recording } = await context.serviceClient
      .from("session_recordings")
      .select("external_url")
      .eq("session_id", session.id)
      .eq("institute_id", context.instituteId)
      .maybeSingle();

    const { error } = await context.serviceClient
      .from("session_recordings")
      .delete()
      .eq("session_id", session.id)
      .eq("institute_id", context.instituteId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (isCloudflareStreamReference(recording?.external_url)) {
      await deleteCloudflareStreamVideo(recording?.external_url);
    } else {
      await deleteR2Object(recording?.external_url);
    }

    revalidateAdminContent("learning");

    return NextResponse.json({ success: true });
  } catch (error) {
    return adminJsonError(error, "Unable to delete session recording");
  }
}
