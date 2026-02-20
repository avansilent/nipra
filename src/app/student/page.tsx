"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";
import { motion } from "framer-motion";

export default function StudentPortal() {
  const [ready, setReady] = useState(false);
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  const [courses, setCourses] = useState<Array<{ id: string; title: string; description: string | null }>>([]);
  const [tests, setTests] = useState<Array<{ id: string; title: string; test_date: string; course_id: string }>>([]);
  const [results, setResults] = useState<Array<{ test_id: string; marks: number; test_title: string | null }>>([]);
  const [notes, setNotes] = useState<Array<{ id: string; title: string; file_url: string; course_id: string }>>([]);
  const [timelineFilter, setTimelineFilter] = useState<"all" | "upcoming" | "completed" | "missed">("all");
  const [downloadingNoteId, setDownloadingNoteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const normalizeRole = (role?: string | null): "admin" | "student" =>
    role === "admin" ? "admin" : "student";
  const withTimeout = async <T,>(
    promise: Promise<T> | PromiseLike<T>,
    ms = 5000
  ): Promise<T> => {
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
  type CourseRow = { id: string; title: string; description: string | null };
  type EnrollmentSelectRow = { course: CourseRow | CourseRow[] | null };
  type ResultSelectRow = {
    test_id: string;
    marks: number;
    test: { title: string } | Array<{ title: string }> | null;
  };
  type NoteRow = { id: string; title: string; file_url: string; course_id: string };

  const sectionVariant = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  };

  useEffect(() => {
    if (!supabase) {
      router.replace("/login?type=student");
      return;
    }

    supabase.auth.getUser().then(async ({ data }) => {
      try {
        const user = data.user;
        if (!user) {
          router.replace("/login?type=student");
          return;
        }

        const { data: profile } = await withTimeout(
          supabase
            .from("profiles")
            .select("role, institute_id")
            .eq("id", user.id)
            .maybeSingle()
        );

        const role = normalizeRole(
          profile?.role ??
            user.app_metadata?.role ??
            user.user_metadata?.role ??
            "student"
        );

        setLastLogin(user.last_sign_in_at ?? null);

        if (role !== "student") {
          router.replace(role === "admin" ? "/admin/dashboard" : "/login");
          return;
        }

        const instituteId =
          profile?.institute_id ??
          (user.app_metadata?.institute_id as string | undefined) ??
          (user.user_metadata?.institute_id as string | undefined) ??
          null;

        if (!instituteId) {
          setError("Institute not assigned for this account.");
          return;
        }

        const { data: enrollmentRows, error: enrollmentError } = await withTimeout(
          supabase
            .from("enrollments")
            .select("course:course_id (id, title, description)")
            .eq("student_id", user.id)
            .eq("institute_id", instituteId)
        );

        if (enrollmentError) {
          setError(enrollmentError.message);
          return;
        }

        const enrolledCourses = ((enrollmentRows ?? []) as EnrollmentSelectRow[])
          .flatMap((row) => {
            if (!row.course) {
              return [];
            }
            return Array.isArray(row.course) ? row.course : [row.course];
          });

        setCourses(enrolledCourses);

        const courseIds = enrolledCourses.map((course) => course.id);

        if (courseIds.length > 0) {
          const { data: testRows, error: testError } = await withTimeout(
            supabase
              .from("tests")
              .select("id, title, test_date, course_id")
                .eq("institute_id", instituteId)
              .in("course_id", courseIds)
              .order("test_date", { ascending: true })
          );

          if (testError) {
            setError(testError.message);
          } else {
            setTests(testRows ?? []);
          }

          const { data: noteRows, error: noteError } = await withTimeout(
            supabase
              .from("notes")
              .select("id, title, file_url, course_id")
                .eq("institute_id", instituteId)
              .in("course_id", courseIds)
              .limit(10)
          );

          if (noteError) {
            setError(noteError.message);
          } else {
            setNotes((noteRows ?? []) as NoteRow[]);
          }
        }

        const { data: resultRows, error: resultError } = await withTimeout(
          supabase
            .from("results")
            .select("test_id, marks, test:tests(title)")
            .eq("student_id", user.id)
            .eq("institute_id", instituteId)
        );

        if (resultError) {
          setError(resultError.message);
        } else {
          const mappedResults = ((resultRows ?? []) as ResultSelectRow[]).map((row) => {
            const relatedTest = Array.isArray(row.test) ? row.test[0] : row.test;
            return {
              test_id: row.test_id,
              marks: row.marks,
              test_title: relatedTest?.title ?? null,
            };
          });
          setResults(mappedResults);
        }
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to load dashboard.");
      } finally {
        setReady(true);
      }
    });
  }, [router, supabase]);

  if (!ready) {
    return (
      <section className="w-full max-w-6xl mx-auto py-10 md:py-16 animate-pulse">
        <div className="rounded-3xl bg-white/75 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <div className="h-6 w-56 rounded bg-slate-200" />
          <div className="mt-3 h-4 w-80 rounded bg-slate-200" />
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={`student-kpi-${idx}`} className="h-20 rounded-2xl bg-slate-200" />
            ))}
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="h-48 rounded-3xl bg-slate-200" />
            <div className="h-48 rounded-3xl bg-slate-200" />
          </div>
        </div>
      </section>
    );
  }

  const averageMarks =
    results.length > 0
      ? Math.round(
          results.reduce((sum, item) => sum + Number(item.marks || 0), 0) /
            results.length
        )
      : 0;
  const bestMarks =
    results.length > 0
      ? Math.max(...results.map((item) => Number(item.marks || 0)))
      : 0;
  const upcomingCount = tests.filter((test) => new Date(test.test_date) >= new Date()).length;
  const nextTest = tests.find((test) => new Date(test.test_date) >= new Date()) ?? null;
  const participationRate = tests.length > 0 ? Math.min(100, Math.round((results.length / tests.length) * 100)) : 0;
  const readinessScore = Math.min(100, Math.round((averageMarks * 0.6) + (participationRate * 0.4)));
  const consistencyScore = Math.min(100, Math.round((averageMarks + bestMarks) / 2));
  const focusScore = Math.min(100, Math.round((notes.length * 7) + (courses.length * 8)));

  const trackerItems = [
    { label: "Readiness", value: readinessScore, tint: "from-indigo-500 to-sky-500" },
    { label: "Consistency", value: consistencyScore, tint: "from-sky-500 to-cyan-500" },
    { label: "Participation", value: participationRate, tint: "from-violet-500 to-indigo-500" },
    { label: "Focus", value: focusScore, tint: "from-cyan-500 to-blue-500" },
  ];

  const testActivity = tests.slice(0, 12).map((test) => {
    const taken = results.some((result) => result.test_id === test.id);
    const isUpcoming = new Date(test.test_date) >= new Date();
    const status = taken ? "completed" : isUpcoming ? "upcoming" : "missed";
    return { ...test, status };
  });

  const filteredTestActivity =
    timelineFilter === "all"
      ? testActivity
      : testActivity.filter((test) => test.status === timelineFilter);

  const recentResultTrend = results.slice(0, 6).reverse();
  const peakForTrend =
    recentResultTrend.length > 0
      ? Math.max(...recentResultTrend.map((item) => Number(item.marks || 0)), 1)
      : 1;

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

  return (
    <section className="relative w-full max-w-6xl mx-auto px-3 md:px-0 py-10 md:py-16">
      <div className="pointer-events-none absolute -top-16 -left-14 h-56 w-56 rounded-full bg-indigo-200/45 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-20 h-64 w-64 rounded-full bg-sky-200/45 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-violet-200/35 blur-3xl" />
      {error && (
        <div className="mb-6 rounded-3xl bg-red-50/90 px-4 py-3 text-sm text-red-700 shadow-[0_14px_30px_rgba(239,68,68,0.15)] ring-1 ring-red-100/70 backdrop-blur-md">
          {error}
        </div>
      )}
      <motion.div
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.45 }}
        variants={sectionVariant}
        className="relative overflow-hidden rounded-[2.2rem] bg-gradient-to-br from-white/92 via-slate-100/70 to-sky-50/75 p-6 md:p-8 shadow-[0_30px_80px_rgba(15,23,42,0.12)] ring-1 ring-white/70"
      >
        <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-bl-[2rem] bg-gradient-to-br from-indigo-200/35 to-sky-200/10" />
        <div className="pointer-events-none absolute left-0 bottom-0 h-24 w-24 rounded-tr-[2rem] bg-gradient-to-tr from-cyan-200/35 to-transparent" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-600/80 font-semibold">
              Student Command Center
            </p>
            <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
              Welcome back. Let’s keep momentum.
            </h1>
            <p className="mt-2 text-sm md:text-base text-slate-600 max-w-2xl">
              Everything you need in one place: enrolled courses, upcoming tests,
              notes, and performance insights.
            </p>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-white to-sky-50/80 px-5 py-4 shadow-[0_20px_50px_rgba(14,165,233,0.12)] min-w-[240px] ring-1 ring-white/80">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Next Test</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {nextTest ? nextTest.title : "No upcoming tests"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {nextTest ? new Date(nextTest.test_date).toLocaleDateString() : "You're all caught up."}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <motion.div whileHover={{ y: -4, scale: 1.01 }} className="rounded-2xl bg-gradient-to-br from-white/92 to-indigo-50/40 px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-sm ring-1 ring-white/70">
            <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">Courses</p>
            <p className="text-xl font-semibold text-slate-900 mt-1">{courses.length}</p>
          </motion.div>
          <motion.div whileHover={{ y: -4, scale: 1.01 }} className="rounded-2xl bg-gradient-to-br from-white/92 to-sky-50/50 px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-sm ring-1 ring-white/70">
            <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">Upcoming</p>
            <p className="text-xl font-semibold text-slate-900 mt-1">{upcomingCount}</p>
          </motion.div>
          <motion.div whileHover={{ y: -4, scale: 1.01 }} className="rounded-2xl bg-gradient-to-br from-white/92 to-violet-50/45 px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-sm ring-1 ring-white/70">
            <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">Results</p>
            <p className="text-xl font-semibold text-slate-900 mt-1">{results.length}</p>
          </motion.div>
          <motion.div whileHover={{ y: -4, scale: 1.01 }} className="rounded-2xl bg-gradient-to-br from-white/92 to-cyan-50/45 px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-sm ring-1 ring-white/70">
            <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">Avg Score</p>
            <p className="text-xl font-semibold text-slate-900 mt-1">{averageMarks}</p>
          </motion.div>
          <motion.div whileHover={{ y: -4, scale: 1.01 }} className="rounded-2xl bg-gradient-to-br from-white/92 to-emerald-50/45 px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-sm ring-1 ring-white/70">
            <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">Best Score</p>
            <p className="text-xl font-semibold text-slate-900 mt-1">{bestMarks}</p>
          </motion.div>
          <motion.div whileHover={{ y: -4, scale: 1.01 }} className="rounded-2xl bg-gradient-to-br from-white/92 to-amber-50/50 px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-sm ring-1 ring-white/70">
            <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">Resources</p>
            <p className="text-xl font-semibold text-slate-900 mt-1">{notes.length}</p>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.45, delay: 0.07 }}
        variants={sectionVariant}
        className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"
      >
        <div className="rounded-[2rem] bg-gradient-to-br from-white/84 to-indigo-50/45 p-6 shadow-[0_22px_60px_rgba(15,23,42,0.1)] backdrop-blur-md ring-1 ring-white/70">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 tracking-wide">Enrolled Courses</h2>
            <Link href="/courses" className="text-xs font-semibold text-indigo-600">Browse all</Link>
          </div>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            {courses.length === 0 ? (
              <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm">No courses yet.</div>
            ) : (
              courses.map((course, index) => (
                <div key={course.id} className="rounded-2xl bg-white/88 px-4 py-3 shadow-[0_12px_28px_rgba(15,23,42,0.07)] ring-1 ring-white/80">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{course.title}</p>
                      {course.description && (
                        <p className="text-xs text-slate-500 mt-1">{course.description}</p>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">#{index + 1}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[2rem] bg-gradient-to-br from-white/84 to-sky-50/40 p-6 shadow-[0_22px_60px_rgba(15,23,42,0.1)] backdrop-blur-md ring-1 ring-white/70">
          <h2 className="text-sm font-semibold text-slate-900 tracking-wide">Quick Actions</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <Link href="/test-series" className="rounded-2xl px-4 py-3 bg-gradient-to-r from-indigo-50 to-sky-50/80 shadow-[0_8px_24px_rgba(15,23,42,0.07)] ring-1 ring-white/80 hover:shadow-[0_14px_30px_rgba(79,70,229,0.16)] hover:-translate-y-0.5 transition">Open Test Series</Link>
            <Link href="/notes" className="rounded-2xl px-4 py-3 bg-gradient-to-r from-violet-50 to-indigo-50/80 shadow-[0_8px_24px_rgba(15,23,42,0.07)] ring-1 ring-white/80 hover:shadow-[0_14px_30px_rgba(79,70,229,0.16)] hover:-translate-y-0.5 transition">Open Notes Library</Link>
            <Link href="/question-papers" className="rounded-2xl px-4 py-3 bg-gradient-to-r from-cyan-50 to-sky-50/80 shadow-[0_8px_24px_rgba(15,23,42,0.07)] ring-1 ring-white/80 hover:shadow-[0_14px_30px_rgba(79,70,229,0.16)] hover:-translate-y-0.5 transition">Open Question Papers</Link>
            <Link href="/dashboard" className="rounded-2xl px-4 py-3 bg-gradient-to-r from-emerald-50 to-cyan-50/80 shadow-[0_8px_24px_rgba(15,23,42,0.07)] ring-1 ring-white/80 hover:shadow-[0_14px_30px_rgba(79,70,229,0.16)] hover:-translate-y-0.5 transition">Academic Dashboard</Link>
          </div>

          <div className="mt-6 rounded-2xl bg-white/70 p-4 ring-1 ring-white/75">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-3">Advanced Tracking</h3>
            <div className="space-y-3">
              {trackerItems.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                    <span>{item.label}</span>
                    <span className="font-semibold text-slate-900">{item.value}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-200/80 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.value}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={`h-2 rounded-full bg-gradient-to-r ${item.tint}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.45, delay: 0.1 }}
        variants={sectionVariant}
        className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <div className="glass-readable smooth-hover p-4 hover:-translate-y-0.5">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Attendance</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{participationRate}%</p>
          <p className="text-xs text-slate-500 mt-1">Based on tests attempted</p>
        </div>
        <div className="glass-readable smooth-hover p-4 hover:-translate-y-0.5">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Recent Activity</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{tests.length + notes.length}</p>
          <p className="text-xs text-slate-500 mt-1">Tests + resources this cycle</p>
        </div>
        <div className="glass-readable smooth-hover p-4 hover:-translate-y-0.5">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Last Login</p>
          <p className="mt-2 text-base font-semibold text-slate-900">
            {lastLogin ? new Date(lastLogin).toLocaleString() : "Not available"}
          </p>
          <p className="text-xs text-slate-500 mt-1">Auto-restored from session</p>
        </div>
        <div className="glass-readable smooth-hover p-4 hover:-translate-y-0.5">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Progress Chart</p>
          <div className="mt-3 space-y-2">
            {(recentResultTrend.length ? recentResultTrend : [{ test_id: "init", marks: 0, test_title: "No data" }]).map((item) => {
              const width = recentResultTrend.length > 0 ? Math.max(8, Math.round((Number(item.marks || 0) / peakForTrend) * 100)) : 8;
              return (
                <div key={item.test_id}>
                  <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                    <span>{item.test_title ?? "Test"}</span>
                    <span>{item.marks}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${width}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-sky-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.45, delay: 0.14 }}
        variants={sectionVariant}
        className="mt-8 grid gap-6 md:grid-cols-2"
      >
        <div className="rounded-[2rem] bg-gradient-to-br from-white/84 to-violet-50/40 p-6 shadow-[0_22px_60px_rgba(15,23,42,0.1)] backdrop-blur-md ring-1 ring-white/70">
          <h3 className="text-sm font-semibold text-slate-900">Upcoming tests</h3>
          <div className="mt-3 space-y-3 text-sm text-slate-600">
            {tests.length === 0 ? (
              <div>No tests scheduled.</div>
            ) : (
              tests.map((test) => (
                <div key={test.id} className="flex items-center justify-between rounded-2xl px-4 py-3 bg-white/88 ring-1 ring-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                  <div>
                    <p className="font-semibold text-slate-900">{test.title}</p>
                    <p className="text-xs text-slate-500">{test.test_date}</p>
                  </div>
                  <span className="text-[11px] font-semibold text-violet-700 bg-violet-50 px-2.5 py-1 rounded-full">Scheduled</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[2rem] bg-gradient-to-br from-white/84 to-cyan-50/35 p-6 shadow-[0_22px_60px_rgba(15,23,42,0.1)] backdrop-blur-md ring-1 ring-white/70">
          <h3 className="text-sm font-semibold text-slate-900">Results</h3>
          <div className="mt-3 space-y-3 text-sm text-slate-600">
            {results.length === 0 ? (
              <div>No results recorded.</div>
            ) : (
              results.map((result) => (
                <div key={result.test_id} className="flex items-center justify-between rounded-2xl px-4 py-3 bg-white/88 ring-1 ring-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {result.test_title ?? "Test"}
                    </p>
                    <p className="text-xs text-slate-500">Marks</p>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">{result.marks}</div>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 rounded-3xl bg-gradient-to-br from-slate-100/90 to-sky-50/80 p-4 ring-1 ring-white/70">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Score trend</p>
            {recentResultTrend.length === 0 ? (
              <p className="text-sm text-slate-500 mt-2">No trend data yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {recentResultTrend.map((item) => {
                  const width = Math.max(
                    8,
                    Math.round((Number(item.marks || 0) / peakForTrend) * 100)
                  );

                  return (
                    <div key={item.test_id}>
                      <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                        <span>{item.test_title ?? "Test"}</span>
                        <span className="font-semibold text-slate-900">{item.marks}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${width}%` }}
                          transition={{ duration: 0.7, ease: "easeOut" }}
                          className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-sky-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.45, delay: 0.2 }}
        variants={sectionVariant}
        className="mt-8 rounded-[2rem] bg-gradient-to-br from-white/84 to-emerald-50/30 p-6 shadow-[0_22px_60px_rgba(15,23,42,0.1)] backdrop-blur-md ring-1 ring-white/70"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Study Resources (Notes)</h3>
          <Link href="/notes" className="text-xs font-semibold text-indigo-600">View all</Link>
        </div>
        <div className="mt-4 space-y-3">
          {notes.length === 0 ? (
            <p className="text-sm text-slate-500">No notes available yet.</p>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="rounded-2xl px-4 py-3 bg-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.06)] ring-1 ring-white/85"
              >
                <p className="text-sm font-semibold text-slate-900">{note.title}</p>
                <button
                  type="button"
                  onClick={() => handleNoteDownload(note.id)}
                  className="mt-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800 transition"
                  disabled={downloadingNoteId === note.id}
                >
                  {downloadingNoteId === note.id ? "Preparing..." : "Secure download"}
                </button>
              </div>
            ))
          )}
        </div>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.45, delay: 0.26 }}
        variants={sectionVariant}
        className="mt-8 rounded-[2.1rem] bg-gradient-to-br from-white/84 to-indigo-50/35 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.1)] backdrop-blur-md ring-1 ring-white/70"
      >
        <h3 className="text-sm font-semibold text-slate-900">Test Activity Timeline</h3>
        <div className="mt-3 flex flex-wrap gap-2">
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
                onClick={() => setTimelineFilter(filter.id as "all" | "upcoming" | "completed" | "missed")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-gradient-to-r from-indigo-600 to-sky-500 text-white shadow"
                    : "bg-white/85 text-slate-600 ring-1 ring-slate-100 hover:ring-indigo-200"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
        <div className="mt-4 space-y-2">
          {filteredTestActivity.length === 0 ? (
            <p className="text-sm text-slate-500">No test activity yet.</p>
          ) : (
            filteredTestActivity.map((test) => {
              const status =
                test.status === "completed"
                  ? "Completed"
                  : test.status === "upcoming"
                    ? "Upcoming"
                    : "Missed";
              const statusClass =
                status === "Completed"
                  ? "bg-emerald-100 text-emerald-700"
                  : status === "Upcoming"
                    ? "bg-sky-100 text-sky-700"
                    : "bg-rose-100 text-rose-700";

              return (
                <div key={test.id} className="rounded-2xl bg-white/90 px-4 py-3 flex items-center justify-between gap-3 ring-1 ring-white/85 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{test.title}</p>
                    <p className="text-xs text-slate-500">{new Date(test.test_date).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusClass}`}>{status}</span>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </section>
  );
}
