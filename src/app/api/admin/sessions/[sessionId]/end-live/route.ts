import { NextResponse } from "next/server";
import { getAdminRouteContext } from "../../../../../../lib/admin/route";
import { revalidateAdminContent } from "../../../../../../lib/cacheInvalidation";
import { findLatestCloudflareLiveRecording } from "../../../../../../lib/cloudflareStream";
import {
  adminJsonError,
  getAdminSession,
  getMeetingLink,
  publicSessionColumns,
  type RouteParams,
} from "../../../../../../lib/admin/onlineClasses";
import { isCloudflareLiveInputReference } from "../../../../../../lib/storageReferences";

function getRecordingSearchStart(session: Awaited<ReturnType<typeof getAdminSession>>) {
  const timeValue = session.start_time.length === 5 ? `${session.start_time}:00` : session.start_time;
  const sessionDate = new Date(`${session.session_date}T${timeValue}+05:30`);
  if (Number.isNaN(sessionDate.getTime())) {
    return undefined;
  }

  return new Date(sessionDate.getTime() - 30 * 60 * 1000).toISOString();
}

export async function POST(_request: Request, contextParams: RouteParams<"sessionId">) {
  try {
    const { sessionId } = await contextParams.params;
    const context = await getAdminRouteContext();
    const session = await getAdminSession(context, sessionId);

    if (session.status === "cancelled") {
      return NextResponse.json({ error: "Cancelled sessions cannot be completed" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data: updatedSession, error: updateError } = await context.serviceClient
      .from("class_sessions")
      .update({ status: "completed" })
      .eq("id", session.id)
      .eq("institute_id", context.instituteId)
      .select(publicSessionColumns())
      .single();

    if (updateError || !updatedSession) {
      return NextResponse.json({ error: updateError?.message ?? "Unable to end live session" }, { status: 500 });
    }

    const [{ data: materials }, { data: assignments }] = await Promise.all([
      context.serviceClient
        .from("session_materials")
        .update({ visible_from: now })
        .eq("session_id", session.id)
        .eq("institute_id", context.instituteId)
        .select("id"),
      context.serviceClient
        .from("assignments")
        .update({ is_published: true })
        .eq("session_id", session.id)
        .eq("institute_id", context.instituteId)
        .select("id"),
      context.serviceClient
        .from("class_session_meeting_links")
        .update({ join_window_closes_at: now })
        .eq("session_id", session.id)
        .eq("institute_id", context.instituteId),
    ]);

    let recordingAttached = false;
    try {
      const meetingLink = await getMeetingLink(context, session.id);
      if (meetingLink?.join_url && isCloudflareLiveInputReference(meetingLink.join_url)) {
        const recording = await findLatestCloudflareLiveRecording(meetingLink.join_url, getRecordingSearchStart(session));
        if (recording?.reference) {
          const title = recording.title || `${session.title} recording`;
          const { data: existingMaterial } = await context.serviceClient
            .from("materials")
            .select("id")
            .eq("file_url", recording.reference)
            .eq("institute_id", context.instituteId)
            .maybeSingle();

          if (existingMaterial?.id) {
            await context.serviceClient
              .from("materials")
              .update({ title, course_id: session.course_id, visibility: "student" })
              .eq("id", existingMaterial.id)
              .eq("institute_id", context.instituteId);
          } else {
            await context.serviceClient
              .from("materials")
              .insert({
                institute_id: context.instituteId,
                course_id: session.course_id,
                title,
                file_url: recording.reference,
                visibility: "student",
              });
          }

          await context.serviceClient
            .from("session_recordings")
            .upsert(
              {
                institute_id: context.instituteId,
                session_id: session.id,
                recording_provider: "external_link",
                title,
                external_url: recording.reference,
                bunny_video_id: null,
                bunny_library_id: null,
                available_from: now,
              },
              { onConflict: "session_id" }
            );
          recordingAttached = true;
        }
      }
    } catch {
      recordingAttached = false;
    }

    revalidateAdminContent("learning");

    return NextResponse.json({
      session: updatedSession,
      unlockedMaterials: materials?.length ?? 0,
      publishedAssignments: assignments?.length ?? 0,
      recordingAttached,
    });
  } catch (error) {
    return adminJsonError(error, "Unable to end live session");
  }
}
