"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import AssignmentPanel from "./AssignmentPanel";
import type { CourseMode } from "./CourseModeSelector";
import SessionMaterialsPanel from "./SessionMaterialsPanel";

type LiveProvider = "google_meet" | "zoom" | "other";
type SessionStatus = "scheduled" | "live" | "completed" | "cancelled";

export type AdminCourseOption = {
  id: string;
  title: string;
  mode?: CourseMode;
  status?: "draft" | "published" | "archived";
};

type MeetingLink = {
  id: string;
  session_id: string;
  provider: LiveProvider;
  join_url: string | null;
  host_url: string | null;
  meeting_id: string | null;
  passcode: string | null;
  join_window_opens_at: string | null;
  join_window_closes_at: string | null;
};

type AdminSession = {
  id: string;
  institute_id: string;
  course_id: string;
  title: string;
  description: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
  live_provider: LiveProvider;
  status: SessionStatus;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  course?: AdminCourseOption | null;
  meetingLink?: MeetingLink | null;
  materialCount?: number;
  assignmentCount?: number;
};

type SessionFormState = {
  courseId: string;
  title: string;
  description: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  liveProvider: LiveProvider;
  joinUrl: string;
  hostUrl: string;
  meetingId: string;
  passcode: string;
  sortOrder: string;
};

type SessionManagerProps = {
  courses: AdminCourseOption[];
  disabled?: boolean;
  onNotice?: (message: string) => void;
  onError?: (message: string) => void;
};

const inputClass =
  "w-full rounded-[22px] bg-[#f8fafd] px-4 py-3 text-sm text-slate-900 outline-none shadow-[0_10px_24px_rgba(226,232,240,0.8)] transition duration-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(186,230,253,0.55),0_14px_28px_rgba(226,232,240,0.9)]";
const textareaClass = `${inputClass} min-h-[108px] resize-y`;
const labelClass = "mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500";
const hintClass = "mt-2 text-xs text-slate-500";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-[1.45rem] bg-sky-600 px-4 py-2.5 text-[0.92rem] font-semibold text-white shadow-[0_14px_30px_rgba(56,189,248,0.24)] transition duration-300 hover:-translate-y-0.5 hover:bg-sky-700 hover:shadow-[0_18px_36px_rgba(56,189,248,0.3)] disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-[1.45rem] bg-[#f6f8fb] px-4 py-2.5 text-[0.92rem] font-semibold text-slate-900 shadow-[0_10px_22px_rgba(226,232,240,0.84)] transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_28px_rgba(226,232,240,0.92)] disabled:cursor-not-allowed disabled:opacity-60";
const subtleButtonClass =
  "inline-flex items-center justify-center rounded-[1.35rem] bg-[#f3f6fb] px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_8px_18px_rgba(226,232,240,0.72)] transition duration-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60";
const dangerButtonClass =
  "inline-flex items-center justify-center rounded-[1.35rem] bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 shadow-[0_10px_22px_rgba(252,165,165,0.16)] transition duration-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60";
const nestedCardClass =
  "rounded-[24px] bg-white/92 p-4 shadow-[0_14px_30px_rgba(226,232,240,0.86)]";

function getLocalDateInputValue() {
  const date = new Date();
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

const emptySessionForm = (courseId = ""): SessionFormState => ({
  courseId,
  title: "",
  description: "",
  sessionDate: getLocalDateInputValue(),
  startTime: "",
  endTime: "",
  liveProvider: "google_meet",
  joinUrl: "",
  hostUrl: "",
  meetingId: "",
  passcode: "",
  sortOrder: "0",
});

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
      {hint ? <p className={hintClass}>{hint}</p> : null}
    </label>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[22px] bg-[#f6f8fb] px-4 py-5 text-sm text-slate-600 shadow-[0_10px_22px_rgba(226,232,240,0.72)]">
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mt-1 leading-6">{description}</p>
    </div>
  );
}

function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    neutral: "bg-stone-100 text-slate-900",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-rose-50 text-rose-700",
  }[tone];

  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>;
}

function getStatusTone(status: SessionStatus) {
  if (status === "live") {
    return "success";
  }
  if (status === "scheduled") {
    return "warning";
  }
  if (status === "cancelled") {
    return "danger";
  }
  return "neutral";
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function formatProvider(provider: LiveProvider) {
  if (provider === "zoom") {
    return "Zoom";
  }
  if (provider === "other") {
    return "Other";
  }
  return "Google Meet";
}

async function readApiResponse<T>(response: Response, fallback: string): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? fallback);
  }

  return payload as T;
}

