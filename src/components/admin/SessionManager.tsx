"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePersistentDraft } from "../../hooks/usePersistentDraft";
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
  sortOrder: string;
};

type SessionManagerProps = {
  courses: AdminCourseOption[];
  disabled?: boolean;
  onNotice?: (message: string) => void;
  onError?: (message: string) => void;
  draftScope?: string | null;
};

type TeacherHostResponse = {
  host?: {
    webRtcUrl?: string | null;
    rtmpsUrl?: string | null;
    streamKey?: string | null;
    viewerUrl?: string | null;
  };
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
  sortOrder: "0",
});

const hasSessionFormDraft = (form: SessionFormState) =>
  Boolean(
    form.courseId ||
      form.title.trim() ||
      form.description.trim() ||
      form.startTime ||
      form.endTime ||
      form.sortOrder !== "0"
  );

const hasRecordingTitleDrafts = (drafts: Record<string, string>) =>
  Object.values(drafts).some((value) => value.trim());

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
  if (provider === "other") {
    return "Direct live";
  }
  return "Legacy live";
}

function isCloudflareLiveLink(value?: string | null) {
  return Boolean(value?.startsWith("cf-live:"));
}

async function readApiResponse<T>(response: Response, fallback: string): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? fallback);
  }

  return payload as T;
}

