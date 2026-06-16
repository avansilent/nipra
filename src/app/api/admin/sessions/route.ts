import { NextResponse } from "next/server";
import { getAdminRouteContext, type AdminRouteError } from "../../../../lib/admin/route";
import { revalidateAdminContent } from "../../../../lib/cacheInvalidation";
import {
  adminJsonError,
  ensureAdminCourse,
  getMeetingPayload,
  numberField,
  publicSessionColumns,
  requireSessionTimes,
  stringField,
  upsertMeetingLink,
} from "../../../../lib/admin/onlineClasses";

export async function GET(request: Request) {
  try {
    const context = await getAdminRouteContext();
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId") ?? searchParams.get("course_id");

    let query = context.serviceClient
      .from("class_sessions")
      .select(`${publicSessionColumns()}, course:courses(id, title, mode)`)
      .eq("institute_id", context.instituteId)
      .order("session_date", { ascending: true })
      .order("start_time", { ascending: true })
      .order("sort_order", { ascending: true });

    if (courseId) {
      await ensureAdminCourse(context, courseId);
      query = query.eq("course_id", courseId);
    }

    const { data: sessions, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sessions: sessions ?? [] });
  } catch (error) {
    return adminJsonError(error, "Unable to load sessions");
  }
}

export async function POST(request: Request) {
  let createdSessionId: string | null = null;

  try {
    const context = await getAdminRouteContext();
    const body = (await request.json()) as Record<string, unknown>;
    const courseId = stringField(body.course_id ?? body.courseId);
    const title = stringField(body.title);
    const description = stringField(body.description) || null;
    const sessionDate = stringField(body.session_date ?? body.sessionDate);
    const startTime = stringField(body.start_time ?? body.startTime);
    const endTime = stringField(body.end_time ?? body.endTime);
    const meetingPayload = getMeetingPayload(body);

    if (!title) {
      return NextResponse.json({ error: "Session title is required" }, { status: 400 });
    }

    await ensureAdminCourse(context, courseId);
    requireSessionTimes(sessionDate, startTime, endTime);

    const { data: session, error: insertError } = await context.serviceClient
      .from("class_sessions")
      .insert({
        institute_id: context.instituteId,
        course_id: courseId,
        title,
        description,
        session_date: sessionDate,
        start_time: startTime,
        end_time: endTime,
        live_provider: meetingPayload.provider,
        status: "scheduled",
        sort_order: numberField(body.sort_order ?? body.sortOrder),
      })
      .select(publicSessionColumns())
      .single();

    if (insertError || !session) {
      return NextResponse.json({ error: insertError?.message ?? "Unable to create session" }, { status: 500 });
    }

    const createdSession = session as unknown as Parameters<typeof upsertMeetingLink>[1];
    createdSessionId = createdSession.id;
    const meetingLink = await upsertMeetingLink(context, createdSession, meetingPayload);

    revalidateAdminContent("learning");

    return NextResponse.json({ session: createdSession, meetingLink });
  } catch (error) {
    if (createdSessionId) {
      try {
        const context = await getAdminRouteContext();
        await context.serviceClient.from("class_sessions").delete().eq("id", createdSessionId).eq("institute_id", context.instituteId);
      } catch {
        // Best-effort cleanup only. Return the original error below.
      }
    }

    return adminJsonError(error as AdminRouteError, "Unable to create session");
  }
}
