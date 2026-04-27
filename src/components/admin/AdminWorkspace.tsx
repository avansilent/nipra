"use client";

import Link from "next/link";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { useAuth } from "../../app/AuthProvider";
import { defaultHomeContent, mergeHomeContent } from "../../data/homeContent";
import { defaultSiteSettings, mergeSiteSettings } from "../../data/siteSettings";
import { formatResourceVisibility, type ResourceVisibility } from "../../lib/resourceVisibility";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";
import type { Faq, HomeContent, Program, Testimonial } from "../../types/home";
import type { SiteSettings } from "../../types/site";
import AdminMetricCard from "./AdminMetricCard";
import AdminPanelCard from "./AdminPanelCard";
import AdminSidebar from "./AdminSidebar";
import type { AdminTab } from "./adminTabs";

type StudentRow = {
  id: string;
  name: string;
  email: string | null;
  login_id: string | null;
  role: string;
  created_at?: string;
};

type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  price_text: string | null;
  status: "draft" | "published" | "archived";
  cta_label: string;
  created_at?: string;
};

type EnrollmentRow = {
  student_id: string;
  course_id: string;
  enrolled_at: string;
};

type GeneratedCredentials = {
  name: string;
  email: string;
  loginId: string;
  password: string;
};

type StudentFormState = {
  name: string;
  email: string;
  loginId: string;
  password: string;
};

type ResourceRow = {
  id: string;
  title: string;
  course_id: string;
  file_url: string;
  visibility: ResourceVisibility;
  created_at?: string;
};

type TestRow = {
  id: string;
  title: string;
  test_date: string;
  course_id: string;
  created_at?: string;
};

type ResultRow = {
  student_id: string;
  test_id: string;
  marks: number;
  recorded_at?: string;
  student_name: string;
  test_title: string;
  test_date: string | null;
};

type ResultSelectRow = {
  student_id: string;
  test_id: string;
  marks: number;
  recorded_at?: string;
  student: { name: string } | Array<{ name: string }> | null;
  test: { title: string; test_date: string } | Array<{ title: string; test_date: string }> | null;
};

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

type ResourceUploadFormState = {
  courseId: string;
  title: string;
  visibility: ResourceVisibility;
  file: File | null;
};

type TestFormState = {
  title: string;
  courseId: string;
  testDate: string;
};

type ResultFormState = {
  studentId: string;
  testId: string;
  marks: string;
};

type AnnouncementFormState = {
  title: string;
  body: string;
};

type ResourceKind = "note" | "material";

const emptyStudentForm: StudentFormState = {
  name: "",
  email: "",
  loginId: "",
  password: "",
};

const emptyProgram = (): Program => ({
  id: `program-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title: "",
  subtitle: "Focus",
  chips: [],
  ctaLabel: "Explore",
  ctaHref: "/courses",
});

const emptyFaq = (): Faq => ({
  id: `faq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  question: "",
  answer: "",
});

