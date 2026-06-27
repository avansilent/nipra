import { NextResponse } from "next/server";
import {
  getStudentRouteContext,
  studentJsonError,
  StudentRouteError,
  type RouteParams,
} from "../../../../../../lib/student/onlineClasses";
import { normalizeAnswerMap, scoreAnswers, type TestQuestionRow } from "../../../../../../lib/tests/mcq";
import { getStudentTest, toPublicStudentTest } from "../../../../../../lib/tests/studentTestAccess";

type SubmitPayload = {
  answers?: unknown;
};

export async function POST(request: Request, contextArg: RouteParams<"testId">) {
  try {
    const context = await getStudentRouteContext();
    const { testId } = await contextArg.params;
    const test = await getStudentTest(context, testId);
    const body = (await request.json().catch(() => ({}))) as SubmitPayload;
    const answers = normalizeAnswerMap(body.answers);

    const { data: attempt, error: attemptError } = await context.serviceClient
      .from("test_attempts")
      .select("id, status, started_at, submitted_at, warning_count")
      .eq("institute_id", context.instituteId)
      .eq("test_id", test.id)
      .eq("student_id", context.userId)
      .maybeSingle();

    if (attemptError) {
      return NextResponse.json({ error: attemptError.message }, { status: 500 });
    }

    if (!attempt) {
      throw new StudentRouteError("Start the test before submitting answers.", 400, "attempt_missing");
    }

    if (attempt.status === "submitted") {
      throw new StudentRouteError("This test was already submitted.", 409, "already_submitted");
    }

    const { data: questions, error: questionsError } = await context.serviceClient
      .from("test_questions")
      .select("id, institute_id, test_id, prompt, options, correct_option_index, marks, explanation, sort_order")
      .eq("institute_id", context.instituteId)
      .eq("test_id", test.id)
      .order("sort_order", { ascending: true });

    if (questionsError) {
      return NextResponse.json({ error: questionsError.message }, { status: 500 });
    }

    const questionRows = (questions ?? []) as TestQuestionRow[];
    if (questionRows.length === 0) {
      throw new StudentRouteError("This test has no questions.", 400, "empty_test");
    }

    const score = scoreAnswers(questionRows, answers);
    const now = new Date().toISOString();
    const { data: updatedAttempt, error: updateError } = await context.serviceClient
      .from("test_attempts")
      .update({
        status: "submitted",
        submitted_at: now,
        answers,
        score: score.score,
        total_marks: score.totalMarks,
        percentage: score.percentage,
        correct_count: score.correctCount,
        question_count: score.questionCount,
      })
      .eq("id", attempt.id)
      .eq("institute_id", context.instituteId)
      .select("id, test_id, status, started_at, submitted_at, score, total_marks, percentage, correct_count, question_count, warning_count")
      .single();

    if (updateError || !updatedAttempt) {
      return NextResponse.json({ error: updateError?.message ?? "Unable to submit test" }, { status: 500 });
    }

    const { error: resultError } = await context.serviceClient.from("results").upsert(
      {
        student_id: context.userId,
        test_id: test.id,
        institute_id: context.instituteId,
        marks: score.score,
        recorded_at: now,
      },
      { onConflict: "student_id,test_id" }
    );

    if (resultError) {
      return NextResponse.json({ error: resultError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        test: toPublicStudentTest(test, null, questionRows.length, updatedAttempt),
        result: {
          score: score.score,
          totalMarks: score.totalMarks,
          percentage: score.percentage,
          correctCount: score.correctCount,
          questionCount: score.questionCount,
          warningCount: updatedAttempt.warning_count,
          submittedAt: updatedAttempt.submitted_at,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return studentJsonError(error, "Unable to submit test");
  }
}
