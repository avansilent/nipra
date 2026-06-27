import { NextResponse } from "next/server";
import { createCloudflareStreamEmbedUrl } from "../../../../../../lib/cloudflareStream";
import {
  assertSessionJoinAllowed,
  getStudentRouteContext,
  getStudentSession,
  studentJsonError,
  type RouteParams,
} from "../../../../../../lib/student/onlineClasses";
import { isCloudflareLiveInputReference } from "../../../../../../lib/storageReferences";

export async function POST(_request: Request, contextParams: RouteParams<"sessionId">) {
  try {
    const { sessionId } = await contextParams.params;
    const context = await getStudentRouteContext();
    const session = await getStudentSession(context, sessionId);

    const { data: meetingLink, error: meetingError } = await context.serviceClient
      .from("class_session_meeting_links")
      .select("id, provider, join_url, join_window_opens_at, join_window_closes_at")
      .eq("session_id", session.id)
      .eq("institute_id", context.instituteId)
      .maybeSingle();

    if (meetingError) {
      return NextResponse.json({ error: meetingError.message }, { status: 500 });
    }

    if (!meetingLink?.join_url || !isCloudflareLiveInputReference(meetingLink.join_url)) {
      return NextResponse.json(
        { error: "Direct live stream is not ready yet.", code: "stream_not_ready" },
        { status: 403 }
      );
    }

    assertSessionJoinAllowed(session, meetingLink);

    const { error: attendanceError } = await context.serviceClient
      .from("session_attendance")
      .upsert(
        {
          institute_id: context.instituteId,
          session_id: session.id,
          student_id: context.userId,
          joined_at: new Date().toISOString(),
        },
        { onConflict: "session_id,student_id" }
      );

    if (attendanceError) {
      return NextResponse.json({ error: attendanceError.message }, { status: 500 });
    }

    const joinUrl = await createCloudflareStreamEmbedUrl(meetingLink.join_url);

    if (!joinUrl) {
      return NextResponse.json({ error: "Secure live player is not ready yet.", code: "stream_not_ready" }, { status: 503 });
    }

    return NextResponse.json(
      {
        session: {
          id: session.id,
          title: session.title,
          status: session.status,
          live_provider: session.live_provider,
        },
        meeting: {
          provider: meetingLink.provider,
          joinUrl,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return studentJsonError(error, "Unable to join live class");
  }
}
