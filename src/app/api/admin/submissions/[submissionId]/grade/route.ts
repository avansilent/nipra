import { NextResponse } from "next/server";
import { AdminRouteError, getAdminRouteContext } from "../../../../../../lib/admin/route";
import {
  adminJsonError,
  requireUuid,
  stringField,
  type RouteParams,
} from "../../../../../../lib/admin/onlineClasses";

export async function PATCH(request: Request, contextParams: RouteParams<"submissionId">) {
  try {
    const { submissionId } = await contextParams.params;
    const context = await getAdminRouteContext();
    requireUuid(submissionId, "Submission");

    const body = (await request.json()) as Record<string, unknown>;
    const marks = Number(body.marks_obtained ?? body.marksObtained);
    const feedback = stringField(body.feedback) || null;

    if (!Number.isFinite(marks) || marks < 0) {
      return NextResponse.json({ error: "Marks must be 0 or greater" }, { status: 400 });
    }

    const { data: submission, error: submissionError } = await context.serviceClient
      .from("assignment_submissions")
      .select("id, assignment_id, institute_id")
      .eq("id", submissionId)
      .eq("institute_id", context.instituteId)
      .maybeSingle();

    if (submissionError) {
      return NextResponse.json({ error: submissionError.message }, { status: 500 });
    }

    if (!submission) {
      return NextResponse.json({ error: "Submission not found for your institute" }, { status: 404 });
    }

    const { data: assignment, error: assignmentError } = await context.serviceClient
      .from("assignments")
      .select("id, max_marks")
      .eq("id", submission.assignment_id)
      .eq("institute_id", context.instituteId)
      .maybeSingle();

    if (assignmentError) {
      return NextResponse.json({ error: assignmentError.message }, { status: 500 });
    }

    if (!assignment) {
      throw new AdminRouteError("Assignment not found for this submission", 404);
    }

    if (marks > Number(assignment.max_marks)) {
      return NextResponse.json({ error: `Marks cannot exceed ${assignment.max_marks}` }, { status: 400 });
    }

    const { data: updatedSubmission, error: updateError } = await context.serviceClient
      .from("assignment_submissions")
      .update({
        marks_obtained: marks,
        feedback,
        graded_at: new Date().toISOString(),
        graded_by: context.userId,
      })
      .eq("id", submission.id)
      .eq("institute_id", context.instituteId)
      .select("id, assignment_id, student_id, text_response, submitted_at, marks_obtained, feedback, graded_at, graded_by")
      .single();

    if (updateError || !updatedSubmission) {
      return NextResponse.json({ error: updateError?.message ?? "Unable to grade submission" }, { status: 500 });
    }

    return NextResponse.json({ submission: updatedSubmission });
  } catch (error) {
    return adminJsonError(error, "Unable to grade submission");
  }
}
