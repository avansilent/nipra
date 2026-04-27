"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import type { PublicResourceItem } from "../lib/publicResources";

type ResourceLibraryProps = {
  eyebrow: string;
  title: string;
  description: string;
  searchPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
  items: PublicResourceItem[];
  downloadKind: "note" | "material";
  surfaceLabel: string;
};

function formatDate(value?: string | null) {
  if (!value) {
    return "Recently added";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recently added";
  }

  return date.toLocaleDateString();
}

export default function ResourceLibrary({
  eyebrow,
  title,
  description,
  searchPlaceholder,
  emptyTitle,
  emptyDescription,
  items,
  downloadKind,
  surfaceLabel,
}: ResourceLibraryProps) {
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const filteredItems = deferredQuery
    ? items.filter((item) => `${item.title} ${item.courseTitle}`.toLowerCase().includes(deferredQuery))
    : items;

  const resourceCount = items.length;
  const courseCount = new Set(items.map((item) => item.courseTitle)).size;

  const handleDownload = async (resourceId: string) => {
    try {
      setFeedback(null);
      setDownloadingId(resourceId);

      const endpoint = downloadKind === "note" ? `/api/notes/${resourceId}/download` : `/api/materials/${resourceId}/download`;
      const response = await fetch(endpoint, { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error ?? "Unable to open the PDF right now.");
      }

      window.open(payload.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to open the PDF right now.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <section className="resource-library-shell relative bg-stone-50/60 px-6 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="pointer-events-none absolute left-0 top-12 h-52 w-52 rounded-full bg-stone-200/35 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-20 h-60 w-60 rounded-full bg-slate-200/25 blur-3xl" />

      <div className="mx-auto max-w-7xl space-y-8">
        <div className="resource-library-hero-card rounded-[36px] bg-white/96 p-6 shadow-[0_18px_44px_rgba(36,32,28,0.06)] sm:p-8">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-center">
            <div className="resource-library-copy-column min-w-0 pl-2 pr-1 text-center sm:pl-3 sm:pr-2">
              <span className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                {eyebrow}
              </span>
              <h1 className="resource-library-title overflow-wrap-anywhere mt-5 max-w-4xl text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl sm:tracking-[-0.06em] lg:text-[3.1rem]">
                {title}
              </h1>
              <p className="resource-library-description overflow-wrap-anywhere mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                {description}
              </p>
            </div>

            <div className="resource-library-summary-card min-w-0 rounded-[28px] bg-stone-50/80 p-5 text-center sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Library Snapshot</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-[22px] bg-white px-4 py-3 shadow-[0_8px_24px_rgba(36,32,28,0.04)]">
                  <p className="text-xs text-stone-500">Files</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{resourceCount}</p>
                </div>
                <div className="rounded-[22px] bg-white px-4 py-3 shadow-[0_8px_24px_rgba(36,32,28,0.04)]">
                  <p className="text-xs text-stone-500">Courses</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{courseCount}</p>
                </div>
                <div className="rounded-[22px] bg-white px-4 py-3 shadow-[0_8px_24px_rgba(36,32,28,0.04)]">
                  <p className="text-xs text-stone-500">Access</p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">Public download enabled</p>
                </div>
              </div>
            </div>
          </div>

          <div className="resource-library-search-row mt-6 flex flex-col gap-3 pl-2 pr-1 sm:pl-3 sm:pr-2 lg:items-center">
            <label className="block w-full lg:max-w-xl">
              <span className="sr-only">Search library</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-[24px] bg-stone-50 px-5 py-3.5 text-sm text-slate-900 outline-none transition-[box-shadow,background-color] duration-150 focus:bg-white focus:shadow-[0_0_0_4px_rgba(231,226,219,0.65)]"
              />
            </label>
            <div className="min-w-0 flex flex-wrap justify-center gap-3 text-sm text-slate-600">
              <span className="inline-flex items-center rounded-full bg-white px-4 py-2 font-medium shadow-[0_8px_20px_rgba(36,32,28,0.04)]">
                Search by file name or course
              </span>
              <Link href="/student/dashboard" className="inline-flex items-center rounded-full bg-white px-4 py-2 font-medium text-slate-800 shadow-[0_8px_20px_rgba(36,32,28,0.04)]">
                Open Student Portal
              </Link>
            </div>
          </div>
        </div>

        {feedback ? (
          <div className="rounded-[24px] bg-amber-50/90 px-5 py-4 text-center text-sm text-amber-700 shadow-[0_10px_24px_rgba(36,32,28,0.04)]">
            {feedback}
          </div>
        ) : null}

        {filteredItems.length === 0 ? (
          <div className="resource-library-empty-state rounded-[32px] bg-white/92 px-7 py-10 text-center shadow-[0_14px_36px_rgba(36,32,28,0.05)] sm:px-8">
            <p className="text-lg font-semibold text-slate-950">{emptyTitle}</p>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">{emptyDescription}</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => (
              <article
                key={item.id}
                className="resource-library-card min-w-0 rounded-[32px] bg-white/96 p-5 text-center shadow-[0_16px_38px_rgba(36,32,28,0.05)] sm:p-5"
              >
                <div className="overflow-hidden rounded-[26px] bg-stone-50">
                  {item.previewUrl ? (
                    <iframe
                      title={`${item.title} preview`}
                      src={`${item.previewUrl}#toolbar=0&navpanes=0&scrollbar=0&page=1&view=FitH`}
                      className="h-[280px] w-full bg-white"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-[280px] items-center justify-center bg-[linear-gradient(180deg,rgba(248,245,241,1),rgba(255,255,255,1))] px-6 text-center text-sm text-slate-500">
                      Preview is being prepared for this file.
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-col items-center gap-3">
                  <div className="resource-library-card-copy-column min-w-0 flex-1 pl-2 pr-1 sm:pl-2.5 sm:pr-2">
                    <p className="resource-library-card-title overflow-wrap-anywhere text-lg font-semibold tracking-[-0.02em] sm:tracking-[-0.03em] text-slate-950">{item.title}</p>
                    <p className="overflow-wrap-anywhere mt-2 text-sm leading-6 text-slate-600">{item.courseTitle}</p>
                  </div>
                  <span className="inline-flex shrink-0 rounded-full bg-stone-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                    {surfaceLabel}
                  </span>
                </div>

                <div className="resource-library-card-meta mt-4 flex flex-wrap items-center justify-center gap-3 px-2 text-xs text-stone-500 sm:px-2.5">
                  <span>{formatDate(item.createdAt)}</span>
                  <span>First-page preview</span>
                </div>

                <div className="resource-library-card-actions mt-5 flex flex-col gap-3 px-2 pb-1 sm:flex-row sm:px-2.5">
                  <button
                    type="button"
                    onClick={() => void handleDownload(item.id)}
                    className="inline-flex w-full flex-1 items-center justify-center rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white sm:w-auto"
                  >
                    {downloadingId === item.id ? "Opening..." : "Open / Download"}
                  </button>
                  {item.previewUrl ? (
                    <a
                      href={item.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-full items-center justify-center rounded-full bg-stone-100 px-4 py-3 text-sm font-semibold text-slate-800 sm:w-auto"
                    >
                      Preview
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}