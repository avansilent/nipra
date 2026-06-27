import { NextResponse } from "next/server";
import { getActiveCourseIds, getStudentRouteContext, studentJsonError } from "../../../../lib/student/onlineClasses";
import { toPublicStudentTest, type StudentTestRow } from "../../../../lib/tests/studentTestAccess";

type QuestionCountRow = {
  test_id: string;
};

type AttemptRow = {
  id: string;
  test_id: string;
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

export async function GET() {
  try {
    const context = await getStudentRouteContext();
    const activeCourseIds = await getActiveCourseIds(context);

    let testsQuery = context.serviceClient
      .from("tests")
      .select("id, institute_id, course_id, title, description, test_date, starts_at, ends_at, duration_minutes, default_marks_per_question, is_published, is_free, audience_scope, created_at, updated_at")
      .eq("institute_id", context.instituteId)
      .eq("is_published", true)
      .order("starts_at", { ascending: true, nullsFirst: false })
      .order("test_date", { ascending: true })
      .limit(50);

    if (activeCourseIds.length > 0) {
      testsQuery = testsQuery.or(`and(is_free.eq.true,audience_scope.eq.all_students),course_id.in.(${activeCourseIds.join(",")})`);
    } else {
      testsQuery = testsQuery.eq("is_free", true).eq("audience_scope", "all_students");
    }

    const { data: tests, error: testsError } = await testsQuery;
    if (testsError) {
      return NextResponse.json({ error: testsError.message }, { status: 500 });
    }

    const testRows = (tests ?? []) as StudentTestRow[];
    const testIds = testRows.map((test) => test.id);
    const courseIds = Array.from(new Set(testRows.map((test) => test.course_id)));

    const [
      { data: questionRows, error: questionError },
      { data: attempts, error: attemptsError },
      { data: courses, error: coursesError },
    ] =
      testIds.length > 0
        ? await Promise.all([
            context.serviceClient
              .from("test_questions")
              .select("test_id")
              .eq("institute_id", context.instituteId)
              .in("test_id", testIds),
            context.serviceClient
              .from("test_attempts")
              .select("id, test_id, status, started_at, submitted_at, score, total_marks, percentage, correct_count, question_count, warning_count")
              .eq("institute_id", context.instituteId)
              .eq("student_id", context.userId)
              .in("test_id", testIds),
            context.serviceClient
              .from("courses")
              .select("id, title")
              .eq("institute_id", context.instituteId)
              .in("id", courseIds),
          ])
        : [
            { data: [], error: null },
            { data: [], error: null },
            { data: [], error: null },
          ];

    const firstError = questionError ?? attemptsError ?? coursesError;
    if (firstError) {
      return NextResponse.json({ error: firstError.message }, { status: 500 });
    }

    const questionCountByTest = new Map<string, number>();
    ((questionRows ?? []) as QuestionCountRow[]).forEach((row) => {
      questionCountByTest.set(row.test_id, (questionCountByTest.get(row.test_id) ?? 0) + 1);
    });
    const attemptByTest = new Map(((attempts ?? []) as AttemptRow[]).map((attempt) => [attempt.test_id, attempt]));
    const courseTitleById = new Map((courses ?? []).map((course) => [course.id, course.title]));

    return NextResponse.json(
      {
        tests: testRows.map((test) =>
          toPublicStudentTest(test, courseTitleById.get(test.course_id), questionCountByTest.get(test.id), attemptByTest.get(test.id))
        ),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return studentJsonError(error, "Unable to load test series");
  }
}
