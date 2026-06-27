import { NextResponse } from "next/server";
import {
  getStudentRouteContext,
  studentJsonError,
  StudentRouteError,
  type RouteParams,
} from "../../../../../../lib/student/onlineClasses";
import { sanitizeQuestionForStudent, type TestQuestionRow } from "../../../../../../lib/tests/mcq";
import {
  getAttemptEndsAt,
  getStudentTest,
  testAvailability,
  toPublicStudentTest,
} from "../../../../../../lib/tests/studentTestAccess";

type AttemptRow = {
  id: string;
  institute_id: string;
  test_id: string;
  student_id: string;
  status: string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  total_marks: number | null;
  percentage: number | null;
  correct_count: number | null;
  question_count: number | null;
  warning_count: number;
};

export async function POST(_request: Request, contextArg: RouteParams<"testId">) {
  try {
    const context = await getStudentRouteContext();
    const { testId } = await contextArg.params;
    const test = await getStudentTest(context, testId);
    const availability = testAvailability(test);

    if (!availability.available) {
      throw new StudentRouteError(availability.message, 403, availability.code);
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
      throw new StudentRouteError("This test has no questions yet.", 400, "empty_test");
    }

    const { data: existingAttempt, error: existingError } = await context.serviceClient
      .from("test_attempts")
      .select("id, institute_id, test_id, student_id, status, started_at, submitted_at, score, total_marks, percentage, correct_count, question_count, warning_count")
      .eq("institute_id", context.instituteId)
      .eq("test_id", test.id)
      .eq("student_id", context.userId)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    let attempt = existingAttempt as AttemptRow | null;

    if (attempt?.status === "submitted") {
      return NextResponse.json(
        {
          test: toPublicStudentTest(test, null, questionRows.length, attempt),
          attempt,
          questions: [],
          alreadySubmitted: true,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    if (attempt && getAttemptEndsAt(test, attempt.started_at).getTime() <= Date.now()) {
      const { error: expireError } = await context.serviceClient
        .from("test_attempts")
        .update({ status: "expired" })
        .eq("id", attempt.id)
        .eq("institute_id", context.instituteId)
        .select("id");

      if (expireError) {
        return NextResponse.json({ error: expireError.message }, { status: 500 });
      }

      throw new StudentRouteError("Your test time has ended.", 403, "attempt_expired");
    }

    if (!attempt) {
      const { data: insertedAttempt, error: insertError } = await context.serviceClient
        .from("test_attempts")
        .insert({
          institute_id: context.instituteId,
          test_id: test.id,
          student_id: context.userId,
          status: "in_progress",
          question_count: questionRows.length,
        })
        .select("id, institute_id, test_id, student_id, status, started_at, submitted_at, score, total_marks, percentage, correct_count, question_count, warning_count")
        .single();

      if (insertError || !insertedAttempt) {
        return NextResponse.json({ error: insertError?.message ?? "Unable to start test" }, { status: 500 });
      }

      attempt = insertedAttempt as AttemptRow;
    }

    return NextResponse.json(
      {
        test: toPublicStudentTest(test, null, questionRows.length, attempt),
        attempt: {
          ...attempt,
          ends_at: getAttemptEndsAt(test, attempt.started_at).toISOString(),
        },
        questions: questionRows.map(sanitizeQuestionForStudent),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return studentJsonError(error, "Unable to start test");
  }
}
