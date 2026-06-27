import { NextResponse } from "next/server";
import { createSignedStorageUrl, deleteR2Objects, toR2ObjectReference, uploadR2File } from "../r2Storage";
import type { AdminRouteContext } from "./route";
import { AdminRouteError } from "./route";

export type LiveProvider = "google_meet" | "zoom" | "other";
export type SessionStatus = "scheduled" | "live" | "completed" | "cancelled";
export type MaterialType = "note" | "book" | "link" | "pdf";

export type RouteParams<Key extends string> = {
  params: Promise<Record<Key, string>>;
};

type MeetingPayload = {
  provider?: unknown;
  joinUrl?: unknown;
  join_url?: unknown;
  hostUrl?: unknown;
  host_url?: unknown;
  meetingId?: unknown;
  meeting_id?: unknown;
  passcode?: unknown;
};

type SessionLike = {
  id: string;
  course_id: string;
  institute_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  status: SessionStatus;
};

export function adminJsonError(error: unknown, fallback: string) {
  const typedError = error as AdminRouteError;
  return NextResponse.json(
    { error: typedError.message ?? fallback },
    { status: typedError.status ?? 500 }
  );
}

export function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function nullableStringField(value: unknown) {
  const nextValue = stringField(value);
  return nextValue || null;
}

export function numberField(value: unknown, fallback = 0) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : fallback;
}

export function normalizeLiveProvider(value: unknown): LiveProvider {
  const provider = stringField(value);
  if (provider === "google_meet" || provider === "zoom" || provider === "other") {
    return provider;
  }

  return "other";
}

export function normalizeSessionStatus(value: unknown): SessionStatus | null {
  const status = stringField(value);
  if (status === "scheduled" || status === "live" || status === "completed" || status === "cancelled") {
    return status;
  }

  return null;
}

export function normalizeMaterialType(value: unknown): MaterialType {
  const type = stringField(value);
  if (type === "book" || type === "link" || type === "pdf") {
    return type;
  }

  return "note";
}

export function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function requireUuid(value: string, label: string) {
  if (!isValidUuid(value)) {
    throw new AdminRouteError(`${label} is invalid`, 400);
  }
}

