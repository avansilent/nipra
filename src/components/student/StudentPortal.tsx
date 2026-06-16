"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "../../app/AuthProvider";
import { isBunnyStreamReference } from "../../lib/bunnyStreamReference";
import {
  getEnrollmentAccessLabel,
  getEnrollmentAccessMessage,
  getEnrollmentAccessTone,
  isEnrollmentAccessActive,
  type EnrollmentAccessRow,
} from "../../lib/enrollmentAccess";
import { formatResourceVisibility, type ResourceVisibility } from "../../lib/resourceVisibility";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";
import AssignmentCard, { type StudentAssignment } from "./AssignmentCard";
import AssignmentSubmitModal from "./AssignmentSubmitModal";
import LiveClassCard, { type StudentLiveSession } from "./LiveClassCard";
import LiveClassViewer from "./LiveClassViewer";
import SessionMaterialsList from "./SessionMaterialsList";

type CourseRow = {
  id: string;
  title: string;
  description: string | null;
};

type EnrollmentSelectRow = {
  student_id?: string;
  course_id?: string;
  enrolled_at?: string;
  course: CourseRow | CourseRow[] | null;
} & EnrollmentAccessRow;

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
  test: { title: string; test_date: string; course_id?: string | null } | Array<{ title: string; test_date: string; course_id?: string | null }> | null;
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

type ActiveVideo = {
  id: string;
  title: string;
  embedUrl: string;
};

type TimelineFilter = "all" | "upcoming" | "completed" | "missed";

type BlockedEnrollmentRow = EnrollmentSelectRow & {
  course: CourseRow;
};

const shellSurfaceClass =
  "student-surface min-w-0 overflow-hidden rounded-[32px] bg-white/94 p-5 shadow-[0_20px_52px_rgba(226,232,240,0.9)] sm:p-6";
const softCardClass =
  "student-soft-card min-w-0 overflow-hidden rounded-[24px] bg-white/92 p-4 shadow-[0_14px_30px_rgba(226,232,240,0.86)]";
const actionCardClass =
  "student-soft-card min-w-0 overflow-hidden rounded-[24px] bg-white/92 p-4 shadow-[0_14px_30px_rgba(226,232,240,0.86)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(226,232,240,0.94)]";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-[1.4rem] bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(56,189,248,0.24)] transition duration-300 hover:-translate-y-0.5 hover:bg-sky-700 hover:shadow-[0_18px_34px_rgba(56,189,248,0.3)] disabled:cursor-not-allowed disabled:opacity-70";
const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-[1.4rem] bg-[#f6f8fb] px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-[0_10px_22px_rgba(226,232,240,0.84)] transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_28px_rgba(226,232,240,0.92)]";

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

async function readApiResponse<T>(response: Response, fallback: string): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? fallback);
  }

  return payload as T;
}

function getIstDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}-${month}-${day}`;
}

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
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-700">{title}</h2>
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
    <div className="student-soft-card min-w-0 overflow-hidden rounded-[24px] bg-white/92 p-4 shadow-[0_14px_30px_rgba(226,232,240,0.88)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-700">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{helper}</p>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="student-empty-state min-w-0 rounded-[22px] bg-[#f6f8fb] px-4 py-5 text-sm text-slate-600 shadow-[0_10px_24px_rgba(226,232,240,0.72)]">
      <p className="font-semibold text-slate-700">{title}</p>
      <p className="mt-1 leading-6">{description}</p>
    </div>
  );
}

export default function StudentPortal() {
  const { user, role, roleResolved, instituteId, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])!;
  const userId = user?.id ?? null;
  const userLastSignInAt = user?.last_sign_in_at ?? null;

  const [ready, setReady] = useState(false);
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [blockedEnrollments, setBlockedEnrollments] = useState<BlockedEnrollmentRow[]>([]);
  const [tests, setTests] = useState<TestRow[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [notes, setNotes] = useState<ResourceRow[]>([]);
  const [materials, setMaterials] = useState<ResourceRow[]>([]);
  const [videos, setVideos] = useState<ResourceRow[]>([]);
  const [activeVideo, setActiveVideo] = useState<ActiveVideo | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [liveUpcomingSessions, setLiveUpcomingSessions] = useState<StudentLiveSession[]>([]);
  const [livePastSessions, setLivePastSessions] = useState<StudentLiveSession[]>([]);
  const [studentAssignments, setStudentAssignments] = useState<StudentAssignment[]>([]);
  const [onlineClassLoading, setOnlineClassLoading] = useState(false);
  const [onlineClassError, setOnlineClassError] = useState<string | null>(null);
  const [liveViewerSession, setLiveViewerSession] = useState<StudentLiveSession | null>(null);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const [resourceQuery, setResourceQuery] = useState("");
  const [statusTime, setStatusTime] = useState(0);
  const [downloadingNoteId, setDownloadingNoteId] = useState<string | null>(null);
  const [downloadingMaterialId, setDownloadingMaterialId] = useState<string | null>(null);
  const [loadingVideoId, setLoadingVideoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deferredResourceQuery = useDeferredValue(resourceQuery.trim().toLowerCase());

  const withTimeout = useCallback(async <T,>(promise: Promise<T> | PromiseLike<T>, ms = 6000): Promise<T> => {
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
  }, []);

  const resolveEffectiveInstituteId = useCallback(async () => {
    if (instituteId) {
      return instituteId;
    }

    if (!userId) {
      return null;
    }

    try {
      const { data: profile } = await withTimeout(
        supabase
          .from("profiles")
          .select("institute_id")
          .eq("id", userId)
          .maybeSingle(),
        3500
      );

      if (profile?.institute_id) {
        return profile.institute_id as string;
      }
    } catch {
      // Fall back to enrollments below while the browser auth session catches up.
    }

    try {
      const { data: enrollment } = await withTimeout(
        supabase
          .from("enrollments")
          .select("institute_id")
          .eq("student_id", userId)
          .limit(1)
          .maybeSingle(),
        3500
      );

      return (enrollment?.institute_id as string | undefined) ?? null;
    } catch {
      return null;
    }
  }, [instituteId, supabase, userId, withTimeout]);

  useEffect(() => {
    if (authLoading || (userId && !roleResolved)) {
      return;
    }

    const loadPortal = async () => {
      if (!userId) {
        setReady(true);
        return;
      }

      if (role !== "student") {
        setReady(true);
        return;
      }

        setLastLogin(userLastSignInAt);

      const effectiveInstituteId = await resolveEffectiveInstituteId();

      if (!effectiveInstituteId) {
        setCourses([]);
        setBlockedEnrollments([]);
        setTests([]);
        setResults([]);
        setNotes([]);
        setMaterials([]);
        setVideos([]);
        setActiveVideo(null);
        setAnnouncements([]);
        setError("Your payment is verified. Refresh this page once if the course is still preparing.");
        setReady(true);
        return;
      }

      setError(null);
      setReady(false);
      setStatusTime(Date.now());

      try {
        const { data: enrollmentRows, error: enrollmentError } = await withTimeout(
          supabase
            .from("enrollments")
            .select("*, course:course_id (id, title, description)")
            .eq("student_id", userId)
            .eq("institute_id", effectiveInstituteId)
        );

        if (enrollmentError) {
          throw new Error(enrollmentError.message);
        }

        const normalizedEnrollments = ((enrollmentRows ?? []) as EnrollmentSelectRow[]).flatMap((row) => {
          const course = singleRelation(row.course);
          return course ? [{ ...row, course }] : [];
        }) as BlockedEnrollmentRow[];
        const activeEnrollments = normalizedEnrollments.filter((row) => isEnrollmentAccessActive(row));
        const inactiveEnrollments = normalizedEnrollments.filter((row) => !isEnrollmentAccessActive(row));
        const enrolledCourses = activeEnrollments.map((row) => row.course);

        setCourses(enrolledCourses);
        setBlockedEnrollments(inactiveEnrollments);

        const courseIds = enrolledCourses.map((course) => course.id);
        const activeCourseIdSet = new Set(courseIds);

        if (courseIds.length > 0) {
          const settledCourseQueries = await Promise.allSettled([
            withTimeout(
              supabase
                .from("tests")
                .select("id, title, test_date, course_id")
                .eq("institute_id", effectiveInstituteId)
                .in("course_id", courseIds)
                .order("test_date", { ascending: true })
                .limit(24)
            ),
            withTimeout(
              supabase
                .from("results")
                .select("test_id, marks, recorded_at, test:tests(title, test_date, course_id)")
                .eq("student_id", userId)
                .eq("institute_id", effectiveInstituteId)
                .order("recorded_at", { ascending: false })
                .limit(12)
            ),
            withTimeout(
              supabase
                .from("notes")
                .select("id, title, file_url, course_id, visibility, created_at")
                .eq("institute_id", effectiveInstituteId)
                .in("visibility", ["student", "public"])
                .in("course_id", courseIds)
                .order("created_at", { ascending: false })
                .limit(12)
            ),
            withTimeout(
              supabase
                .from("materials")
                .select("id, title, file_url, course_id, visibility, created_at")
                .eq("institute_id", effectiveInstituteId)
                .in("visibility", ["student", "public"])
                .in("course_id", courseIds)
                .order("created_at", { ascending: false })
                .not("file_url", "like", "bunny-stream:%")
                .limit(12)
            ),
            withTimeout(
              supabase
                .from("materials")
                .select("id, title, file_url, course_id, visibility, created_at")
                .eq("institute_id", effectiveInstituteId)
                .in("visibility", ["student", "public"])
                .in("course_id", courseIds)
                .like("file_url", "bunny-stream:%")
                .order("created_at", { ascending: false })
                .limit(12)
            ),
          ]);

          const [testsResult, resultsResult, notesResult, materialsResult, videosResult] = settledCourseQueries;

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

            const normalizedResults = ((resultsResult.value.data ?? []) as ResultSelectRow[])
              .map((row) => {
                const test = singleRelation(row.test);
                return {
                  test,
                  result: {
                    test_id: row.test_id,
                    marks: Number(row.marks ?? 0),
                    recorded_at: row.recorded_at,
                    test_title: test?.title ?? null,
                    test_date: test?.test_date ?? null,
                  },
                };
              })
              .filter((row) => !row.test?.course_id || activeCourseIdSet.has(row.test.course_id))
              .map((row) => row.result);
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
            setMaterials(((materialsResult.value.data ?? []) as ResourceRow[]).filter((row) => !isBunnyStreamReference(row.file_url)));
          } else {
            setMaterials([]);
          }

          if (videosResult.status === "fulfilled") {
            if (videosResult.value.error) {
              throw new Error(videosResult.value.error.message);
            }
            const normalizedVideos = ((videosResult.value.data ?? []) as ResourceRow[]).filter((row) => isBunnyStreamReference(row.file_url));
            setVideos(normalizedVideos);
            setActiveVideo((currentVideo) =>
              currentVideo && normalizedVideos.some((video) => video.id === currentVideo.id) ? currentVideo : null
            );
          } else {
            setVideos([]);
            setActiveVideo(null);
          }
        } else {
          setTests([]);
          setResults([]);
          setNotes([]);
          setMaterials([]);
          setVideos([]);
          setActiveVideo(null);
        }

        try {
          const { data: announcementRows, error: announcementError } = await withTimeout(
            supabase
              .from("announcements")
              .select("id, title, body, created_at")
              .eq("institute_id", effectiveInstituteId)
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
  }, [authLoading, role, roleResolved, resolveEffectiveInstituteId, supabase, userId, userLastSignInAt, withTimeout]);

  const displayName = useMemo(() => {
    const metadataName = typeof user?.user_metadata?.name === "string" ? user.user_metadata.name : null;
    const base = metadataName || user?.email?.split("@")[0] || "Student";
    return base.replace(/[._-]+/g, " ").trim();
  }, [user]);

  const firstName = displayName.split(" ")[0] || "Student";
  const resourceCount = notes.length + materials.length + videos.length;
  const nextTest = tests.find((test) => new Date(test.test_date) >= new Date()) ?? null;
  const upcomingCount = tests.filter((test) => new Date(test.test_date) >= new Date()).length;
  const averageMarks = results.length > 0 ? Math.round(results.reduce((sum, item) => sum + Number(item.marks || 0), 0) / results.length) : 0;
  const bestMarks = results.length > 0 ? Math.max(...results.map((item) => Number(item.marks || 0))) : 0;
  const latestResult = results[0] ?? null;

  const resultTestIds = useMemo(() => new Set(results.map((result) => result.test_id)), [results]);
  const testActivity = useMemo(() => {
    const currentTime = statusTime;
    return tests.slice(0, 12).map((test) => {
      const taken = resultTestIds.has(test.id);
      const isUpcoming = new Date(test.test_date).getTime() >= currentTime;
      const status = taken ? "completed" : isUpcoming ? "upcoming" : "missed";
      return { ...test, status };
    });
  }, [resultTestIds, statusTime, tests]);

  const completedCount = useMemo(() => testActivity.filter((item) => item.status === "completed").length, [testActivity]);
  const missedCount = useMemo(() => testActivity.filter((item) => item.status === "missed").length, [testActivity]);
  const participationRate = tests.length > 0 ? Math.min(100, Math.round((results.length / tests.length) * 100)) : 0;

  const filteredTestActivity = useMemo(
    () => (timelineFilter === "all" ? testActivity : testActivity.filter((test) => test.status === timelineFilter)),
    [testActivity, timelineFilter]
  );

  const recentResultTrend = useMemo(() => results.slice(0, 6).reverse(), [results]);
  const peakForTrend = recentResultTrend.length > 0 ? Math.max(...recentResultTrend.map((item) => Number(item.marks || 0)), 1) : 1;
  const chartPointItems = useMemo(() => recentResultTrend.map((item, index, trend) => {
    const score = Number(item.marks || 0);
    const x = trend.length === 1 ? 50 : 8 + (index / Math.max(trend.length - 1, 1)) * 84;
    const y = 88 - (score / peakForTrend) * 68;

    return {
      id: item.test_id,
      label: item.test_title ?? "Test",
      score,
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
    };
  }), [peakForTrend, recentResultTrend]);
  const chartPolyline = useMemo(() => chartPointItems.map((point) => `${point.x},${point.y}`).join(" "), [chartPointItems]);
  const chartFill = chartPolyline ? `8,92 ${chartPolyline} 92,92` : "";
  const latestAnnouncement = announcements[0] ?? null;
  const primaryBlockedEnrollment = blockedEnrollments[0] ?? null;
  const blockedCoursePaymentHref = primaryBlockedEnrollment
    ? `/join?interest=${encodeURIComponent(primaryBlockedEnrollment.course.title)}#admission`
    : "/join#admission";
  const todayIstDateKey = getIstDateKey();
  const todayMaterialSessions = useMemo(
    () =>
      livePastSessions
        .filter((session) => session.status === "completed" && session.session_date === todayIstDateKey)
        .slice(0, 4),
    [livePastSessions, todayIstDateKey]
  );
  const visibleAssignments = useMemo(() => studentAssignments.slice(0, 8), [studentAssignments]);

  const courseTitleById = useMemo(() => new Map(courses.map((course) => [course.id, course.title])), [courses]);
  const filteredNotes = useMemo(
    () =>
      deferredResourceQuery
        ? notes.filter((note) => `${note.title} ${courseTitleById.get(note.course_id) ?? ""}`.toLowerCase().includes(deferredResourceQuery))
        : notes,
    [courseTitleById, deferredResourceQuery, notes]
  );
  const filteredMaterials = useMemo(
    () =>
      deferredResourceQuery
        ? materials.filter((material) => `${material.title} ${courseTitleById.get(material.course_id) ?? ""}`.toLowerCase().includes(deferredResourceQuery))
        : materials,
    [courseTitleById, deferredResourceQuery, materials]
  );
  const filteredVideos = useMemo(
    () =>
      deferredResourceQuery
        ? videos.filter((video) => `${video.title} ${courseTitleById.get(video.course_id) ?? ""}`.toLowerCase().includes(deferredResourceQuery))
        : videos,
    [courseTitleById, deferredResourceQuery, videos]
  );

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

  const loadOnlineClassData = useCallback(async (options?: { silent?: boolean }) => {
    if (!userId || role !== "student") {
      setLiveUpcomingSessions([]);
      setLivePastSessions([]);
      setStudentAssignments([]);
      setOnlineClassLoading(false);
      setOnlineClassError(null);
      return;
    }

    if (!options?.silent) {
      setOnlineClassLoading(true);
    }
    setOnlineClassError(null);

    try {
      const [sessionsResponse, assignmentsResponse] = await Promise.all([
        fetch("/api/student/sessions", { cache: "no-store" }),
        fetch("/api/student/assignments", { cache: "no-store" }),
      ]);
      const sessionsPayload = await readApiResponse<{
        upcoming?: StudentLiveSession[];
        past?: StudentLiveSession[];
        sessions?: StudentLiveSession[];
      }>(sessionsResponse, "Unable to load live classes");
      const assignmentsPayload = await readApiResponse<{ assignments?: StudentAssignment[] }>(
        assignmentsResponse,
        "Unable to load assignments"
      );

      setLiveUpcomingSessions(sessionsPayload.upcoming ?? []);
      setLivePastSessions(sessionsPayload.past ?? []);
      setStudentAssignments(assignmentsPayload.assignments ?? []);
    } catch (loadError) {
      setOnlineClassError(loadError instanceof Error ? loadError.message : "Unable to load live classes");
      setLiveUpcomingSessions([]);
      setLivePastSessions([]);
      setStudentAssignments([]);
    } finally {
      if (!options?.silent) {
        setOnlineClassLoading(false);
      }
    }
  }, [role, userId]);

  useEffect(() => {
    if (authLoading || (userId && !roleResolved)) {
      return;
    }

    const loadTimer = window.setTimeout(() => {
      void loadOnlineClassData();
    }, 0);

    return () => {
      window.clearTimeout(loadTimer);
    };
  }, [authLoading, loadOnlineClassData, roleResolved, userId]);

  useEffect(() => {
    if (authLoading || (userId && !roleResolved) || !userId || role !== "student") {
      return;
    }

    const refreshLiveClasses = () => {
      void loadOnlineClassData({ silent: true });
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        refreshLiveClasses();
      }
    };

    window.addEventListener("focus", refreshLiveClasses);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    const refreshTimer = window.setInterval(refreshLiveClasses, 60_000);

    return () => {
      window.removeEventListener("focus", refreshLiveClasses);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.clearInterval(refreshTimer);
    };
  }, [authLoading, loadOnlineClassData, role, roleResolved, userId]);

  const handleVideoOpen = async (video: ResourceRow) => {
    try {
      setLoadingVideoId(video.id);
      const response = await fetch(`/api/videos/${encodeURIComponent(video.id)}/embed`);
      const data = await response.json();

      if (!response.ok || !data?.embedUrl) {
        throw new Error(data?.error ?? "Unable to open video.");
      }

      setActiveVideo({
        id: video.id,
        title: data.title ?? video.title,
        embedUrl: data.embedUrl,
      });
      setError(null);
    } catch (videoError) {
      setError(videoError instanceof Error ? videoError.message : "Unable to open video.");
    } finally {
      setLoadingVideoId(null);
    }
  };

  if (authLoading || (user && !roleResolved) || !ready) {
    return (
      <section className="student-portal-shell relative mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="pointer-events-none absolute -top-10 left-0 h-48 w-48 rounded-full bg-stone-200/45 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-20 h-56 w-56 rounded-full bg-slate-200/35 blur-3xl" />
        <div className="space-y-5 animate-pulse">
          <div className="rounded-[32px] bg-white/92 p-6 shadow-[0_24px_60px_rgba(226,232,240,0.88)]">
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
      <section className="student-portal-shell relative mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="student-surface rounded-[32px] bg-white/92 p-8 shadow-[0_24px_60px_rgba(226,232,240,0.88)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">Student Portal</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-slate-950">Student access required</h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Sign in to open your courses, tests, and resources.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login?type=student" className={primaryButtonClass}>Go to Student Login</Link>
            <Link href="/courses" className={secondaryButtonClass}>Browse Courses</Link>
          </div>
        </div>
      </section>
    );
  }

  if (courses.length === 0 && blockedEnrollments.length > 0) {
    return (
      <section className="student-portal-shell relative mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="pointer-events-none absolute -top-10 left-0 h-48 w-48 rounded-full bg-stone-200/45 blur-3xl" />
        <div className="student-surface rounded-[32px] bg-white/94 p-6 shadow-[0_24px_60px_rgba(226,232,240,0.88)] sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-amber-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">Access paused</span>
            <StatusBadge tone="danger">{blockedEnrollments.length} course{blockedEnrollments.length === 1 ? "" : "s"} locked</StatusBadge>
          </div>
          <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-[-0.06em] text-slate-700 sm:text-4xl">
            Complete payment or choose a course to reopen your portal.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            Your private dashboard is hidden until course access becomes active again.
          </p>

          <div className="mt-6 grid gap-3">
            {blockedEnrollments.slice(0, 4).map((enrollment) => (
              <article key={`${enrollment.student_id ?? "student"}-${enrollment.course.id}`} className={softCardClass}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{enrollment.course.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{getEnrollmentAccessMessage(enrollment)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {enrollment.payment_due_at ? <StatusBadge tone="warning">Due {formatDate(enrollment.payment_due_at)}</StatusBadge> : null}
                      {enrollment.access_ends_at ? <StatusBadge tone="neutral">Ended {formatDate(enrollment.access_ends_at)}</StatusBadge> : null}
                    </div>
                  </div>
                  <StatusBadge tone={getEnrollmentAccessTone(enrollment)}>{getEnrollmentAccessLabel(enrollment)}</StatusBadge>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={blockedCoursePaymentHref} className={primaryButtonClass}>Pay Due</Link>
            <Link href="/courses" className={secondaryButtonClass}>Choose Course</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="student-portal-shell relative mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="pointer-events-none absolute -top-10 left-0 h-48 w-48 rounded-full bg-stone-200/45 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-20 h-56 w-56 rounded-full bg-slate-200/35 blur-3xl" />
      <div className="pointer-events-none absolute bottom-6 left-1/3 h-52 w-52 rounded-full bg-stone-100/70 blur-3xl" />

      <div className="min-w-0 space-y-6">
        {error ? (
          <div className="rounded-[22px] bg-amber-50/90 px-5 py-4 text-sm text-amber-700 shadow-[0_12px_28px_rgba(253,230,138,0.34)]">
            {error}
          </div>
        ) : null}

        <div className="student-surface overflow-hidden rounded-[36px] bg-white/94 p-6 shadow-[0_28px_80px_rgba(226,232,240,0.92)] sm:p-7">
          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr] xl:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-sky-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">Student Portal</span>
                <StatusBadge tone="neutral">Live academic feed</StatusBadge>
              </div>
              <h1 className="mt-5 max-w-4xl text-3xl font-semibold tracking-[-0.06em] text-slate-700 sm:text-4xl lg:text-[3rem]">
                Hi {firstName}, ready to study?
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                Courses, tests, results, and resources are here.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <StatusBadge tone="success">{courses.length} assigned courses</StatusBadge>
                <StatusBadge tone={upcomingCount > 0 ? "warning" : "neutral"}>{upcomingCount} upcoming tests</StatusBadge>
                <StatusBadge tone="neutral">{resourceCount} learning assets</StatusBadge>
              </div>
            </div>

            <div className="student-soft-card rounded-[28px] bg-[#f8fafd] p-5 shadow-[0_16px_36px_rgba(226,232,240,0.88)]">
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
                    <p className="mt-1 leading-6">{latestResult ? `${latestResult.test_title ?? "Test"} - ${latestResult.marks}` : "No results yet"}</p>
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
            <MetricCard label="Courses" value={courses.length} helper="Assigned" />
            <MetricCard label="Tests" value={upcomingCount} helper={`${completedCount} done, ${missedCount} missed`} />
            <MetricCard label="Average" value={averageMarks} helper={results.length > 0 ? `Best ${bestMarks}` : "No marks yet"} />
            <MetricCard label="Assets" value={resourceCount} helper={`${videos.length} videos, ${announcements.length} updates`} />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <div className="space-y-6">
            <PortalSection title="My Courses" action={<Link href="/courses" className={secondaryButtonClass}>Catalog</Link>}>
              {courses.length === 0 ? (
                <EmptyState title="No courses yet" description="Ask admin to assign your course." />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {courses.map((course, index) => (
                    <article key={course.id} className={softCardClass}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-semibold tracking-[-0.03em] text-slate-950">{course.title}</p>
                          {course.description ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{course.description}</p> : null}
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

            <PortalSection
              title="Live Classes"
              description="Join active classes and track the next scheduled sessions."
              action={
                <button type="button" className={secondaryButtonClass} onClick={() => void loadOnlineClassData()} disabled={onlineClassLoading}>
                  Refresh
                </button>
              }
            >
              {onlineClassError ? (
                <div className="mb-4 rounded-[22px] bg-amber-50/90 px-4 py-3 text-sm font-semibold text-amber-700">
                  {onlineClassError}
                </div>
              ) : null}
              {onlineClassLoading ? (
                <div className={softCardClass}>
                  <p className="text-sm text-slate-600">Loading live classes...</p>
                </div>
              ) : liveUpcomingSessions.length === 0 ? (
                <EmptyState title="No live classes scheduled" description="Upcoming online or hybrid sessions will appear here." />
              ) : (
                <div className="space-y-3">
                  {liveUpcomingSessions.slice(0, 6).map((session) => (
                    <LiveClassCard key={session.id} session={session} onJoin={setLiveViewerSession} />
                  ))}
                </div>
              )}
            </PortalSection>

            <PortalSection title="Today's Materials" description="Released notes and files from completed classes today.">
              <SessionMaterialsList
                sessions={todayMaterialSessions}
                emptyTitle="No materials unlocked today"
                emptyDescription="When a class ends today, its released materials will appear here."
              />
            </PortalSection>

            <PortalSection
              title="Assignments"
              description="Submit work, update ungraded answers, and review graded feedback."
              action={
                <button type="button" className={secondaryButtonClass} onClick={() => void loadOnlineClassData()} disabled={onlineClassLoading}>
                  Refresh
                </button>
              }
            >
              {onlineClassLoading ? (
                <div className={softCardClass}>
                  <p className="text-sm text-slate-600">Loading assignments...</p>
                </div>
              ) : visibleAssignments.length === 0 ? (
                <EmptyState title="No assignments yet" description="Published assignments for your active courses will appear here." />
              ) : (
                <div className="space-y-3">
                  {visibleAssignments.map((assignment) => (
                    <AssignmentCard key={assignment.id} assignment={assignment} onOpen={(item) => setActiveAssignmentId(item.id)} />
                  ))}
                </div>
              )}
            </PortalSection>

            <PortalSection title="Tests">
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
                  <EmptyState title="No tests here" description="Try another filter." />
                ) : (
                  filteredTestActivity.map((test) => {
                    const tone = test.status === "completed" ? "success" : test.status === "upcoming" ? "warning" : "danger";
                    const label = test.status === "completed" ? "Completed" : test.status === "upcoming" ? "Upcoming" : "Missed";

                    return (
                      <div key={test.id} className={`${softCardClass} flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between`}>
                        <div>
                          <p className="font-semibold text-slate-900">{test.title}</p>
                          <p className="mt-1 text-sm text-slate-600">{courseTitleById.get(test.course_id) ?? "Course"} - {formatDate(test.test_date)}</p>
                        </div>
                        <StatusBadge tone={tone}>{label}</StatusBadge>
                      </div>
                    );
                  })
                )}
              </div>
            </PortalSection>

            <PortalSection
              title="Resources"
              action={
                <div className="flex flex-wrap gap-3">
                  <Link href="/notes" className={secondaryButtonClass}>Notes</Link>
                  <Link href="/books" className={secondaryButtonClass}>Books</Link>
                </div>
              }
            >
              <div className="mb-5">
                <label className="block">
                  <span className="sr-only">Search notes, books, and videos</span>
                  <input
                    value={resourceQuery}
                    onChange={(event) => setResourceQuery(event.target.value)}
                    placeholder="Search notes, books, or videos by name or course"
                    className="w-full rounded-[20px] bg-[#f8fafd] px-4 py-3 text-sm text-slate-700 outline-none shadow-[0_10px_24px_rgba(226,232,240,0.78)] transition duration-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(186,230,253,0.55),0_14px_28px_rgba(226,232,240,0.9)]"
                  />
                </label>
              </div>
              <div className="mb-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-950">Videos</h3>
                  <StatusBadge tone="neutral">{filteredVideos.length}</StatusBadge>
                </div>
                {activeVideo ? (
                  <div className="mb-4 overflow-hidden rounded-[24px] bg-slate-950 shadow-[0_18px_38px_rgba(15,23,42,0.18)]">
                    <div className="aspect-video w-full">
                      <iframe
                        key={activeVideo.embedUrl}
                        src={activeVideo.embedUrl}
                        title={activeVideo.title}
                        className="h-full w-full border-0"
                        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                      />
                    </div>
                  </div>
                ) : null}
                <div className="grid gap-3 md:grid-cols-2">
                  {filteredVideos.length === 0 ? (
                    <EmptyState title="No videos" description={videos.length === 0 ? "Course videos will appear here." : "Try another search."} />
                  ) : (
                    filteredVideos.slice(0, 6).map((video) => (
                      <div key={video.id} className={softCardClass}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{video.title}</p>
                            <p className="mt-1 text-sm text-slate-600">{courseTitleById.get(video.course_id) ?? "Course"}</p>
                          </div>
                          <StatusBadge tone={activeVideo?.id === video.id ? "success" : "neutral"}>
                            {activeVideo?.id === video.id ? "Playing" : "Video"}
                          </StatusBadge>
                        </div>
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={() => void handleVideoOpen(video)}
                            className={primaryButtonClass}
                            disabled={loadingVideoId === video.id}
                          >
                            {loadingVideoId === video.id ? "Opening..." : "Watch"}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-950">Notes</h3>
                    <StatusBadge tone="neutral">{filteredNotes.length}</StatusBadge>
                  </div>
                  <div className="space-y-3">
                    {filteredNotes.length === 0 ? (
                      <EmptyState title="No notes" description={notes.length === 0 ? "Notes will appear here." : "Try another search."} />
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
                            <button
                              type="button"
                              onClick={() => handleNoteDownload(note.id)}
                              className={primaryButtonClass}
                              disabled={downloadingNoteId === note.id}
                            >
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
                      <EmptyState title="No books" description={materials.length === 0 ? "Books will appear here." : "Try another search."} />
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
                            <button
                              type="button"
                              onClick={() => handleMaterialDownload(material.id)}
                              className={primaryButtonClass}
                              disabled={downloadingMaterialId === material.id}
                            >
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
            <PortalSection title="Quick Actions">
              <div className="grid gap-3">
                {[
                  { href: "/courses", label: "Courses" },
                  { href: "/test-series", label: "Test series" },
                  { href: "/notes", label: "Notes" },
                  { href: "/books", label: "Books" },
                  { href: "/question-papers", label: "Question papers" },
                ].map((action) => (
                  <Link key={action.href} href={action.href} className={actionCardClass}>
                    <p className="text-base font-semibold tracking-[-0.02em] text-slate-950">{action.label}</p>
                  </Link>
                ))}
              </div>
            </PortalSection>

            <PortalSection title="Progress">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className={softCardClass}>
                  <p className="text-xs text-stone-500">Participation</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{participationRate}%</p>
                </div>
                <div className={softCardClass}>
                  <p className="text-xs text-stone-500">Best score</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{bestMarks}</p>
                </div>
              </div>

              {chartPointItems.length > 0 ? (
                <div className={`${softCardClass} mt-5`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Score graph</p>
                    </div>
                    <StatusBadge tone="success">{chartPointItems[chartPointItems.length - 1]?.score ?? 0}</StatusBadge>
                  </div>
                  <div className="mt-5 rounded-[20px] bg-[#f8fafd] p-3">
                    <svg viewBox="0 0 100 100" role="img" aria-label="Recent result score graph" className="h-40 w-full overflow-visible">
                      <defs>
                        <linearGradient id="student-score-fill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {[20, 40, 60, 80].map((line) => (
                        <line key={line} x1="4" x2="96" y1={line} y2={line} stroke="#e2e8f0" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
                      ))}
                      {chartFill ? <polygon points={chartFill} fill="url(#student-score-fill)" /> : null}
                      <polyline points={chartPolyline} fill="none" stroke="#0284c7" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                      {chartPointItems.map((point) => (
                        <circle key={point.id} cx={point.x} cy={point.y} r="2.6" fill="#ffffff" stroke="#0284c7" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
                      ))}
                    </svg>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                    {chartPointItems.slice(-2).map((point) => (
                      <div key={`${point.id}-label`} className="rounded-[14px] bg-sky-50 px-3 py-2">
                        <span className="font-semibold text-slate-700">{point.label}</span>
                        <span className="ml-2 text-sky-700">{point.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {recentResultTrend.length === 0 ? (
                <div className="mt-5">
                  <EmptyState title="No marks yet" description="Scores will appear here." />
                </div>
              ) : null}
            </PortalSection>

            <PortalSection title="Announcements">
              <div className="space-y-3">
                {announcements.length === 0 ? (
                  <EmptyState title="No announcements" description="Updates will appear here." />
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
      <LiveClassViewer session={liveViewerSession} onClose={() => setLiveViewerSession(null)} />
      <AssignmentSubmitModal
        assignmentId={activeAssignmentId}
        onClose={() => setActiveAssignmentId(null)}
        onSubmitted={() => void loadOnlineClassData()}
      />
    </section>
  );
}
