import { NextResponse } from "next/server";
import { buildBunnyStreamEmbedUrl, isValidBunnyLibraryId, isValidBunnyVideoId } from "../bunnyStream";
import { getEnrollmentAccessMessage, isEnrollmentAccessActive, type EnrollmentAccessRow } from "../enrollmentAccess";
import { createSupabaseRouteClient } from "../supabase/route";
import { createSupabaseServiceClient } from "../supabase/service";

export class StudentRouteError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export type StudentRouteContext = {
  routeClient: Awaited<ReturnType<typeof createSupabaseRouteClient>>;
  serviceClient: ReturnType<typeof createSupabaseServiceClient>;
  userId: string;
  instituteId: string;
};

export type RouteParams<Key extends string> = {
  params: Promise<Record<Key, string>>;
};

type ClassSession = {
  id: string;
  institute_id: string;
  course_id: string;
  title: string;
  description: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
  live_provider: "google_meet" | "zoom" | "other";
  status: "scheduled" | "live" | "completed" | "cancelled";
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

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

export function studentJsonError(error: unknown, fallback: string) {
  const typedError = error as StudentRouteError;
  return NextResponse.json(
    {
      error: typedError.message ?? fallback,
      code: typedError.code,
    },
    { status: typedError.status ?? 500 }
  );
}

export function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function requireUuid(value: string, label: string) {
  if (!isValidUuid(value)) {
    throw new StudentRouteError(`${label} is invalid`, 400, "invalid_id");
  }
}

function normalizeRole(role?: string | null) {
  return role === "student" || role === "admin" ? role : null;
}

export async function getStudentRouteContext(): Promise<StudentRouteContext> {
  const routeClient = await createSupabaseRouteClient();
  const serviceClient = createSupabaseServiceClient();
  const {
    data: { user },
  } = await routeClient.auth.getUser();

  if (!user) {
    throw new StudentRouteError("Login required.", 401, "unauthorized");
  }

  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("role, institute_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new StudentRouteError(profileError.message, 500);
  }

  let instituteId =
    profile?.institute_id ??
    (user.app_metadata?.institute_id as string | undefined) ??
    null;
  const enrollmentRoleFallback = !instituteId ? "student" : null;

  if (!instituteId) {
    const { data: enrollment, error: enrollmentError } = await serviceClient
      .from("enrollments")
      .select("institute_id")
      .eq("student_id", user.id)
      .limit(1)
      .maybeSingle();

    if (enrollmentError) {
      throw new StudentRouteError(enrollmentError.message, 500);
    }

    instituteId = (enrollment?.institute_id as string | null | undefined) ?? null;
  }

  const role = normalizeRole(profile?.role ?? user.app_metadata?.role ?? enrollmentRoleFallback);

  if (role !== "student") {
    throw new StudentRouteError("Student access required.", 403, "student_required");
  }

  if (!instituteId) {
    throw new StudentRouteError("Student institute is not assigned.", 403, "institute_missing");
  }

  return {
    routeClient,
    serviceClient,
    userId: user.id,
    instituteId,
  };
}

export async function getActiveCourseIds(context: StudentRouteContext) {
  const { data: enrollments, error } = await context.serviceClient
    .from("enrollments")
    .select("course_id, access_status, payment_status, access_ends_at, payment_due_at, last_payment_at")
    .eq("student_id", context.userId)
    .eq("institute_id", context.instituteId);

  if (error) {
    throw new StudentRouteError(error.message, 500);
  }

  return (enrollments ?? [])
    .filter((enrollment) => isEnrollmentAccessActive(enrollment as EnrollmentAccessRow))
    .map((enrollment) => enrollment.course_id as string);
}

export async function ensureActiveEnrollment(context: StudentRouteContext, courseId: string) {
  requireUuid(courseId, "Course");

  const { data: enrollment, error } = await context.serviceClient
    .from("enrollments")
    .select("*")
    .eq("student_id", context.userId)
    .eq("course_id", courseId)
    .eq("institute_id", context.instituteId)
    .maybeSingle();

  if (error) {
    throw new StudentRouteError(error.message, 500);
  }

  if (!enrollment) {
    throw new StudentRouteError("This course is not assigned to this student.", 403, "not_enrolled");
  }

  if (!isEnrollmentAccessActive(enrollment as EnrollmentAccessRow)) {
    throw new StudentRouteError(getEnrollmentAccessMessage(enrollment as EnrollmentAccessRow), 403, "access_inactive");
  }

  return enrollment;
}

export async function getStudentSession(context: StudentRouteContext, sessionId: string) {
  requireUuid(sessionId, "Session");

  const { data: session, error } = await context.serviceClient
    .from("class_sessions")
    .select("id, institute_id, course_id, title, description, session_date, start_time, end_time, live_provider, status, sort_order, created_at, updated_at")
    .eq("id", sessionId)
    .eq("institute_id", context.instituteId)
    .maybeSingle();

  if (error) {
    throw new StudentRouteError(error.message, 500);
  }

  if (!session) {
    throw new StudentRouteError("Class session not found.", 404, "session_not_found");
  }

  const typedSession = session as ClassSession;
  await ensureActiveEnrollment(context, typedSession.course_id);

  return typedSession;
}

export async function getStudentAssignment(context: StudentRouteContext, assignmentId: string) {
  requireUuid(assignmentId, "Assignment");

  const { data: assignment, error } = await context.serviceClient
    .from("assignments")
    .select("id, institute_id, session_id, course_id, title, description, instructions, file_path, due_date, max_marks, is_published, created_at, updated_at")
    .eq("id", assignmentId)
    .eq("institute_id", context.instituteId)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    throw new StudentRouteError(error.message, 500);
  }

  if (!assignment) {
    throw new StudentRouteError("Assignment not found.", 404, "assignment_not_found");
  }

  const typedAssignment = assignment as AssignmentRow;
  await ensureActiveEnrollment(context, typedAssignment.course_id);

  return typedAssignment;
}

