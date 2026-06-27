import { getEnrollmentAccessMessage, isEnrollmentAccessActive, type EnrollmentAccessRow } from "../enrollmentAccess";
import { requireUuid, StudentRouteError, type StudentRouteContext } from "../student/onlineClasses";
import type { TestAudienceScope } from "./mcq";

export type StudentTestRow = {
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
  audience_scope: TestAudienceScope;
  created_at?: string;
  updated_at?: string;
};

export function testAvailability(test: Pick<StudentTestRow, "starts_at" | "ends_at" | "is_published">, now = Date.now()) {
  if (!test.is_published) {
    return { available: false, code: "not_published", message: "This test is not published yet." };
  }

  const startsAt = test.starts_at ? new Date(test.starts_at).getTime() : null;
  const endsAt = test.ends_at ? new Date(test.ends_at).getTime() : null;

  if (startsAt !== null && now < startsAt) {
    return { available: false, code: "not_started", message: "This test has not opened yet." };
  }

  if (endsAt !== null && now > endsAt) {
    return { available: false, code: "ended", message: "This test has ended." };
  }

  return { available: true, code: "available", message: "Test is available." };
}

export async function getStudentTest(context: StudentRouteContext, testId: string) {
  requireUuid(testId, "Test");

  const { data: test, error } = await context.serviceClient
    .from("tests")
    .select("id, institute_id, course_id, title, description, test_date, starts_at, ends_at, duration_minutes, default_marks_per_question, is_published, is_free, audience_scope, created_at, updated_at")
    .eq("id", testId)
    .eq("institute_id", context.instituteId)
    .maybeSingle();

  if (error) {
    throw new StudentRouteError(error.message, 500);
  }

  if (!test) {
    throw new StudentRouteError("Test not found.", 404, "test_not_found");
  }

  const typedTest = test as StudentTestRow;
  if (!typedTest.is_published) {
    throw new StudentRouteError("This test is not published yet.", 404, "test_not_found");
  }

  if (!(typedTest.is_free && typedTest.audience_scope === "all_students")) {
    const { data: enrollment, error: enrollmentError } = await context.serviceClient
      .from("enrollments")
      .select("*")
      .eq("student_id", context.userId)
      .eq("course_id", typedTest.course_id)
      .eq("institute_id", context.instituteId)
      .maybeSingle();

    if (enrollmentError) {
      throw new StudentRouteError(enrollmentError.message, 500);
    }

    if (!enrollment) {
      throw new StudentRouteError("This test belongs to a course not assigned to this student.", 403, "not_enrolled");
    }

    if (!isEnrollmentAccessActive(enrollment as EnrollmentAccessRow)) {
      throw new StudentRouteError(getEnrollmentAccessMessage(enrollment as EnrollmentAccessRow), 403, "access_inactive");
    }
  }

  return typedTest;
}

export function getAttemptEndsAt(test: Pick<StudentTestRow, "duration_minutes">, startedAt: string) {
  return new Date(new Date(startedAt).getTime() + Number(test.duration_minutes ?? 30) * 60 * 1000);
}

export function toPublicStudentTest(test: StudentTestRow, courseTitle?: string | null, questionCount?: number, attempt?: Record<string, unknown> | null) {
  const availability = testAvailability(test);

  return {
    id: test.id,
    course_id: test.course_id,
    course_title: courseTitle ?? null,
    title: test.title,
    description: test.description,
    test_date: test.test_date,
    starts_at: test.starts_at,
    ends_at: test.ends_at,
    duration_minutes: test.duration_minutes,
    is_free: test.is_free,
    audience_scope: test.audience_scope,
    question_count: questionCount ?? 0,
    availability,
    attempt: attempt
      ? {
          id: attempt.id,
          status: attempt.status,
          started_at: attempt.started_at,
          submitted_at: attempt.submitted_at,
          score: attempt.score,
          total_marks: attempt.total_marks,
          percentage: attempt.percentage,
          correct_count: attempt.correct_count,
          question_count: attempt.question_count,
          warning_count: attempt.warning_count,
        }
      : null,
  };
}
