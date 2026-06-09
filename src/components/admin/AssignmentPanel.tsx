"use client";

import { useCallback, useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import AssignmentSubmissionsView from "./AssignmentSubmissionsView";

type AssignmentRow = {
  id: string;
  institute_id: string;
  session_id: string | null;
  course_id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  due_date: string | null;
  max_marks: number;
  is_published: boolean;
  created_at?: string;
  updated_at?: string;
  hasFile?: boolean;
  signedUrl?: string | null;
  submissionCount?: number;
};

type AssignmentFormState = {
  title: string;
  description: string;
  instructions: string;
  dueDate: string;
  maxMarks: string;
  isPublished: boolean;
  file: File | null;
};

type AssignmentPanelProps = {
  sessionId: string;
  courseId: string;
  disabled?: boolean;
  onChanged?: () => void;
};

const emptyAssignmentForm = (): AssignmentFormState => ({
  title: "",
  description: "",
  instructions: "",
  dueDate: "",
  maxMarks: "100",
  isPublished: false,
  file: null,
});

const inputClass =
  "w-full rounded-[22px] bg-[#f8fafd] px-4 py-3 text-sm text-slate-900 outline-none shadow-[0_10px_24px_rgba(226,232,240,0.8)] transition duration-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(186,230,253,0.55),0_14px_28px_rgba(226,232,240,0.9)]";
const textareaClass = `${inputClass} min-h-[96px] resize-y`;
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

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
      {hint ? <p className={hintClass}>{hint}</p> : null}
    </label>
  );
}

function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" }) {
  const toneClass = {
    neutral: "bg-stone-100 text-slate-900",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
  }[tone];

  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>;
}

function toDateTimeLocalValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

async function readApiResponse<T>(response: Response, fallback: string): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? fallback);
  }

  return payload as T;
}

