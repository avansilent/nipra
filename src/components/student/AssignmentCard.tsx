"use client";

import type { ReactNode } from "react";

export type StudentAssignment = {
  id: string;
  session_id: string | null;
  course_id: string;
  course_title: string | null;
  title: string;
  description: string | null;
  instructions: string | null;
  due_date: string | null;
  max_marks: number;
  is_published: boolean;
  hasFile: boolean;
  submission_status: "not_submitted" | "submitted" | "graded";
  submission: {
    id: string;
    submitted_at: string | null;
    marks_obtained: number | null;
    feedback: string | null;
    graded_at: string | null;
    hasFile: boolean;
  } | null;
};

type AssignmentCardProps = {
  assignment: StudentAssignment;
  onOpen: (assignment: StudentAssignment) => void;
};

const primaryButtonClass =
  "inline-flex items-center justify-center rounded-[1.4rem] bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(56,189,248,0.24)] transition duration-300 hover:-translate-y-0.5 hover:bg-sky-700 hover:shadow-[0_18px_34px_rgba(56,189,248,0.3)] disabled:cursor-not-allowed disabled:opacity-70";
const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-[1.4rem] bg-[#f6f8fb] px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-[0_10px_22px_rgba(226,232,240,0.84)] transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_28px_rgba(226,232,240,0.92)] disabled:cursor-not-allowed disabled:opacity-70";
const cardClass =
  "student-soft-card min-w-0 overflow-hidden rounded-[24px] bg-white/92 p-4 shadow-[0_14px_30px_rgba(226,232,240,0.86)]";

function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning";
}) {
  const toneClass = {
    neutral: "bg-[#f4f6fa] text-slate-600",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
  }[tone];

  return <span className={`student-status-badge inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "No due date";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No due date" : date.toLocaleString();
}

function statusLabel(status: StudentAssignment["submission_status"]) {
  if (status === "graded") {
    return "Graded";
  }

  if (status === "submitted") {
    return "Submitted";
  }

  return "New";
}

export default function AssignmentCard({ assignment, onOpen }: AssignmentCardProps) {
  const statusTone = assignment.submission_status === "graded" ? "success" : assignment.submission_status === "submitted" ? "neutral" : "warning";
  const isGraded = assignment.submission_status === "graded";

  return (
    <article className={cardClass}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={statusTone}>{statusLabel(assignment.submission_status)}</StatusBadge>
            <StatusBadge tone="neutral">{assignment.max_marks} marks</StatusBadge>
            {assignment.hasFile ? <StatusBadge tone="neutral">File</StatusBadge> : null}
          </div>
          <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-slate-950">{assignment.title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{assignment.course_title ?? "Assigned course"}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Due {formatDate(assignment.due_date)}</p>
          {assignment.description ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{assignment.description}</p> : null}
          {isGraded ? (
            <div className="mt-3 rounded-[18px] bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <span className="font-semibold">{assignment.submission?.marks_obtained ?? 0}</span>
              <span> / {assignment.max_marks}</span>
              {assignment.submission?.feedback ? <p className="mt-1 leading-6">{assignment.submission.feedback}</p> : null}
            </div>
          ) : null}
        </div>

        <button type="button" className={isGraded ? secondaryButtonClass : primaryButtonClass} onClick={() => onOpen(assignment)}>
          {isGraded ? "View" : assignment.submission_status === "submitted" ? "Update" : "Submit"}
        </button>
      </div>
    </article>
  );
}
