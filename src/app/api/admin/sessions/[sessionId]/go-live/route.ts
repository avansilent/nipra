import { NextResponse } from "next/server";
import { getAdminRouteContext } from "../../../../../../lib/admin/route";
import { revalidateAdminContent } from "../../../../../../lib/cacheInvalidation";
import { createCloudflareLiveInput } from "../../../../../../lib/cloudflareStream";
import {
  adminJsonError,
  getAdminSession,
  getMeetingLink,
  getSessionJoinWindow,
  publicSessionColumns,
  type RouteParams,
} from "../../../../../../lib/admin/onlineClasses";
import { isCloudflareLiveInputReference } from "../../../../../../lib/storageReferences";

async function ensureDirectLiveStream(
  context: Awaited<ReturnType<typeof getAdminRouteContext>>,
  session: Awaited<ReturnType<typeof getAdminSession>>
) {
  const joinWindow = getSessionJoinWindow(session.session_date, session.start_time, session.end_time);
  const existingLink = await getMeetingLink(context, session.id);

  if (existingLink?.join_url && isCloudflareLiveInputReference(existingLink.join_url)) {
    const { data: updatedMeetingLink, error } = await context.serviceClient
      .from("class_session_meeting_links")
      .update({
        provider: "other",
        ...joinWindow,
      })
      .eq("session_id", session.id)
      .eq("institute_id", context.instituteId)
      .select("id, session_id, provider, join_url, host_url, meeting_id, passcode, join_window_opens_at, join_window_closes_at, created_at, updated_at")
      .single();

    if (error || !updatedMeetingLink) {
      return {
        error: NextResponse.json({ error: error?.message ?? "Unable to update direct live stream" }, { status: 500 }),
      };
    }

    return { meetingLink: updatedMeetingLink };
  }

  const stream = await createCloudflareLiveInput({
    title: session.title,
    sessionId: session.id,
    courseId: session.course_id,
    instituteId: context.instituteId,
  });

  const { data: meetingLink, error } = await context.serviceClient
    .from("class_session_meeting_links")
    .upsert(
      {
        institute_id: context.instituteId,
        session_id: session.id,
        provider: "other",
        join_url: stream.reference,
        host_url: stream.rtmpsUrl,
        meeting_id: stream.uid,
        passcode: stream.streamKey,
        ...joinWindow,
      },
      { onConflict: "session_id" }
    )
    .select("id, session_id, provider, join_url, host_url, meeting_id, passcode, join_window_opens_at, join_window_closes_at, created_at, updated_at")
    .single();

  if (error || !meetingLink) {
    return {
      error: NextResponse.json({ error: error?.message ?? "Unable to prepare direct live stream" }, { status: 500 }),
    };
  }

  return { meetingLink };
}

export async function POST(_request: Request, contextParams: RouteParams<"sessionId">) {
  try {
    const { sessionId } = await contextParams.params;
    const context = await getAdminRouteContext();
    const session = await getAdminSession(context, sessionId);

    if (session.status === "completed" || session.status === "cancelled") {
      return NextResponse.json({ error: "Only scheduled sessions can go live" }, { status: 400 });
    }

    const prepared = await ensureDirectLiveStream(context, session);
    if ("error" in prepared) {
      return prepared.error;
    }

    const { data: updatedSession, error: updateError } = await context.serviceClient
      .from("class_sessions")
      .update({ status: "live", live_provider: "other" })
      .eq("id", session.id)
      .eq("institute_id", context.instituteId)
      .select(publicSessionColumns())
      .single();

    if (updateError || !updatedSession) {
      return NextResponse.json({ error: updateError?.message ?? "Unable to start live session" }, { status: 500 });
    }

    revalidateAdminContent("learning");

    return NextResponse.json({ session: updatedSession, meetingLink: prepared.meetingLink });
  } catch (error) {
    return adminJsonError(error, "Unable to start live session");
  }
}
