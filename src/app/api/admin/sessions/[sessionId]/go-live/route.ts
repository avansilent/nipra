import { NextResponse } from "next/server";
import { getAdminRouteContext } from "../../../../../../lib/admin/route";
import {
  adminJsonError,
  getAdminSession,
  getMeetingLink,
  getSessionJoinWindow,
  publicSessionColumns,
  type RouteParams,
} from "../../../../../../lib/admin/onlineClasses";

export async function POST(_request: Request, contextParams: RouteParams<"sessionId">) {
  try {
    const { sessionId } = await contextParams.params;
    const context = await getAdminRouteContext();
    const session = await getAdminSession(context, sessionId);

    if (session.status === "completed" || session.status === "cancelled") {
      return NextResponse.json({ error: "Only scheduled sessions can go live" }, { status: 400 });
    }

    const meetingLink = await getMeetingLink(context, session.id);
    if (!meetingLink?.join_url) {
      return NextResponse.json({ error: "Add a Google Meet or Zoom student join link before going live" }, { status: 400 });
    }

    const joinWindow = getSessionJoinWindow(session.session_date, session.start_time, session.end_time);
    const { data: updatedMeetingLink, error: meetingError } = await context.serviceClient
      .from("class_session_meeting_links")
      .update(joinWindow)
      .eq("session_id", session.id)
      .eq("institute_id", context.instituteId)
      .select("id, session_id, provider, join_url, host_url, meeting_id, passcode, join_window_opens_at, join_window_closes_at, created_at, updated_at")
      .single();

    if (meetingError) {
      return NextResponse.json({ error: meetingError.message }, { status: 500 });
    }

    const { data: updatedSession, error: updateError } = await context.serviceClient
      .from("class_sessions")
      .update({ status: "live" })
      .eq("id", session.id)
      .eq("institute_id", context.instituteId)
      .select(publicSessionColumns())
      .single();

    if (updateError || !updatedSession) {
      return NextResponse.json({ error: updateError?.message ?? "Unable to start live session" }, { status: 500 });
    }

    return NextResponse.json({ session: updatedSession, meetingLink: updatedMeetingLink });
  } catch (error) {
    return adminJsonError(error, "Unable to start live session");
  }
}