function sessionBodyFromForm(form: SessionFormState) {
  return {
    course_id: form.courseId,
    title: form.title.trim(),
    description: form.description.trim(),
    session_date: form.sessionDate,
    start_time: form.startTime,
    end_time: form.endTime,
    live_provider: form.liveProvider,
    join_url: form.joinUrl.trim(),
    host_url: form.hostUrl.trim(),
    meeting_id: form.meetingId.trim(),
    passcode: form.passcode.trim(),
    sort_order: Number(form.sortOrder),
  };
}

function validateSessionForm(form: SessionFormState, setError: (message: string) => void) {
  if (!form.courseId) {
    setError("Select a course before saving the session.");
    return false;
  }

  if (!form.title.trim()) {
    setError("Session title is required.");
    return false;
  }

  if (!form.sessionDate || !form.startTime || !form.endTime) {
    setError("Session date, start time, and end time are required.");
    return false;
  }

  return true;
}

export default function SessionManager({
  courses,
  disabled,
  onNotice,
  onError,
}: SessionManagerProps) {
  const orderedCourses = useMemo(
    () =>
      [...courses].sort((a, b) => {
        const modeRank = { online: 0, hybrid: 1, offline: 2 };
        return modeRank[a.mode ?? "offline"] - modeRank[b.mode ?? "offline"] || a.title.localeCompare(b.title);
      }),
    [courses]
  );

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [sessionDetails, setSessionDetails] = useState<Record<string, AdminSession>>({});
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [form, setForm] = useState<SessionFormState>(() => emptySessionForm(orderedCourses[0]?.id ?? ""));
  const [editForm, setEditForm] = useState<SessionFormState>(() => emptySessionForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const raiseError = useCallback((messageText: string) => {
    setError(messageText);
    onError?.(messageText);
  }, [onError]);

  const showNotice = useCallback((messageText: string) => {
    setMessage(messageText);
    onNotice?.(messageText);
  }, [onNotice]);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = selectedCourseId ? `?courseId=${encodeURIComponent(selectedCourseId)}` : "";
      const response = await fetch(`/api/admin/sessions${query}`, { cache: "no-store" });
      const payload = await readApiResponse<{ sessions?: AdminSession[] }>(response, "Unable to load class sessions");
      setSessions(payload.sessions ?? []);
    } catch (loadError) {
      raiseError(loadError instanceof Error ? loadError.message : "Unable to load class sessions");
    } finally {
      setLoading(false);
    }
  }, [raiseError, selectedCourseId]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadSessions();
    }, 0);

    return () => {
      window.clearTimeout(loadTimer);
    };
  }, [loadSessions]);

  const loadSessionDetail = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/admin/sessions/${sessionId}`, { cache: "no-store" });
      const payload = await readApiResponse<{ session?: AdminSession }>(response, "Unable to load session");
      if (!payload.session) {
        return null;
      }

      setSessionDetails((prev) => ({ ...prev, [sessionId]: payload.session as AdminSession }));
      setSessions((prev) => prev.map((session) => (session.id === sessionId ? { ...session, ...payload.session } as AdminSession : session)));
      return payload.session as AdminSession;
    } catch (loadError) {
      raiseError(loadError instanceof Error ? loadError.message : "Unable to load session");
      return null;
    }
  }, [raiseError]);

  const toggleSession = async (sessionId: string) => {
    const nextExpandedSessionId = expandedSessionId === sessionId ? null : sessionId;
    setExpandedSessionId(nextExpandedSessionId);
    if (nextExpandedSessionId && !sessionDetails[sessionId]) {
      await loadSessionDetail(sessionId);
    }
  };

  const handleCreateSession = async () => {
    if (!validateSessionForm(form, raiseError)) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionBodyFromForm(form)),
      });
      const payload = await readApiResponse<{ session?: AdminSession }>(response, "Unable to create session");
      setForm(emptySessionForm(form.courseId));
      showNotice("Class session created.");
      await loadSessions();
      if (payload.session?.id) {
        setExpandedSessionId(payload.session.id);
        await loadSessionDetail(payload.session.id);
      }
    } catch (saveError) {
      raiseError(saveError instanceof Error ? saveError.message : "Unable to create session");
    } finally {
      setSaving(false);
    }
  };

  const startEditSession = async (session: AdminSession) => {
    const detail = sessionDetails[session.id] ?? (await loadSessionDetail(session.id)) ?? session;
    setEditingSessionId(session.id);
    setExpandedSessionId(session.id);
    setEditForm({
      courseId: detail.course_id,
      title: detail.title,
      description: detail.description ?? "",
      sessionDate: detail.session_date,
      startTime: detail.start_time.slice(0, 5),
      endTime: detail.end_time.slice(0, 5),
      liveProvider: detail.live_provider,
      joinUrl: detail.meetingLink?.join_url ?? "",
      hostUrl: detail.meetingLink?.host_url ?? "",
      meetingId: detail.meetingLink?.meeting_id ?? "",
      passcode: detail.meetingLink?.passcode ?? "",
      sortOrder: String(detail.sort_order ?? 0),
    });
  };

  const handleUpdateSession = async (sessionId: string) => {
    if (!validateSessionForm(editForm, raiseError)) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionBodyFromForm(editForm)),
      });
      await readApiResponse(response, "Unable to update session");
      setEditingSessionId(null);
      showNotice("Class session updated.");
      await Promise.all([loadSessions(), loadSessionDetail(sessionId)]);
    } catch (saveError) {
      raiseError(saveError instanceof Error ? saveError.message : "Unable to update session");
    } finally {
      setSaving(false);
    }
  };

  const postSessionAction = async (session: AdminSession, action: "go-live" | "end-live") => {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/sessions/${session.id}/${action}`, { method: "POST" });
      await readApiResponse(response, "Unable to update live session");
      showNotice(action === "go-live" ? "Session is live." : "Session completed. Materials and assignments were unlocked.");
      await Promise.all([loadSessions(), loadSessionDetail(session.id)]);
    } catch (actionError) {
      raiseError(actionError instanceof Error ? actionError.message : "Unable to update live session");
    } finally {
      setSaving(false);
    }
  };

  const patchSessionStatus = async (session: AdminSession, status: SessionStatus) => {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await readApiResponse(response, "Unable to update session status");
      showNotice("Session status updated.");
      await Promise.all([loadSessions(), loadSessionDetail(session.id)]);
    } catch (statusError) {
      raiseError(statusError instanceof Error ? statusError.message : "Unable to update session status");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSession = async (session: AdminSession) => {
    if (!window.confirm(`Delete "${session.title}" and its materials, assignments, and submissions?`)) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/sessions/${session.id}`, { method: "DELETE" });
      await readApiResponse(response, "Unable to delete session");
      showNotice("Class session deleted.");
      setSessionDetails((prev) => {
        const next = { ...prev };
        delete next[session.id];
        return next;
      });
      if (expandedSessionId === session.id) {
        setExpandedSessionId(null);
      }
      await loadSessions();
    } catch (deleteError) {
      raiseError(deleteError instanceof Error ? deleteError.message : "Unable to delete session");
    } finally {
      setSaving(false);
    }
  };

  const updateForm = (patch: Partial<SessionFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const updateEditForm = (patch: Partial<SessionFormState>) => {
    setEditForm((prev) => ({ ...prev, ...patch }));
  };

  const renderSessionForm = (values: SessionFormState, update: (patch: Partial<SessionFormState>) => void, mode: "create" | "edit") => (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <Field label="Course">
        <select className={inputClass} value={values.courseId} onChange={(event) => update({ courseId: event.target.value })}>
          <option value="">Select course</option>
          {orderedCourses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title} ({course.mode ?? "offline"})
            </option>
          ))}
        </select>
      </Field>
      <Field label="Session title">
        <input className={inputClass} value={values.title} onChange={(event) => update({ title: event.target.value })} placeholder="Live maths class" />
      </Field>
      <Field label="Provider">
        <select className={inputClass} value={values.liveProvider} onChange={(event) => update({ liveProvider: event.target.value as LiveProvider })}>
          <option value="google_meet">Google Meet</option>
          <option value="zoom">Zoom</option>
          <option value="other">Other HTTPS</option>
        </select>
      </Field>
      <Field label="Date">
        <input type="date" className={inputClass} value={values.sessionDate} onChange={(event) => update({ sessionDate: event.target.value })} />
      </Field>
      <Field label="Start time">
        <input type="time" className={inputClass} value={values.startTime} onChange={(event) => update({ startTime: event.target.value })} />
      </Field>
      <Field label="End time">
        <input type="time" className={inputClass} value={values.endTime} onChange={(event) => update({ endTime: event.target.value })} />
      </Field>
      <Field label="Student join link" hint="Use meet.google.com for Google Meet or a Zoom domain for Zoom.">
        <input className={inputClass} value={values.joinUrl} onChange={(event) => update({ joinUrl: event.target.value })} placeholder="https://meet.google.com/..." />
      </Field>
      <Field label="Host link" hint="Optional. Admin-only.">
        <input className={inputClass} value={values.hostUrl} onChange={(event) => update({ hostUrl: event.target.value })} placeholder="https://..." />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <Field label="Meeting ID">
          <input className={inputClass} value={values.meetingId} onChange={(event) => update({ meetingId: event.target.value })} placeholder="Optional" />
        </Field>
        <Field label="Passcode">
          <input className={inputClass} value={values.passcode} onChange={(event) => update({ passcode: event.target.value })} placeholder="Optional" />
        </Field>
      </div>
      <Field label="Sort order">
        <input className={inputClass} inputMode="numeric" value={values.sortOrder} onChange={(event) => update({ sortOrder: event.target.value })} placeholder="0" />
      </Field>
      <div className="lg:col-span-2 xl:col-span-3">
        <Field label="Description">
          <textarea className={textareaClass} value={values.description} onChange={(event) => update({ description: event.target.value })} placeholder="Class focus, chapter, or teacher note" />
        </Field>
      </div>
      {mode === "edit" ? (
        <div className="lg:col-span-2 xl:col-span-3">
          <p className="text-xs leading-6 text-slate-500">Saving meeting details keeps the student join link protected behind the student join API.</p>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <Field label="Filter by course">
          <select className={inputClass} value={selectedCourseId} onChange={(event) => setSelectedCourseId(event.target.value)}>
            <option value="">All courses</option>
            {orderedCourses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </Field>
        <button type="button" className={secondaryButtonClass} onClick={() => void loadSessions()} disabled={loading || saving}>
          Refresh Sessions
        </button>
      </div>

      <div className={nestedCardClass}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Create Session</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">Live classes use Google Meet or Zoom now; recordings can still be uploaded after class.</p>
          </div>
          <StatusBadge tone="neutral">{sessions.length} listed</StatusBadge>
        </div>
        {renderSessionForm(form, updateForm, "create")}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" className={primaryButtonClass} disabled={disabled || saving} onClick={() => void handleCreateSession()}>
            Create Session
          </button>
          <button type="button" className={subtleButtonClass} onClick={() => setForm(emptySessionForm(form.courseId))}>
            Clear Form
          </button>
          {message ? <span className="text-sm font-semibold text-emerald-700">{message}</span> : null}
          {error ? <span className="text-sm font-semibold text-rose-700">{error}</span> : null}
        </div>
      </div>

      {loading ? (
        <EmptyState title="Loading sessions" description="Fetching the latest class schedule from the protected admin API." />
      ) : sessions.length === 0 ? (
        <EmptyState title="No class sessions yet" description="Create a session above to start building the online or hybrid class calendar." />
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const detail = sessionDetails[session.id] ?? session;
            const courseTitle = detail.course?.title ?? orderedCourses.find((course) => course.id === session.course_id)?.title ?? "Course";
            const isExpanded = expandedSessionId === session.id;
            const isEditing = editingSessionId === session.id;

            return (
              <div key={session.id} className={nestedCardClass}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold tracking-[-0.03em] text-slate-950">{session.title}</p>
                      <StatusBadge tone={getStatusTone(session.status)}>{session.status}</StatusBadge>
                      <StatusBadge tone="neutral">{formatProvider(session.live_provider)}</StatusBadge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {courseTitle} - {formatDate(session.session_date)} - {session.start_time.slice(0, 5)} to {session.end_time.slice(0, 5)}
                    </p>
                    {session.description ? <p className="mt-2 text-sm leading-6 text-slate-500">{session.description}</p> : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {typeof detail.materialCount === "number" ? <StatusBadge tone="neutral">{detail.materialCount} materials</StatusBadge> : null}
                      {typeof detail.assignmentCount === "number" ? <StatusBadge tone="neutral">{detail.assignmentCount} assignments</StatusBadge> : null}
                      {detail.meetingLink?.join_url ? <StatusBadge tone="success">Join link saved</StatusBadge> : <StatusBadge tone="warning">No join link</StatusBadge>}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <button type="button" className={secondaryButtonClass} onClick={() => void toggleSession(session.id)}>
                      {isExpanded ? "Close" : "Details"}
                    </button>
                    <button type="button" className={subtleButtonClass} onClick={() => void startEditSession(session)}>
                      Edit
                    </button>
                    {session.status === "scheduled" || session.status === "live" ? (
                      <button
                        type="button"
                        className={session.status === "live" ? secondaryButtonClass : primaryButtonClass}
                        disabled={saving}
                        onClick={() => void postSessionAction(session, session.status === "live" ? "end-live" : "go-live")}
                      >
                        {session.status === "live" ? "End Live" : "Go Live"}
                      </button>
                    ) : null}
                    {session.status !== "cancelled" && session.status !== "completed" ? (
                      <button type="button" className={secondaryButtonClass} disabled={saving} onClick={() => void patchSessionStatus(session, "cancelled")}>
                        Cancel
                      </button>
                    ) : null}
                    <button type="button" className={dangerButtonClass} disabled={saving} onClick={() => void handleDeleteSession(session)}>
                      Delete
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-4 rounded-[22px] bg-[#f7f9fc] p-4">
                    {renderSessionForm(editForm, updateEditForm, "edit")}
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button type="button" className={primaryButtonClass} disabled={saving} onClick={() => void handleUpdateSession(session.id)}>
                        Save Session
                      </button>
                      <button type="button" className={subtleButtonClass} onClick={() => setEditingSessionId(null)}>
                        Cancel Edit
                      </button>
                    </div>
                  </div>
                ) : null}

                {isExpanded ? (
                  <div className="mt-4 space-y-4 rounded-[22px] bg-[#f7f9fc] p-4">
                    <div className="grid gap-3 lg:grid-cols-2">
                      <div className="rounded-[20px] bg-white/92 p-4 shadow-[0_10px_22px_rgba(226,232,240,0.76)]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Meeting Window</p>
                        <p className="mt-2 text-sm text-slate-600">Opens {formatDateTime(detail.meetingLink?.join_window_opens_at)}</p>
                        <p className="mt-1 text-sm text-slate-600">Closes {formatDateTime(detail.meetingLink?.join_window_closes_at)}</p>
                      </div>
                      <div className="rounded-[20px] bg-white/92 p-4 shadow-[0_10px_22px_rgba(226,232,240,0.76)]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Meeting Details</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {detail.meetingLink?.join_url ? (
                            <a href={detail.meetingLink.join_url} target="_blank" rel="noreferrer" className={secondaryButtonClass}>
                              Student Link
                            </a>
                          ) : null}
                          {detail.meetingLink?.host_url ? (
                            <a href={detail.meetingLink.host_url} target="_blank" rel="noreferrer" className={secondaryButtonClass}>
                              Host Link
                            </a>
                          ) : null}
                          {detail.meetingLink?.meeting_id ? <StatusBadge tone="neutral">ID {detail.meetingLink.meeting_id}</StatusBadge> : null}
                          {detail.meetingLink?.passcode ? <StatusBadge tone="neutral">Passcode saved</StatusBadge> : null}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[22px] bg-[#f9fbfd] p-4">
                      <div className="mb-4">
                        <p className="text-base font-semibold text-slate-950">Session Materials</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">Files stay private in storage and are delivered with signed links.</p>
                      </div>
                      <SessionMaterialsPanel
                        sessionId={session.id}
                        sessionStatus={session.status}
                        disabled={saving}
                        onChanged={() => void loadSessionDetail(session.id)}
                      />
                    </div>

                    <div className="rounded-[22px] bg-[#f9fbfd] p-4">
                      <div className="mb-4">
                        <p className="text-base font-semibold text-slate-950">Assignments</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">Create tasks for this session, then review and grade submissions.</p>
                      </div>
                      <AssignmentPanel
                        sessionId={session.id}
                        courseId={session.course_id}
                        disabled={saving}
                        onChanged={() => void loadSessionDetail(session.id)}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