export function toIstDate(dateValue: string, timeValue: string) {
  const normalizedTime = timeValue.length === 5 ? `${timeValue}:00` : timeValue;
  return new Date(`${dateValue}T${normalizedTime}+05:30`);
}

export function getComputedJoinWindow(session: Pick<ClassSession, "session_date" | "start_time" | "end_time">) {
  return {
    opensAt: new Date(toIstDate(session.session_date, session.start_time).getTime() - 10 * 60 * 1000),
    closesAt: new Date(toIstDate(session.session_date, session.end_time).getTime() + 30 * 60 * 1000),
  };
}

export function assertSessionJoinAllowed(
  session: ClassSession,
  meetingLink?: { join_window_opens_at?: string | null; join_window_closes_at?: string | null } | null,
  now = new Date()
) {
  if (session.status !== "live") {
    throw new StudentRouteError("Class is not live right now.", 403, "not_live");
  }

  const computedWindow = getComputedJoinWindow(session);
  const opensAt = meetingLink?.join_window_opens_at ? new Date(meetingLink.join_window_opens_at) : computedWindow.opensAt;
  const closesAt = meetingLink?.join_window_closes_at ? new Date(meetingLink.join_window_closes_at) : computedWindow.closesAt;

  if (now < opensAt) {
    throw new StudentRouteError("Class has not opened yet.", 403, "not_open");
  }

  if (now > closesAt) {
    throw new StudentRouteError("Class join window has ended.", 403, "session_ended");
  }
}

export async function createSignedMaterialUrl(context: StudentRouteContext, filePath: string | null | undefined) {
  if (!filePath) {
    return null;
  }

  const { data, error } = await context.serviceClient.storage.from("materials").createSignedUrl(filePath, 60 * 60);
  if (error || !data?.signedUrl) {
    throw new StudentRouteError(error?.message ?? "Unable to create secure material link.", 500);
  }

  return data.signedUrl;
}

export function getStoredFilePath(row: unknown) {
  return (row as { file_path?: string | null } | null | undefined)?.file_path ?? null;
}

