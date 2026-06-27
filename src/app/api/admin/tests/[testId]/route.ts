import { NextResponse } from "next/server";
import { AdminRouteError, getAdminRouteContext, type AdminRouteContext } from "../../../../../lib/admin/route";
import { revalidateAdminContent } from "../../../../../lib/cacheInvalidation";
import {
  booleanField,
  normalizeAudienceScope,
  normalizeQuestionsInput,
  numberField,
  stringField,
  type TestAudienceScope,
  type NormalizedTestQuestion,
} from "../../../../../lib/tests/mcq";

type RouteContext = {
  params: Promise<{ testId: string }>;
};

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
  audienceScope?: unknown;
  audience_scope?: unknown;
  questions?: unknown;
};

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function requireTestId(value: string) {
  if (!isValidUuid(value)) {
    throw new AdminRouteError("Test is invalid", 400);
  }
}

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

async function getAdminTest(context: AdminRouteContext, testId: string) {
  requireTestId(testId);

  const { data: test, error } = await context.serviceClient
    .from("tests")
    .select("id, institute_id, course_id, title, description, test_date, starts_at, ends_at, duration_minutes, default_marks_per_question, is_published, is_free, audience_scope, created_at, updated_at")
    .eq("id", testId)
    .eq("institute_id", context.instituteId)
    .maybeSingle();

  if (error) {
    throw new AdminRouteError(error.message, 500);
  }

  if (!test) {
    throw new AdminRouteError("Test not found for this institute", 404);
  }

  return test;
}

async function ensureCourse(context: AdminRouteContext, courseId: string) {
  if (!courseId) {
    throw new AdminRouteError("Course is required", 400);
  }

  const { data: course, error } = await context.serviceClient
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("institute_id", context.instituteId)
    .maybeSingle();

  if (error) {
    throw new AdminRouteError(error.message, 500);
  }

  if (!course) {
    throw new AdminRouteError("Course not found for this institute", 404);
  }
}

function normalizeTestPayload(body: TestPayload) {
  const title = stringField(body.title);
  const courseId = stringField(body.courseId ?? body.course_id);
  const durationMinutes = Math.trunc(numberField(body.durationMinutes ?? body.duration_minutes, 30));
  const defaultMarks = numberField(body.defaultMarksPerQuestion ?? body.default_marks_per_question, 1);
  const startsAt = parseAdminDateTime(body.startsAt ?? body.starts_at, "Start time", true);
  const endsAt = parseAdminDateTime(body.endsAt ?? body.ends_at, "End time");
  const isFree = booleanField(body.isFree ?? body.is_free, true);
  const audienceScope: TestAudienceScope = isFree
    ? normalizeAudienceScope(body.audienceScope ?? body.audience_scope, "all_students")
    : "course_students";

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
      is_free: isFree,
      audience_scope: audienceScope,
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

export async function GET(_request: Request, contextArg: RouteContext) {
  try {
    const context = await getAdminRouteContext();
    const { testId } = await contextArg.params;
    const test = await getAdminTest(context, testId);

    const [{ data: questions, error: questionsError }, { data: attempts, error: attemptsError }] = await Promise.all([
      context.serviceClient
        .from("test_questions")
        .select("id, institute_id, test_id, prompt, options, correct_option_index, marks, explanation, sort_order")
        .eq("test_id", testId)
        .eq("institute_id", context.instituteId)
        .order("sort_order", { ascending: true }),
      context.serviceClient
        .from("test_attempts")
        .select("id, test_id, student_id, status, score, total_marks, percentage, correct_count, question_count, warning_count, warning_events, started_at, submitted_at")
        .eq("test_id", testId)
        .eq("institute_id", context.instituteId)
        .order("started_at", { ascending: false }),
    ]);

    const firstError = questionsError ?? attemptsError;
    if (firstError) {
      return NextResponse.json({ error: firstError.message }, { status: 500 });
    }

    const studentIds = Array.from(new Set((attempts ?? []).map((attempt) => attempt.student_id).filter(Boolean)));
    const { data: students, error: studentsError } =
      studentIds.length > 0
        ? await context.serviceClient.from("users").select("id, name, email, phone, login_id").in("id", studentIds)
        : { data: [], error: null };

    if (studentsError) {
      return NextResponse.json({ error: studentsError.message }, { status: 500 });
    }

    const studentById = new Map((students ?? []).map((student) => [student.id, student]));

    return NextResponse.json({
      test,
      questions: questions ?? [],
      attempts: (attempts ?? []).map((attempt) => ({
        ...attempt,
        student: studentById.get(attempt.student_id) ?? null,
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const typedError = error as AdminRouteError;
    return NextResponse.json({ error: typedError.message ?? "Unable to load test" }, { status: typedError.status ?? 500 });
  }
}

export async function PATCH(request: Request, contextArg: RouteContext) {
  try {
    const context = await getAdminRouteContext();
    const { testId } = await contextArg.params;
    await getAdminTest(context, testId);

    const body = (await request.json().catch(() => ({}))) as TestPayload;
    const payload = normalizeTestPayload(body);
    await ensureCourse(context, payload.test.course_id);

    const { error: updateError } = await context.serviceClient
      .from("tests")
      .update(payload.test)
      .eq("id", testId)
      .eq("institute_id", context.instituteId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await replaceQuestions(context, testId, payload.questions);
    revalidateAdminContent("learning");

    return NextResponse.json({ ok: true });
  } catch (error) {
    const typedError = error as AdminRouteError;
    return NextResponse.json({ error: typedError.message ?? "Unable to update test" }, { status: typedError.status ?? 500 });
  }
}

export async function DELETE(_request: Request, contextArg: RouteContext) {
  try {
    const context = await getAdminRouteContext();
    const { testId } = await contextArg.params;
    await getAdminTest(context, testId);

    const { error } = await context.serviceClient
      .from("tests")
      .delete()
      .eq("id", testId)
      .eq("institute_id", context.instituteId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidateAdminContent("learning");

    return NextResponse.json({ ok: true });
  } catch (error) {
    const typedError = error as AdminRouteError;
    return NextResponse.json({ error: typedError.message ?? "Unable to delete test" }, { status: typedError.status ?? 500 });
  }
}
