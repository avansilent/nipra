"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

export type StudentLiveSession = {
  id: string;
  course_id: string;
  course_title: string | null;
  title: string;
  description: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
  live_provider: "google_meet" | "zoom" | "other";
  status: "scheduled" | "live" | "completed" | "cancelled";
  sort_order: number;
};

type LiveClassCardProps = {
  session: StudentLiveSession;
  onJoin: (session: StudentLiveSession) => void;
  onOpenMaterials?: (session: StudentLiveSession) => void;
  onOpenRecording?: (session: StudentLiveSession) => void;
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

function toIstDate(dateValue: string, timeValue: string) {
  const normalizedTime = timeValue.length === 5 ? `${timeValue}:00` : timeValue;
  return new Date(`${dateValue}T${normalizedTime}+05:30`);
}

function formatDate(value: string) {
  const date = toIstDate(value, "00:00");
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

function formatProvider(provider: StudentLiveSession["live_provider"]) {
  if (provider === "other") {
    return "Direct live";
  }
  return "Live class";
}

function formatCountdown(targetTime: number, now: number) {
  const diff = Math.max(0, targetTime - now);
  const totalMinutes = Math.floor(diff / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

export default function LiveClassCard({
  session,
  onJoin,
  onOpenMaterials,
  onOpenRecording,
}: LiveClassCardProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 30_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const startAt = useMemo(() => toIstDate(session.session_date, session.start_time).getTime(), [session.session_date, session.start_time]);
  const endAt = useMemo(() => toIstDate(session.session_date, session.end_time).getTime(), [session.session_date, session.end_time]);
  const joinAllowed = session.status === "live" && now >= startAt - 10 * 60_000 && now <= endAt + 30 * 60_000;
  const statusTone = session.status === "live" ? "success" : session.status === "scheduled" ? "warning" : session.status === "cancelled" ? "danger" : "neutral";
  const statusLabel = session.status === "live" ? "Live now" : session.status === "scheduled" ? "Upcoming" : session.status === "completed" ? "Completed" : "Cancelled";
  const countdownLabel = session.status === "scheduled" && startAt > now ? formatCountdown(startAt, now) : null;

  return (
    <article className={cardClass}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
            <StatusBadge tone="neutral">{formatProvider(session.live_provider)}</StatusBadge>
            {countdownLabel ? <StatusBadge tone="warning">Starts in {countdownLabel}</StatusBadge> : null}
          </div>
          <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-slate-950">{session.title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{session.course_title ?? "Assigned course"}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {formatDate(session.session_date)} - {formatTime(session.start_time)} to {formatTime(session.end_time)}
          </p>
          {session.description ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{session.description}</p> : null}
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          {session.status === "completed" ? (
            <>
              {onOpenMaterials ? (
                <button type="button" className={secondaryButtonClass} onClick={() => onOpenMaterials(session)}>
                  Materials
                </button>
              ) : null}
              {onOpenRecording ? (
                <button type="button" className={secondaryButtonClass} onClick={() => onOpenRecording(session)}>
                  Recording
                </button>
              ) : null}
            </>
          ) : (
            <button type="button" className={primaryButtonClass} disabled={!joinAllowed} onClick={() => onJoin(session)}>
              Join Class
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
