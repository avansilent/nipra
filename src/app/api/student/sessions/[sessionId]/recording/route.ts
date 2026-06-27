import { NextResponse } from "next/server";
import {
  buildRecordingEmbedUrl,
  getStudentRouteContext,
  getStudentSession,
  studentJsonError,
  type RouteParams,
} from "../../../../../../lib/student/onlineClasses";

export async function GET(_request: Request, contextParams: RouteParams<"sessionId">) {
  try {
    const { sessionId } = await contextParams.params;
    const context = await getStudentRouteContext();
    const session = await getStudentSession(context, sessionId);

    if (session.status !== "completed") {
      return NextResponse.json(
        { error: "Recording is available only after class is completed.", code: "not_completed" },
        { status: 403 }
      );
    }

    const { data: recording, error } = await context.serviceClient
      .from("session_recordings")
      .select("id, session_id, recording_provider, title, bunny_video_id, bunny_library_id, external_url, available_from, created_at")
      .eq("session_id", session.id)
      .eq("institute_id", context.instituteId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!recording) {
      return NextResponse.json({ error: "Recording is not uploaded yet.", code: "recording_missing" }, { status: 404 });
    }

    if (recording.available_from && new Date(recording.available_from).getTime() > Date.now()) {
      return NextResponse.json({ error: "Recording is not available yet.", code: "recording_locked" }, { status: 403 });
    }

    const embedUrl = await buildRecordingEmbedUrl(recording);
    if (!embedUrl) {
      return NextResponse.json({ error: "Recording is not ready yet.", code: "recording_not_ready" }, { status: 404 });
    }

    return NextResponse.json(
      {
        recording: {
          id: recording.id,
          session_id: recording.session_id,
          title: recording.title ?? session.title,
          provider: recording.recording_provider,
          embedUrl,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return studentJsonError(error, "Unable to load session recording");
  }
}
