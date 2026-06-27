import { NextResponse } from "next/server";
import { AdminRouteError, getAdminRouteContext, type AdminRouteContext } from "../../../../lib/admin/route";
import { revalidateAdminContent } from "../../../../lib/cacheInvalidation";
import {
  booleanField,
  normalizeQuestionsInput,
  numberField,
  stringField,
  type NormalizedTestQuestion,
} from "../../../../lib/tests/mcq";

type TestPayload = {
  title?: unknown;
  description?: unknown;
  courseId?: unknown;
  course_id?: unknown;
  startsAt?: unknown;
  starts_at?: unknown;
  endsAt?: unknown;
  ends_at?: unknown;
  durationMinutes?: unknown;
  duration_minutes?: unknown;
  defaultMarksPerQuestion?: unknown;
  default_marks_per_question?: unknown;
  isPublished?: unknown;
  is_published?: unknown;
  isFree?: unknown;
  is_free?: unknown;
  questions?: unknown;
};

type TestRow = {
  id: string;
  institute_id: string;
  course_id: string;
  title: string;
  description: string | null;
  test_date: string;
  starts_at: string | null;
  ends_at: string | null;
  duration_minutes: number;
  default_marks_per_question: number;
  is_published: boolean;
  is_free: boolean;
  created_at?: string;
  updated_at?: string;
};

type QuestionRow = {
  id: string;
  institute_id: string;
  test_id: string;
  prompt: string;
  options: string[];
  correct_option_index: number;
  marks: number;
  explanation: string | null;
  sort_order: number;
};

type AttemptRow = {
  id: string;
  test_id: string;
  student_id: string;
  status: string;
  score: number | null;
  total_marks: number | null;
  percentage: number | null;
  warning_count: number;
  started_at: string;
  submitted_at: string | null;
};

function parseAdminDateTime(value: unknown, label: string, required = false) {
  const text = stringField(value);
  if (!text) {
    if (required) {
      throw new AdminRouteError(`${label} is required`, 400);
    }
    return null;
  }

  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(text)
    ? `${text.length === 16 ? `${text}:00` : text}+05:30`
    : text;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    throw new AdminRouteError(`${label} is invalid`, 400);
  }

  return date.toISOString();
}

function testDateFromStart(startsAt: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(startsAt));
}

async function ensureCourse(context: AdminRouteContext, courseId: string) {
  if (!courseId) {
    throw new AdminRouteError("Course is required", 400);
  }

  const { data: course, error } = await context.serviceClient
    .from("courses")
    .select("id, title")
    .eq("id", courseId)
    .eq("institute_id", context.instituteId)
    .maybeSingle();

  if (error) {
    throw new AdminRouteError(error.message, 500);
  }

  if (!course) {
    throw new AdminRouteError("Course not found for this institute", 404);
  }

  return course;
}

function normalizeTestPayload(body: TestPayload) {
  const title = stringField(body.title);
  const courseId = stringField(body.courseId ?? body.course_id);
  const durationMinutes = Math.trunc(numberField(body.durationMinutes ?? body.duration_minutes, 30));
  const defaultMarks = numberField(body.defaultMarksPerQuestion ?? body.default_marks_per_question, 1);
  const startsAt = parseAdminDateTime(body.startsAt ?? body.starts_at, "Start time", true);
  const endsAt = parseAdminDateTime(body.endsAt ?? body.ends_at, "End time");

  if (!title) {
    throw new AdminRouteError("Test title is required", 400);
  }

  if (durationMinutes < 1 || durationMinutes > 360) {
    throw new AdminRouteError("Duration must be between 1 and 360 minutes", 400);
  }

  if (defaultMarks <= 0 || defaultMarks > 100) {
    throw new AdminRouteError("Default marks must be between 1 and 100", 400);
  }

  if (!startsAt) {
    throw new AdminRouteError("Start time is required", 400);
  }

  if (endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    throw new AdminRouteError("End time must be after start time", 400);
  }

  const questions = normalizeQuestionsInput(body.questions, defaultMarks);

  return {
    test: {
      course_id: courseId,
      title,
      description: stringField(body.description) || null,
      starts_at: startsAt,
      ends_at: endsAt,
      test_date: testDateFromStart(startsAt),
      duration_minutes: durationMinutes,
      default_marks_per_question: Math.round(defaultMarks * 100) / 100,
      is_published: booleanField(body.isPublished ?? body.is_published, false),
      is_free: booleanField(body.isFree ?? body.is_free, true),
    },
    questions,
  };
}

async function replaceQuestions(context: AdminRouteContext, testId: string, questions: NormalizedTestQuestion[]) {
  const { error: deleteError } = await context.serviceClient
    .from("test_questions")
    .delete()
    .eq("test_id", testId)
    .eq("institute_id", context.instituteId);

  if (deleteError) {
    throw new AdminRouteError(deleteError.message, 500);
  }

  const { error: insertError } = await context.serviceClient.from("test_questions").insert(
    questions.map((question, index) => ({
      ...question,
      institute_id: context.instituteId,
      test_id: testId,
      sort_order: index,
    }))
  );

  if (insertError) {
    throw new AdminRouteError(insertError.message, 500);
  }
}

