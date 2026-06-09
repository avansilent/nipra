import { NextResponse } from "next/server";
import {
  getActiveCourseIds,
  getStudentRouteContext,
  studentJsonError,
  toIstDate,
  toPublicSession,
} from "../../../../lib/student/onlineClasses";

type SessionRow = {
  id: string;
  course_id: string;
  institute_id: string;
  title: string;
  description: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
  live_provider: "google_meet" | "zoom" | "other";
  status: "scheduled" | "live" | "completed" | "cancelled";
  sort_order: number;
};

export async function GET() {
  try {
    const context = await getStudentRouteContext();
    const courseIds = await getActiveCourseIds(context);

    if (courseIds.length === 0) {
      return NextResponse.json({ upcoming: [], past: [], sessions: [] }, { headers: { "Cache-Control": "no-store" } });
    }

    const [{ data: sessions, error: sessionsError }, { data: courses, error: coursesError }] = await Promise.all([
      context.serviceClient
        .from("class_sessions")
        .select("id, institute_id, course_id, title, description, session_date, start_time, end_time, live_provider, status, sort_order")
        .eq("institute_id", context.instituteId)
        .in("course_id", courseIds)
        .order("session_date", { ascending: true })
        .order("start_time", { ascending: true })
        .order("sort_order", { ascending: true }),
      context.serviceClient
        .from("courses")
        .select("id, title")
        .eq("institute_id", context.instituteId)
        .in("id", courseIds),
    ]);

    const firstError = sessionsError ?? coursesError;
    if (firstError) {
      return NextResponse.json({ error: firstError.message }, { status: 500 });
    }

    const courseTitleById = new Map((courses ?? []).map((course) => [course.id, course.title]));
    const now = Date.now();
    const safeSessions = ((sessions ?? []) as SessionRow[]).map((session) => toPublicSession(session, courseTitleById.get(session.course_id)));
    const upcoming = safeSessions.filter((session) => {
      if (session.status === "live" || session.status === "scheduled") {
        return toIstDate(session.session_date, session.end_time).getTime() + 30 * 60 * 1000 >= now;
      }

      return false;
    });
    const past = safeSessions.filter((session) => !upcoming.some((item) => item.id === session.id));

    return NextResponse.json({ upcoming, past, sessions: safeSessions }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return studentJsonError(error, "Unable to load class sessions");
  }
}
