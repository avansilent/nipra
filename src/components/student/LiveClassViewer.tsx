"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { StudentLiveSession } from "./LiveClassCard";

type MeetingResponse = {
  session?: {
    id: string;
    title: string;
    status: string;
    live_provider: StudentLiveSession["live_provider"];
  };
  meeting?: {
    provider: StudentLiveSession["live_provider"];
    joinUrl: string;
    meetingId: string | null;
    passcode: string | null;
  };
};

type LiveClassViewerProps = {
  session: StudentLiveSession | null;
  onClose: () => void;
};

const primaryButtonClass =
  "inline-flex items-center justify-center rounded-[1.4rem] bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(56,189,248,0.24)] transition duration-300 hover:-translate-y-0.5 hover:bg-sky-700 hover:shadow-[0_18px_34px_rgba(56,189,248,0.3)] disabled:cursor-not-allowed disabled:opacity-70";
const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-[1.4rem] bg-[#f6f8fb] px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-[0_10px_22px_rgba(226,232,240,0.84)] transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_28px_rgba(226,232,240,0.92)] disabled:cursor-not-allowed disabled:opacity-70";

function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" }) {
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

function providerLabel(provider?: StudentLiveSession["live_provider"]) {
  if (provider === "zoom") {
    return "Zoom";
  }

  if (provider === "other") {
    return "Live class";
  }

  return "Google Meet";
}

export default function LiveClassViewer({ session, onClose }: LiveClassViewerProps) {
  const [meeting, setMeeting] = useState<MeetingResponse["meeting"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMeeting = useCallback(async (sessionId: string) => {
    setLoading(true);
    setError(null);
    setMeeting(null);

    try {
      const response = await fetch(`/api/student/sessions/${sessionId}/join`, {
        method: "POST",
        cache: "no-store",
      });
      const payload = await readApiResponse<MeetingResponse>(response, "Unable to join live class");
      setMeeting(payload.meeting ?? null);
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Unable to join live class");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    const loadTimer = window.setTimeout(() => {
      void loadMeeting(session.id);
    }, 0);

    return () => {
      window.clearTimeout(loadTimer);
    };
  }, [loadMeeting, session]);

  if (!session) {
    return null;
  }

  const isEmbeddable = meeting?.provider === "other" && meeting.joinUrl;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
      <div className="student-surface max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[30px] bg-white p-5 shadow-[0_30px_80px_rgba(15,23,42,0.28)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone="success">Live</StatusBadge>
              <StatusBadge tone="neutral">{providerLabel(meeting?.provider ?? session.live_provider)}</StatusBadge>
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{session.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{session.course_title ?? "Assigned course"}</p>
          </div>
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="rounded-[24px] bg-[#f6f8fb] p-5 text-sm text-slate-600 shadow-[0_10px_24px_rgba(226,232,240,0.72)]">
              Opening class...
            </div>
          ) : error ? (
            <div className="rounded-[24px] bg-rose-50 p-5 text-sm font-semibold text-rose-700">
              {error}
            </div>
          ) : meeting?.joinUrl ? (
            <div className="space-y-4">
              {isEmbeddable ? (
                <div className="overflow-hidden rounded-[24px] bg-slate-950 shadow-[0_18px_38px_rgba(15,23,42,0.18)]">
                  <div className="aspect-video w-full">
                    <iframe
                      src={meeting.joinUrl}
                      title={session.title}
                      className="h-full w-full border-0"
                      allow="camera; microphone; fullscreen; display-capture"
                      allowFullScreen
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-[24px] bg-[#f6f8fb] p-5 shadow-[0_10px_24px_rgba(226,232,240,0.72)]">
                  <p className="text-sm leading-6 text-slate-600">{providerLabel(meeting.provider)} is ready.</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <a href={meeting.joinUrl} target="_blank" rel="noreferrer" className={primaryButtonClass}>
                      Launch Class
                    </a>
                    {meeting.meetingId ? <StatusBadge tone="neutral">ID {meeting.meetingId}</StatusBadge> : null}
                    {meeting.passcode ? <StatusBadge tone="neutral">Passcode saved</StatusBadge> : null}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-[24px] bg-amber-50 p-5 text-sm font-semibold text-amber-700">
              Class link is not ready yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
