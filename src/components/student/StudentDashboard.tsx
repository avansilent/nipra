"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";
import { motion } from "framer-motion";
import { useAuth } from "../../app/AuthProvider";

export default function StudentDashboard() {
  const { user, role, instituteId, loading: authLoading } = useAuth();
  const [ready, setReady] = useState(false);
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  const [courses, setCourses] = useState<Array<{ id: string; title: string; description: string | null }>>([]);
  const [tests, setTests] = useState<Array<{ id: string; title: string; test_date: string; course_id: string }>>([]);
  const [results, setResults] = useState<Array<{ test_id: string; marks: number; test_title: string | null }>>([]);
  const [notes, setNotes] = useState<Array<{ id: string; title: string; file_url: string; course_id: string }>>([]);
  const [materials, setMaterials] = useState<Array<{ id: string; title: string; file_url: string; course_id: string }>>([]);
  const [announcements, setAnnouncements] = useState<Array<{ id: string; title: string; body: string; created_at: string }>>([]);
  const [timelineFilter, setTimelineFilter] = useState<"all" | "upcoming" | "completed" | "missed">("all");
  const [downloadingNoteId, setDownloadingNoteId] = useState<string | null>(null);
  const [downloadingMaterialId, setDownloadingMaterialId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
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
  const surfaceClass =
    "rounded-[2rem] bg-white/92 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.08)] backdrop-blur-xl";
  const innerCardClass =
    "rounded-[1.6rem] bg-white px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)]";
  const actionCardClass =
    "rounded-[1.4rem] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(15,23,42,0.1)]";
  const microStatClass =
    "rounded-[1.5rem] bg-white p-4 shadow-[0_16px_34px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5";

  useEffect(() => {
    if (!supabase || authLoading) {
      return;
    }

    const loadDashboard = async () => {
      if (!user) {
        setReady(true);
        setError("Session not available yet. Please refresh once.");
        return;
      }

      if (role !== "student") {
        setReady(true);
        setError("Student access is required for this dashboard.");
        return;
      }

      if (!instituteId) {
        setReady(true);
        setError("Institute not assigned for this account.");
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
                .select("test_id, marks, test:tests(title)")
                .eq("student_id", user.id)
                .eq("institute_id", instituteId)
                .order("created_at", { ascending: false })
            ),
            withTimeout(
              supabase
                .from("notes")
                .select("id, title, file_url, course_id")
                .eq("institute_id", instituteId)
                .in("course_id", courseIds)
                .order("created_at", { ascending: false })
            ),
            withTimeout(
              supabase
                .from("materials")
                .select("id, title, file_url, course_id")
                .eq("institute_id", instituteId)
                .in("course_id", courseIds)
                .order("created_at", { ascending: false })
            ),
          ]);

          const [testsResult, resultsResult, notesResult, materialsResult] = settledCourseQueries;

          if (testsResult.status === "fulfilled") {
            if (testsResult.value.error) {
              throw new Error(testsResult.value.error.message);
            }
            setTests(testsResult.value.data ?? []);
          } else {
            setTests([]);
          }

          if (resultsResult.status === "fulfilled") {
            if (resultsResult.value.error) {
              throw new Error(resultsResult.value.error.message);
            }

            const normalizedResults = ((resultsResult.value.data ?? []) as ResultSelectRow[]).map((row) => ({
              test_id: row.test_id,
              marks: row.marks,
              test_title: Array.isArray(row.test) ? row.test[0]?.title ?? null : row.test?.title ?? null,
            }));
            setResults(normalizedResults);
          } else {
            setResults([]);
          }

          if (notesResult.status === "fulfilled") {
            if (notesResult.value.error) {
              throw new Error(notesResult.value.error.message);
            }
            setNotes((notesResult.value.data ?? []) as NoteRow[]);
          } else {
            setNotes([]);
          }

          if (materialsResult.status === "fulfilled") {
            if (materialsResult.value.error) {
              throw new Error(materialsResult.value.error.message);
            }
            setMaterials(materialsResult.value.data ?? []);
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
              .limit(6)
          );

          if (announcementError) {
            throw new Error(announcementError.message);
          }

          setAnnouncements(announcementRows ?? []);
        } catch {
          setAnnouncements([]);
        }

        setReady(true);
      } catch (dashboardError) {
        setReady(true);
        setError(dashboardError instanceof Error ? dashboardError.message : "Unable to load dashboard.");
      }
    };

    void loadDashboard();
  }, [authLoading, instituteId, role, supabase, user]);

  const nextTest = tests.find((test) => new Date(test.test_date) >= new Date()) ?? null;
  const upcomingCount = tests.filter((test) => new Date(test.test_date) >= new Date()).length;
  const averageMarks = results.length > 0 ? Math.round(results.reduce((sum, item) => sum + Number(item.marks || 0), 0) / results.length) : 0;
  const bestMarks = results.length > 0 ? Math.max(...results.map((item) => Number(item.marks || 0))) : 0;
  const readinessScore = Math.min(100, Math.round((results.length * 12) + (upcomingCount * 9)));
  const consistencyScore = Math.min(100, Math.round((results.length * 10) + (upcomingCount * 6)));
  const participationRate = tests.length > 0 ? Math.min(100, Math.round((results.length / tests.length) * 100)) : 0;
  const focusScore = Math.min(100, Math.round((notes.length * 7) + (courses.length * 8)));

  const trackerItems = [
    { label: "Readiness", value: readinessScore, tint: "from-slate-900 to-slate-600" },
    { label: "Consistency", value: consistencyScore, tint: "from-stone-700 to-slate-500" },
    { label: "Participation", value: participationRate, tint: "from-slate-700 to-slate-500" },
    { label: "Focus", value: focusScore, tint: "from-slate-800 to-slate-500" },
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

  return (
    <section className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-10 md:py-16">
      <div className="pointer-events-none absolute -top-16 -left-14 h-56 w-56 rounded-full bg-slate-200/50 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-20 h-64 w-64 rounded-full bg-stone-200/45 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-slate-100/70 blur-3xl" />
      {error && (
        <div className="mb-6 rounded-3xl bg-white px-4 py-3 text-sm text-slate-700 shadow-[0_14px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          {error}
        </div>
      )}
      {!ready ? (
        <div className="rounded-[2.2rem] bg-white/92 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <p className="text-sm text-slate-500">Loading student dashboard...</p>
        </div>
      ) : (
        <>
          <motion.div initial="hidden" animate="visible" transition={{ duration: 0.45 }} variants={sectionVariant} className="relative overflow-hidden rounded-[2.3rem] bg-white/94 p-6 md:p-8 lg:p-10 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-bl-[2rem] bg-gradient-to-br from-slate-100/90 to-transparent" />
            <div className="pointer-events-none absolute left-0 bottom-0 h-24 w-24 rounded-tr-[2rem] bg-gradient-to-tr from-slate-100/70 to-transparent" />
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Student Command Center</p>
                <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight">Welcome back. Let’s keep momentum.</h1>
                <p className="mt-2 text-sm md:text-base text-slate-600 max-w-2xl">Everything you need in one place: enrolled courses, upcoming tests, notes, and performance insights.</p>
              </div>
              <div className="min-w-[240px] rounded-3xl bg-white px-5 py-4 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Next Test</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{nextTest ? nextTest.title : "No upcoming tests"}</p>
                <p className="text-xs text-slate-500 mt-1">{nextTest ? new Date(nextTest.test_date).toLocaleDateString() : "You're all caught up."}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[{ label: "Courses", value: courses.length }, { label: "Upcoming", value: upcomingCount }, { label: "Results", value: results.length }, { label: "Avg Score", value: averageMarks }, { label: "Best Score", value: bestMarks }, { label: "Resources", value: notes.length }].map((item) => (
                <motion.div key={item.label} whileHover={{ y: -4, scale: 1.01 }} className="rounded-[1.6rem] bg-white px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.07)] backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">{item.label}</p>
                  <p className="text-xl font-semibold text-slate-900 mt-1">{item.value}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div initial="hidden" animate="visible" transition={{ duration: 0.45, delay: 0.07 }} variants={sectionVariant} className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className={surfaceClass}>
              <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-900 tracking-wide">Enrolled Courses</h2><Link href="/courses" className="text-xs font-semibold text-slate-700">Browse all</Link></div>
              <div className="mt-4 space-y-3 text-sm text-slate-600">{courses.length === 0 ? <div className={innerCardClass}>No courses yet.</div> : courses.map((course, index) => (<div key={course.id} className={innerCardClass}><div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-slate-900">{course.title}</p>{course.description && <p className="text-xs text-slate-500 mt-1">{course.description}</p>}</div><span className="rounded-full bg-stone-100 px-2 py-1 text-[11px] font-semibold text-slate-700">#{index + 1}</span></div></div>))}</div>
            </div>

            <div className={surfaceClass}>
              <h2 className="text-sm font-semibold text-slate-900 tracking-wide">Quick Actions</h2>
              <div className="mt-4 grid gap-3 text-sm">
                <Link href="/test-series" className={actionCardClass}>Open Test Series</Link>
                <Link href="/notes" className={actionCardClass}>Open Notes Library</Link>
                <Link href="/question-papers" className={actionCardClass}>Open Question Papers</Link>
                <Link href="/dashboard" className={actionCardClass}>Academic Dashboard</Link>
              </div>

              <div className="mt-6 rounded-[1.7rem] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-3">Advanced Tracking</h3>
                <div className="space-y-3">{trackerItems.map((item) => (<div key={item.label}><div className="flex items-center justify-between text-xs text-slate-600 mb-1"><span>{item.label}</span><span className="font-semibold text-slate-900">{item.value}%</span></div><div className="h-2.5 rounded-full bg-slate-200/80 overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${item.value}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className={`h-2 rounded-full bg-gradient-to-r ${item.tint}`} /></div></div>))}</div>
              </div>
            </div>
          </motion.div>

          <motion.div initial="hidden" animate="visible" transition={{ duration: 0.45, delay: 0.1 }} variants={sectionVariant} className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className={microStatClass}><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Attendance</p><p className="mt-2 text-2xl font-bold text-slate-900">{participationRate}%</p><p className="text-xs text-slate-500 mt-1">Based on tests attempted</p></div>
            <div className={microStatClass}><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Recent Activity</p><p className="mt-2 text-2xl font-bold text-slate-900">{tests.length + notes.length}</p><p className="text-xs text-slate-500 mt-1">Tests + resources this cycle</p></div>
            <div className={microStatClass}><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Last Login</p><p className="mt-2 text-base font-semibold text-slate-900">{lastLogin ? new Date(lastLogin).toLocaleString() : "Not available"}</p><p className="text-xs text-slate-500 mt-1">Auto-restored from session</p></div>
            <div className={microStatClass}><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Progress Chart</p><div className="mt-3 space-y-2">{(recentResultTrend.length ? recentResultTrend : [{ test_id: "init", marks: 0, test_title: "No data" }]).map((item) => { const width = recentResultTrend.length > 0 ? Math.max(8, Math.round((Number(item.marks || 0) / peakForTrend) * 100)) : 8; return (<div key={item.test_id}><div className="flex items-center justify-between text-[11px] text-slate-600 mb-1"><span>{item.test_title ?? "Test"}</span><span>{item.marks}</span></div><div className="h-2 rounded-full bg-slate-200 overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${width}%` }} transition={{ duration: 0.6, ease: "easeOut" }} className="h-2 rounded-full bg-gradient-to-r from-slate-900 to-slate-600" /></div></div>); })}</div></div>
          </motion.div>

          <motion.div initial="hidden" animate="visible" transition={{ duration: 0.45, delay: 0.14 }} variants={sectionVariant} className="mt-8 grid gap-6 md:grid-cols-2">
            <div className={surfaceClass}><h3 className="text-sm font-semibold text-slate-900">Upcoming tests</h3><div className="mt-3 space-y-3 text-sm text-slate-600">{tests.length === 0 ? <div>No tests scheduled.</div> : tests.map((test) => (<div key={test.id} className={`${innerCardClass} flex items-center justify-between`}><div><p className="font-semibold text-slate-900">{test.title}</p><p className="text-xs text-slate-500">{test.test_date}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">Scheduled</span></div>))}</div></div>
            <div className={surfaceClass}><h3 className="text-sm font-semibold text-slate-900">Results</h3><div className="mt-3 space-y-3 text-sm text-slate-600">{results.length === 0 ? <div>No results recorded.</div> : results.map((result) => (<div key={result.test_id} className={`${innerCardClass} flex items-center justify-between`}><div><p className="font-semibold text-slate-900">{result.test_title ?? "Test"}</p><p className="text-xs text-slate-500">Marks</p></div><div className="text-sm font-semibold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-full">{result.marks}</div></div>))}</div><div className="mt-5 rounded-[1.8rem] bg-slate-50 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Score trend</p>{recentResultTrend.length === 0 ? <p className="text-sm text-slate-500 mt-2">No trend data yet.</p> : <div className="mt-3 space-y-2">{recentResultTrend.map((item) => { const width = Math.max(8, Math.round((Number(item.marks || 0) / peakForTrend) * 100)); return (<div key={item.test_id}><div className="flex items-center justify-between text-xs text-slate-600 mb-1"><span>{item.test_title ?? "Test"}</span><span className="font-semibold text-slate-900">{item.marks}</span></div><div className="h-2 rounded-full bg-slate-200 overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${width}%` }} transition={{ duration: 0.7, ease: "easeOut" }} className="h-2 rounded-full bg-gradient-to-r from-slate-900 to-slate-600" /></div></div>); })}</div>}</div></div>
          </motion.div>

          <motion.div initial="hidden" animate="visible" transition={{ duration: 0.45, delay: 0.2 }} variants={sectionVariant} className={`mt-8 ${surfaceClass}`}><div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-900">Study Resources (Notes)</h3><Link href="/notes" className="text-xs font-semibold text-slate-700">View all</Link></div><div className="mt-4 space-y-3">{notes.length === 0 ? <p className="text-sm text-slate-500">No notes available yet.</p> : notes.map((note) => (<div key={note.id} className={innerCardClass}><p className="text-sm font-semibold text-slate-900">{note.title}</p><button type="button" onClick={() => handleNoteDownload(note.id)} className="mt-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800 transition" disabled={downloadingNoteId === note.id}>{downloadingNoteId === note.id ? "Preparing..." : "Secure download"}</button></div>))}</div></motion.div>

          <motion.div initial="hidden" animate="visible" transition={{ duration: 0.45, delay: 0.26 }} variants={sectionVariant} className={`mt-8 ${surfaceClass}`}><h3 className="text-sm font-semibold text-slate-900">Test Activity Timeline</h3><div className="mt-3 flex flex-wrap gap-2">{[{ id: "all", label: "All" }, { id: "upcoming", label: "Upcoming" }, { id: "completed", label: "Completed" }, { id: "missed", label: "Missed" }].map((filter) => { const active = timelineFilter === filter.id; return (<button key={filter.id} type="button" onClick={() => setTimelineFilter(filter.id as "all" | "upcoming" | "completed" | "missed")} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${active ? "bg-gradient-to-r from-slate-900 to-slate-700 text-white shadow-[0_12px_26px_rgba(15,23,42,0.18)]" : "bg-white/82 text-slate-600 shadow-[0_8px_20px_rgba(15,23,42,0.05)] hover:bg-white/95"}`}>{filter.label}</button>); })}</div><div className="mt-4 space-y-2">{filteredTestActivity.length === 0 ? <p className="text-sm text-slate-500">No test activity yet.</p> : filteredTestActivity.map((test) => { const status = test.status === "completed" ? "Completed" : test.status === "upcoming" ? "Upcoming" : "Missed"; const statusClass = "bg-slate-100 text-slate-700"; return (<div key={test.id} className={`${innerCardClass} flex items-center justify-between gap-3`}><div><p className="text-sm font-semibold text-slate-900">{test.title}</p><p className="text-xs text-slate-500">{new Date(test.test_date).toLocaleDateString()}</p></div><span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusClass}`}>{status}</span></div>); })}</div></motion.div>

          <motion.div initial="hidden" animate="visible" transition={{ duration: 0.45, delay: 0.32 }} variants={sectionVariant} className="mt-8 grid gap-6 md:grid-cols-2"><div className={surfaceClass}><div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-900">Study Materials</h3><span className="text-xs text-slate-500">PDF uploads from admin</span></div><div className="mt-4 space-y-3">{materials.length === 0 ? <p className="text-sm text-slate-500">No materials uploaded yet.</p> : materials.map((material) => (<div key={material.id} className={innerCardClass}><p className="text-sm font-semibold text-slate-900">{material.title}</p><button type="button" onClick={() => handleMaterialDownload(material.id)} className="mt-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800 transition" disabled={downloadingMaterialId === material.id}>{downloadingMaterialId === material.id ? "Preparing..." : "Secure download"}</button></div>))}</div></div><div className={surfaceClass}><h3 className="text-sm font-semibold text-slate-900">Announcements</h3><div className="mt-4 space-y-3">{announcements.length === 0 ? <p className="text-sm text-slate-500">No announcements yet.</p> : announcements.map((announcement) => (<div key={announcement.id} className={innerCardClass}><p className="text-sm font-semibold text-slate-900">{announcement.title}</p><p className="mt-1 text-xs text-slate-500">{new Date(announcement.created_at).toLocaleDateString()}</p><p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{announcement.body}</p></div>))}</div></div></motion.div>
        </>
      )}
    </section>
  );
}