const emptyTestimonial = (): Testimonial => ({
  id: `testimonial-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: "",
  role: "",
  quote: "",
});

const emptyResourceForm = (): ResourceUploadFormState => ({
  courseId: "",
  title: "",
  visibility: "student",
  file: null,
});

const emptyTestForm = (): TestFormState => ({
  title: "",
  courseId: "",
  testDate: "",
});

const emptyResultForm = (): ResultFormState => ({
  studentId: "",
  testId: "",
  marks: "",
});

const emptyAnnouncementForm = (): AnnouncementFormState => ({
  title: "",
  body: "",
});

const inputClass =
  "w-full rounded-[20px] border border-stone-200/80 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-stone-300 focus:shadow-[0_0_0_4px_rgba(231,226,219,0.7)]";
const textareaClass = `${inputClass} min-h-[120px] resize-y`;
const labelClass = "mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500";
const hintClass = "mt-2 text-xs text-slate-500";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-[linear-gradient(180deg,rgba(27,32,40,1),rgba(56,65,76,1))] px-4 py-2.5 text-[0.92rem] font-semibold text-white shadow-[0_18px_38px_rgba(20,24,32,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(20,24,32,0.22)] disabled:cursor-not-allowed disabled:opacity-60 sm:px-5 sm:py-3 sm:text-sm";
const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-full border border-stone-200/80 bg-white px-4 py-2.5 text-[0.92rem] font-semibold text-slate-800 shadow-[0_12px_28px_rgba(36,32,28,0.06)] transition hover:-translate-y-0.5 hover:border-stone-300 disabled:cursor-not-allowed disabled:opacity-60 sm:px-5 sm:py-3 sm:text-sm";
const subtleButtonClass =
  "inline-flex items-center justify-center rounded-full bg-stone-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-60";
const dangerButtonClass =
  "inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60";
const tableShellClass = "overflow-hidden rounded-[24px] border border-stone-200/70 bg-white/94";
const tableHeaderCellClass = "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500";
const tableCellClass = "px-4 py-4 align-top text-sm text-slate-600";
const nestedCardClass =
  "rounded-[22px] border border-stone-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,245,241,0.96))] p-4 shadow-[0_12px_28px_rgba(36,32,28,0.04)]";

const withTimeout = async <T,>(promise: Promise<T> | PromiseLike<T>, ms = 8000): Promise<T> => {
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

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
      {hint ? <p className={hintClass}>{hint}</p> : null}
    </label>
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

export default function AdminWorkspace() {
  const { user, role, instituteId, loading: authLoading, logout } = useAuth();
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])!;

  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [pageLoading, setPageLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [notes, setNotes] = useState<ResourceRow[]>([]);
  const [materials, setMaterials] = useState<ResourceRow[]>([]);
  const [tests, setTests] = useState<TestRow[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [homeContent, setHomeContent] = useState<HomeContent>(defaultHomeContent);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(defaultSiteSettings);

  const [studentForm, setStudentForm] = useState<StudentFormState>(emptyStudentForm);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentFilter, setStudentFilter] = useState<"all" | "recent">("all");
  const [generatedCredentials, setGeneratedCredentials] = useState<GeneratedCredentials | null>(null);
  const [bulkUploadSummary, setBulkUploadSummary] = useState<string | null>(null);

  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    price_text: "",
    status: "draft" as CourseRow["status"],
    cta_label: "View Course",
  });
  const [assignmentForm, setAssignmentForm] = useState({ studentId: "", courseId: "" });
  const [noteForm, setNoteForm] = useState<ResourceUploadFormState>(emptyResourceForm);
  const [materialForm, setMaterialForm] = useState<ResourceUploadFormState>(emptyResourceForm);
  const [notePickerKey, setNotePickerKey] = useState(0);
  const [materialPickerKey, setMaterialPickerKey] = useState(0);
  const [testForm, setTestForm] = useState<TestFormState>(emptyTestForm);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [resultForm, setResultForm] = useState<ResultFormState>(emptyResultForm);
  const [announcementForm, setAnnouncementForm] = useState<AnnouncementFormState>(emptyAnnouncementForm);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);

  const deferredStudentSearch = useDeferredValue(studentSearch);

  const clearFeedback = useCallback(() => {
    setError(null);
    setMessage(null);
  }, []);

  const loadStudents = useCallback(async () => {
    const response = await withTimeout(fetch("/api/admin/students", { cache: "no-store" }));
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to load students");
    }
    setStudents(payload.students ?? []);
  }, []);

  const loadCourses = useCallback(async (tenantId: string) => {
    const [{ data: courseRows, error: coursesError }, { data: enrollmentRows, error: enrollmentsError }] = await Promise.all([
      withTimeout(
        supabase
          .from("courses")
          .select("id, title, description, price_text, status, cta_label, created_at")
          .eq("institute_id", tenantId)
          .order("created_at", { ascending: false })
      ),
      withTimeout(
        supabase
          .from("enrollments")
          .select("student_id, course_id, enrolled_at")
          .eq("institute_id", tenantId)
          .order("enrolled_at", { ascending: false })
      ),
    ]);

    if (coursesError) {
      throw new Error(coursesError.message);
    }

    if (enrollmentsError) {
      throw new Error(enrollmentsError.message);
    }

    setCourses(((courseRows ?? []) as CourseRow[]).map((course) => ({
      ...course,
      status: (course.status ?? "draft") as CourseRow["status"],
      cta_label: course.cta_label ?? "View Course",
      price_text: course.price_text ?? "",
    })));
    setEnrollments((enrollmentRows ?? []) as EnrollmentRow[]);
  }, [supabase]);

  const loadOperationalData = useCallback(async (tenantId: string) => {
    const [
      { data: noteRows, error: notesError },
      { data: materialRows, error: materialsError },
      { data: testRows, error: testsError },
      { data: resultRows, error: resultsError },
      { data: announcementRows, error: announcementsError },
    ] = await Promise.all([
      withTimeout(
        supabase
          .from("notes")
          .select("id, title, course_id, file_url, visibility, created_at")
          .eq("institute_id", tenantId)
          .order("created_at", { ascending: false })
      ),
      withTimeout(
        supabase
          .from("materials")
          .select("id, title, course_id, file_url, visibility, created_at")
          .eq("institute_id", tenantId)
          .order("created_at", { ascending: false })
      ),
      withTimeout(
        supabase
          .from("tests")
          .select("id, title, test_date, course_id, created_at")
          .eq("institute_id", tenantId)
          .order("test_date", { ascending: true })
      ),
      withTimeout(
        supabase
          .from("results")
          .select("student_id, test_id, marks, recorded_at, student:student_id(name), test:test_id(title, test_date)")
          .eq("institute_id", tenantId)
          .order("recorded_at", { ascending: false })
      ),
      withTimeout(
        supabase
          .from("announcements")
          .select("id, title, body, created_at")
          .eq("institute_id", tenantId)
          .order("created_at", { ascending: false })
      ),
    ]);

    if (notesError) {
      throw new Error(notesError.message);
    }

    if (materialsError) {
      throw new Error(materialsError.message);
    }

    if (testsError) {
      throw new Error(testsError.message);
    }

    if (resultsError) {
      throw new Error(resultsError.message);
    }

    if (announcementsError) {
      throw new Error(announcementsError.message);
    }

    setNotes((noteRows ?? []) as ResourceRow[]);
    setMaterials((materialRows ?? []) as ResourceRow[]);
    setTests((testRows ?? []) as TestRow[]);
    setResults(((resultRows ?? []) as ResultSelectRow[]).map((row) => {
      const student = singleRelation(row.student);
      const test = singleRelation(row.test);

      return {
        student_id: row.student_id,
        test_id: row.test_id,
        marks: Number(row.marks ?? 0),
        recorded_at: row.recorded_at,
        student_name: student?.name ?? row.student_id,
        test_title: test?.title ?? row.test_id,
        test_date: test?.test_date ?? null,
      };
    }));
    setAnnouncements((announcementRows ?? []) as AnnouncementRow[]);
  }, [supabase]);

  const loadContent = useCallback(async () => {
    const response = await withTimeout(fetch("/api/admin/site-content", { cache: "no-store" }));
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to load site content");
    }
    setHomeContent(mergeHomeContent(payload.home));
    setSiteSettings(mergeSiteSettings(payload.settings));
  }, []);

  const loadWorkspace = useCallback(async () => {
    if (!instituteId) {
      return;
    }

    setPageLoading(true);
    clearFeedback();

    try {
      await Promise.all([loadStudents(), loadCourses(instituteId), loadOperationalData(instituteId), loadContent()]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load admin workspace");
    } finally {
      setPageLoading(false);
    }
  }, [clearFeedback, instituteId, loadContent, loadCourses, loadOperationalData, loadStudents]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (role !== "admin") {
      setPageLoading(false);
      return;
    }

    if (!instituteId) {
      setError("This admin account is missing an institute assignment. Please update the admin profile in Supabase.");
      setPageLoading(false);
      return;
    }

    void loadWorkspace();
  }, [authLoading, instituteId, loadWorkspace, role]);

  const filteredStudents = useMemo(() => {
    const search = deferredStudentSearch.trim().toLowerCase();
    const recentCutoff = Date.now() - 1000 * 60 * 60 * 24 * 30;

    return students.filter((student) => {
      if (studentFilter === "recent") {
        const createdAt = student.created_at ? new Date(student.created_at).getTime() : 0;
        if (!createdAt || createdAt < recentCutoff) {
          return false;
        }
      }

      if (!search) {
        return true;
      }

      return [student.name, student.email ?? "", student.login_id ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [deferredStudentSearch, studentFilter, students]);

  const recentStudentCount = useMemo(() => {
    const recentCutoff = Date.now() - 1000 * 60 * 60 * 24 * 30;
    return students.filter((student) => {
      const createdAt = student.created_at ? new Date(student.created_at).getTime() : 0;
      return Boolean(createdAt && createdAt >= recentCutoff);
    }).length;
  }, [students]);

  const publishedCourseCount = courses.filter((course) => course.status === "published").length;
  const draftCourseCount = courses.filter((course) => course.status === "draft").length;
  const archivedCourseCount = courses.filter((course) => course.status === "archived").length;
  const unassignedCourseCount = courses.filter((course) => !enrollments.some((entry) => entry.course_id === course.id)).length;
  const totalResources = notes.length + materials.length;
  const upcomingTestsCount = tests.filter((test) => new Date(test.test_date) >= new Date()).length;
  const thisWeekTestCount = tests.filter((test) => {
    const value = new Date(test.test_date).getTime();
    const start = Date.now();
    const end = start + 1000 * 60 * 60 * 24 * 7;
    return value >= start && value <= end;
  }).length;
  const latestAnnouncement = announcements[0] ?? null;

  const studentNameById = useMemo(() => new Map(students.map((student) => [student.id, student.name])), [students]);
  const courseTitleById = useMemo(() => new Map(courses.map((course) => [course.id, course.title])), [courses]);
  const testTitleById = useMemo(() => new Map(tests.map((test) => [test.id, test.title])), [tests]);

  const overviewMetrics = [
    {
      label: "Student accounts",
      value: students.length,
      helper: `${recentStudentCount} added in the last 30 days`,
      accent: "slate" as const,
    },
    {
      label: "Published courses",
      value: publishedCourseCount,
      helper: `${draftCourseCount} drafts and ${archivedCourseCount} archived`,
      accent: "stone" as const,
    },
    {
      label: "Learning assets",
      value: totalResources,
      helper: `${notes.length} notes and ${materials.length} materials live`,
      accent: "slate" as const,
    },
    {
      label: "Academic activity",
      value: tests.length + results.length + announcements.length,
      helper: `${upcomingTestsCount} tests ahead and ${announcements.length} announcements`,
      accent: "stone" as const,
    },
  ];

  const overviewModules = [
    {
      title: "Student operations",
      description: "Create access, reset passwords, and onboard students with CSV in one queue.",
      meta: `${students.length} active accounts`,
      tab: "students" as const,
    },
    {
      title: "Academic operations",
      description: "Control courses, assignments, tests, and mark entry from the same workspace.",
      meta: `${courses.length} courses and ${tests.length} tests`,
      tab: "operations" as const,
    },
    {
      title: "Resource publishing",
      description: "Upload notes, push materials, and publish announcements to the student portal.",
      meta: `${totalResources} assets available`,
      tab: "resources" as const,
    },
    {
      title: "Website editing",
      description: "Update the public story, hero copy, testimonials, FAQs, and site identity without code edits.",
      meta: `${homeContent.programs.length + homeContent.faqs.length + homeContent.testimonials.length} content blocks`,
      tab: "website" as const,
    },
  ];

  const priorityQueue = [
    draftCourseCount > 0
      ? {
          title: "Draft courses still need publishing",
          description: `${draftCourseCount} course records are still hidden from the live catalog.`,
          action: "Review operations",
          tab: "operations" as const,
        }
      : null,
    totalResources === 0
      ? {
          title: "No study resources uploaded yet",
          description: "Students will have a cleaner experience once notes or materials are attached to courses.",
          action: "Open resources",
          tab: "resources" as const,
        }
      : null,
    tests.length === 0
      ? {
          title: "Assessment schedule is empty",
          description: "Create the first test so the student dashboard can surface upcoming milestones.",
          action: "Schedule a test",
          tab: "operations" as const,
        }
      : null,
    announcements.length === 0
      ? {
          title: "Announcement stream is quiet",
          description: "A short update helps the student portal feel active and guided.",
          action: "Publish update",
          tab: "resources" as const,
        }
      : null,
    unassignedCourseCount > 0
      ? {
          title: "Some courses have no enrolled students",
          description: `${unassignedCourseCount} courses are ready but still not mapped to learners.`,
          action: "Assign students",
          tab: "operations" as const,
        }
      : null,
  ].filter((item) => item !== null);

  const saveHomeButton = (
    <button type="button" onClick={() => void saveSiteContent("home", homeContent)} className={primaryButtonClass} disabled={busy}>
      Save Website Content
    </button>
  );

  const handleStudentFormChange = (key: keyof StudentFormState, value: string) => {
    setStudentForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleStudentSubmit = async () => {
    clearFeedback();
    setBusy(true);

    try {
      const response = await fetch(editingStudentId ? `/api/admin/students/${editingStudentId}` : "/api/admin/students", {
        method: editingStudentId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentForm),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save student");
      }

      if (!editingStudentId && payload.credentials) {
        setGeneratedCredentials({
          name: studentForm.name,
          email: payload.credentials.email,
          loginId: payload.credentials.loginId,
          password: payload.credentials.password,
        });
      }

      setStudentForm(emptyStudentForm);
      setEditingStudentId(null);
      setMessage(editingStudentId ? "Student account updated." : "Student account created.");
      await Promise.all([loadStudents(), instituteId ? loadOperationalData(instituteId) : Promise.resolve()]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save student");
    } finally {
      setBusy(false);
    }
  };

  const startEditingStudent = (student: StudentRow) => {
    setEditingStudentId(student.id);
    setStudentForm({
      name: student.name,
      email: student.email ?? "",
      loginId: student.login_id ?? "",
      password: "",
    });
    setActiveTab("students");
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!window.confirm("Delete this student account permanently?")) {
      return;
    }

    clearFeedback();
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/students/${studentId}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to delete student");
      }

      setMessage("Student account deleted.");
      await Promise.all([
        loadStudents(),
        instituteId ? loadCourses(instituteId) : Promise.resolve(),
        instituteId ? loadOperationalData(instituteId) : Promise.resolve(),
      ]);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete student");
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (student: StudentRow) => {
    clearFeedback();
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/students/${student.id}/reset-password`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to reset password");
      }

      setGeneratedCredentials({
        name: student.name,
        email: student.email ?? "",
        loginId: student.login_id ?? "",
        password: payload.password,
      });
      setMessage("Temporary password generated.");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Unable to reset password");
    } finally {
      setBusy(false);
    }
  };

  const handleBulkUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    clearFeedback();
    setBusy(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/students/bulk-upload", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to import CSV");
      }

      setBulkUploadSummary(`${payload.created} created, ${payload.failed} failed`);
      const firstCreated = (payload.results ?? []).find((item: { status: string }) => item.status === "created");
      if (firstCreated?.password) {
        setGeneratedCredentials({
          name: firstCreated.name,
          email: firstCreated.email,
          loginId: firstCreated.loginId,
          password: firstCreated.password,
        });
      }

      setMessage("Bulk onboarding completed.");
      await Promise.all([loadStudents(), instituteId ? loadOperationalData(instituteId) : Promise.resolve()]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to import CSV");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  };

  const handleCourseCreate = async () => {
    if (!instituteId) {
      return;
    }

    if (!courseForm.title.trim()) {
      setError("Course title is required.");
      return;
    }

    clearFeedback();
    setBusy(true);
    try {
      const { error: insertError } = await supabase.from("courses").insert({
        institute_id: instituteId,
        title: courseForm.title.trim(),
        description: courseForm.description.trim() || null,
        price_text: courseForm.price_text.trim() || null,
        status: courseForm.status,
        cta_label: courseForm.cta_label.trim() || "View Course",
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      setCourseForm({ title: "", description: "", price_text: "", status: "draft", cta_label: "View Course" });
      setMessage("Course created.");
      await loadCourses(instituteId);
    } catch (courseError) {
      setError(courseError instanceof Error ? courseError.message : "Unable to create course");
    } finally {
      setBusy(false);
    }
  };

  const updateCourseField = (courseId: string, key: keyof CourseRow, value: string) => {
    setCourses((prev) => prev.map((course) => (course.id === courseId ? { ...course, [key]: value } : course)));
  };

  const handleCourseSave = async (course: CourseRow) => {
    if (!instituteId) {
      return;
    }

    clearFeedback();
    setBusy(true);
    try {
      const { error: updateError } = await supabase
        .from("courses")
        .update({
          title: course.title.trim(),
          description: course.description?.trim() || null,
          price_text: course.price_text?.trim() || null,
          status: course.status,
          cta_label: course.cta_label.trim() || "View Course",
        })
        .eq("id", course.id)
        .eq("institute_id", instituteId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setMessage("Course updated.");
      await loadCourses(instituteId);
    } catch (courseError) {
      setError(courseError instanceof Error ? courseError.message : "Unable to update course");
    } finally {
      setBusy(false);
    }
  };

  const handleCourseDelete = async (courseId: string) => {
    if (!instituteId || !window.confirm("Delete this course and all linked academic data?")) {
      return;
    }

    clearFeedback();
    setBusy(true);
    try {
      const { error: deleteError } = await supabase.from("courses").delete().eq("id", courseId).eq("institute_id", instituteId);
      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setMessage("Course deleted.");
      await Promise.all([loadCourses(instituteId), loadOperationalData(instituteId)]);
    } catch (courseError) {
      setError(courseError instanceof Error ? courseError.message : "Unable to delete course");
    } finally {
      setBusy(false);
    }
  };

  const handleAssignStudent = async () => {
    if (!instituteId || !assignmentForm.studentId || !assignmentForm.courseId) {
      setError("Select both a student and a course.");
      return;
    }

    clearFeedback();
    setBusy(true);
    try {
      const { error: insertError } = await supabase.from("enrollments").upsert(
        {
          student_id: assignmentForm.studentId,
          course_id: assignmentForm.courseId,
          institute_id: instituteId,
        },
        { onConflict: "student_id,course_id" }
      );

      if (insertError) {
        throw new Error(insertError.message);
      }

      setAssignmentForm({ studentId: "", courseId: "" });
      setMessage("Enrollment saved.");
      await loadCourses(instituteId);
    } catch (assignmentError) {
      setError(assignmentError instanceof Error ? assignmentError.message : "Unable to assign student");
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveEnrollment = async (studentId: string, courseId: string) => {
    if (!instituteId) {
      return;
    }

    clearFeedback();
    setBusy(true);
    try {
      const { error: deleteError } = await supabase
        .from("enrollments")
        .delete()
        .eq("student_id", studentId)
        .eq("course_id", courseId)
        .eq("institute_id", instituteId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setMessage("Enrollment removed.");
      await loadCourses(instituteId);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove enrollment");
    } finally {
      setBusy(false);
    }
  };

  const handleResourceUpload = async (kind: ResourceKind) => {
    if (!instituteId) {
      return;
    }

    const formState = kind === "note" ? noteForm : materialForm;
    if (!formState.courseId || !formState.file) {
      setError("Select a course and a PDF file before uploading.");
      return;
    }

    clearFeedback();
    setBusy(true);

    try {
      const formData = new FormData();
      formData.append("courseId", formState.courseId);
      formData.append("title", formState.title.trim());
      formData.append("visibility", formState.visibility);
      formData.append("file", formState.file);

      const response = await fetch(kind === "note" ? "/api/admin/notes/upload" : "/api/admin/materials/upload", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? `Unable to upload ${kind}`);
      }

      if (kind === "note") {
        setNoteForm(emptyResourceForm());
        setNotePickerKey((prev) => prev + 1);
      } else {
        setMaterialForm(emptyResourceForm());
        setMaterialPickerKey((prev) => prev + 1);
      }

      setMessage(kind === "note" ? "Note uploaded." : "Book uploaded.");
      await loadOperationalData(instituteId);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : `Unable to upload ${kind}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteResource = async (kind: ResourceKind, row: ResourceRow) => {
    if (!instituteId) {
      return;
    }

    if (!window.confirm(`Delete this ${kind} permanently?`)) {
      return;
    }

    clearFeedback();
    setBusy(true);

    try {
      const bucket = kind === "note" ? "notes" : "materials";
      const table = kind === "note" ? "notes" : "materials";

      const { error: storageError } = await supabase.storage.from(bucket).remove([row.file_url]);
      if (storageError && !storageError.message.toLowerCase().includes("not found")) {
        throw new Error(storageError.message);
      }

      const { error: deleteError } = await supabase.from(table).delete().eq("id", row.id).eq("institute_id", instituteId);
      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setMessage(kind === "note" ? "Note deleted." : "Book deleted.");
      await loadOperationalData(instituteId);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : `Unable to delete ${kind}`);
    } finally {
      setBusy(false);
    }
  };

  const handleTestSubmit = async () => {
    if (!instituteId) {
      return;
    }

    if (!testForm.title.trim() || !testForm.courseId || !testForm.testDate) {
      setError("Test title, course, and date are required.");
      return;
    }

    clearFeedback();
    setBusy(true);

    try {
      if (editingTestId) {
        const { error: updateError } = await supabase
          .from("tests")
          .update({
            title: testForm.title.trim(),
            course_id: testForm.courseId,
            test_date: testForm.testDate,
          })
          .eq("id", editingTestId)
          .eq("institute_id", instituteId);

        if (updateError) {
          throw new Error(updateError.message);
        }

        setMessage("Test updated.");
      } else {
        const { error: insertError } = await supabase.from("tests").insert({
          institute_id: instituteId,
          course_id: testForm.courseId,
          title: testForm.title.trim(),
          test_date: testForm.testDate,
        });

        if (insertError) {
          throw new Error(insertError.message);
        }

        setMessage("Test scheduled.");
      }

      setEditingTestId(null);
      setTestForm(emptyTestForm());
      await loadOperationalData(instituteId);
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : "Unable to save test");
    } finally {
      setBusy(false);
    }
  };

  const startEditingTest = (test: TestRow) => {
    setEditingTestId(test.id);
    setTestForm({
      title: test.title,
      courseId: test.course_id,
      testDate: test.test_date,
    });
    setActiveTab("operations");
  };

  const handleDeleteTest = async (testId: string) => {
    if (!instituteId || !window.confirm("Delete this test and any linked result records?")) {
      return;
    }

    clearFeedback();
    setBusy(true);
    try {
      const { error: deleteError } = await supabase.from("tests").delete().eq("id", testId).eq("institute_id", instituteId);
      if (deleteError) {
        throw new Error(deleteError.message);
      }

      if (editingTestId === testId) {
        setEditingTestId(null);
        setTestForm(emptyTestForm());
      }

      setMessage("Test deleted.");
      await loadOperationalData(instituteId);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete test");
    } finally {
      setBusy(false);
    }
  };

  const handleResultSubmit = async () => {
    if (!instituteId) {
      return;
    }

    const marks = Number(resultForm.marks);
    if (!resultForm.studentId || !resultForm.testId || Number.isNaN(marks)) {
      setError("Select a student, a test, and valid marks.");
      return;
    }

    clearFeedback();
    setBusy(true);
    try {
      const { error: upsertError } = await supabase.from("results").upsert(
        {
          student_id: resultForm.studentId,
          test_id: resultForm.testId,
          institute_id: instituteId,
          marks,
        },
        { onConflict: "student_id,test_id" }
      );

      if (upsertError) {
        throw new Error(upsertError.message);
      }

      setResultForm(emptyResultForm());
      setMessage("Result saved.");
      await loadOperationalData(instituteId);
    } catch (resultError) {
      setError(resultError instanceof Error ? resultError.message : "Unable to save result");
    } finally {
      setBusy(false);
    }
  };

  const startEditingResult = (result: ResultRow) => {
    setResultForm({
      studentId: result.student_id,
      testId: result.test_id,
      marks: String(result.marks),
    });
    setActiveTab("operations");
  };

  const handleDeleteResult = async (studentId: string, testId: string) => {
    if (!instituteId || !window.confirm("Delete this recorded result?")) {
      return;
    }

    clearFeedback();
    setBusy(true);
    try {
      const { error: deleteError } = await supabase
        .from("results")
        .delete()
        .eq("student_id", studentId)
        .eq("test_id", testId)
        .eq("institute_id", instituteId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setMessage("Result deleted.");
      await loadOperationalData(instituteId);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete result");
    } finally {
      setBusy(false);
    }
  };

  const handleAnnouncementSubmit = async () => {
    if (!instituteId) {
      return;
    }

    if (!announcementForm.title.trim() || !announcementForm.body.trim()) {
      setError("Announcement title and body are required.");
      return;
    }

    clearFeedback();
    setBusy(true);

    try {
      if (editingAnnouncementId) {
        const { error: updateError } = await supabase
          .from("announcements")
          .update({
            title: announcementForm.title.trim(),
            body: announcementForm.body.trim(),
          })
          .eq("id", editingAnnouncementId)
          .eq("institute_id", instituteId);

        if (updateError) {
          throw new Error(updateError.message);
        }

        setMessage("Announcement updated.");
      } else {
        const { error: insertError } = await supabase.from("announcements").insert({
          institute_id: instituteId,
          title: announcementForm.title.trim(),
          body: announcementForm.body.trim(),
          created_by: user?.id ?? null,
        });

        if (insertError) {
          throw new Error(insertError.message);
        }

        setMessage("Announcement published.");
      }

      setEditingAnnouncementId(null);
      setAnnouncementForm(emptyAnnouncementForm());
      await loadOperationalData(instituteId);
    } catch (announcementError) {
      setError(announcementError instanceof Error ? announcementError.message : "Unable to save announcement");
    } finally {
      setBusy(false);
    }
  };

  const startEditingAnnouncement = (announcement: AnnouncementRow) => {
    setEditingAnnouncementId(announcement.id);
    setAnnouncementForm({ title: announcement.title, body: announcement.body });
    setActiveTab("resources");
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!instituteId || !window.confirm("Delete this announcement?")) {
      return;
    }

    clearFeedback();
    setBusy(true);
    try {
      const { error: deleteError } = await supabase.from("announcements").delete().eq("id", announcementId).eq("institute_id", instituteId);
      if (deleteError) {
        throw new Error(deleteError.message);
      }

      if (editingAnnouncementId === announcementId) {
        setEditingAnnouncementId(null);
        setAnnouncementForm(emptyAnnouncementForm());
      }

      setMessage("Announcement deleted.");
      await loadOperationalData(instituteId);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete announcement");
    } finally {
      setBusy(false);
    }
  };

  const updateProgram = (programId: string, patch: Partial<Program>) => {
    setHomeContent((prev) => ({
      ...prev,
      programs: prev.programs.map((program) => (program.id === programId ? { ...program, ...patch } : program)),
    }));
  };

  const updateFaq = (faqId: string, patch: Partial<Faq>) => {
    setHomeContent((prev) => ({
      ...prev,
      faqs: prev.faqs.map((faq) => (faq.id === faqId ? { ...faq, ...patch } : faq)),
    }));
  };

  const updateTestimonial = (testimonialId: string, patch: Partial<Testimonial>) => {
    setHomeContent((prev) => ({
      ...prev,
      testimonials: prev.testimonials.map((testimonial) => (testimonial.id === testimonialId ? { ...testimonial, ...patch } : testimonial)),
    }));
  };

  const saveSiteContent = async (key: "home" | "settings", data: HomeContent | SiteSettings) => {
    clearFeedback();
    setBusy(true);
    try {
      const response = await fetch("/api/admin/site-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, data }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? `Unable to save ${key}`);
      }
      setMessage(key === "home" ? "Website content saved." : "Site settings saved.");
      if (key === "home") {
        setHomeContent(mergeHomeContent(payload.data));
      } else {
        setSiteSettings(mergeSiteSettings(payload.data));
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save site content");
    } finally {
      setBusy(false);
    }
  };

  if (authLoading || pageLoading) {
    return (
      <section className="relative w-full px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="pointer-events-none absolute left-0 top-10 h-44 w-44 rounded-full bg-stone-200/50 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-20 h-52 w-52 rounded-full bg-slate-200/40 blur-3xl" />
        <div className="mx-auto max-w-7xl animate-pulse space-y-5">
          <div className="rounded-[32px] border border-stone-200/70 bg-white/90 p-6 shadow-[0_24px_64px_rgba(36,32,28,0.08)]">
            <div className="h-4 w-28 rounded-full bg-stone-200" />
            <div className="mt-4 h-10 w-3/4 rounded-full bg-stone-200" />
            <div className="mt-4 h-4 w-full rounded-full bg-stone-200" />
            <div className="mt-2 h-4 w-2/3 rounded-full bg-stone-200" />
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`metric-skeleton-${index}`} className="h-32 rounded-[24px] bg-stone-100" />
              ))}
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className="h-[420px] rounded-[30px] bg-white/90" />
            <div className="h-[420px] rounded-[30px] bg-white/90" />
          </div>
        </div>
      </section>
    );
  }

  if (role !== "admin") {
    return (
      <section className="relative w-full px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-stone-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,243,238,0.96))] p-8 shadow-[0_24px_60px_rgba(36,32,28,0.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Restricted Area</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-slate-950">Admin access required</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            This workspace is reserved for owner-level admin accounts with institute permissions.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login?type=admin" className={primaryButtonClass}>
              Go to Admin Login
            </Link>
            <Link href="/" className={secondaryButtonClass}>
              Back to website
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="pointer-events-none absolute left-0 top-6 h-48 w-48 rounded-full bg-stone-200/50 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-20 h-64 w-64 rounded-full bg-slate-200/35 blur-3xl" />
      <div className="pointer-events-none absolute bottom-8 left-1/3 h-56 w-56 rounded-full bg-stone-100/70 blur-3xl" />

      <div className="mx-auto max-w-7xl space-y-5">
        <div className="overflow-hidden rounded-[34px] border border-stone-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,241,236,0.96))] p-6 shadow-[0_28px_80px_rgba(36,32,28,0.08)] sm:p-7">
          <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr] xl:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-slate-900 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                  System Admin Workspace
                </span>
                <span className="rounded-full border border-stone-200/80 bg-white/86 px-3 py-1 text-xs font-medium text-slate-600">
                  {busy ? "Syncing live data" : "Live institute data"}
                </span>
              </div>
              <h1 className="mt-5 max-w-4xl text-3xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-4xl lg:text-[3.2rem]">
                Industrial-grade control for students, academics, resources, and website publishing.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                This control room is designed to keep operations calm and readable: fewer distractions, clearer actions, and one place to manage the full institute system.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={() => void loadWorkspace()} className={secondaryButtonClass} disabled={busy}>
                  Refresh Workspace
                </button>
                <button type="button" onClick={() => void logout()} className={primaryButtonClass}>
                  Logout
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-stone-200/80 bg-white/84 p-5 shadow-[0_18px_40px_rgba(36,32,28,0.05)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">Executive Snapshot</p>
              <div className="mt-4 space-y-4 text-sm text-slate-600">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">Institute name</p>
                    <p className="mt-1 leading-6">{siteSettings.siteName}</p>
                  </div>
                  <StatusBadge tone="neutral">Active</StatusBadge>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">Tests this week</p>
                    <p className="mt-1 leading-6">{thisWeekTestCount > 0 ? `${thisWeekTestCount} scheduled` : "No assessments in the next 7 days"}</p>
                  </div>
                  <StatusBadge tone={thisWeekTestCount > 0 ? "warning" : "neutral"}>{thisWeekTestCount}</StatusBadge>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">Latest announcement</p>
                    <p className="mt-1 leading-6">{latestAnnouncement ? latestAnnouncement.title : "No announcement published yet"}</p>
                  </div>
                  <StatusBadge tone={latestAnnouncement ? "success" : "warning"}>{latestAnnouncement ? "Live" : "Pending"}</StatusBadge>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {overviewMetrics.map((metric) => (
              <AdminMetricCard key={metric.label} {...metric} />
            ))}
          </div>
        </div>

        {error || message ? (
          <div className={`rounded-[24px] border px-5 py-4 text-sm shadow-[0_14px_32px_rgba(36,32,28,0.05)] ${error ? "border-rose-200 bg-rose-50/90 text-rose-700" : "border-emerald-200 bg-emerald-50/90 text-emerald-700"}`}>
            {error ? error : message}
          </div>
        ) : null}

        {generatedCredentials ? (
          <AdminPanelCard
            eyebrow="Credential Vault"
            title="Latest generated student credentials"
            description="Share this securely with the student, then clear or rotate it if needed."
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className={nestedCardClass}>
                <p className="text-xs text-stone-500">Student</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{generatedCredentials.name}</p>
              </div>
              <div className={nestedCardClass}>
                <p className="text-xs text-stone-500">Email</p>
                <p className="mt-2 break-all text-sm font-semibold text-slate-900">{generatedCredentials.email}</p>
              </div>
              <div className={nestedCardClass}>
                <p className="text-xs text-stone-500">Login ID</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{generatedCredentials.loginId}</p>
              </div>
              <div className={nestedCardClass}>
                <p className="text-xs text-stone-500">Password</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{generatedCredentials.password}</p>
              </div>
            </div>
          </AdminPanelCard>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <AdminSidebar activeTab={activeTab} onSelect={setActiveTab} siteName={siteSettings.siteName} />

          <div className="space-y-5">
            {activeTab === "overview" ? (
              <>
                <AdminPanelCard
                  eyebrow="Command Modules"
                  title="Every admin workflow is grouped by intent"
                  description="The panel below keeps student access, academic operations, resource publishing, and website editing separate so each job stays easy to scan."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    {overviewModules.map((module) => (
                      <button
                        key={module.title}
                        type="button"
                        onClick={() => setActiveTab(module.tab)}
                        className="rounded-[24px] border border-stone-200/70 bg-white/92 p-5 text-left shadow-[0_14px_34px_rgba(36,32,28,0.05)] transition hover:-translate-y-0.5 hover:border-stone-300"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-lg font-semibold tracking-[-0.03em] text-slate-950">{module.title}</p>
                          <StatusBadge tone="neutral">{module.meta}</StatusBadge>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{module.description}</p>
                        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Open module</p>
                      </button>
                    ))}
                  </div>
                </AdminPanelCard>

                <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                  <AdminPanelCard
                    eyebrow="Priority Queue"
                    title="What needs attention right now"
                    description="Instead of hunting through tabs, the system pulls the highest-signal items into one operational queue."
                  >
                    {priorityQueue.length === 0 ? (
                      <EmptyState
                        title="Workspace is in a healthy state"
                        description="Drafts are under control, resources are published, and core communication channels are active."
                      />
                    ) : (
                      <div className="space-y-3">
                        {priorityQueue.map((item) => (
                          <div key={item.title} className={`${nestedCardClass} flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between`}>
                            <div>
                              <p className="text-base font-semibold text-slate-950">{item.title}</p>
                              <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                            </div>
                            <button type="button" onClick={() => setActiveTab(item.tab)} className={secondaryButtonClass}>
                              {item.action}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </AdminPanelCard>

                  <AdminPanelCard
                    eyebrow="Public Surface"
                    title="Live website snapshot"
                    description="This gives the system admin a quick read on what learners and parents currently see."
                  >
                    <div className="space-y-3">
                      <div className={nestedCardClass}>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Hero title</p>
                        <p className="mt-2 text-base font-semibold text-slate-950">{homeContent.heroTitle}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{homeContent.heroSubtitle}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className={nestedCardClass}>
                          <p className="text-xs text-stone-500">Contact</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">{siteSettings.contactEmail || "Not set"}</p>
                          <p className="mt-1 text-sm text-slate-600">{siteSettings.contactPhone || "No phone added"}</p>
                        </div>
                        <div className={nestedCardClass}>
                          <p className="text-xs text-stone-500">Programs</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">{homeContent.programs.length} active cards</p>
                          <p className="mt-1 text-sm text-slate-600">{homeContent.testimonials.length} testimonials and {homeContent.faqs.length} FAQs</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Link href="/" className={secondaryButtonClass}>Open Homepage</Link>
                        <Link href="/courses" className={secondaryButtonClass}>Open Courses</Link>
                        <Link href="/join" className={secondaryButtonClass}>Open Admission Flow</Link>
                      </div>
                    </div>
                  </AdminPanelCard>
                </div>
              </>
            ) : null}

            {activeTab === "students" ? (
              <>
                <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                  <AdminPanelCard
                    eyebrow="Student Access"
                    title={editingStudentId ? "Edit student account" : "Create student account"}
                    description="Use this form to create individual access, adjust identity fields, or prepare a manual credential reset."
                    action={
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStudentId(null);
                          setStudentForm(emptyStudentForm);
                        }}
                        className={subtleButtonClass}
                      >
                        Clear Form
                      </button>
                    }
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Student name">
                        <input className={inputClass} value={studentForm.name} onChange={(event) => handleStudentFormChange("name", event.target.value)} placeholder="Aarav Singh" />
                      </Field>
                      <Field label="Email" hint="Optional on create. The system can generate one automatically.">
                        <input className={inputClass} value={studentForm.email} onChange={(event) => handleStudentFormChange("email", event.target.value)} placeholder="student@nipra.in" />
                      </Field>
                      <Field label="Login ID">
                        <input className={inputClass} value={studentForm.loginId} onChange={(event) => handleStudentFormChange("loginId", event.target.value)} placeholder="aarav-singh" />
                      </Field>
                      <Field label="Password" hint="Leave empty to auto-generate a secure temporary password.">
                        <input className={inputClass} value={studentForm.password} onChange={(event) => handleStudentFormChange("password", event.target.value)} placeholder="Temporary password" />
                      </Field>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button type="button" disabled={busy} onClick={() => void handleStudentSubmit()} className={primaryButtonClass}>
                        {editingStudentId ? "Update Student" : "Create Student"}
                      </button>
                      <button type="button" onClick={() => setActiveTab("operations")} className={secondaryButtonClass}>
                        Open Academic Ops
                      </button>
                    </div>
                  </AdminPanelCard>

                  <AdminPanelCard
                    eyebrow="Bulk Onboarding"
                    title="CSV import and secure credential handoff"
                    description="Bring large batches in quickly, then use the generated credential block for immediate student activation."
                  >
                    <div className="space-y-4">
                      <div className={nestedCardClass}>
                        <p className="text-sm font-semibold text-slate-900">Bulk upload CSV</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">Required headers: name, email, loginId, password.</p>
                        <label className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-full border border-stone-200/80 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-[0_12px_28px_rgba(36,32,28,0.06)] transition hover:-translate-y-0.5 hover:border-stone-300">
                          Upload Student CSV
                          <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleBulkUpload} />
                        </label>
                        {bulkUploadSummary ? <p className="mt-3 text-sm text-slate-600">{bulkUploadSummary}</p> : null}
                      </div>

                      {generatedCredentials ? (
                        <div className={nestedCardClass}>
                          <p className="text-sm font-semibold text-slate-900">Latest credential packet</p>
                          <div className="mt-3 space-y-2 text-sm text-slate-600">
                            <p><span className="font-semibold text-slate-900">Student:</span> {generatedCredentials.name}</p>
                            <p><span className="font-semibold text-slate-900">Email:</span> {generatedCredentials.email}</p>
                            <p><span className="font-semibold text-slate-900">Login ID:</span> {generatedCredentials.loginId}</p>
                            <p><span className="font-semibold text-slate-900">Password:</span> {generatedCredentials.password}</p>
                          </div>
                        </div>
                      ) : (
                        <EmptyState title="No credential packet yet" description="Create a student or reset a password to surface the latest secure handoff details here." />
                      )}
                    </div>
                  </AdminPanelCard>
                </div>

                <AdminPanelCard
                  eyebrow="Student Directory"
                  title="Search, filter, and maintain active accounts"
                  description="This directory is optimized for support work: quick scanning, direct edit access, and password recovery from one table."
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center">
                      <input className={`${inputClass} lg:max-w-md`} value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Search by name, email, or login ID" />
                      <select className={inputClass} value={studentFilter} onChange={(event) => setStudentFilter(event.target.value as "all" | "recent") }>
                        <option value="all">All students</option>
                        <option value="recent">Added in last 30 days</option>
                      </select>
                    </div>
                    <StatusBadge tone="neutral">{filteredStudents.length} visible</StatusBadge>
                  </div>

                  <div className={`mt-5 ${tableShellClass}`}>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-stone-200/70 text-sm">
                        <thead className="bg-stone-50/90">
                          <tr>
                            <th className={tableHeaderCellClass}>Student</th>
                            <th className={tableHeaderCellClass}>Email</th>
                            <th className={tableHeaderCellClass}>Login ID</th>
                            <th className={tableHeaderCellClass}>Created</th>
                            <th className={`${tableHeaderCellClass} text-right`}>Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200/70 bg-white">
                          {filteredStudents.map((student) => (
                            <tr key={student.id} className="hover:bg-stone-50/70">
                              <td className={tableCellClass}>
                                <p className="font-semibold text-slate-900">{student.name}</p>
                                <p className="mt-1 text-xs text-slate-500">Student account</p>
                              </td>
                              <td className={tableCellClass}>{student.email ?? "-"}</td>
                              <td className={tableCellClass}>{student.login_id ?? "-"}</td>
                              <td className={tableCellClass}>{formatDate(student.created_at)}</td>
                              <td className={`${tableCellClass} min-w-[260px]`}>
                                <div className="flex flex-wrap justify-end gap-2">
                                  <button type="button" onClick={() => startEditingStudent(student)} className={secondaryButtonClass}>Edit</button>
                                  <button type="button" onClick={() => void handleResetPassword(student)} className={subtleButtonClass}>Reset Password</button>
                                  <button type="button" onClick={() => void handleDeleteStudent(student.id)} className={dangerButtonClass}>Delete</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </AdminPanelCard>
              </>
            ) : null}

            {activeTab === "operations" ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <AdminMetricCard label="Draft courses" value={draftCourseCount} helper="Records still waiting for publish approval" accent="stone" />
                  <AdminMetricCard label="Enrollments" value={enrollments.length} helper="Student-to-course mappings currently active" accent="slate" />
                  <AdminMetricCard label="Scheduled tests" value={tests.length} helper={`${upcomingTestsCount} still upcoming`} accent="stone" />
                  <AdminMetricCard label="Recorded results" value={results.length} helper="Marks already visible to students" accent="slate" />
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                  <AdminPanelCard eyebrow="Course Builder" title="Create or stage a course record" description="Courses remain structured and editable here before they reach live students or the public catalog.">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Course title"><input className={inputClass} value={courseForm.title} onChange={(event) => setCourseForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Board Foundation Batch" /></Field>
                      <Field label="Pricing text"><input className={inputClass} value={courseForm.price_text} onChange={(event) => setCourseForm((prev) => ({ ...prev, price_text: event.target.value }))} placeholder="₹1,500 / month" /></Field>
                      <Field label="Status"><select className={inputClass} value={courseForm.status} onChange={(event) => setCourseForm((prev) => ({ ...prev, status: event.target.value as CourseRow["status"] }))}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></Field>
                      <Field label="CTA label"><input className={inputClass} value={courseForm.cta_label} onChange={(event) => setCourseForm((prev) => ({ ...prev, cta_label: event.target.value }))} placeholder="View Course" /></Field>
                      <div className="md:col-span-2">
                        <Field label="Description"><textarea className={textareaClass} value={courseForm.description} onChange={(event) => setCourseForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Short description for admins and catalog editors" /></Field>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button type="button" disabled={busy} onClick={() => void handleCourseCreate()} className={primaryButtonClass}>Create Course</button>
                      <button type="button" onClick={() => setCourseForm({ title: "", description: "", price_text: "", status: "draft", cta_label: "View Course" })} className={subtleButtonClass}>Clear Builder</button>
                    </div>
                  </AdminPanelCard>

                  <AdminPanelCard eyebrow="Enrollment Desk" title="Assign students to live courses" description="The mapping here decides what each student sees inside the private portal.">
                    <div className="grid gap-4">
                      <Field label="Student"><select className={inputClass} value={assignmentForm.studentId} onChange={(event) => setAssignmentForm((prev) => ({ ...prev, studentId: event.target.value }))}><option value="">Select student</option>{students.map((student) => (<option key={student.id} value={student.id}>{student.name}</option>))}</select></Field>
                      <Field label="Course"><select className={inputClass} value={assignmentForm.courseId} onChange={(event) => setAssignmentForm((prev) => ({ ...prev, courseId: event.target.value }))}><option value="">Select course</option>{courses.map((course) => (<option key={course.id} value={course.id}>{course.title}</option>))}</select></Field>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button type="button" onClick={() => void handleAssignStudent()} className={primaryButtonClass} disabled={busy}>Save Enrollment</button>
                      <StatusBadge tone="neutral">{enrollments.length} enrollments</StatusBadge>
                    </div>
                    <div className="mt-5 space-y-3">
                      {enrollments.slice(0, 6).map((enrollment) => (
                        <div key={`${enrollment.student_id}-${enrollment.course_id}`} className={`${nestedCardClass} flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between`}>
                          <div>
                            <p className="font-semibold text-slate-900">{studentNameById.get(enrollment.student_id) ?? enrollment.student_id} → {courseTitleById.get(enrollment.course_id) ?? enrollment.course_id}</p>
                            <p className="mt-1 text-sm text-slate-600">Assigned on {formatDate(enrollment.enrolled_at)}</p>
                          </div>
                          <button type="button" onClick={() => void handleRemoveEnrollment(enrollment.student_id, enrollment.course_id)} className={dangerButtonClass}>Remove</button>
                        </div>
                      ))}
                      {enrollments.length === 0 ? <EmptyState title="No enrollments yet" description="Assign the first student to connect academic content with the portal." /> : null}
                    </div>
                  </AdminPanelCard>
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                  <AdminPanelCard eyebrow="Assessment Scheduler" title={editingTestId ? "Update scheduled test" : "Create new test"} description="Tests appear directly in the student dashboard timeline once scheduled.">
                    <div className="grid gap-4">
                      <Field label="Test title"><input className={inputClass} value={testForm.title} onChange={(event) => setTestForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Class 10 Science Weekly Test" /></Field>
                      <Field label="Course"><select className={inputClass} value={testForm.courseId} onChange={(event) => setTestForm((prev) => ({ ...prev, courseId: event.target.value }))}><option value="">Select course</option>{courses.map((course) => (<option key={course.id} value={course.id}>{course.title}</option>))}</select></Field>
                      <Field label="Test date"><input type="date" className={inputClass} value={testForm.testDate} onChange={(event) => setTestForm((prev) => ({ ...prev, testDate: event.target.value }))} /></Field>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button type="button" onClick={() => void handleTestSubmit()} className={primaryButtonClass} disabled={busy}>{editingTestId ? "Update Test" : "Schedule Test"}</button>
                      <button type="button" onClick={() => { setEditingTestId(null); setTestForm(emptyTestForm()); }} className={subtleButtonClass}>Clear Form</button>
                    </div>
                  </AdminPanelCard>

                  <AdminPanelCard eyebrow="Result Desk" title="Record or update marks" description="Marks entered here become the latest performance data shown in the student portal.">
                    <div className="grid gap-4">
                      <Field label="Student"><select className={inputClass} value={resultForm.studentId} onChange={(event) => setResultForm((prev) => ({ ...prev, studentId: event.target.value }))}><option value="">Select student</option>{students.map((student) => (<option key={student.id} value={student.id}>{student.name}</option>))}</select></Field>
                      <Field label="Test"><select className={inputClass} value={resultForm.testId} onChange={(event) => setResultForm((prev) => ({ ...prev, testId: event.target.value }))}><option value="">Select test</option>{tests.map((test) => (<option key={test.id} value={test.id}>{test.title}</option>))}</select></Field>
                      <Field label="Marks"><input className={inputClass} value={resultForm.marks} onChange={(event) => setResultForm((prev) => ({ ...prev, marks: event.target.value }))} placeholder="88" /></Field>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button type="button" onClick={() => void handleResultSubmit()} className={primaryButtonClass} disabled={busy}>Save Result</button>
                      <button type="button" onClick={() => setResultForm(emptyResultForm())} className={subtleButtonClass}>Clear Form</button>
                    </div>
                  </AdminPanelCard>
                </div>

                <AdminPanelCard eyebrow="Course Directory" title="Inline course catalog editor" description="Use the table below for live catalog hygiene without leaving the admin system.">
                  {courses.length === 0 ? (
                    <EmptyState title="No courses yet" description="Create the first course above, then refine title, pricing, status, and CTA here." />
                  ) : (
                    <div className="space-y-4">
                      {courses.map((course) => (
                        <div key={course.id} className={nestedCardClass}>
                          <div className="grid gap-4 xl:grid-cols-[1.1fr_1.5fr_0.8fr_0.8fr_0.8fr_auto]">
                            <input className={inputClass} value={course.title} onChange={(event) => updateCourseField(course.id, "title", event.target.value)} />
                            <input className={inputClass} value={course.description ?? ""} onChange={(event) => updateCourseField(course.id, "description", event.target.value)} />
                            <input className={inputClass} value={course.price_text ?? ""} onChange={(event) => updateCourseField(course.id, "price_text", event.target.value)} />
                            <select className={inputClass} value={course.status} onChange={(event) => updateCourseField(course.id, "status", event.target.value)}>
                              <option value="draft">Draft</option>
                              <option value="published">Published</option>
                              <option value="archived">Archived</option>
                            </select>
                            <input className={inputClass} value={course.cta_label} onChange={(event) => updateCourseField(course.id, "cta_label", event.target.value)} />
                            <div className="flex flex-wrap gap-2 xl:justify-end">
                              <button type="button" onClick={() => void handleCourseSave(course)} className={secondaryButtonClass}>Save</button>
                              <button type="button" onClick={() => void handleCourseDelete(course.id)} className={dangerButtonClass}>Delete</button>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <StatusBadge tone={course.status === "published" ? "success" : course.status === "draft" ? "warning" : "neutral"}>{course.status}</StatusBadge>
                            <StatusBadge tone="neutral">{courseTitleById.get(course.id) ? "Tracked" : "Pending"}</StatusBadge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </AdminPanelCard>

                <div className="grid gap-5 xl:grid-cols-2">
                  <AdminPanelCard eyebrow="Scheduled Tests" title="Assessment board" description="Edit dates, clean up old assessments, or jump a test into the result desk.">
                    <div className="space-y-3">
                      {tests.length === 0 ? (
                        <EmptyState title="No tests scheduled" description="Create the first assessment to populate the student portal timeline." />
                      ) : (
                        tests.map((test) => (
                          <div key={test.id} className={`${nestedCardClass} flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between`}>
                            <div>
                              <p className="font-semibold text-slate-900">{test.title}</p>
                              <p className="mt-1 text-sm text-slate-600">{courseTitleById.get(test.course_id) ?? "Unknown course"} · {formatDate(test.test_date)}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button type="button" onClick={() => startEditingTest(test)} className={secondaryButtonClass}>Edit</button>
                              <button type="button" onClick={() => setResultForm((prev) => ({ ...prev, testId: test.id }))} className={subtleButtonClass}>Record Marks</button>
                              <button type="button" onClick={() => void handleDeleteTest(test.id)} className={dangerButtonClass}>Delete</button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </AdminPanelCard>

                  <AdminPanelCard eyebrow="Result Ledger" title="Recent marks and grade activity" description="Quickly edit or remove entries that are already feeding student performance cards.">
                    <div className="space-y-3">
                      {results.length === 0 ? (
                        <EmptyState title="No results recorded" description="Add the first result to unlock richer performance insight in the student portal." />
                      ) : (
                        results.slice(0, 16).map((result) => (
                          <div key={`${result.student_id}-${result.test_id}`} className={`${nestedCardClass} flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between`}>
                            <div>
                              <p className="font-semibold text-slate-900">{result.student_name}</p>
                              <p className="mt-1 text-sm text-slate-600">{result.test_title} · {result.test_date ? formatDate(result.test_date) : "No test date"}</p>
                              <p className="mt-1 text-xs text-slate-500">Updated {formatDateTime(result.recorded_at)}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge tone="success">{result.marks}</StatusBadge>
                              <button type="button" onClick={() => startEditingResult(result)} className={secondaryButtonClass}>Edit</button>
                              <button type="button" onClick={() => void handleDeleteResult(result.student_id, result.test_id)} className={dangerButtonClass}>Delete</button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </AdminPanelCard>
                </div>
              </>
            ) : null}

            {activeTab === "resources" ? (
              <>
                <div className="grid gap-5 xl:grid-cols-2">
                  <AdminPanelCard eyebrow="Notes Upload" title="Publish revision notes" description="Attach a note PDF to a course, then choose whether it belongs in the public library or only inside the student portal.">
                    <div className="grid gap-4">
                      <Field label="Course"><select className={inputClass} value={noteForm.courseId} onChange={(event) => setNoteForm((prev) => ({ ...prev, courseId: event.target.value }))}><option value="">Select course</option>{courses.map((course) => (<option key={course.id} value={course.id}>{course.title}</option>))}</select></Field>
                      <Field label="Note title"><input className={inputClass} value={noteForm.title} onChange={(event) => setNoteForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Chapter 4 Revision Pack" /></Field>
                      <Field label="Visible in"><select className={inputClass} value={noteForm.visibility} onChange={(event) => setNoteForm((prev) => ({ ...prev, visibility: event.target.value as ResourceVisibility }))}><option value="student">Student portal only</option><option value="public">Public notes page</option></select></Field>
                      <Field label="PDF file" hint={noteForm.file ? noteForm.file.name : "Select a PDF file for secure delivery."}>
                        <label className={`${secondaryButtonClass} w-full cursor-pointer`}>
                          Choose Note PDF
                          <input key={notePickerKey} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => setNoteForm((prev) => ({ ...prev, file: event.target.files?.[0] ?? null }))} />
                        </label>
                      </Field>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button type="button" onClick={() => void handleResourceUpload("note")} className={primaryButtonClass} disabled={busy}>Upload Note</button>
                      <button type="button" onClick={() => { setNoteForm(emptyResourceForm()); setNotePickerKey((prev) => prev + 1); }} className={subtleButtonClass}>Clear</button>
                    </div>
                  </AdminPanelCard>

                  <AdminPanelCard eyebrow="Books Upload" title="Publish books and reference PDFs" description="Use this for books, worksheets, solved papers, or reference PDFs and decide whether they appear publicly or stay inside the portal.">
                    <div className="grid gap-4">
                      <Field label="Course"><select className={inputClass} value={materialForm.courseId} onChange={(event) => setMaterialForm((prev) => ({ ...prev, courseId: event.target.value }))}><option value="">Select course</option>{courses.map((course) => (<option key={course.id} value={course.id}>{course.title}</option>))}</select></Field>
                      <Field label="Book title"><input className={inputClass} value={materialForm.title} onChange={(event) => setMaterialForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Biology Quick Reference" /></Field>
                      <Field label="Visible in"><select className={inputClass} value={materialForm.visibility} onChange={(event) => setMaterialForm((prev) => ({ ...prev, visibility: event.target.value as ResourceVisibility }))}><option value="student">Student portal only</option><option value="public">Public books page</option></select></Field>
                      <Field label="PDF file" hint={materialForm.file ? materialForm.file.name : "Select a PDF file for secure delivery."}>
                        <label className={`${secondaryButtonClass} w-full cursor-pointer`}>
                          Choose Book PDF
                          <input key={materialPickerKey} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => setMaterialForm((prev) => ({ ...prev, file: event.target.files?.[0] ?? null }))} />
                        </label>
                      </Field>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button type="button" onClick={() => void handleResourceUpload("material")} className={primaryButtonClass} disabled={busy}>Upload Book</button>
                      <button type="button" onClick={() => { setMaterialForm(emptyResourceForm()); setMaterialPickerKey((prev) => prev + 1); }} className={subtleButtonClass}>Clear</button>
                    </div>
                  </AdminPanelCard>
                </div>

                <AdminPanelCard eyebrow="Resource Library" title="Manage uploaded notes and books" description="Delete outdated files, verify where each PDF appears, and keep both the public library and portal shelves clean.">
                  <div className="grid gap-5 xl:grid-cols-2">
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-base font-semibold text-slate-950">Notes</h3>
                        <StatusBadge tone="neutral">{notes.length}</StatusBadge>
                      </div>
                      <div className="space-y-3">
                        {notes.length === 0 ? (
                          <EmptyState title="No notes uploaded" description="Upload the first note above to send it to the public notes page or the student portal." />
                        ) : (
                          notes.map((note) => (
                            <div key={note.id} className={`${nestedCardClass} flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between`}>
                              <div>
                                <p className="font-semibold text-slate-900">{note.title}</p>
                                <p className="mt-1 text-sm text-slate-600">{courseTitleById.get(note.course_id) ?? "Unknown course"} · {formatDate(note.created_at)}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <StatusBadge tone={note.visibility === "public" ? "success" : "neutral"}>{formatResourceVisibility(note.visibility)}</StatusBadge>
                                </div>
                              </div>
                              <button type="button" onClick={() => void handleDeleteResource("note", note)} className={dangerButtonClass}>Delete</button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-base font-semibold text-slate-950">Books</h3>
                        <StatusBadge tone="neutral">{materials.length}</StatusBadge>
                      </div>
                      <div className="space-y-3">
                        {materials.length === 0 ? (
                          <EmptyState title="No books uploaded" description="Upload the first book or reference PDF above to populate the public books page or portal shelf." />
                        ) : (
                          materials.map((material) => (
                            <div key={material.id} className={`${nestedCardClass} flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between`}>
                              <div>
                                <p className="font-semibold text-slate-900">{material.title}</p>
                                <p className="mt-1 text-sm text-slate-600">{courseTitleById.get(material.course_id) ?? "Unknown course"} · {formatDate(material.created_at)}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <StatusBadge tone={material.visibility === "public" ? "success" : "neutral"}>{formatResourceVisibility(material.visibility)}</StatusBadge>
                                </div>
                              </div>
                              <button type="button" onClick={() => void handleDeleteResource("material", material)} className={dangerButtonClass}>Delete</button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </AdminPanelCard>

                <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                  <AdminPanelCard eyebrow="Announcement Desk" title={editingAnnouncementId ? "Update announcement" : "Publish announcement"} description="Announcements are the cleanest way to push operational updates into the student portal home surface.">
                    <div className="grid gap-4">
                      <Field label="Title"><input className={inputClass} value={announcementForm.title} onChange={(event) => setAnnouncementForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Batch timing update" /></Field>
                      <Field label="Message body"><textarea className={textareaClass} value={announcementForm.body} onChange={(event) => setAnnouncementForm((prev) => ({ ...prev, body: event.target.value }))} placeholder="Add the announcement details shown to students." /></Field>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button type="button" onClick={() => void handleAnnouncementSubmit()} className={primaryButtonClass} disabled={busy}>{editingAnnouncementId ? "Update Announcement" : "Publish Announcement"}</button>
                      <button type="button" onClick={() => { setEditingAnnouncementId(null); setAnnouncementForm(emptyAnnouncementForm()); }} className={subtleButtonClass}>Clear</button>
                    </div>
                  </AdminPanelCard>

                  <AdminPanelCard eyebrow="Announcement Stream" title="Live communication feed" description="Keep notices current so students see a trustworthy, active portal."
                  >
                    <div className="space-y-3">
                      {announcements.length === 0 ? (
                        <EmptyState title="No announcements yet" description="Publish the first update to make the student portal feel active and guided." />
                      ) : (
                        announcements.map((announcement) => (
                          <div key={announcement.id} className={nestedCardClass}>
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <p className="font-semibold text-slate-900">{announcement.title}</p>
                                <p className="mt-1 text-xs text-slate-500">Published {formatDateTime(announcement.created_at)}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => startEditingAnnouncement(announcement)} className={secondaryButtonClass}>Edit</button>
                                <button type="button" onClick={() => void handleDeleteAnnouncement(announcement.id)} className={dangerButtonClass}>Delete</button>
                              </div>
                            </div>
                            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{announcement.body}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </AdminPanelCard>
                </div>
              </>
            ) : null}

            {activeTab === "website" ? (
              <>
                <AdminPanelCard eyebrow="Website Publishing" title="Manage public homepage content" description="All cards below feed the public site. Save from any card to publish the current homepage dataset." action={saveHomeButton}>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className={nestedCardClass}><p className="text-xs text-stone-500">Programs</p><p className="mt-2 text-2xl font-semibold text-slate-950">{homeContent.programs.length}</p></div>
                    <div className={nestedCardClass}><p className="text-xs text-stone-500">Testimonials</p><p className="mt-2 text-2xl font-semibold text-slate-950">{homeContent.testimonials.length}</p></div>
                    <div className={nestedCardClass}><p className="text-xs text-stone-500">FAQs</p><p className="mt-2 text-2xl font-semibold text-slate-950">{homeContent.faqs.length}</p></div>
                  </div>
                </AdminPanelCard>

                <AdminPanelCard eyebrow="Hero Content" title="Homepage hero and primary messaging" description="This is the first story parents and students read on the public site." action={saveHomeButton}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Hero badge"><input className={inputClass} value={homeContent.heroBadge} onChange={(event) => setHomeContent((prev) => ({ ...prev, heroBadge: event.target.value }))} /></Field>
                    <Field label="Hero title"><input className={inputClass} value={homeContent.heroTitle} onChange={(event) => setHomeContent((prev) => ({ ...prev, heroTitle: event.target.value }))} /></Field>
                    <div className="md:col-span-2"><Field label="Hero subtitle"><textarea className={textareaClass} value={homeContent.heroSubtitle} onChange={(event) => setHomeContent((prev) => ({ ...prev, heroSubtitle: event.target.value }))} /></Field></div>
                    <Field label="Primary CTA label"><input className={inputClass} value={homeContent.heroPrimaryCtaLabel} onChange={(event) => setHomeContent((prev) => ({ ...prev, heroPrimaryCtaLabel: event.target.value }))} /></Field>
                    <Field label="Primary CTA link"><input className={inputClass} value={homeContent.heroPrimaryCtaHref} onChange={(event) => setHomeContent((prev) => ({ ...prev, heroPrimaryCtaHref: event.target.value }))} /></Field>
                    <Field label="Secondary CTA label"><input className={inputClass} value={homeContent.heroSecondaryCtaLabel} onChange={(event) => setHomeContent((prev) => ({ ...prev, heroSecondaryCtaLabel: event.target.value }))} /></Field>
                    <Field label="Secondary CTA link"><input className={inputClass} value={homeContent.heroSecondaryCtaHref} onChange={(event) => setHomeContent((prev) => ({ ...prev, heroSecondaryCtaHref: event.target.value }))} /></Field>
                  </div>
                </AdminPanelCard>

                <AdminPanelCard eyebrow="Programs" title="Homepage program cards" description="Course master data stays in operations, while homepage programs shape the public marketing view." action={saveHomeButton}>
                  <div className="space-y-4">
                    {homeContent.programs.map((program) => (
                      <div key={program.id} className={nestedCardClass}>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <input className={inputClass} value={program.title} onChange={(event) => updateProgram(program.id, { title: event.target.value })} placeholder="Program title" />
                          <input className={inputClass} value={program.subtitle} onChange={(event) => updateProgram(program.id, { subtitle: event.target.value })} placeholder="Subtitle" />
                          <input className={inputClass} value={program.ctaLabel} onChange={(event) => updateProgram(program.id, { ctaLabel: event.target.value })} placeholder="CTA label" />
                          <input className={inputClass} value={program.ctaHref} onChange={(event) => updateProgram(program.id, { ctaHref: event.target.value })} placeholder="CTA href" />
                        </div>
                        <div className="mt-4">
                          <Field label="Chips (comma separated)"><textarea className={textareaClass} value={program.chips.join(", ")} onChange={(event) => updateProgram(program.id, { chips: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></Field>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <button type="button" onClick={() => setHomeContent((prev) => ({ ...prev, programs: prev.programs.filter((item) => item.id !== program.id) }))} className={dangerButtonClass}>Remove Program</button>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={() => setHomeContent((prev) => ({ ...prev, programs: [...prev.programs, emptyProgram()] }))} className={secondaryButtonClass}>Add Program</button>
                  </div>
                </AdminPanelCard>

                <div className="grid gap-5 xl:grid-cols-2">
                  <AdminPanelCard eyebrow="Testimonials" title="Social proof and learner voices" description="Keep the public story credible with fresh student outcomes." action={saveHomeButton}>
                    <div className="space-y-4">
                      {homeContent.testimonials.map((testimonial) => (
                        <div key={testimonial.id} className={nestedCardClass}>
                          <div className="grid gap-4 md:grid-cols-2">
                            <input className={inputClass} value={testimonial.name} onChange={(event) => updateTestimonial(testimonial.id, { name: event.target.value })} placeholder="Name" />
                            <input className={inputClass} value={testimonial.role} onChange={(event) => updateTestimonial(testimonial.id, { role: event.target.value })} placeholder="Role / Class" />
                          </div>
                          <textarea className={`${textareaClass} mt-4`} value={testimonial.quote} onChange={(event) => updateTestimonial(testimonial.id, { quote: event.target.value })} placeholder="Quote" />
                          <div className="mt-4 flex justify-end">
                            <button type="button" onClick={() => setHomeContent((prev) => ({ ...prev, testimonials: prev.testimonials.filter((item) => item.id !== testimonial.id) }))} className={dangerButtonClass}>Remove</button>
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={() => setHomeContent((prev) => ({ ...prev, testimonials: [...prev.testimonials, emptyTestimonial()] }))} className={secondaryButtonClass}>Add Testimonial</button>
                    </div>
                  </AdminPanelCard>

                  <AdminPanelCard eyebrow="FAQs" title="Common questions and answers" description="Keep public objections low with a tighter, clearer FAQ block." action={saveHomeButton}>
                    <div className="space-y-4">
                      {homeContent.faqs.map((faq) => (
                        <div key={faq.id} className={nestedCardClass}>
                          <input className={inputClass} value={faq.question} onChange={(event) => updateFaq(faq.id, { question: event.target.value })} placeholder="Question" />
                          <textarea className={`${textareaClass} mt-4`} value={faq.answer} onChange={(event) => updateFaq(faq.id, { answer: event.target.value })} placeholder="Answer" />
                          <div className="mt-4 flex justify-end">
                            <button type="button" onClick={() => setHomeContent((prev) => ({ ...prev, faqs: prev.faqs.filter((item) => item.id !== faq.id) }))} className={dangerButtonClass}>Remove</button>
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={() => setHomeContent((prev) => ({ ...prev, faqs: [...prev.faqs, emptyFaq()] }))} className={secondaryButtonClass}>Add FAQ</button>
                    </div>
                  </AdminPanelCard>
                </div>
              </>
            ) : null}

            {activeTab === "settings" ? (
              <AdminPanelCard
                eyebrow="Site Settings"
                title="Brand identity, contact info, and metadata"
                description="These fields shape the site title, support channels, and brand presentation across public surfaces."
                action={<button type="button" onClick={() => void saveSiteContent("settings", siteSettings)} className={primaryButtonClass} disabled={busy}>Save Settings</button>}
              >
                <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Site name"><input className={inputClass} value={siteSettings.siteName} onChange={(event) => setSiteSettings((prev) => ({ ...prev, siteName: event.target.value }))} /></Field>
                    <Field label="Logo URL"><input className={inputClass} value={siteSettings.logoUrl} onChange={(event) => setSiteSettings((prev) => ({ ...prev, logoUrl: event.target.value }))} placeholder="/logo.png or https://..." /></Field>
                    <div className="md:col-span-2"><Field label="Site description"><textarea className={textareaClass} value={siteSettings.siteDescription} onChange={(event) => setSiteSettings((prev) => ({ ...prev, siteDescription: event.target.value }))} /></Field></div>
                    <Field label="Contact email"><input className={inputClass} value={siteSettings.contactEmail} onChange={(event) => setSiteSettings((prev) => ({ ...prev, contactEmail: event.target.value }))} /></Field>
                    <Field label="Contact phone"><input className={inputClass} value={siteSettings.contactPhone} onChange={(event) => setSiteSettings((prev) => ({ ...prev, contactPhone: event.target.value }))} /></Field>
                    <div className="md:col-span-2"><Field label="Contact address"><input className={inputClass} value={siteSettings.contactAddress} onChange={(event) => setSiteSettings((prev) => ({ ...prev, contactAddress: event.target.value }))} /></Field></div>
                    <div className="md:col-span-2"><Field label="Footer notice"><input className={inputClass} value={siteSettings.footerNotice} onChange={(event) => setSiteSettings((prev) => ({ ...prev, footerNotice: event.target.value }))} /></Field></div>
                  </div>

                  <div className="space-y-4">
                    <div className={nestedCardClass}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Current preview</p>
                      <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{siteSettings.siteName}</h3>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{siteSettings.siteDescription}</p>
                    </div>
                    <div className={nestedCardClass}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Support channels</p>
                      <div className="mt-3 space-y-2 text-sm text-slate-600">
                        <p><span className="font-semibold text-slate-900">Email:</span> {siteSettings.contactEmail || "Not set"}</p>
                        <p><span className="font-semibold text-slate-900">Phone:</span> {siteSettings.contactPhone || "Not set"}</p>
                        <p><span className="font-semibold text-slate-900">Address:</span> {siteSettings.contactAddress || "Not set"}</p>
                      </div>
                    </div>
                    <div className={nestedCardClass}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Quick links</p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link href="/" className={secondaryButtonClass}>Homepage</Link>
                        <Link href="/about" className={secondaryButtonClass}>About Page</Link>
                        <Link href="/courses" className={secondaryButtonClass}>Courses</Link>
                      </div>
                    </div>
                  </div>
                </div>
              </AdminPanelCard>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
