"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "../../app/AuthProvider";
import { formatResourceVisibility, type ResourceVisibility } from "../../lib/resourceVisibility";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

type CourseRow = {
  id: string;
  title: string;
  description: string | null;
};

type EnrollmentSelectRow = {
  course: CourseRow | CourseRow[] | null;
};

type TestRow = {
  id: string;
  title: string;
  test_date: string;
  course_id: string;
};

type ResultSelectRow = {
  test_id: string;
  marks: number;
  recorded_at?: string;
  test: { title: string; test_date: string } | Array<{ title: string; test_date: string }> | null;
};

type ResultRow = {
  test_id: string;
  marks: number;
  recorded_at?: string;
  test_title: string | null;
  test_date: string | null;
};

type ResourceRow = {
  id: string;
  title: string;
  file_url: string;
  course_id: string;
  visibility: ResourceVisibility;
  created_at?: string;
};

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

type TimelineFilter = "all" | "upcoming" | "completed" | "missed";

const shellSurfaceClass =
  "rounded-[30px] border border-stone-200/70 bg-white/96 p-5 shadow-[0_22px_56px_rgba(36,32,28,0.06)] sm:p-6";
const softCardClass =
  "rounded-[22px] border border-stone-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,245,241,0.96))] p-4 shadow-[0_12px_28px_rgba(36,32,28,0.04)]";
const actionCardClass =
  "rounded-[22px] border border-stone-200/70 bg-white/92 p-4 shadow-[0_12px_28px_rgba(36,32,28,0.04)] transition hover:-translate-y-0.5 hover:border-stone-300";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-[linear-gradient(180deg,rgba(27,32,40,1),rgba(56,65,76,1))] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(20,24,32,0.16)] transition hover:-translate-y-0.5";
const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-full border border-stone-200/80 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-[0_10px_24px_rgba(36,32,28,0.05)] transition hover:-translate-y-0.5 hover:border-stone-300";

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString();
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
}

function singleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] ?? null : value;
}

function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    neutral: "bg-stone-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-rose-50 text-rose-700",
  }[tone];

  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>;
}

function PortalSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={shellSurfaceClass}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">{title}</h2>
          {description ? <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function MetricCard({ label, value, helper }: { label: string; value: string | number; helper: string }) {
  return (
    <div className="rounded-[24px] border border-stone-200/70 bg-white/94 p-4 shadow-[0_12px_28px_rgba(36,32,28,0.04)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{helper}</p>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-stone-300/80 bg-stone-50/70 px-4 py-5 text-sm text-slate-600">
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mt-1 leading-6">{description}</p>
    </div>
  );
}

export default function StudentPortal() {
  const { user, role, instituteId, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])!;

  const [ready, setReady] = useState(false);
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [tests, setTests] = useState<TestRow[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [notes, setNotes] = useState<ResourceRow[]>([]);
  const [materials, setMaterials] = useState<ResourceRow[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const [resourceQuery, setResourceQuery] = useState("");
  const [downloadingNoteId, setDownloadingNoteId] = useState<string | null>(null);
  const [downloadingMaterialId, setDownloadingMaterialId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deferredResourceQuery = useDeferredValue(resourceQuery.trim().toLowerCase());

  const withTimeout = async <T,>(promise: Promise<T> | PromiseLike<T>, ms = 6000): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("Request timed out")), ms);
    });

    try {
      return await Promise.race([Promise.resolve(promise), timeoutPromise]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }

    const loadPortal = async () => {
      if (!user) {
        setReady(true);
        return;
      }

      if (role !== "student") {
        setReady(true);
        return;
      }

      if (!instituteId) {
        setError("Institute not assigned for this account.");
        setReady(true);
        return;
      }

      setError(null);
      setReady(false);

      try {
        setLastLogin(user.last_sign_in_at ?? null);

        const { data: enrollmentRows, error: enrollmentError } = await withTimeout(
          supabase
            .from("enrollments")
            .select("course:course_id (id, title, description)")
            .eq("student_id", user.id)
            .eq("institute_id", instituteId)
        );

        if (enrollmentError) {
          throw new Error(enrollmentError.message);
        }

        const enrolledCourses = ((enrollmentRows ?? []) as EnrollmentSelectRow[]).flatMap((row) => {
          if (!row.course) {
            return [];
          }
          return Array.isArray(row.course) ? row.course : [row.course];
        });

        setCourses(enrolledCourses);

        const courseIds = enrolledCourses.map((course) => course.id);

        if (courseIds.length > 0) {
          const settledCourseQueries = await Promise.allSettled([
            withTimeout(
              supabase
                .from("tests")
                .select("id, title, test_date, course_id")
                .eq("institute_id", instituteId)
                .in("course_id", courseIds)
                .order("test_date", { ascending: true })
            ),
            withTimeout(
              supabase
                .from("results")
                .select("test_id, marks, recorded_at, test:tests(title, test_date)")
                .eq("student_id", user.id)
                .eq("institute_id", instituteId)
                .order("recorded_at", { ascending: false })
            ),
            withTimeout(
              supabase
                .from("notes")
                .select("id, title, file_url, course_id, visibility, created_at")
                .eq("institute_id", instituteId)
                .in("visibility", ["student", "public"])
                .in("course_id", courseIds)
                .order("created_at", { ascending: false })
            ),
            withTimeout(
              supabase
                .from("materials")
                .select("id, title, file_url, course_id, visibility, created_at")
                .eq("institute_id", instituteId)
                .in("visibility", ["student", "public"])
                .in("course_id", courseIds)
                .order("created_at", { ascending: false })
            ),
          ]);

          const [testsResult, resultsResult, notesResult, materialsResult] = settledCourseQueries;

          if (testsResult.status === "fulfilled") {
            if (testsResult.value.error) {
              throw new Error(testsResult.value.error.message);
            }
            setTests((testsResult.value.data ?? []) as TestRow[]);
          } else {
            setTests([]);
          }

          if (resultsResult.status === "fulfilled") {
            if (resultsResult.value.error) {
              throw new Error(resultsResult.value.error.message);
            }

            const normalizedResults = ((resultsResult.value.data ?? []) as ResultSelectRow[]).map((row) => {
              const test = singleRelation(row.test);
              return {
                test_id: row.test_id,
                marks: Number(row.marks ?? 0),
                recorded_at: row.recorded_at,
                test_title: test?.title ?? null,
                test_date: test?.test_date ?? null,
              };
            });
            setResults(normalizedResults);
          } else {
            setResults([]);
          }

          if (notesResult.status === "fulfilled") {
            if (notesResult.value.error) {
              throw new Error(notesResult.value.error.message);
            }
            setNotes((notesResult.value.data ?? []) as ResourceRow[]);
          } else {
            setNotes([]);
          }

          if (materialsResult.status === "fulfilled") {
            if (materialsResult.value.error) {
              throw new Error(materialsResult.value.error.message);
            }
            setMaterials((materialsResult.value.data ?? []) as ResourceRow[]);
          } else {
            setMaterials([]);
          }
        } else {
          setTests([]);
          setResults([]);
          setNotes([]);
          setMaterials([]);
        }

        try {
          const { data: announcementRows, error: announcementError } = await withTimeout(
            supabase
              .from("announcements")
              .select("id, title, body, created_at")
              .eq("institute_id", instituteId)
              .order("created_at", { ascending: false })
              .limit(8)
          );

          if (announcementError) {
            throw new Error(announcementError.message);
          }

          setAnnouncements((announcementRows ?? []) as AnnouncementRow[]);
        } catch {
          setAnnouncements([]);
        }

        setReady(true);
      } catch (loadError) {
        setReady(true);
        setError(loadError instanceof Error ? loadError.message : "Unable to load the student portal.");
      }
    };

    void loadPortal();
  }, [authLoading, instituteId, role, supabase, user]);

  const displayName = useMemo(() => {
    const metadataName = typeof user?.user_metadata?.name === "string" ? user.user_metadata.name : null;
    const base = metadataName || user?.email?.split("@")[0] || "Student";
    return base.replace(/[._-]+/g, " ").trim();
  }, [user]);

  const firstName = displayName.split(" ")[0] || "Student";
  const resourceCount = notes.length + materials.length;
  const nextTest = tests.find((test) => new Date(test.test_date) >= new Date()) ?? null;
  const upcomingCount = tests.filter((test) => new Date(test.test_date) >= new Date()).length;
  const averageMarks = results.length > 0 ? Math.round(results.reduce((sum, item) => sum + Number(item.marks || 0), 0) / results.length) : 0;
  const bestMarks = results.length > 0 ? Math.max(...results.map((item) => Number(item.marks || 0))) : 0;
  const latestResult = results[0] ?? null;

  const testActivity = tests.slice(0, 12).map((test) => {
    const taken = results.some((result) => result.test_id === test.id);
    const isUpcoming = new Date(test.test_date) >= new Date();
    const status = taken ? "completed" : isUpcoming ? "upcoming" : "missed";
    return { ...test, status };
  });

  const completedCount = testActivity.filter((item) => item.status === "completed").length;
  const missedCount = testActivity.filter((item) => item.status === "missed").length;
  const participationRate = tests.length > 0 ? Math.min(100, Math.round((results.length / tests.length) * 100)) : 0;

  const filteredTestActivity =
    timelineFilter === "all"
      ? testActivity
      : testActivity.filter((test) => test.status === timelineFilter);

  const recentResultTrend = results.slice(0, 6).reverse();
  const peakForTrend = recentResultTrend.length > 0 ? Math.max(...recentResultTrend.map((item) => Number(item.marks || 0)), 1) : 1;
  const latestAnnouncement = announcements[0] ?? null;

  const courseTitleById = useMemo(() => new Map(courses.map((course) => [course.id, course.title])), [courses]);
  const filteredNotes = deferredResourceQuery
    ? notes.filter((note) => `${note.title} ${courseTitleById.get(note.course_id) ?? ""}`.toLowerCase().includes(deferredResourceQuery))
    : notes;
  const filteredMaterials = deferredResourceQuery
    ? materials.filter((material) => `${material.title} ${courseTitleById.get(material.course_id) ?? ""}`.toLowerCase().includes(deferredResourceQuery))
    : materials;

  const handleNoteDownload = async (noteId: string) => {
    try {
      setDownloadingNoteId(noteId);
      const response = await fetch(`/api/notes/${noteId}/download`);
      const data = await response.json();

      if (!response.ok || !data?.url) {
        throw new Error(data?.error ?? "Unable to download note.");
      }

      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download note.");
    } finally {
      setDownloadingNoteId(null);
    }
  };

  const handleMaterialDownload = async (materialId: string) => {
    try {
      setDownloadingMaterialId(materialId);
      const response = await fetch(`/api/materials/${materialId}/download`);
      const data = await response.json();

      if (!response.ok || !data?.url) {
        throw new Error(data?.error ?? "Unable to download material.");
      }

      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download material.");
    } finally {
      setDownloadingMaterialId(null);
    }
  };

  if (authLoading || !ready) {
    return (
      <section className="relative mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="pointer-events-none absolute -top-10 left-0 h-48 w-48 rounded-full bg-stone-200/45 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-20 h-56 w-56 rounded-full bg-slate-200/35 blur-3xl" />
        <div className="space-y-5 animate-pulse">
          <div className="rounded-[32px] border border-stone-200/70 bg-white/92 p-6 shadow-[0_24px_60px_rgba(36,32,28,0.08)]">
            <div className="h-4 w-28 rounded-full bg-stone-200" />
            <div className="mt-4 h-10 w-2/3 rounded-full bg-stone-200" />
            <div className="mt-4 h-4 w-full rounded-full bg-stone-200" />
            <div className="mt-2 h-4 w-3/4 rounded-full bg-stone-200" />
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`portal-metric-${index}`} className="h-32 rounded-[24px] bg-stone-100" />
              ))}
            </div>
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
            <div className="h-[420px] rounded-[30px] bg-white/92" />
            <div className="h-[420px] rounded-[30px] bg-white/92" />
          </div>
        </div>
      </section>
    );
  }

  if (!user || role !== "student") {
    return (
      <section className="relative mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="rounded-[32px] border border-stone-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,243,238,0.96))] p-8 shadow-[0_24px_60px_rgba(36,32,28,0.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">Student Portal</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-slate-950">Student access required</h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Sign in with a valid student account to open your private courses, tests, resources, and announcements.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login?type=student" className={primaryButtonClass}>Go to Student Login</Link>
            <Link href="/courses" className={secondaryButtonClass}>Browse Courses</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="pointer-events-none absolute -top-10 left-0 h-48 w-48 rounded-full bg-stone-200/45 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-20 h-56 w-56 rounded-full bg-slate-200/35 blur-3xl" />
      <div className="pointer-events-none absolute bottom-6 left-1/3 h-52 w-52 rounded-full bg-stone-100/70 blur-3xl" />

      <div className="space-y-6">
        {error ? (
          <div className="rounded-[22px] border border-amber-200 bg-amber-50/90 px-5 py-4 text-sm text-amber-700 shadow-[0_12px_28px_rgba(36,32,28,0.04)]">
            {error}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-[34px] border border-stone-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,241,236,0.96))] p-6 shadow-[0_28px_80px_rgba(36,32,28,0.08)] sm:p-7">
          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr] xl:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-slate-900 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">Student Portal</span>
                <StatusBadge tone="neutral">Live academic feed</StatusBadge>
              </div>
              <h1 className="mt-5 max-w-4xl text-3xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-4xl lg:text-[3rem]">
                Welcome back, {firstName}. Your study system is clean, focused, and ready.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                Use this portal to track assigned courses, stay ahead of upcoming tests, open secure resources, and catch new announcements without the usual clutter.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <StatusBadge tone="success">{courses.length} assigned courses</StatusBadge>
                <StatusBadge tone={upcomingCount > 0 ? "warning" : "neutral"}>{upcomingCount} upcoming tests</StatusBadge>
                <StatusBadge tone="neutral">{resourceCount} resource files</StatusBadge>
              </div>
            </div>

            <div className="rounded-[28px] border border-stone-200/80 bg-white/84 p-5 shadow-[0_16px_36px_rgba(36,32,28,0.05)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">Session Overview</p>
              <div className="mt-4 space-y-4 text-sm text-slate-600">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">Next test</p>
                    <p className="mt-1 leading-6">{nextTest ? nextTest.title : "No test scheduled yet"}</p>
                  </div>
                  <StatusBadge tone={nextTest ? "warning" : "neutral"}>{nextTest ? formatDate(nextTest.test_date) : "Clear"}</StatusBadge>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">Latest result</p>
                    <p className="mt-1 leading-6">{latestResult ? `${latestResult.test_title ?? "Test"} · ${latestResult.marks}` : "No results recorded yet"}</p>
                  </div>
                  <StatusBadge tone={latestResult ? "success" : "neutral"}>{latestResult ? "Live" : "Pending"}</StatusBadge>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">Last login</p>
                    <p className="mt-1 leading-6">{formatDateTime(lastLogin)}</p>
                  </div>
                  <StatusBadge tone="neutral">Session</StatusBadge>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Courses" value={courses.length} helper="Assigned learning tracks visible in this portal" />
            <MetricCard label="Upcoming tests" value={upcomingCount} helper={`${missedCount} missed and ${completedCount} completed so far`} />
            <MetricCard label="Average score" value={averageMarks} helper={results.length > 0 ? `Best score ${bestMarks}` : "No result data yet"} />
            <MetricCard label="Resources" value={resourceCount} helper={`${announcements.length} announcements currently active`} />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <div className="space-y-6">
            <PortalSection title="Assigned Courses" description="These are the courses already attached to your account by the institute admin." action={<Link href="/courses" className={secondaryButtonClass}>Browse Full Catalog</Link>}>
              {courses.length === 0 ? (
                <EmptyState title="No assigned courses yet" description="Your admin has not attached a course yet. Check back soon or contact the institute for activation." />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {courses.map((course, index) => (
                    <article key={course.id} className={softCardClass}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-semibold tracking-[-0.03em] text-slate-950">{course.title}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{course.description || "Assigned course with portal-based resources and assessment tracking."}</p>
                        </div>
                        <StatusBadge tone="neutral">#{index + 1}</StatusBadge>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <StatusBadge tone="success">Assigned</StatusBadge>
                        <StatusBadge tone="neutral">Portal ready</StatusBadge>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </PortalSection>

            <PortalSection title="Assessment Timeline" description="Upcoming, completed, and missed tests are grouped here so you can plan faster and recover earlier.">
              <div className="mb-4 flex flex-wrap gap-2">
                {[
                  { id: "all", label: "All" },
                  { id: "upcoming", label: "Upcoming" },
                  { id: "completed", label: "Completed" },
                  { id: "missed", label: "Missed" },
                ].map((filter) => {
                  const active = timelineFilter === filter.id;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setTimelineFilter(filter.id as TimelineFilter)}
                      className={active ? primaryButtonClass : secondaryButtonClass}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
              <div className="space-y-3">
                {filteredTestActivity.length === 0 ? (
                  <EmptyState title="No test activity for this filter" description="Try a different timeline filter or wait for the admin to publish more assessments." />
                ) : (
                  filteredTestActivity.map((test) => {
                    const tone = test.status === "completed" ? "success" : test.status === "upcoming" ? "warning" : "danger";
                    const label = test.status === "completed" ? "Completed" : test.status === "upcoming" ? "Upcoming" : "Missed";

                    return (
                      <div key={test.id} className={`${softCardClass} flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between`}>
                        <div>
                          <p className="font-semibold text-slate-900">{test.title}</p>
                          <p className="mt-1 text-sm text-slate-600">{courseTitleById.get(test.course_id) ?? "Course"} · {formatDate(test.test_date)}</p>
                        </div>
                        <StatusBadge tone={tone}>{label}</StatusBadge>
                      </div>
                    );
                  })
                )}
              </div>
            </PortalSection>

            <PortalSection
              title="Resource Center"
              description="Search and open notes or books attached to your assigned courses. Public files also stay available on the open libraries."
              action={
                <div className="flex flex-wrap gap-3">
                  <Link href="/notes" className={secondaryButtonClass}>Open Notes Library</Link>
                  <Link href="/books" className={secondaryButtonClass}>Open Books Library</Link>
                </div>
              }
            >
              <div className="mb-5">
                <label className="block">
                  <span className="sr-only">Search notes and books</span>
                  <input
                    value={resourceQuery}
                    onChange={(event) => setResourceQuery(event.target.value)}
                    placeholder="Search notes or books by name or course"
                    className="w-full rounded-[20px] border border-stone-200/80 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-stone-300 focus:shadow-[0_0_0_4px_rgba(231,226,219,0.7)]"
                  />
                </label>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-950">Notes</h3>
                    <StatusBadge tone="neutral">{filteredNotes.length}</StatusBadge>
                  </div>
                  <div className="space-y-3">
                    {filteredNotes.length === 0 ? (
                      <EmptyState title="No notes found" description={notes.length === 0 ? "Notes uploaded by the admin will appear here automatically." : "Try a different search term to find a note faster."} />
                    ) : (
                      filteredNotes.slice(0, 6).map((note) => (
                        <div key={note.id} className={softCardClass}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">{note.title}</p>
                              <p className="mt-1 text-sm text-slate-600">{courseTitleById.get(note.course_id) ?? "Course"}</p>
                            </div>
                            <StatusBadge tone={note.visibility === "public" ? "success" : "neutral"}>{formatResourceVisibility(note.visibility)}</StatusBadge>
                          </div>
                          <div className="mt-4">
                            <button type="button" onClick={() => handleNoteDownload(note.id)} className={primaryButtonClass}>
                              {downloadingNoteId === note.id ? "Preparing..." : "Open Note"}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-950">Books</h3>
                    <StatusBadge tone="neutral">{filteredMaterials.length}</StatusBadge>
                  </div>
                  <div className="space-y-3">
                    {filteredMaterials.length === 0 ? (
                      <EmptyState title="No books found" description={materials.length === 0 ? "Books and PDFs uploaded by the admin will appear here automatically." : "Try a different search term to find a book faster."} />
                    ) : (
                      filteredMaterials.slice(0, 6).map((material) => (
                        <div key={material.id} className={softCardClass}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">{material.title}</p>
                              <p className="mt-1 text-sm text-slate-600">{courseTitleById.get(material.course_id) ?? "Course"}</p>
                            </div>
                            <StatusBadge tone={material.visibility === "public" ? "success" : "neutral"}>{formatResourceVisibility(material.visibility)}</StatusBadge>
                          </div>
                          <div className="mt-4">
                            <button type="button" onClick={() => handleMaterialDownload(material.id)} className={primaryButtonClass}>
                              {downloadingMaterialId === material.id ? "Preparing..." : "Open Book"}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </PortalSection>
          </div>

          <div className="space-y-6">
            <PortalSection title="Quick Actions" description="Jump into the most-used study surfaces without leaving the portal.">
              <div className="grid gap-3">
                {[
                  { href: "/courses", label: "Explore courses", description: "Review the full catalog and fee structure." },
                  { href: "/test-series", label: "Open test series", description: "Practice in the assessment workspace." },
                  { href: "/notes", label: "Open notes", description: "Go straight to the revision library." },
                    { href: "/books", label: "Open books", description: "Browse books and reference PDFs." },
                  { href: "/question-papers", label: "Question papers", description: "Access paper-based preparation material." },
                ].map((action) => (
                  <Link key={action.href} href={action.href} className={actionCardClass}>
                    <p className="text-base font-semibold tracking-[-0.02em] text-slate-950">{action.label}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
                  </Link>
                ))}
              </div>
            </PortalSection>

            <PortalSection title="Performance Board" description="Your recent result pattern and participation rate stay visible here for quick review.">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className={softCardClass}>
                  <p className="text-xs text-stone-500">Participation</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{participationRate}%</p>
                  <p className="mt-2 text-sm text-slate-600">Based on results recorded against scheduled tests.</p>
                </div>
                <div className={softCardClass}>
                  <p className="text-xs text-stone-500">Best score</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{bestMarks}</p>
                  <p className="mt-2 text-sm text-slate-600">Highest recorded marks visible in the portal.</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Recent result trend</p>
                {recentResultTrend.length === 0 ? (
                  <EmptyState title="No result trend yet" description="Once marks are recorded by the admin, your recent progress will appear here." />
                ) : (
                  recentResultTrend.map((item) => {
                    const width = Math.max(8, Math.round((Number(item.marks || 0) / peakForTrend) * 100));
                    return (
                      <div key={item.test_id} className={softCardClass}>
                        <div className="flex items-center justify-between gap-4 text-sm">
                          <div>
                            <p className="font-semibold text-slate-900">{item.test_title ?? "Test"}</p>
                            <p className="mt-1 text-xs text-slate-500">{item.test_date ? formatDate(item.test_date) : "No date"}</p>
                          </div>
                          <StatusBadge tone="success">{item.marks}</StatusBadge>
                        </div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-200">
                          <div className="h-2 rounded-full bg-[linear-gradient(90deg,rgba(27,32,40,1),rgba(86,96,110,1))] transition-[width] duration-500" style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </PortalSection>

            <PortalSection title="Announcements" description="The latest institute communication arrives here first.">
              <div className="space-y-3">
                {announcements.length === 0 ? (
                  <EmptyState title="No announcements yet" description="Once the admin publishes updates, they will appear in this stream." />
                ) : (
                  announcements.map((announcement) => (
                    <article key={announcement.id} className={softCardClass}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">{announcement.title}</p>
                          <p className="mt-1 text-xs text-slate-500">{formatDateTime(announcement.created_at)}</p>
                        </div>
                        {latestAnnouncement?.id === announcement.id ? <StatusBadge tone="success">Latest</StatusBadge> : null}
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{announcement.body}</p>
                    </article>
                  ))
                )}
              </div>
            </PortalSection>
          </div>
        </div>
      </div>
    </section>
  );
}