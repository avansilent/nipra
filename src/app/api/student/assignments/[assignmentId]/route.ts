import { NextResponse } from "next/server";
import {
  createSignedMaterialUrl,
  getStoredFilePath,
  getStudentAssignment,
  getStudentRouteContext,
  studentJsonError,
  toPublicAssignment,
  type RouteParams,
} from "../../../../../lib/student/onlineClasses";

export async function GET(_request: Request, contextParams: RouteParams<"assignmentId">) {
  try {
    const { assignmentId } = await contextParams.params;
    const context = await getStudentRouteContext();
    const assignment = await getStudentAssignment(context, assignmentId);

    const [{ data: course }, { data: session }, { data: submission, error: submissionError }] = await Promise.all([
      context.serviceClient
        .from("courses")
        .select("id, title, mode")
        .eq("id", assignment.course_id)
        .eq("institute_id", context.instituteId)
        .maybeSingle(),
      assignment.session_id
        ? context.serviceClient
            .from("class_sessions")
            .select("id, title, session_date, start_time, end_time, status")
            .eq("id", assignment.session_id)
            .eq("institute_id", context.instituteId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      context.serviceClient
        .from("assignment_submissions")
        .select("id, assignment_id, student_id, text_response, file_path, submitted_at, marks_obtained, feedback, graded_at")
        .eq("assignment_id", assignment.id)
        .eq("student_id", context.userId)
        .eq("institute_id", context.instituteId)
        .maybeSingle(),
    ]);

    if (submissionError) {
      return NextResponse.json({ error: submissionError.message }, { status: 500 });
    }

    const submissionFilePath = getStoredFilePath(submission);
    const safeSubmission = submission ? { ...(submission as Record<string, unknown>) } : null;
    if (safeSubmission) {
      delete safeSubmission.file_path;
    }

    return NextResponse.json(
      {
        assignment: {
          ...toPublicAssignment(assignment, submission, course?.title),
          course,
          session,
          signedUrl: await createSignedMaterialUrl(context, getStoredFilePath(assignment)),
          submission: safeSubmission
            ? {
                ...safeSubmission,
                hasFile: Boolean(submissionFilePath),
                signedUrl: await createSignedMaterialUrl(context, submissionFilePath),
              }
            : null,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return studentJsonError(error, "Unable to load assignment");
  }
}
