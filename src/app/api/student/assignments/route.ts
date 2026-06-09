import { NextResponse } from "next/server";
import {
  getActiveCourseIds,
  getStudentRouteContext,
  requireUuid,
  studentJsonError,
  toPublicAssignment,
} from "../../../../lib/student/onlineClasses";

type AssignmentRow = {
  id: string;
  institute_id: string;
  session_id: string | null;
  course_id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  file_path?: string | null;
  due_date: string | null;
  max_marks: number;
  is_published: boolean;
  created_at?: string;
  updated_at?: string;
};

export async function GET(request: Request) {
  try {
    const context = await getStudentRouteContext();
    const activeCourseIds = await getActiveCourseIds(context);

    if (activeCourseIds.length === 0) {
      return NextResponse.json({ assignments: [] }, { headers: { "Cache-Control": "no-store" } });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId") ?? searchParams.get("course_id");
    const sessionId = searchParams.get("sessionId") ?? searchParams.get("session_id");

    if (courseId) {
      requireUuid(courseId, "Course");
      if (!activeCourseIds.includes(courseId)) {
        return NextResponse.json({ error: "This course is not assigned to this student.", code: "not_enrolled" }, { status: 403 });
      }
    }

    if (sessionId) {
      requireUuid(sessionId, "Session");
    }

    const scopedCourseIds = courseId ? [courseId] : activeCourseIds;
    let assignmentsQuery = context.serviceClient
      .from("assignments")
      .select("id, institute_id, session_id, course_id, title, description, instructions, file_path, due_date, max_marks, is_published, created_at, updated_at")
      .eq("institute_id", context.instituteId)
      .eq("is_published", true)
      .in("course_id", scopedCourseIds)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (sessionId) {
      assignmentsQuery = assignmentsQuery.eq("session_id", sessionId);
    }

    const [{ data: assignments, error: assignmentsError }, { data: courses, error: coursesError }] = await Promise.all([
      assignmentsQuery,
      context.serviceClient
        .from("courses")
        .select("id, title")
        .eq("institute_id", context.instituteId)
        .in("id", scopedCourseIds),
    ]);

    const firstError = assignmentsError ?? coursesError;
    if (firstError) {
      return NextResponse.json({ error: firstError.message }, { status: 500 });
    }

    const assignmentRows = (assignments ?? []) as AssignmentRow[];
    const assignmentIds = assignmentRows.map((assignment) => assignment.id);
    const { data: submissions, error: submissionsError } =
      assignmentIds.length > 0
        ? await context.serviceClient
            .from("assignment_submissions")
            .select("id, assignment_id, submitted_at, marks_obtained, feedback, graded_at, file_path")
            .eq("institute_id", context.instituteId)
            .eq("student_id", context.userId)
            .in("assignment_id", assignmentIds)
        : { data: [], error: null };

    if (submissionsError) {
      return NextResponse.json({ error: submissionsError.message }, { status: 500 });
    }

    const courseTitleById = new Map((courses ?? []).map((course) => [course.id, course.title]));
    const submissionByAssignmentId = new Map((submissions ?? []).map((submission) => [submission.assignment_id, submission]));

    return NextResponse.json(
      {
        assignments: assignmentRows.map((assignment) =>
          toPublicAssignment(assignment, submissionByAssignmentId.get(assignment.id), courseTitleById.get(assignment.course_id))
        ),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return studentJsonError(error, "Unable to load assignments");
  }
}