async function withTimeout<T>(promise: Promise<T> | PromiseLike<T>, ms = 9000): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Request timed out. Please try again.")), ms);
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function sessionBodyFromForm(form: SessionFormState) {
  return {
    course_id: form.courseId,
    title: form.title.trim(),
    description: form.description.trim(),
    session_date: form.sessionDate,
    start_time: form.startTime,
    end_time: form.endTime,
    live_provider: "other",
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
  draftScope,
}: SessionManagerProps) {
  const draftPrefix = draftScope ? `nipra-admin-draft:${draftScope}:sessions` : null;
  const orderedCourses = useMemo(
    () =>
      [...courses].sort((a, b) => {
        const modeRank = { online: 0, hybrid: 1, offline: 2 };
        return modeRank[a.mode ?? "offline"] - modeRank[b.mode ?? "offline"] || a.title.localeCompare(b.title);
      }),
    [courses]
  );

  const [selectedCourseId, setSelectedCourseId] = usePersistentDraft<string>(
    draftPrefix ? `${draftPrefix}:selected-course-id` : null,
    "",
    { shouldPersist: (value) => Boolean(value) }
  );
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [sessionDetails, setSessionDetails] = useState<Record<string, AdminSession>>({});
  const [expandedSessionId, setExpandedSessionId, expandedSessionDraft] = usePersistentDraft<string | null>(
    draftPrefix ? `${draftPrefix}:expanded-session-id` : null,
    null,
    { shouldPersist: (value) => Boolean(value) }
  );
  const [editingSessionId, setEditingSessionId, editingSessionDraft] = usePersistentDraft<string | null>(
    draftPrefix ? `${draftPrefix}:editing-session-id` : null,
    null,
    { shouldPersist: (value) => Boolean(value) }
  );
  const [form, setForm, formDraft] = usePersistentDraft<SessionFormState>(
    draftPrefix ? `${draftPrefix}:form` : null,
    () => emptySessionForm(orderedCourses[0]?.id ?? ""),
    { shouldPersist: hasSessionFormDraft }
  );
  const [editForm, setEditForm, editFormDraft] = usePersistentDraft<SessionFormState>(
    draftPrefix ? `${draftPrefix}:edit-form` : null,
    emptySessionForm,
    { shouldPersist: hasSessionFormDraft }
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teacherJoiningSessionId, setTeacherJoiningSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [recordingTitleDrafts, setRecordingTitleDrafts] = usePersistentDraft<Record<string, string>>(
    draftPrefix ? `${draftPrefix}:recording-titles` : null,
    {},
    { shouldPersist: hasRecordingTitleDrafts }
  );

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
      const response = await withTimeout(fetch(`/api/admin/sessions${query}`, { cache: "no-store" }));
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
      const response = await withTimeout(fetch(`/api/admin/sessions/${sessionId}`, { cache: "no-store" }));
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
      const response = await withTimeout(fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionBodyFromForm(form)),
      }));
      const payload = await readApiResponse<{ session?: AdminSession }>(response, "Unable to create session");
      formDraft.clearDraft();
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
      const response = await withTimeout(fetch(`/api/admin/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionBodyFromForm(editForm)),
      }));
      await readApiResponse(response, "Unable to update session");
      editingSessionDraft.clearDraft();
      editFormDraft.clearDraft();
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
      if (action === "go-live") {
        const detail = sessionDetails[session.id] ?? session;
        if (!isCloudflareLiveLink(detail.meetingLink?.join_url)) {
          const prepareResponse = await withTimeout(fetch(`/api/admin/sessions/${session.id}/stream`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "prepare" }),
          }));
          await readApiResponse(prepareResponse, "Unable to prepare direct live stream");
        }
      }

      const response = await withTimeout(fetch(`/api/admin/sessions/${session.id}/${action}`, { method: "POST" }));
      await readApiResponse(response, "Unable to update live session");
      showNotice(action === "go-live" ? "Direct live class is ready for students." : "Session completed. Materials and assignments were unlocked.");
      await Promise.all([loadSessions(), loadSessionDetail(session.id)]);
    } catch (actionError) {
      raiseError(actionError instanceof Error ? actionError.message : "Unable to update live session");
    } finally {
      setSaving(false);
    }
  };

  const handlePrepareStream = async (session: AdminSession) => {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await withTimeout(fetch(`/api/admin/sessions/${session.id}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "prepare" }),
      }));
      await readApiResponse(response, "Unable to prepare direct live stream");
      showNotice("Direct live stream is ready.");
      await Promise.all([loadSessions(), loadSessionDetail(session.id)]);
    } catch (streamError) {
      raiseError(streamError instanceof Error ? streamError.message : "Unable to prepare direct live stream");
    } finally {
      setSaving(false);
    }
  };

  const handleJoinAsTeacher = async (session: AdminSession) => {
    setSaving(true);
    setTeacherJoiningSessionId(session.id);
    setError(null);
    setMessage(null);

    try {
      const detail = sessionDetails[session.id] ?? session;
      if (!isCloudflareLiveLink(detail.meetingLink?.join_url)) {
        const prepareResponse = await withTimeout(fetch(`/api/admin/sessions/${session.id}/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "prepare" }),
        }));
        await readApiResponse(prepareResponse, "Unable to prepare direct live stream");
      }

      const response = await withTimeout(fetch(`/api/admin/sessions/${session.id}/host`, { cache: "no-store" }));
      const payload = await readApiResponse<TeacherHostResponse>(response, "Unable to open teacher live studio");
      await loadSessionDetail(session.id);

      if (payload.host?.webRtcUrl) {
        window.open(payload.host.webRtcUrl, "_blank", "noopener,noreferrer");
        showNotice("Teacher live studio opened. Allow camera and microphone in the new tab.");
        return;
      }

      raiseError("Browser teacher studio is not available for this stream. Use the RTMPS URL and stream key shown in Details with OBS or another encoder.");
    } catch (joinError) {
      raiseError(joinError instanceof Error ? joinError.message : "Unable to open teacher live studio");
    } finally {
      setSaving(false);
      setTeacherJoiningSessionId(null);
    }
  };

  const handleSyncRecording = async (session: AdminSession) => {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await withTimeout(fetch(`/api/admin/sessions/${session.id}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync-recording",
          title: recordingTitleDrafts[session.id]?.trim() || `${session.title} recording`,
        }),
      }));
      await readApiResponse(response, "Unable to sync Cloudflare recording");
      setRecordingTitleDrafts((prev) => {
        const next = { ...prev };
        delete next[session.id];
        return next;
      });
      showNotice("Recording saved to the course video shelf.");
      await Promise.all([loadSessions(), loadSessionDetail(session.id)]);
    } catch (syncError) {
      raiseError(syncError instanceof Error ? syncError.message : "Unable to sync Cloudflare recording");
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async (value: string | null | undefined, label: string) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      showNotice(`${label} copied.`);
    } catch {
      raiseError(`Unable to copy ${label.toLowerCase()}.`);
    }
  };

  const patchSessionStatus = async (session: AdminSession, status: SessionStatus) => {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await withTimeout(fetch(`/api/admin/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }));
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
      const response = await withTimeout(fetch(`/api/admin/sessions/${session.id}`, { method: "DELETE" }));
      await readApiResponse(response, "Unable to delete session");
      showNotice("Class session deleted.");
      setSessionDetails((prev) => {
        const next = { ...prev };
        delete next[session.id];
        return next;
      });
      if (expandedSessionId === session.id) {
        expandedSessionDraft.clearDraft();
        setExpandedSessionId(null);
      }
      if (editingSessionId === session.id) {
        editingSessionDraft.clearDraft();
        editFormDraft.clearDraft();
        setEditingSessionId(null);
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

  const renderSessionForm = (values: SessionFormState, update: (patch: Partial<SessionFormState>) => void) => (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <Field label="Class / course">
        <select className={inputClass} value={values.courseId} onChange={(event) => update({ courseId: event.target.value })}>
          <option value="">Select course</option>
          {orderedCourses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title} ({course.mode ?? "offline"})
            </option>
          ))}
        </select>
      </Field>
      <Field label="Subject / class topic">
        <input className={inputClass} value={values.title} onChange={(event) => update({ title: event.target.value })} placeholder="Maths - algebra practice" />
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
      <Field label="Sort order">
        <input className={inputClass} inputMode="numeric" value={values.sortOrder} onChange={(event) => update({ sortOrder: event.target.value })} placeholder="0" />
      </Field>
      <div className="lg:col-span-2 xl:col-span-3">
        <Field label="Description">
          <textarea className={textareaClass} value={values.description} onChange={(event) => update({ description: event.target.value })} placeholder="Class focus, chapter, or teacher note" />
        </Field>
      </div>
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
            <p className="mt-1 text-sm leading-6 text-slate-600">Choose the class, add the subject topic, then create a direct live stream for enrolled students.</p>
          </div>
          <StatusBadge tone="neutral">{sessions.length} listed</StatusBadge>
        </div>
        {renderSessionForm(form, updateForm)}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" className={primaryButtonClass} disabled={disabled || saving} onClick={() => void handleCreateSession()}>
            Create Session
          </button>
          <button type="button" className={subtleButtonClass} onClick={() => { formDraft.clearDraft(); setForm(emptySessionForm(form.courseId)); }}>
            Clear Form
          </button>
          {message ? <span className="text-sm font-semibold text-emerald-700">{message}</span> : null}
          {error ? <span className="text-sm font-semibold text-rose-700">{error}</span> : null}
        </div>
      </div>

      {loading ? (
        <EmptyState title="Loading sessions" description="Fetching the latest class schedule from the protected admin API." />
      ) : sessions.length === 0 ? (
        <EmptyState title="No class sessions yet" description="Create a class session above, then prepare direct live when the teacher is ready." />
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const detail = sessionDetails[session.id] ?? session;
            const courseTitle = detail.course?.title ?? orderedCourses.find((course) => course.id === session.course_id)?.title ?? "Course";
            const isExpanded = expandedSessionId === session.id;
            const isEditing = editingSessionId === session.id;
            const hasCloudflareStream = isCloudflareLiveLink(detail.meetingLink?.join_url);

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
                      {hasCloudflareStream ? (
                        <StatusBadge tone="success">Direct live ready</StatusBadge>
                      ) : detail.meetingLink?.join_url ? (
                        <StatusBadge tone="warning">Legacy link saved</StatusBadge>
                      ) : (
                        <StatusBadge tone="warning">Stream not prepared</StatusBadge>
                      )}
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
                    {session.status !== "completed" && session.status !== "cancelled" ? (
                      <button
                        type="button"
                        className={secondaryButtonClass}
                        disabled={saving || teacherJoiningSessionId === session.id}
                        onClick={() => void handleJoinAsTeacher(session)}
                      >
                        {teacherJoiningSessionId === session.id ? "Opening..." : "Join as Teacher"}
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
                    {renderSessionForm(editForm, updateEditForm)}
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button type="button" className={primaryButtonClass} disabled={saving} onClick={() => void handleUpdateSession(session.id)}>
                        Save Session
                      </button>
                      <button type="button" className={subtleButtonClass} onClick={() => { editingSessionDraft.clearDraft(); editFormDraft.clearDraft(); setEditingSessionId(null); }}>
                        Cancel Edit
                      </button>
                    </div>
                  </div>
                ) : null}

                {isExpanded ? (
                  <div className="mt-4 space-y-4 rounded-[22px] bg-[#f7f9fc] p-4">
                    <div className="grid gap-3 lg:grid-cols-2">
                      <div className="rounded-[20px] bg-white/92 p-4 shadow-[0_10px_22px_rgba(226,232,240,0.76)]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Student Access Window</p>
                        <p className="mt-2 text-sm text-slate-600">Opens {formatDateTime(detail.meetingLink?.join_window_opens_at)}</p>
                        <p className="mt-1 text-sm text-slate-600">Closes {formatDateTime(detail.meetingLink?.join_window_closes_at)}</p>
                      </div>
                      <div className="rounded-[20px] bg-white/92 p-4 shadow-[0_10px_22px_rgba(226,232,240,0.76)]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Direct Live Status</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <StatusBadge tone={hasCloudflareStream ? "success" : "warning"}>
                            {hasCloudflareStream ? "Stream prepared" : "Create live before class"}
                          </StatusBadge>
                          <StatusBadge tone="neutral">Students join inside portal</StatusBadge>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[22px] bg-white/92 p-4 shadow-[0_10px_22px_rgba(226,232,240,0.76)]">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Direct Live Stream</p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            Prepare this session for enrolled students. Cloudflare records automatically, then sync the saved class into this course video shelf.
                          </p>
                        </div>
                        <button
                          type="button"
                          className={hasCloudflareStream ? secondaryButtonClass : primaryButtonClass}
                          disabled={saving}
                          onClick={() => void handlePrepareStream(session)}
                        >
                          {hasCloudflareStream ? "Refresh Stream" : "Create Live Stream"}
                        </button>
                        <button
                          type="button"
                          className={primaryButtonClass}
                          disabled={saving || teacherJoiningSessionId === session.id}
                          onClick={() => void handleJoinAsTeacher(session)}
                        >
                          {teacherJoiningSessionId === session.id ? "Opening..." : "Join as Teacher"}
                        </button>
                      </div>

                      {hasCloudflareStream ? (
                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                          <Field label="RTMPS URL" hint="Use this in OBS or your streaming encoder.">
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <input className={`${inputClass} min-w-0`} readOnly value={detail.meetingLink?.host_url ?? ""} />
                              <button type="button" className={subtleButtonClass} onClick={() => void copyToClipboard(detail.meetingLink?.host_url, "RTMPS URL")}>
                                Copy
                              </button>
                            </div>
                          </Field>
                          <Field label="Stream key" hint="Admin-only secret. Do not share publicly.">
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <input className={`${inputClass} min-w-0`} readOnly type="password" value={detail.meetingLink?.passcode ?? ""} />
                              <button type="button" className={subtleButtonClass} onClick={() => void copyToClipboard(detail.meetingLink?.passcode, "Stream key")}>
                                Copy
                              </button>
                            </div>
                          </Field>
                          <div className="lg:col-span-2">
                            <Field label="Recording title" hint="Used when saving the completed live recording into the course video shelf.">
                              <input
                                className={inputClass}
                                value={recordingTitleDrafts[session.id] ?? `${session.title} recording`}
                                onChange={(event) => setRecordingTitleDrafts((prev) => ({ ...prev, [session.id]: event.target.value }))}
                              />
                            </Field>
                            <div className="mt-3 flex flex-wrap gap-3">
                              <button type="button" className={primaryButtonClass} disabled={saving} onClick={() => void handleSyncRecording(session)}>
                                Sync Recording
                              </button>
                              <p className="self-center text-xs leading-5 text-slate-500">
                                Use after ending the stream. If Cloudflare is still processing, wait a few minutes and sync again.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null}
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
                        draftScope={draftScope}
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