export default function AssignmentPanel({
  sessionId,
  courseId,
  disabled,
  onChanged,
}: AssignmentPanelProps) {
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [form, setForm] = useState<AssignmentFormState>(emptyAssignmentForm);
  const [editForm, setEditForm] = useState<AssignmentFormState>(emptyAssignmentForm);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [filePickerKey, setFilePickerKey] = useState(0);
  const [editFilePickerKey, setEditFilePickerKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/assignments?sessionId=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
      const payload = await readApiResponse<{ assignments?: AssignmentRow[] }>(response, "Unable to load assignments");
      setAssignments(payload.assignments ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load assignments");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadAssignments();
    }, 0);

    return () => {
      window.clearTimeout(loadTimer);
    };
  }, [loadAssignments]);

  const appendAssignmentForm = (formData: FormData, values: AssignmentFormState) => {
    formData.append("course_id", courseId);
    formData.append("session_id", sessionId);
    formData.append("title", values.title.trim());
    formData.append("description", values.description.trim());
    formData.append("instructions", values.instructions.trim());
    formData.append("due_date", fromDateTimeLocalValue(values.dueDate));
    formData.append("max_marks", values.maxMarks.trim() || "100");
    formData.append("is_published", String(values.isPublished));
    if (values.file) {
      formData.append("file", values.file);
    }
  };

  const validateForm = (values: AssignmentFormState) => {
    if (!values.title.trim()) {
      setError("Assignment title is required.");
      return false;
    }

    const maxMarks = Number(values.maxMarks);
    if (!Number.isFinite(maxMarks) || maxMarks <= 0) {
      setError("Max marks must be greater than 0.");
      return false;
    }

    return true;
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>, target: "create" | "edit") => {
    const file = event.target.files?.[0] ?? null;
    if (target === "create") {
      setForm((prev) => ({ ...prev, file }));
      return;
    }

    setEditForm((prev) => ({ ...prev, file }));
  };

  const handleCreate = async () => {
    if (!validateForm(form)) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      appendAssignmentForm(formData, form);

      const response = await fetch("/api/admin/assignments", {
        method: "POST",
        body: formData,
      });
      await readApiResponse(response, "Unable to create assignment");

      setForm(emptyAssignmentForm());
      setFilePickerKey((prev) => prev + 1);
      setMessage("Assignment created.");
      await loadAssignments();
      onChanged?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create assignment");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (assignment: AssignmentRow) => {
    setEditingAssignmentId(assignment.id);
    setEditForm({
      title: assignment.title,
      description: assignment.description ?? "",
      instructions: assignment.instructions ?? "",
      dueDate: toDateTimeLocalValue(assignment.due_date),
      maxMarks: String(assignment.max_marks ?? 100),
      isPublished: assignment.is_published,
      file: null,
    });
    setEditFilePickerKey((prev) => prev + 1);
  };

  const handleUpdate = async (assignmentId: string) => {
    if (!validateForm(editForm)) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      appendAssignmentForm(formData, editForm);

      const response = await fetch(`/api/admin/assignments/${assignmentId}`, {
        method: "PATCH",
        body: formData,
      });
      await readApiResponse(response, "Unable to update assignment");

      setEditingAssignmentId(null);
      setEditForm(emptyAssignmentForm());
      setMessage("Assignment updated.");
      await loadAssignments();
      onChanged?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update assignment");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (assignment: AssignmentRow) => {
    if (!window.confirm(`Delete "${assignment.title}" and any submissions?`)) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/assignments/${assignment.id}`, { method: "DELETE" });
      await readApiResponse(response, "Unable to delete assignment");
      if (selectedAssignmentId === assignment.id) {
        setSelectedAssignmentId(null);
      }
      if (editingAssignmentId === assignment.id) {
        setEditingAssignmentId(null);
      }
      setMessage("Assignment deleted.");
      await loadAssignments();
      onChanged?.();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete assignment");
    } finally {
      setSaving(false);
    }
  };

  const renderAssignmentForm = (values: AssignmentFormState, update: (patch: Partial<AssignmentFormState>) => void, fileKey: number, mode: "create" | "edit") => (
    <div className="grid gap-4 lg:grid-cols-2">
      <Field label="Assignment title">
        <input className={inputClass} value={values.title} onChange={(event) => update({ title: event.target.value })} placeholder="Practice worksheet" />
      </Field>
      <Field label="Due date">
        <input type="datetime-local" className={inputClass} value={values.dueDate} onChange={(event) => update({ dueDate: event.target.value })} />
      </Field>
      <Field label="Max marks">
        <input className={inputClass} inputMode="numeric" value={values.maxMarks} onChange={(event) => update({ maxMarks: event.target.value })} placeholder="100" />
      </Field>
      <Field label="PDF file" hint={values.file ? values.file.name : mode === "edit" ? "Optional. Upload only if replacing the file." : "Optional assignment PDF."}>
        <label className={`${secondaryButtonClass} w-full cursor-pointer`}>
          Choose PDF
          <input key={fileKey} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => handleFileChange(event, mode)} />
        </label>
      </Field>
      <div className="lg:col-span-2">
        <Field label="Description">
          <textarea className={textareaClass} value={values.description} onChange={(event) => update({ description: event.target.value })} placeholder="Short student-facing summary" />
        </Field>
      </div>
      <div className="lg:col-span-2">
        <Field label="Instructions">
          <textarea className={textareaClass} value={values.instructions} onChange={(event) => update({ instructions: event.target.value })} placeholder="Submission instructions" />
        </Field>
      </div>
      <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={values.isPublished}
          onChange={(event) => update({ isPublished: event.target.checked })}
          className="h-4 w-4 rounded border-stone-300 text-sky-600"
        />
        Publish now
      </label>
    </div>
  );

  return (
    <div className="space-y-4">
      {renderAssignmentForm(form, (patch) => setForm((prev) => ({ ...prev, ...patch })), filePickerKey, "create")}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={primaryButtonClass} disabled={disabled || saving} onClick={() => void handleCreate()}>
          Create Assignment
        </button>
        {message ? <span className="text-sm font-semibold text-emerald-700">{message}</span> : null}
        {error ? <span className="text-sm font-semibold text-rose-700">{error}</span> : null}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className={nestedCardClass}>
            <p className="text-sm text-slate-600">Loading assignments...</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className={nestedCardClass}>
            <p className="font-semibold text-slate-900">No assignments yet</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">Create assignments here, then they can be graded from the submissions view.</p>
          </div>
        ) : (
          assignments.map((assignment) => (
            <div key={assignment.id} className={nestedCardClass}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{assignment.title}</p>
                    <StatusBadge tone={assignment.is_published ? "success" : "warning"}>
                      {assignment.is_published ? "Published" : "Draft"}
                    </StatusBadge>
                    <StatusBadge tone="neutral">{assignment.max_marks} marks</StatusBadge>
                  </div>
                  {assignment.description ? <p className="mt-1 text-sm leading-6 text-slate-600">{assignment.description}</p> : null}
                  <p className="mt-2 text-xs text-slate-500">Due {formatDateTime(assignment.due_date)}</p>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {assignment.signedUrl ? (
                    <a href={assignment.signedUrl} target="_blank" rel="noreferrer" className={secondaryButtonClass}>
                      Open File
                    </a>
                  ) : null}
                  <button type="button" className={secondaryButtonClass} onClick={() => startEdit(assignment)}>
                    Edit
                  </button>
                  <button type="button" className={subtleButtonClass} onClick={() => setSelectedAssignmentId((prev) => (prev === assignment.id ? null : assignment.id))}>
                    Submissions
                  </button>
                  <button type="button" className={dangerButtonClass} disabled={saving} onClick={() => void handleDelete(assignment)}>
                    Delete
                  </button>
                </div>
              </div>

              {editingAssignmentId === assignment.id ? (
                <div className="mt-4 rounded-[22px] bg-[#f7f9fc] p-4">
                  {renderAssignmentForm(editForm, (patch) => setEditForm((prev) => ({ ...prev, ...patch })), editFilePickerKey, "edit")}
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" className={primaryButtonClass} disabled={saving} onClick={() => void handleUpdate(assignment.id)}>
                      Save Assignment
                    </button>
                    <button type="button" className={subtleButtonClass} onClick={() => setEditingAssignmentId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              {selectedAssignmentId === assignment.id ? (
                <div className="mt-4 rounded-[22px] bg-[#f7f9fc] p-4">
                  <AssignmentSubmissionsView assignmentId={assignment.id} maxMarks={assignment.max_marks} onSaved={loadAssignments} />
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