function groupQuestions(questions: QuestionRow[]) {
  const grouped = new Map<string, QuestionRow[]>();
  questions.forEach((question) => {
    grouped.set(question.test_id, [...(grouped.get(question.test_id) ?? []), question]);
  });
  return grouped;
}

function summarizeAttempts(attempts: AttemptRow[]) {
  const grouped = new Map<string, AttemptRow[]>();
  attempts.forEach((attempt) => {
    grouped.set(attempt.test_id, [...(grouped.get(attempt.test_id) ?? []), attempt]);
  });

  return grouped;
}

export async function GET() {
  try {
    const context = await getAdminRouteContext();
    const { data: tests, error: testsError } = await context.serviceClient
      .from("tests")
      .select("id, institute_id, course_id, title, description, test_date, starts_at, ends_at, duration_minutes, default_marks_per_question, is_published, is_free, created_at, updated_at")
      .eq("institute_id", context.instituteId)
      .order("starts_at", { ascending: false, nullsFirst: false })
      .order("test_date", { ascending: false });

    if (testsError) {
      return NextResponse.json({ error: testsError.message }, { status: 500 });
    }

    const testRows = (tests ?? []) as TestRow[];
    const testIds = testRows.map((test) => test.id);

    const [{ data: questions, error: questionsError }, { data: attempts, error: attemptsError }, { data: courses, error: coursesError }] =
      testIds.length > 0
        ? await Promise.all([
            context.serviceClient
              .from("test_questions")
              .select("id, institute_id, test_id, prompt, options, correct_option_index, marks, explanation, sort_order")
              .eq("institute_id", context.instituteId)
              .in("test_id", testIds)
              .order("sort_order", { ascending: true }),
            context.serviceClient
              .from("test_attempts")
              .select("id, test_id, student_id, status, score, total_marks, percentage, warning_count, started_at, submitted_at")
              .eq("institute_id", context.instituteId)
              .in("test_id", testIds)
              .order("started_at", { ascending: false }),
            context.serviceClient
              .from("courses")
              .select("id, title")
              .eq("institute_id", context.instituteId),
          ])
        : [
            { data: [], error: null },
            { data: [], error: null },
            { data: [], error: null },
          ];

    const firstError = questionsError ?? attemptsError ?? coursesError;
    if (firstError) {
      return NextResponse.json({ error: firstError.message }, { status: 500 });
    }

    const questionsByTest = groupQuestions((questions ?? []) as QuestionRow[]);
    const attemptsByTest = summarizeAttempts((attempts ?? []) as AttemptRow[]);
    const courseTitleById = new Map((courses ?? []).map((course) => [course.id, course.title]));

    return NextResponse.json({
      tests: testRows.map((test) => {
        const testAttempts = attemptsByTest.get(test.id) ?? [];
        const submittedAttempts = testAttempts.filter((attempt) => attempt.status === "submitted");
        const averageScore =
          submittedAttempts.length > 0
            ? Math.round(
                submittedAttempts.reduce((sum, attempt) => sum + Number(attempt.score ?? 0), 0) /
                  submittedAttempts.length *
                  100
              ) / 100
            : null;

        return {
          ...test,
          course_title: courseTitleById.get(test.course_id) ?? null,
          questions: questionsByTest.get(test.id) ?? [],
          attempt_summary: {
            total: testAttempts.length,
            submitted: submittedAttempts.length,
            in_progress: testAttempts.filter((attempt) => attempt.status === "in_progress").length,
            warnings: testAttempts.reduce((sum, attempt) => sum + Number(attempt.warning_count ?? 0), 0),
            average_score: averageScore,
          },
        };
      }),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const typedError = error as AdminRouteError;
    return NextResponse.json({ error: typedError.message ?? "Unable to load test series" }, { status: typedError.status ?? 500 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAdminRouteContext();
    const body = (await request.json().catch(() => ({}))) as TestPayload;
    const payload = normalizeTestPayload(body);

    await ensureCourse(context, payload.test.course_id);

    const { data: test, error: insertError } = await context.serviceClient
      .from("tests")
      .insert({
        ...payload.test,
        institute_id: context.instituteId,
      })
      .select("id")
      .single();

    if (insertError || !test) {
      return NextResponse.json({ error: insertError?.message ?? "Unable to create test" }, { status: 500 });
    }

    await replaceQuestions(context, test.id, payload.questions);
    revalidateAdminContent("learning");

    return NextResponse.json({ ok: true, testId: test.id });
  } catch (error) {
    const typedError = error as AdminRouteError;
    return NextResponse.json({ error: typedError.message ?? "Unable to create test" }, { status: typedError.status ?? 500 });
  }
}
