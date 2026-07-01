import { NextResponse } from "next/server";
import { getStudentRouteContext, studentJsonError, type RouteParams } from "../../../../../lib/student/onlineClasses";
import { getStudentTest, toPublicStudentTest } from "../../../../../lib/tests/studentTestAccess";

export async function GET(_request: Request, contextArg: RouteParams<"testId">) {
  try {
    const context = await getStudentRouteContext();
    const { testId } = await contextArg.params;
    const test = await getStudentTest(context, testId);

    const [{ count, error: questionCountError }, { data: attemptRows, error: attemptError }, { data: course, error: courseError }] =
      await Promise.all([
        context.serviceClient
          .from("test_questions")
          .select("id", { count: "exact", head: true })
          .eq("institute_id", context.instituteId)
          .eq("test_id", test.id),
        context.serviceClient
          .from("test_attempts")
          .select("id, test_id, status, started_at, submitted_at, score, total_marks, percentage, correct_count, question_count, warning_count")
          .eq("institute_id", context.instituteId)
          .eq("student_id", context.userId)
          .eq("test_id", test.id)
          .order("started_at", { ascending: false })
          .limit(1),
        context.serviceClient
          .from("courses")
          .select("id, title")
          .eq("institute_id", context.instituteId)
          .eq("id", test.course_id)
          .maybeSingle(),
      ]);

    const firstError = questionCountError ?? attemptError ?? courseError;
    if (firstError) {
      return NextResponse.json({ error: firstError.message }, { status: 500 });
    }

    const attempt = attemptRows?.[0] ?? null;

    return NextResponse.json(
      {
        test: toPublicStudentTest(test, course?.title ?? null, count ?? 0, attempt),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return studentJsonError(error, "Unable to load test");
  }
}