export function requireDate(value: string, label = "Date") {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00+05:30`))) {
    throw new AdminRouteError(`${label} is invalid`, 400);
  }
}

export function requireTime(value: string, label = "Time") {
  if (!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) {
    throw new AdminRouteError(`${label} is invalid`, 400);
  }
}

export function requireSessionTimes(sessionDate: string, startTime: string, endTime: string) {
  requireDate(sessionDate, "Session date");
  requireTime(startTime, "Start time");
  requireTime(endTime, "End time");

  if (toIstDate(sessionDate, endTime).getTime() <= toIstDate(sessionDate, startTime).getTime()) {
    throw new AdminRouteError("End time must be after start time", 400);
  }
}

export function toIstDate(dateValue: string, timeValue: string) {
  const normalizedTime = timeValue.length === 5 ? `${timeValue}:00` : timeValue;
  return new Date(`${dateValue}T${normalizedTime}+05:30`);
}

export function getSessionJoinWindow(sessionDate: string, startTime: string, endTime: string) {
  const opensAt = new Date(toIstDate(sessionDate, startTime).getTime() - 10 * 60 * 1000);
  const closesAt = new Date(toIstDate(sessionDate, endTime).getTime() + 30 * 60 * 1000);

  return {
    join_window_opens_at: opensAt.toISOString(),
    join_window_closes_at: closesAt.toISOString(),
  };
}

export function safeUrl(value: unknown, _provider: LiveProvider, required = false) {
  const nextValue = stringField(value);
  if (!nextValue) {
    if (required) {
      throw new AdminRouteError("Meeting link is required", 400);
    }

    return null;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(nextValue);
  } catch {
    throw new AdminRouteError("Meeting link must be a valid URL", 400);
  }

  if (parsedUrl.protocol !== "https:") {
    throw new AdminRouteError("Meeting link must use HTTPS", 400);
  }

  return parsedUrl.toString();
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

export async function ensureAdminCourse(context: AdminRouteContext, courseId: string) {
  requireUuid(courseId, "Course");

  const { data: course, error } = await context.serviceClient
    .from("courses")
    .select("id, title, mode, institute_id")
    .eq("id", courseId)
    .eq("institute_id", context.instituteId)
    .maybeSingle();

  if (error) {
    throw new AdminRouteError(error.message, 500);
  }

  if (!course) {
    throw new AdminRouteError("Course not found for your institute", 404);
  }

  return course;
}

export async function getAdminSession(context: AdminRouteContext, sessionId: string) {
  requireUuid(sessionId, "Session");

  const { data: session, error } = await context.serviceClient
    .from("class_sessions")
    .select("id, institute_id, course_id, title, description, session_date, start_time, end_time, live_provider, status, sort_order, created_at, updated_at")
    .eq("id", sessionId)
    .eq("institute_id", context.instituteId)
    .maybeSingle();

  if (error) {
    throw new AdminRouteError(error.message, 500);
  }

  if (!session) {
    throw new AdminRouteError("Session not found for your institute", 404);
  }

  return session as SessionLike & {
    title: string;
    description: string | null;
    live_provider: LiveProvider;
    sort_order: number;
    created_at: string;
    updated_at: string;
  };
}

export async function getAdminAssignment(context: AdminRouteContext, assignmentId: string) {
  requireUuid(assignmentId, "Assignment");

  const { data: assignment, error } = await context.serviceClient
    .from("assignments")
    .select("id, institute_id, session_id, course_id, title, description, instructions, file_path, due_date, max_marks, is_published, created_at, updated_at")
    .eq("id", assignmentId)
    .eq("institute_id", context.instituteId)
    .maybeSingle();

  if (error) {
    throw new AdminRouteError(error.message, 500);
  }

  if (!assignment) {
    throw new AdminRouteError("Assignment not found for your institute", 404);
  }

  return assignment;
}

export function publicSessionColumns() {
  return "id, institute_id, course_id, title, description, session_date, start_time, end_time, live_provider, status, sort_order, created_at, updated_at";
}

export function publicMaterialColumns() {
  return "id, institute_id, session_id, material_type, title, description, external_url, visible_from, sort_order, created_at";
}

export function publicAssignmentColumns() {
  return "id, institute_id, session_id, course_id, title, description, instructions, due_date, max_marks, is_published, created_at, updated_at";
}

export function toPublicAssignment(assignment: unknown) {
  const { file_path: filePath, ...safeAssignment } = assignment as Record<string, unknown> & { file_path?: string | null };
  return {
    ...safeAssignment,
    hasFile: Boolean(filePath),
  };
}

export function toPublicMaterial(material: unknown) {
  const { file_path: filePath, ...safeMaterial } = material as Record<string, unknown> & { file_path?: string | null };
  return {
    ...safeMaterial,
    hasFile: Boolean(filePath),
  };
}

export function getStoredFilePath(row: unknown) {
  return (row as { file_path?: string | null } | null | undefined)?.file_path ?? null;
}

export function getMeetingPayload(body: Record<string, unknown>) {
  const meeting = (body.meeting && typeof body.meeting === "object" ? body.meeting : {}) as MeetingPayload;
  const provider = normalizeLiveProvider(body.live_provider ?? body.provider ?? meeting.provider);

  return {
    provider,
    joinUrl: body.join_url ?? body.joinUrl ?? meeting.join_url ?? meeting.joinUrl,
    hostUrl: body.host_url ?? body.hostUrl ?? meeting.host_url ?? meeting.hostUrl,
    meetingId: body.meeting_id ?? body.meetingId ?? meeting.meeting_id ?? meeting.meetingId,
    passcode: body.passcode ?? meeting.passcode,
  };
}

export async function upsertMeetingLink(
  context: AdminRouteContext,
  session: SessionLike,
  payload: ReturnType<typeof getMeetingPayload>,
  requireJoinUrl = false
) {
  const joinUrl = safeUrl(payload.joinUrl, payload.provider, requireJoinUrl);
  const hostUrl = safeUrl(payload.hostUrl, payload.provider);

  if (!joinUrl && !hostUrl && !stringField(payload.meetingId) && !stringField(payload.passcode)) {
    return null;
  }

  if (!joinUrl) {
    throw new AdminRouteError("Student live stream is required when saving live details", 400);
  }

  const { data: meetingLink, error } = await context.serviceClient
    .from("class_session_meeting_links")
    .upsert(
      {
        institute_id: context.instituteId,
        session_id: session.id,
        provider: payload.provider,
        join_url: joinUrl,
        host_url: hostUrl,
        meeting_id: nullableStringField(payload.meetingId),
        passcode: nullableStringField(payload.passcode),
        ...getSessionJoinWindow(session.session_date, session.start_time, session.end_time),
      },
      { onConflict: "session_id" }
    )
    .select("id, session_id, provider, join_url, host_url, meeting_id, passcode, join_window_opens_at, join_window_closes_at, created_at, updated_at")
    .single();

  if (error) {
    throw new AdminRouteError(error.message, 500);
  }

  return meetingLink;
}

export async function getMeetingLink(context: AdminRouteContext, sessionId: string) {
  const { data: meetingLink, error } = await context.serviceClient
    .from("class_session_meeting_links")
    .select("id, session_id, provider, join_url, host_url, meeting_id, passcode, join_window_opens_at, join_window_closes_at, created_at, updated_at")
    .eq("session_id", sessionId)
    .eq("institute_id", context.instituteId)
    .maybeSingle();

  if (error) {
    throw new AdminRouteError(error.message, 500);
  }

  return meetingLink;
}

export async function uploadAdminFile(
  context: AdminRouteContext,
  bucketName: string,
  folder: string,
  file: File,
  fallbackName: string,
  fallbackExtension = ""
) {
  const baseName = toSafeFileName(file.name.replace(/\.[a-z0-9]{1,10}$/i, "") || fallbackName);
  const storagePath = `${bucketName}/${folder}/${Date.now()}-${baseName}${getSafeFileExtension(file.name, fallbackExtension)}`;
  const fileReference = toR2ObjectReference(storagePath);

  await uploadR2File({
    key: storagePath,
    file,
    contentType: file.type || "application/octet-stream",
  });

  return fileReference;
}

export function requirePdfFile(file: File, label = "File") {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    throw new AdminRouteError(`${label} must be a PDF`, 400);
  }

  if (file.size > 25 * 1024 * 1024) {
    throw new AdminRouteError(`${label} must be 25MB or smaller`, 400);
  }
}

export async function createSignedMaterialUrl(_context: AdminRouteContext, filePath: string | null | undefined) {
  if (!filePath) {
    return null;
  }

  return createSignedStorageUrl(filePath, 60 * 60);
}

export async function deleteMaterialFiles(_context: AdminRouteContext, paths: Array<string | null | undefined>) {
  const filteredPaths = paths.filter((path): path is string => Boolean(path));
  if (filteredPaths.length > 0) {
    await deleteR2Objects(filteredPaths);
  }
}
