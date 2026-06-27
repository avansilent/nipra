import { NextResponse } from "next/server";
import { getAdminRouteContext } from "../../../../../lib/admin/route";
import { revalidateAdminContent } from "../../../../../lib/cacheInvalidation";
import { deleteCloudflareLiveInput } from "../../../../../lib/cloudflareStream";
import {
  adminJsonError,
  deleteMaterialFiles,
  ensureAdminCourse,
  getAdminSession,
  getMeetingLink,
  getMeetingPayload,
  getSessionJoinWindow,
  getStoredFilePath,
  normalizeSessionStatus,
  numberField,
  publicAssignmentColumns,
  publicMaterialColumns,
  publicSessionColumns,
  requireSessionTimes,
  stringField,
  toPublicAssignment,
  toPublicMaterial,
  upsertMeetingLink,
  type RouteParams,
} from "../../../../../lib/admin/onlineClasses";
import { isCloudflareLiveInputReference } from "../../../../../lib/storageReferences";

export async function GET(_request: Request, contextParams: RouteParams<"sessionId">) {
  try {
    const { sessionId } = await contextParams.params;
    const context = await getAdminRouteContext();
    const session = await getAdminSession(context, sessionId);

    const [
      { data: course, error: courseError },
      { data: meetingLink, error: meetingError },
      { data: recording, error: recordingError },
      { data: materials, error: materialsError },
      { data: assignments, error: assignmentsError },
    ] = await Promise.all([
      context.serviceClient.from("courses").select("id, title, mode").eq("id", session.course_id).eq("institute_id", context.instituteId).maybeSingle(),
      context.serviceClient
        .from("class_session_meeting_links")
        .select("id, session_id, provider, join_url, host_url, meeting_id, passcode, join_window_opens_at, join_window_closes_at, created_at, updated_at")
        .eq("session_id", session.id)
        .eq("institute_id", context.instituteId)
        .maybeSingle(),
      context.serviceClient
        .from("session_recordings")
        .select("id, session_id, recording_provider, title, bunny_video_id, bunny_library_id, external_url, available_from, created_at, updated_at")
        .eq("session_id", session.id)
        .eq("institute_id", context.instituteId)
        .maybeSingle(),
      context.serviceClient
        .from("session_materials")
        .select(`${publicMaterialColumns()}, file_path`)
        .eq("session_id", session.id)
        .eq("institute_id", context.instituteId)
        .order("sort_order", { ascending: true }),
      context.serviceClient
        .from("assignments")
        .select(`${publicAssignmentColumns()}, file_path`)
        .eq("session_id", session.id)
        .eq("institute_id", context.instituteId)
        .order("created_at", { ascending: false }),
    ]);

    const firstError = courseError ?? meetingError ?? recordingError ?? materialsError ?? assignmentsError;
    if (firstError) {
      return NextResponse.json({ error: firstError.message }, { status: 500 });
    }

    return NextResponse.json({
      session: {
        ...session,
        course,
        meetingLink,
        recording,
        materials: (materials ?? []).map(toPublicMaterial),
        assignments: (assignments ?? []).map(toPublicAssignment),
        materialCount: materials?.length ?? 0,
        assignmentCount: assignments?.length ?? 0,
      },
    });
  } catch (error) {
    return adminJsonError(error, "Unable to load session");
  }
}

