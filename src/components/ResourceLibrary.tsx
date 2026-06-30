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
  const [readingId, setReadingId] = useState<string | null>(null);
  const [reader, setReader] = useState<{ title: string; url: string } | null>(null);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const filteredItems = deferredQuery
    ? items.filter((item) => `${item.title} ${item.courseTitle}`.toLowerCase().includes(deferredQuery))
    : items;

  const resourceCount = items.length;
  const courseCount = new Set(items.map((item) => item.courseTitle)).size;

  const getSecureResourceUrl = async (resourceId: string) => {
    const endpoint = downloadKind === "note" ? `/api/notes/${resourceId}/download` : `/api/materials/${resourceId}/download`;
    const response = await fetch(endpoint, { cache: "no-store" });
    const payload = await response.json();

    if (!response.ok || !payload?.url) {
      throw new Error(payload?.error ?? "Unable to open the file right now.");
    }

    return String(payload.url);
  };

  const handleRead = async (item: PublicResourceItem) => {
    try {
      setFeedback(null);
      setReadingId(item.id);
      const url = item.previewUrl ?? await getSecureResourceUrl(item.id);
      setReader({ title: item.title, url });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to open the file right now.");
    } finally {
      setReadingId(null);
    }
  };

  const handleDownload = async (resourceId: string) => {
    try {
      setFeedback(null);
      setDownloadingId(resourceId);
      const url = await getSecureResourceUrl(resourceId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to open the file right now.");
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
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(15,23,42,0.14)] transition hover:-translate-y-0.5 hover:bg-slate-900 sm:w-auto"
              >
                Login to Student Portal
              </Link>
              <Link
                href="/courses"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-stone-100 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:bg-white sm:w-auto"
              >
                Browse Courses & Enroll
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredItems.map((item) => (
              <article
                key={item.id}
                className="resource-library-card min-w-0 rounded-[24px] bg-white/96 p-4 shadow-[0_12px_28px_rgba(36,32,28,0.05)] sm:p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-stone-100 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                      {surfaceLabel.slice(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <p className="resource-library-card-title overflow-wrap-anywhere text-base font-semibold tracking-[-0.02em] text-slate-950 sm:text-lg">
                        {item.title}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone-500">
                        <span>{item.courseTitle}</span>
                        <span>{formatDate(item.createdAt)}</span>
                        <span>{surfaceLabel}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => void handleRead(item)}
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-stone-100 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:bg-white sm:w-auto"
                    >
                      {readingId === item.id ? "Opening..." : "Read here"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDownload(item.id)}
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(15,23,42,0.14)] transition hover:-translate-y-0.5 hover:bg-slate-900 sm:w-auto"
                    >
                      {downloadingId === item.id ? "Opening..." : "Open / Download"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {reader ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
          <div className="flex h-full max-h-[860px] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_28px_80px_rgba(15,23,42,0.34)]">
            <div className="flex flex-col gap-3 border-b border-stone-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-slate-950">{reader.title}</p>
                <p className="mt-1 text-xs text-stone-500">Secure in-page reader</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <a
                  href={reader.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-stone-100 px-4 py-2 text-sm font-semibold text-slate-800"
                >
                  New tab
                </a>
                <button
                  type="button"
                  onClick={() => setReader(null)}
                  className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                >
                  Close
                </button>
              </div>
            </div>
            <iframe
              title={`${reader.title} reader`}
              src={`${reader.url}#toolbar=1&navpanes=0&view=FitH`}
              className="min-h-0 flex-1 bg-white"
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
