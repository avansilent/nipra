"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

type SubmissionRow = {
  id: string;
  assignment_id: string;
  student_id: string;
  text_response: string | null;
  submitted_at: string | null;
  marks_obtained: number | null;
  feedback: string | null;
  graded_at: string | null;
  graded_by?: string | null;
  hasFile?: boolean;
  signedUrl?: string | null;
  student?: {
    id: string;
    name: string;
    email: string | null;
    login_id: string | null;
    phone: string | null;
  };
};

type AssignmentSubmissionsViewProps = {
  assignmentId: string;
  maxMarks: number;
  onSaved?: () => void;
};

type GradeDraft = {
  marks: string;
  feedback: string;
};

const inputClass =
  "w-full rounded-[22px] bg-[#f8fafd] px-4 py-3 text-sm text-slate-900 outline-none shadow-[0_10px_24px_rgba(226,232,240,0.8)] transition duration-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(186,230,253,0.55),0_14px_28px_rgba(226,232,240,0.9)]";
const textareaClass = `${inputClass} min-h-[90px] resize-y`;
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-[1.45rem] bg-sky-600 px-4 py-2.5 text-[0.92rem] font-semibold text-white shadow-[0_14px_30px_rgba(56,189,248,0.24)] transition duration-300 hover:-translate-y-0.5 hover:bg-sky-700 hover:shadow-[0_18px_36px_rgba(56,189,248,0.3)] disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-[1.45rem] bg-[#f6f8fb] px-4 py-2.5 text-[0.92rem] font-semibold text-slate-900 shadow-[0_10px_22px_rgba(226,232,240,0.84)] transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_28px_rgba(226,232,240,0.92)] disabled:cursor-not-allowed disabled:opacity-60";
const nestedCardClass =
  "rounded-[24px] bg-white/92 p-4 shadow-[0_14px_30px_rgba(226,232,240,0.86)]";

function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" }) {
  const toneClass = {
    neutral: "bg-stone-100 text-slate-900",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
  }[tone];

  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function isGraded(submission: SubmissionRow) {
  return Boolean(submission.graded_at || submission.marks_obtained !== null);
}

async function readApiResponse<T>(response: Response, fallback: string): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? fallback);
  }

  return payload as T;
}

export default function AssignmentSubmissionsView({
  assignmentId,
  maxMarks,
  onSaved,
}: AssignmentSubmissionsViewProps) {
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, GradeDraft>>({});
  const [filter, setFilter] = useState<"all" | "graded" | "ungraded">("all");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/assignments/${assignmentId}/submissions`, { cache: "no-store" });
      const payload = await readApiResponse<{ submissions?: SubmissionRow[] }>(response, "Unable to load submissions");
      const rows = payload.submissions ?? [];
      setSubmissions(rows);
      setGradeDrafts(
        Object.fromEntries(
          rows.map((submission) => [
            submission.id,
            {
              marks: submission.marks_obtained === null || typeof submission.marks_obtained === "undefined" ? "" : String(submission.marks_obtained),
              feedback: submission.feedback ?? "",
            },
          ])
        )
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load submissions");
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadSubmissions();
    }, 0);

    return () => {
      window.clearTimeout(loadTimer);
    };
  }, [loadSubmissions]);

  const filteredSubmissions = useMemo(() => {
    if (filter === "graded") {
      return submissions.filter(isGraded);
    }

    if (filter === "ungraded") {
      return submissions.filter((submission) => !isGraded(submission));
    }

    return submissions;
  }, [filter, submissions]);

  const updateDraft = (submissionId: string, patch: Partial<GradeDraft>) => {
    setGradeDrafts((prev) => ({
      ...prev,
      [submissionId]: {
        marks: prev[submissionId]?.marks ?? "",
        feedback: prev[submissionId]?.feedback ?? "",
        ...patch,
      },
    }));
  };

  const handleGrade = async (submission: SubmissionRow) => {
    const draft = gradeDrafts[submission.id] ?? { marks: "", feedback: "" };
    const marks = Number(draft.marks);

    if (!Number.isFinite(marks) || marks < 0 || marks > maxMarks) {
      setError(`Marks must be between 0 and ${maxMarks}.`);
      return;
    }

    setSavingId(submission.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/submissions/${submission.id}/grade`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marks_obtained: marks,
          feedback: draft.feedback.trim(),
        }),
      });
      await readApiResponse(response, "Unable to save grade");
      setMessage("Grade saved.");
      await loadSubmissions();
      onSaved?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save grade");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["all", "ungraded", "graded"] as const).map((nextFilter) => (
            <button
              key={nextFilter}
              type="button"
              onClick={() => setFilter(nextFilter)}
              className={nextFilter === filter ? primaryButtonClass : secondaryButtonClass}
            >
              {nextFilter === "all" ? "All" : nextFilter === "ungraded" ? "Ungraded" : "Graded"}
            </button>
          ))}
        </div>
        <StatusBadge tone="neutral">{filteredSubmissions.length} visible</StatusBadge>
      </div>

      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}

      {loading ? (
        <div className={nestedCardClass}>
          <p className="text-sm text-slate-600">Loading submissions...</p>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className={nestedCardClass}>
          <p className="font-semibold text-slate-900">No submissions found</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">Submitted student work will appear here after learners send their answers.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSubmissions.map((submission) => {
            const draft = gradeDrafts[submission.id] ?? { marks: "", feedback: "" };
            return (
              <div key={submission.id} className={nestedCardClass}>
                <div className="grid gap-4 xl:grid-cols-[1fr_1.15fr_0.9fr]">
                  <div>
                    <p className="font-semibold text-slate-900">{submission.student?.name ?? "Student"}</p>
                    <p className="mt-1 text-sm text-slate-600">{submission.student?.phone ?? submission.student?.email ?? submission.student?.login_id ?? submission.student_id}</p>
                    <p className="mt-2 text-xs text-slate-500">Submitted {formatDateTime(submission.submitted_at)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusBadge tone={isGraded(submission) ? "success" : "warning"}>{isGraded(submission) ? "Graded" : "Ungraded"}</StatusBadge>
                      {submission.signedUrl ? (
                        <a href={submission.signedUrl} target="_blank" rel="noreferrer" className={secondaryButtonClass}>
                          Open File
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Student answer</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{submission.text_response || "No text response"}</p>
                    {submission.feedback ? <p className="mt-3 text-sm leading-6 text-slate-500">Latest feedback: {submission.feedback}</p> : null}
                  </div>

                  <div className="space-y-3">
                    <input
                      className={inputClass}
                      value={draft.marks}
                      inputMode="decimal"
                      placeholder={`Marks / ${maxMarks}`}
                      onChange={(event) => updateDraft(submission.id, { marks: event.target.value })}
                    />
                    <textarea
                      className={textareaClass}
                      value={draft.feedback}
                      placeholder="Feedback"
                      onChange={(event) => updateDraft(submission.id, { feedback: event.target.value })}
                    />
                    <button
                      type="button"
                      className={primaryButtonClass}
                      disabled={savingId === submission.id}
                      onClick={() => void handleGrade(submission)}
                    >
                      Save Grade
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
