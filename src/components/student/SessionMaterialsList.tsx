"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { StudentLiveSession } from "./LiveClassCard";

type SessionMaterial = {
  id: string;
  session_id: string;
  material_type: "note" | "book" | "link" | "pdf";
  title: string;
  description: string | null;
  external_url: string | null;
  visible_from: string | null;
  sort_order: number;
  created_at?: string;
  hasFile?: boolean;
  signedUrl?: string | null;
};

type SessionMaterialsListProps = {
  sessions: StudentLiveSession[];
  emptyTitle?: string;
  emptyDescription?: string;
};

const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-[1.4rem] bg-[#f6f8fb] px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-[0_10px_22px_rgba(226,232,240,0.84)] transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_28px_rgba(226,232,240,0.92)] disabled:cursor-not-allowed disabled:opacity-70";
const cardClass =
  "student-soft-card min-w-0 overflow-hidden rounded-[24px] bg-white/92 p-4 shadow-[0_14px_30px_rgba(226,232,240,0.86)]";

function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" }) {
  const toneClass = {
    neutral: "bg-[#f4f6fa] text-slate-600",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
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
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

export default function SessionMaterialsList({
  sessions,
  emptyTitle = "No materials yet",
  emptyDescription = "Materials unlock after completed sessions.",
}: SessionMaterialsListProps) {
  const [materialsBySessionId, setMaterialsBySessionId] = useState<Record<string, SessionMaterial[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMaterials = useCallback(async () => {
    if (sessions.length === 0) {
      setMaterialsBySessionId({});
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const settled = await Promise.allSettled(
        sessions.map(async (session) => {
          const response = await fetch(`/api/student/sessions/${session.id}/materials`, { cache: "no-store" });
          const payload = await readApiResponse<{ materials?: SessionMaterial[] }>(response, "Unable to load materials");
          return [session.id, payload.materials ?? []] as const;
        })
      );

      const nextMaterials: Record<string, SessionMaterial[]> = {};
      let firstError: string | null = null;

      settled.forEach((result) => {
        if (result.status === "fulfilled") {
          nextMaterials[result.value[0]] = result.value[1];
        } else if (!firstError) {
          firstError = result.reason instanceof Error ? result.reason.message : "Unable to load materials";
        }
      });

      setMaterialsBySessionId(nextMaterials);
      setError(firstError);
    } finally {
      setLoading(false);
    }
  }, [sessions]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadMaterials();
    }, 0);

    return () => {
      window.clearTimeout(loadTimer);
    };
  }, [loadMaterials]);

  const totalMaterials = useMemo(
    () => Object.values(materialsBySessionId).reduce((sum, materials) => sum + materials.length, 0),
    [materialsBySessionId]
  );

  if (sessions.length === 0) {
    return (
      <div className="student-empty-state min-w-0 rounded-[22px] bg-[#f6f8fb] px-4 py-5 text-sm text-slate-600 shadow-[0_10px_24px_rgba(226,232,240,0.72)]">
        <p className="font-semibold text-slate-700">{emptyTitle}</p>
        <p className="mt-1 leading-6">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusBadge tone="neutral">{loading ? "Loading" : `${totalMaterials} unlocked`}</StatusBadge>
        {error ? <span className="text-sm font-semibold text-amber-700">{error}</span> : null}
      </div>

      {sessions.map((session) => {
        const materials = materialsBySessionId[session.id] ?? [];
        return (
          <div key={session.id} className={cardClass}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-slate-950">{session.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{session.course_title ?? "Assigned course"} - {formatDate(session.session_date)}</p>
              </div>
              <StatusBadge tone={materials.length > 0 ? "success" : "warning"}>{materials.length}</StatusBadge>
            </div>

            <div className="mt-4 grid gap-3">
              {materials.length === 0 ? (
                <p className="text-sm leading-6 text-slate-500">No released materials for this session.</p>
              ) : (
                materials.map((material) => (
                  <div key={material.id} className="rounded-[18px] bg-[#f8fafd] p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge tone="neutral">{material.material_type}</StatusBadge>
                        </div>
                        <p className="mt-2 font-semibold text-slate-900">{material.title}</p>
                        {material.description ? <p className="mt-1 text-sm leading-6 text-slate-600">{material.description}</p> : null}
                      </div>
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        {material.signedUrl ? (
                          <a href={material.signedUrl} target="_blank" rel="noreferrer" className={secondaryButtonClass}>
                            Open File
                          </a>
                        ) : null}
                        {material.external_url ? (
                          <a href={material.external_url} target="_blank" rel="noreferrer" className={secondaryButtonClass}>
                            Open Link
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