export function toPublicSession(session: ClassSession, courseTitle?: string | null) {
  return {
    id: session.id,
    course_id: session.course_id,
    course_title: courseTitle ?? null,
    title: session.title,
    description: session.description,
    session_date: session.session_date,
    start_time: session.start_time,
    end_time: session.end_time,
    live_provider: session.live_provider,
    status: session.status,
    sort_order: session.sort_order,
  };
}

function getSubmissionStatus(submission?: Record<string, unknown> | null) {
  if (!submission) {
    return "not_submitted";
  }

  if (
    submission.graded_at ||
    (submission.marks_obtained !== null && typeof submission.marks_obtained !== "undefined")
  ) {
    return "graded";
  }

  return "submitted";
}

export function toPublicAssignment(assignment: AssignmentRow, submission?: Record<string, unknown> | null, courseTitle?: string | null) {
  return {
    id: assignment.id,
    session_id: assignment.session_id,
    course_id: assignment.course_id,
    course_title: courseTitle ?? null,
    title: assignment.title,
    description: assignment.description,
    instructions: assignment.instructions,
    due_date: assignment.due_date,
    max_marks: assignment.max_marks,
    is_published: assignment.is_published,
    hasFile: Boolean(assignment.file_path),
    submission_status: getSubmissionStatus(submission),
    submission: submission
      ? {
          id: submission.id,
          submitted_at: submission.submitted_at,
          marks_obtained: submission.marks_obtained,
          feedback: submission.feedback,
          graded_at: submission.graded_at,
          hasFile: Boolean(getStoredFilePath(submission)),
        }
      : null,
  };
}

export function assertValidSubmissionFile(file: File) {
  const allowedMimeTypes = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]);
  const allowedExtensions = /\.(pdf|jpe?g|png|docx)$/i;

  if (!allowedMimeTypes.has(file.type) && !allowedExtensions.test(file.name)) {
    throw new StudentRouteError("Only PDF, JPG, PNG, or DOCX files are allowed.", 400, "invalid_file_type");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new StudentRouteError("Submission file must be 10MB or smaller.", 400, "file_too_large");
  }
}

export function toSafeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function getSafeFileExtension(name: string, fallbackExtension = "") {
  const match = name.toLowerCase().match(/(\.[a-z0-9]{1,10})$/);

  return match?.[1] ?? fallbackExtension;
}

export async function ensureSubmissionBucket(context: StudentRouteContext) {
  const { data: bucket } = await context.serviceClient.storage.getBucket("materials");
  if (!bucket) {
    await context.serviceClient.storage.createBucket("materials", { public: false });
  }
}

export async function uploadSubmissionFile(context: StudentRouteContext, assignmentId: string, file: File) {
  await ensureSubmissionBucket(context);
  const baseName = toSafeFileName(file.name.replace(/\.[a-z0-9]{1,10}$/i, "") || "submission");
  const storagePath = `submissions/${assignmentId}/${context.userId}/${Date.now()}-${baseName}${getSafeFileExtension(file.name)}`;
  const { error } = await context.serviceClient.storage.from("materials").upload(storagePath, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    throw new StudentRouteError(error.message, 500);
  }

  return storagePath;
}

export async function removeSubmissionFile(context: StudentRouteContext, filePath: string | null | undefined) {
  if (filePath) {
    await context.serviceClient.storage.from("materials").remove([filePath]);
  }
}

export function buildRecordingEmbedUrl(recording: { recording_provider?: string | null; bunny_library_id?: string | null; bunny_video_id?: string | null; external_url?: string | null }) {
  if (recording.recording_provider === "external_link" && recording.external_url) {
    return recording.external_url;
  }

  if (
    recording.bunny_library_id &&
    recording.bunny_video_id &&
    isValidBunnyLibraryId(recording.bunny_library_id) &&
    isValidBunnyVideoId(recording.bunny_video_id)
  ) {
    return buildBunnyStreamEmbedUrl({
      libraryId: recording.bunny_library_id,
      videoId: recording.bunny_video_id,
    });
  }

  return null;
}
