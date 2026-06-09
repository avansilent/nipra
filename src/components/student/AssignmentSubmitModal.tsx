"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import type { StudentAssignment } from "./AssignmentCard";

type AssignmentDetail = StudentAssignment & {
  signedUrl?: string | null;
  course?: {
    id: string;
    title: string;
    mode?: string | null;
  } | null;
  session?: {
    id: string;
    title: string;
    session_date: string;
    start_time: string;
    end_time: string;
    status: string;
  } | null;
  submission: (StudentAssignment["submission"] & {
    student_id?: string;
    text_response?: string | null;
    signedUrl?: string | null;
  }) | null;
};

type AssignmentSubmitModalProps = {
  assignmentId: string | null;
  onClose: () => void;
  onSubmitted?: () => void;
};

const primaryButtonClass =
  "inline-flex items-center justify-center rounded-[1.4rem] bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(56,189,248,0.24)] transition duration-300 hover:-translate-y-0.5 hover:bg-sky-700 hover:shadow-[0_18px_34px_rgba(56,189,248,0.3)] disabled:cursor-not-allowed disabled:opacity-70";
const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-[1.4rem] bg-[#f6f8fb] px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-[0_10px_22px_rgba(226,232,240,0.84)] transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_28px_rgba(226,232,240,0.92)] disabled:cursor-not-allowed disabled:opacity-70";
const inputClass =
  "w-full rounded-[20px] bg-[#f8fafd] px-4 py-3 text-sm text-slate-700 outline-none shadow-[0_10px_24px_rgba(226,232,240,0.78)] transition duration-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(186,230,253,0.55),0_14px_28px_rgba(226,232,240,0.9)]";
const textareaClass = `${inputClass} min-h-[140px] resize-y`;

function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    neutral: "bg-[#f4f6fa] text-slate-600",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-rose-50 text-rose-700",
  }[tone];

  return <span className={`student-status-badge inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>;
}

async function readApiResponse<T>(response: Response, fallback: string): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? fallback);
  }

  return payload as T;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "No due date";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No due date" : date.toLocaleString();
}

function isGraded(assignment: AssignmentDetail | null) {
  if (!assignment?.submission) {
    return false;
  }

  return assignment.submission.graded_at || assignment.submission.marks_obtained !== null;
}

export default function AssignmentSubmitModal({
  assignmentId,
  onClose,
  onSubmitted,
}: AssignmentSubmitModalProps) {
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [textResponse, setTextResponse] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePickerKey, setFilePickerKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  const loadAssignment = useCallback(async (nextAssignmentId: string) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    setFile(null);
    setFilePickerKey((prev) => prev + 1);

    try {
      const response = await fetch(`/api/student/assignments/${nextAssignmentId}`, { cache: "no-store" });
      const payload = await readApiResponse<{ assignment?: AssignmentDetail }>(response, "Unable to load assignment");
      const nextAssignment = payload.assignment ?? null;
      setAssignment(nextAssignment);
      setTextResponse(nextAssignment?.submission?.text_response ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load assignment");
      setAssignment(null);
      setTextResponse("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!assignmentId) {
      return;
    }

    const loadTimer = window.setTimeout(() => {
      void loadAssignment(assignmentId);
    }, 0);

    return () => {
      window.clearTimeout(loadTimer);
    };
  }, [assignmentId, loadAssignment]);

  useEffect(() => {
    if (!assignmentId) {
      return;
    }

    const updateNow = () => {
      setNow(Date.now());
    };
    updateNow();
    const intervalId = window.setInterval(updateNow, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [assignmentId]);

  const dueDatePassed = useMemo(() => {
    if (!assignment?.due_date) {
      return false;
    }

    const dueDate = new Date(assignment.due_date);
    return now > 0 && !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < now;
  }, [assignment, now]);

  const locked = Boolean(isGraded(assignment) || dueDatePassed);

  if (!assignmentId) {
    return null;
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null);
  };

  const handleSubmit = async () => {
    if (!assignment) {
      return;
    }

    if (!textResponse.trim() && !file && !assignment.submission?.hasFile) {
      setError("Add an answer or upload a file before submitting.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("text_response", textResponse.trim());
      if (file) {
        formData.append("file", file);
      }

      const response = await fetch(`/api/student/assignments/${assignment.id}/submit`, {
        method: "POST",
        body: formData,
      });
      await readApiResponse(response, "Unable to submit assignment");
      setMessage("Assignment submitted.");
      setFile(null);
      setFilePickerKey((prev) => prev + 1);
      await loadAssignment(assignment.id);
      onSubmitted?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit assignment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
      <div className="student-surface max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[30px] bg-white p-5 shadow-[0_30px_80px_rgba(15,23,42,0.28)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={assignment?.submission_status === "graded" ? "success" : assignment?.submission_status === "submitted" ? "neutral" : "warning"}>
                {assignment?.submission_status === "graded" ? "Graded" : assignment?.submission_status === "submitted" ? "Submitted" : "Assignment"}
              </StatusBadge>
              {assignment ? <StatusBadge tone="neutral">{assignment.max_marks} marks</StatusBadge> : null}
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{assignment?.title ?? "Assignment"}</h2>
            {assignment ? <p className="mt-2 text-sm leading-6 text-slate-600">{assignment.course_title ?? assignment.course?.title ?? "Assigned course"} - Due {formatDate(assignment.due_date)}</p> : null}
          </div>
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {loading ? (
            <div className="rounded-[24px] bg-[#f6f8fb] p-5 text-sm text-slate-600 shadow-[0_10px_24px_rgba(226,232,240,0.72)]">
              Loading assignment...
            </div>
          ) : error ? (
            <div className="rounded-[24px] bg-rose-50 p-5 text-sm font-semibold text-rose-700">{error}</div>
          ) : null}

          {assignment ? (
            <>
              <div className="rounded-[24px] bg-[#f8fafd] p-4">
                {assignment.description ? <p className="text-sm leading-6 text-slate-600">{assignment.description}</p> : null}
                {assignment.instructions ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{assignment.instructions}</p> : null}
                <div className="mt-4 flex flex-wrap gap-3">
                  {assignment.signedUrl ? (
                    <a href={assignment.signedUrl} target="_blank" rel="noreferrer" className={secondaryButtonClass}>
                      Open Assignment File
                    </a>
                  ) : null}
                  {assignment.submission?.signedUrl ? (
                    <a href={assignment.submission.signedUrl} target="_blank" rel="noreferrer" className={secondaryButtonClass}>
                      Open Submitted File
                    </a>
                  ) : null}
                </div>
              </div>

              {isGraded(assignment) ? (
                <div className="rounded-[24px] bg-emerald-50 p-4 text-sm text-emerald-700">
                  <p className="font-semibold">Marks: {assignment.submission?.marks_obtained ?? 0} / {assignment.max_marks}</p>
                  {assignment.submission?.feedback ? <p className="mt-2 leading-6">{assignment.submission.feedback}</p> : null}
                </div>
              ) : null}

              {dueDatePassed && !isGraded(assignment) ? (
                <div className="rounded-[24px] bg-amber-50 p-4 text-sm font-semibold text-amber-700">
                  Due date has passed.
                </div>
              ) : null}

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Answer</span>
                <textarea
                  className={textareaClass}
                  value={textResponse}
                  disabled={locked}
                  onChange={(event) => setTextResponse(event.target.value)}
                  placeholder="Write your answer"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">File</span>
                <label className={`${secondaryButtonClass} w-full cursor-pointer ${locked ? "pointer-events-none opacity-60" : ""}`}>
                  {file ? file.name : "Choose PDF, image, or DOCX"}
                  <input
                    key={filePickerKey}
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    disabled={locked}
                    onChange={handleFileChange}
                  />
                </label>
              </label>

              {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}

              <div className="flex flex-wrap gap-3">
                <button type="button" className={primaryButtonClass} disabled={locked || saving} onClick={() => void handleSubmit()}>
                  {saving ? "Submitting..." : assignment.submission_status === "submitted" ? "Update Submission" : "Submit Assignment"}
                </button>
                <button type="button" className={secondaryButtonClass} onClick={onClose}>
                  Done
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