export async function PATCH(request: Request, contextParams: RouteParams<"sessionId">) {
  try {
    const { sessionId } = await contextParams.params;
    const context = await getAdminRouteContext();
    const existingSession = await getAdminSession(context, sessionId);
    const body = (await request.json()) as Record<string, unknown>;

    const nextCourseId = stringField(body.course_id ?? body.courseId) || existingSession.course_id;
    await ensureAdminCourse(context, nextCourseId);

    const nextSessionDate = stringField(body.session_date ?? body.sessionDate) || existingSession.session_date;
    const nextStartTime = stringField(body.start_time ?? body.startTime) || existingSession.start_time;
    const nextEndTime = stringField(body.end_time ?? body.endTime) || existingSession.end_time;
    requireSessionTimes(nextSessionDate, nextStartTime, nextEndTime);

    const patch: Record<string, unknown> = {
      course_id: nextCourseId,
      session_date: nextSessionDate,
      start_time: nextStartTime,
      end_time: nextEndTime,
    };

    if ("title" in body) {
      const title = stringField(body.title);
      if (!title) {
        return NextResponse.json({ error: "Session title is required" }, { status: 400 });
      }
      patch.title = title;
    }

    if ("description" in body) {
      patch.description = stringField(body.description) || null;
    }

    if ("live_provider" in body || "provider" in body || "meeting" in body) {
      patch.live_provider = getMeetingPayload(body).provider;
    }

    if ("sort_order" in body || "sortOrder" in body) {
      patch.sort_order = numberField(body.sort_order ?? body.sortOrder);
    }

    if ("status" in body) {
      const status = normalizeSessionStatus(body.status);
      if (!status) {
        return NextResponse.json({ error: "Session status is invalid" }, { status: 400 });
      }
      patch.status = status;
    }

    const { data: session, error: updateError } = await context.serviceClient
      .from("class_sessions")
      .update(patch)
      .eq("id", existingSession.id)
      .eq("institute_id", context.instituteId)
      .select(publicSessionColumns())
      .single();

    if (updateError || !session) {
      return NextResponse.json({ error: updateError?.message ?? "Unable to update session" }, { status: 500 });
    }

    const updatedSession = session as unknown as typeof existingSession;
    const meetingPayload = getMeetingPayload({ ...body, provider: body.live_provider ?? body.provider ?? updatedSession.live_provider });
    const hasMeetingInput = ["join_url", "joinUrl", "host_url", "hostUrl", "meeting_id", "meetingId", "passcode", "meeting"].some((key) => key in body);
    let meetingLink = hasMeetingInput ? await upsertMeetingLink(context, updatedSession, meetingPayload) : await getMeetingLink(context, updatedSession.id);

    if (!hasMeetingInput && meetingLink) {
      const { data: updatedMeetingLink, error: meetingError } = await context.serviceClient
        .from("class_session_meeting_links")
        .update({
          provider: updatedSession.live_provider,
          ...getSessionJoinWindow(updatedSession.session_date, updatedSession.start_time, updatedSession.end_time),
        })
        .eq("session_id", updatedSession.id)
        .eq("institute_id", context.instituteId)
        .select("id, session_id, provider, join_url, host_url, meeting_id, passcode, join_window_opens_at, join_window_closes_at, created_at, updated_at")
        .single();

      if (!meetingError) {
        meetingLink = updatedMeetingLink;
      }
    }

    revalidateAdminContent("learning");

    return NextResponse.json({ session: updatedSession, meetingLink });
  } catch (error) {
    return adminJsonError(error, "Unable to update session");
  }
}

export async function DELETE(_request: Request, contextParams: RouteParams<"sessionId">) {
  try {
    const { sessionId } = await contextParams.params;
    const context = await getAdminRouteContext();
    const session = await getAdminSession(context, sessionId);

    const { data: materials } = await context.serviceClient
      .from("session_materials")
      .select("file_path")
      .eq("session_id", session.id)
      .eq("institute_id", context.instituteId);

    const { data: assignments } = await context.serviceClient
      .from("assignments")
      .select("id, file_path")
      .eq("session_id", session.id)
      .eq("institute_id", context.instituteId);

    const assignmentIds = (assignments ?? []).map((assignment) => assignment.id);
    const { data: submissions } =
      assignmentIds.length > 0
        ? await context.serviceClient
            .from("assignment_submissions")
            .select("file_path")
            .in("assignment_id", assignmentIds)
            .eq("institute_id", context.instituteId)
        : { data: [] as Array<{ file_path: string | null }> };

    const { data: meetingLink } = await context.serviceClient
      .from("class_session_meeting_links")
      .select("join_url")
      .eq("session_id", session.id)
      .eq("institute_id", context.instituteId)
      .maybeSingle();

    const { error: deleteError } = await context.serviceClient
      .from("class_sessions")
      .delete()
      .eq("id", session.id)
      .eq("institute_id", context.instituteId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    await deleteMaterialFiles(context, [
      ...(materials ?? []).map(getStoredFilePath),
      ...(assignments ?? []).map(getStoredFilePath),
      ...(submissions ?? []).map(getStoredFilePath),
    ]);

    if (isCloudflareLiveInputReference(meetingLink?.join_url)) {
      try {
        await deleteCloudflareLiveInput(meetingLink?.join_url);
      } catch {
        // Database deletion already succeeded; Cloudflare cleanup can be retried manually if needed.
      }
    }

    revalidateAdminContent("learning");

    return NextResponse.json({ success: true });
  } catch (error) {
    return adminJsonError(error, "Unable to delete session");
  }
}
