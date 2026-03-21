"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../app/AuthProvider";
import { defaultHomeContent, mergeHomeContent } from "../../data/homeContent";
import { defaultSiteSettings, mergeSiteSettings } from "../../data/siteSettings";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";
import type { Faq, HomeContent, Program, Testimonial } from "../../types/home";
import type { SiteSettings } from "../../types/site";
import AdminMetricCard from "./AdminMetricCard";
import AdminPanelCard from "./AdminPanelCard";
import AdminSidebar from "./AdminSidebar";

type AdminTab = "dashboard" | "students" | "courses" | "content" | "settings";

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

const badgeClass =
  "inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.05)]";
const inputClass =
  "w-full rounded-[24px] bg-white px-4 py-3 text-sm text-slate-900 outline-none shadow-[0_10px_26px_rgba(15,23,42,0.05)] transition focus:shadow-[0_0_0_4px_rgba(226,232,240,0.8),0_18px_36px_rgba(15,23,42,0.08)]";
const labelClass = "mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500";
const secondaryButtonClass =
  "rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-[0_14px_30px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_38px_rgba(15,23,42,0.11)]";
const subtleButtonClass =
  "rounded-full bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5";
const dangerButtonClass =
  "rounded-full bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5";
const nestedCardClass =
  "rounded-[26px] bg-white p-4 shadow-[0_14px_30px_rgba(15,23,42,0.06)]";
const tableShellClass =
  "mt-5 overflow-hidden rounded-[28px] bg-white shadow-[0_16px_38px_rgba(15,23,42,0.07)]";

export default function AdminDashboard() {
  const { role, instituteId, loading: authLoading, logout } = useAuth();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [pageLoading, setPageLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
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

  const deferredStudentSearch = useDeferredValue(studentSearch);

  const withTimeout = async <T,>(promise: Promise<T> | PromiseLike<T>, ms = 7000): Promise<T> => {
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

  const clearFeedback = () => {
    setError(null);
    setMessage(null);
  };

  const loadStudents = async () => {
    const response = await withTimeout(fetch("/api/admin/students", { cache: "no-store" }));
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to load students");
    }
    setStudents(payload.students ?? []);
  };

  const loadCourses = async (tenantId: string) => {
    if (!supabase) {
      return;
    }

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
  };

  const loadContent = async () => {
    const response = await withTimeout(fetch("/api/admin/site-content", { cache: "no-store" }));
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to load site content");
    }
    setHomeContent(mergeHomeContent(payload.home));
    setSiteSettings(mergeSiteSettings(payload.settings));
  };

  const loadDashboard = async () => {
    if (!instituteId) {
      return;
    }

    setPageLoading(true);
    clearFeedback();

    try {
      await Promise.all([loadStudents(), loadCourses(instituteId), loadContent()]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load admin dashboard");
    } finally {
      setPageLoading(false);
    }
  };

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

    void loadDashboard();
  }, [authLoading, instituteId, role]);

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

  const overviewMetrics = useMemo(
    () => [
      { label: "Students", value: students.length, helper: "Active student accounts in your institute" },
      { label: "Courses", value: courses.length, helper: "Course records controlled from the admin panel" },
      { label: "Enrollments", value: enrollments.length, helper: "Student to course assignments" },
      { label: "Content Blocks", value: homeContent.testimonials.length + homeContent.faqs.length + homeContent.programs.length, helper: "Editable frontend content items" },
    ],
    [courses.length, enrollments.length, homeContent.faqs.length, homeContent.programs.length, homeContent.testimonials.length, students.length]
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
      setMessage(editingStudentId ? "Student updated." : "Student created.");
      await loadStudents();
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

      setMessage("Student deleted.");
      await Promise.all([loadStudents(), instituteId ? loadCourses(instituteId) : Promise.resolve()]);
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
      setMessage("Password reset generated.");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Unable to reset password");
    } finally {
      setBusy(false);
    }
  };

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

      setMessage("Bulk upload completed.");
      await loadStudents();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to import CSV");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  };

  const handleCourseCreate = async () => {
    if (!supabase || !instituteId) {
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
    if (!supabase || !instituteId) {
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
    if (!supabase || !instituteId || !window.confirm("Delete this course?")) {
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
      await loadCourses(instituteId);
    } catch (courseError) {
      setError(courseError instanceof Error ? courseError.message : "Unable to delete course");
    } finally {
      setBusy(false);
    }
  };

  const handleAssignStudent = async () => {
    if (!supabase || !instituteId || !assignmentForm.studentId || !assignmentForm.courseId) {
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
      setMessage("Student assigned to course.");
      await loadCourses(instituteId);
    } catch (assignmentError) {
      setError(assignmentError instanceof Error ? assignmentError.message : "Unable to assign student");
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveEnrollment = async (studentId: string, courseId: string) => {
    if (!supabase || !instituteId) {
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

  const updateProgram = (programId: string, patch: Partial<Program>) => {
    setHomeContent((prev) => ({ ...prev, programs: prev.programs.map((program) => (program.id === programId ? { ...program, ...patch } : program)) }));
  };

  const updateFaq = (faqId: string, patch: Partial<Faq>) => {
    setHomeContent((prev) => ({ ...prev, faqs: prev.faqs.map((faq) => (faq.id === faqId ? { ...faq, ...patch } : faq)) }));
  };

  const updateTestimonial = (testimonialId: string, patch: Partial<Testimonial>) => {
    setHomeContent((prev) => ({ ...prev, testimonials: prev.testimonials.map((testimonial) => (testimonial.id === testimonialId ? { ...testimonial, ...patch } : testimonial)) }));
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
      <section className="relative w-full px-4 py-8 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-0 top-10 h-44 w-44 rounded-full bg-stone-200/50 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-32 h-56 w-56 rounded-full bg-slate-100/80 blur-3xl" />
        <div className="mx-auto max-w-7xl animate-pulse rounded-[40px] bg-white/92 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.1)] backdrop-blur-xl">
          <div className="h-8 w-56 rounded-full bg-slate-200" />
          <div className="mt-6 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="h-[420px] rounded-[28px] bg-slate-200" />
            <div className="h-[420px] rounded-[28px] bg-slate-200" />
          </div>
        </div>
      </section>
    );
  }

  if (role !== "admin") {
    return (
      <section className="app-page-shell">
        <div className="rounded-[34px] bg-white/92 p-8 shadow-[0_28px_75px_rgba(15,23,42,0.1)] backdrop-blur-xl">
          <p className={badgeClass}>Restricted Area</p>
          <h1 className="mt-4 text-3xl font-black tracking-[-0.05em] text-slate-950">Admin access required</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">This dashboard is available only to owner-level admin accounts.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login?type=admin" className="btn rounded-full px-5 py-3">Go to Admin Login</Link>
            <Link href="/" className={secondaryButtonClass}>Back to website</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="pointer-events-none absolute left-0 top-8 h-48 w-48 rounded-full bg-stone-200/45 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-24 h-64 w-64 rounded-full bg-slate-100/85 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 left-1/3 h-56 w-56 rounded-full bg-slate-100/70 blur-3xl" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="mx-auto max-w-7xl">
        <div className="rounded-[40px] bg-white/88 p-4 shadow-[0_32px_90px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6">
          <div className="relative overflow-hidden flex flex-col gap-4 rounded-[34px] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,248,250,0.96))] px-5 py-6 text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:px-7">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" />
            <div className="pointer-events-none absolute -right-12 -top-8 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(226,232,240,0.95),transparent_66%)] blur-3xl" />
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Owner Control Center</p>
                <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-[-0.05em] sm:text-4xl">A premium control room with calmer spacing, softer contrast, and cleaner hierarchy.</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">Manage students, course access, content publishing, and institute branding from one cleaner Apple-style workspace.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => void loadDashboard()} className={secondaryButtonClass}>Refresh</button>
                <button type="button" onClick={() => void logout()} className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(15,23,42,0.14)] transition hover:-translate-y-0.5 hover:bg-slate-800">Logout</button>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {overviewMetrics.map((metric) => (
                <div key={metric.label} className="rounded-[26px] bg-white px-4 py-3 shadow-[0_12px_28px_rgba(15,23,42,0.06)] backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{metric.label}</p>
                  <p className="mt-2 text-2xl font-black tracking-[-0.04em]">{metric.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{metric.helper}</p>
                </div>
              ))}
            </div>
          </div>

          {(error || message) && (
            <div className="mt-4 rounded-[26px] bg-white px-4 py-3 text-sm shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              {error ? <p className="text-slate-700">{error}</p> : null}
              {message ? <p className="text-slate-700">{message}</p> : null}
            </div>
          )}

          {generatedCredentials ? (
            <div className="mt-4 rounded-[26px] bg-white px-4 py-4 shadow-[0_16px_38px_rgba(15,23,42,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">Latest credentials</p>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <div><p className="text-xs text-slate-500">Student</p><p className="text-sm font-semibold text-slate-900">{generatedCredentials.name}</p></div>
                <div><p className="text-xs text-slate-500">Email</p><p className="text-sm font-semibold text-slate-900 break-all">{generatedCredentials.email}</p></div>
                <div><p className="text-xs text-slate-500">Login ID</p><p className="text-sm font-semibold text-slate-900">{generatedCredentials.loginId}</p></div>
                <div><p className="text-xs text-slate-500">Password</p><p className="text-sm font-semibold text-slate-900">{generatedCredentials.password}</p></div>
              </div>
            </div>
          ) : null}

          <div className="mt-6 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
            <AdminSidebar activeTab={activeTab} onSelect={setActiveTab} siteName={siteSettings.siteName} />

            <div className="grid gap-5">
              {activeTab === "dashboard" ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {overviewMetrics.map((metric) => (
                      <AdminMetricCard key={metric.label} {...metric} />
                    ))}
                  </div>

                  <AdminPanelCard title="Owner Snapshot" description="A quick overview of the dynamic controls now available in the website admin layer.">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-[28px] bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.08)]">
                        <p className={badgeClass}>Students</p>
                        <h3 className="mt-4 text-xl font-bold tracking-[-0.03em] text-slate-950">Credential management and CSV onboarding</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">Create students one by one, generate login credentials, reset passwords, and bulk import onboarding data using CSV.</p>
                      </div>
                      <div className="rounded-[28px] bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.08)]">
                        <p className={badgeClass}>Frontend Content</p>
                        <h3 className="mt-4 text-xl font-bold tracking-[-0.03em] text-slate-950">Database-backed website control</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">Update hero text, CTA labels, testimonials, FAQs, branding, logo URL, and contact info without touching code.</p>
                      </div>
                    </div>
                  </AdminPanelCard>
                </>
              ) : null}

              {activeTab === "students" ? (
                <>
                  <AdminPanelCard title={editingStudentId ? "Edit Student" : "Add Student"} description="Create or update student access. Email is optional; if empty, the system creates a generated student email." action={<button type="button" onClick={() => { setEditingStudentId(null); setStudentForm(emptyStudentForm); }} className={subtleButtonClass}>Clear form</button>}>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div><label className={labelClass}>Student Name</label><input className={inputClass} value={studentForm.name} onChange={(event) => handleStudentFormChange("name", event.target.value)} placeholder="Aarav Singh" /></div>
                      <div><label className={labelClass}>Email</label><input className={inputClass} value={studentForm.email} onChange={(event) => handleStudentFormChange("email", event.target.value)} placeholder="Optional custom email" /></div>
                      <div><label className={labelClass}>Login ID</label><input className={inputClass} value={studentForm.loginId} onChange={(event) => handleStudentFormChange("loginId", event.target.value)} placeholder="Optional custom login id" /></div>
                      <div><label className={labelClass}>Password</label><input className={inputClass} value={studentForm.password} onChange={(event) => handleStudentFormChange("password", event.target.value)} placeholder="Leave empty to auto-generate" /></div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button type="button" disabled={busy} onClick={handleStudentSubmit} className="btn rounded-full px-5 py-3 text-sm">{editingStudentId ? "Update Student" : "Create Student"}</button>
                      <label className={`${secondaryButtonClass} cursor-pointer`}>Bulk Upload CSV<input type="file" accept=".csv,text/csv" className="hidden" onChange={handleBulkUpload} /></label>
                      <div className="flex items-center text-sm text-slate-500">CSV headers: <span className="ml-2 font-semibold text-slate-700">name,email,loginId,password</span></div>
                    </div>
                    {bulkUploadSummary ? <p className="mt-3 text-sm text-slate-600">{bulkUploadSummary}</p> : null}
                  </AdminPanelCard>

                  <AdminPanelCard title="Student Directory" description="Search, filter, reset passwords, and manage accounts in a table view.">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
                        <input className={`${inputClass} md:max-w-md`} value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Search by name, email, or login ID" />
                        <select className={inputClass} value={studentFilter} onChange={(event) => setStudentFilter(event.target.value as "all" | "recent")}>
                          <option value="all">All students</option>
                          <option value="recent">Added in last 30 days</option>
                        </select>
                      </div>
                      <div className="text-sm text-slate-500">{filteredStudents.length} visible</div>
                    </div>
                    <div className={tableShellClass}><div className="overflow-x-auto"><table className="min-w-full divide-y divide-stone-200/70 text-sm"><thead className="bg-stone-50/85 text-left text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Login ID</th><th className="px-4 py-3">Created</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-stone-200/60">{filteredStudents.map((student) => (<tr key={student.id} className="hover:bg-white/60"><td className="px-4 py-3 font-semibold text-slate-900">{student.name}</td><td className="px-4 py-3 text-slate-600">{student.email ?? "-"}</td><td className="px-4 py-3 text-slate-600">{student.login_id ?? "-"}</td><td className="px-4 py-3 text-slate-500">{student.created_at ? new Date(student.created_at).toLocaleDateString() : "-"}</td><td className="px-4 py-3"><div className="flex justify-end gap-2"><button type="button" onClick={() => startEditingStudent(student)} className={secondaryButtonClass}>Edit</button><button type="button" onClick={() => void handleResetPassword(student)} className={subtleButtonClass}>Reset</button><button type="button" onClick={() => void handleDeleteStudent(student.id)} className={dangerButtonClass}>Delete</button></div></td></tr>))}</tbody></table></div></div>
                  </AdminPanelCard>
                </>
              ) : null}

              {activeTab === "courses" ? (
                <>
                  <AdminPanelCard title="Create Course" description="Manage title, description, pricing text, publish status, and CTA label for each course.">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                      <input className={inputClass} placeholder="Course title" value={courseForm.title} onChange={(event) => setCourseForm((prev) => ({ ...prev, title: event.target.value }))} />
                      <input className={inputClass} placeholder="Short description" value={courseForm.description} onChange={(event) => setCourseForm((prev) => ({ ...prev, description: event.target.value }))} />
                      <input className={inputClass} placeholder="Pricing text" value={courseForm.price_text} onChange={(event) => setCourseForm((prev) => ({ ...prev, price_text: event.target.value }))} />
                      <select className={inputClass} value={courseForm.status} onChange={(event) => setCourseForm((prev) => ({ ...prev, status: event.target.value as CourseRow["status"] }))}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select>
                      <input className={inputClass} placeholder="CTA label" value={courseForm.cta_label} onChange={(event) => setCourseForm((prev) => ({ ...prev, cta_label: event.target.value }))} />
                    </div>
                    <div className="mt-4"><button type="button" disabled={busy} onClick={() => void handleCourseCreate()} className="btn rounded-full px-5 py-3 text-sm">Create Course</button></div>
                  </AdminPanelCard>

                  <AdminPanelCard title="Course Catalog" description="Inline editing for your public and assigned course data.">
                    <div className="grid gap-4">{courses.map((course) => (<div key={course.id} className={nestedCardClass}><div className="grid gap-4 xl:grid-cols-[1.2fr_1.6fr_0.8fr_0.8fr_0.8fr_auto]"><input className={inputClass} value={course.title} onChange={(event) => updateCourseField(course.id, "title", event.target.value)} /><input className={inputClass} value={course.description ?? ""} onChange={(event) => updateCourseField(course.id, "description", event.target.value)} /><input className={inputClass} value={course.price_text ?? ""} onChange={(event) => updateCourseField(course.id, "price_text", event.target.value)} /><select className={inputClass} value={course.status} onChange={(event) => updateCourseField(course.id, "status", event.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select><input className={inputClass} value={course.cta_label} onChange={(event) => updateCourseField(course.id, "cta_label", event.target.value)} /><div className="flex gap-2 xl:justify-end"><button type="button" onClick={() => void handleCourseSave(course)} className={secondaryButtonClass}>Save</button><button type="button" onClick={() => void handleCourseDelete(course.id)} className={dangerButtonClass}>Delete</button></div></div></div>))}</div>
                  </AdminPanelCard>

                  <AdminPanelCard title="Assign Students to Courses" description="Directly manage enrollments from the same panel.">
                    <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]"><select className={inputClass} value={assignmentForm.studentId} onChange={(event) => setAssignmentForm((prev) => ({ ...prev, studentId: event.target.value }))}><option value="">Select student</option>{students.map((student) => (<option key={student.id} value={student.id}>{student.name}</option>))}</select><select className={inputClass} value={assignmentForm.courseId} onChange={(event) => setAssignmentForm((prev) => ({ ...prev, courseId: event.target.value }))}><option value="">Select course</option>{courses.map((course) => (<option key={course.id} value={course.id}>{course.title}</option>))}</select><button type="button" onClick={() => void handleAssignStudent()} className="btn rounded-full px-5 py-3 text-sm">Assign</button></div>
                    <div className="mt-5 grid gap-3">{enrollments.map((enrollment) => { const student = students.find((item) => item.id === enrollment.student_id); const course = courses.find((item) => item.id === enrollment.course_id); return (<div key={`${enrollment.student_id}-${enrollment.course_id}`} className={`${nestedCardClass} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}><div><p className="font-semibold text-slate-900">{student?.name ?? enrollment.student_id} → {course?.title ?? enrollment.course_id}</p><p className="text-sm text-slate-500">Assigned on {new Date(enrollment.enrolled_at).toLocaleDateString()}</p></div><button type="button" onClick={() => void handleRemoveEnrollment(enrollment.student_id, enrollment.course_id)} className={dangerButtonClass}>Remove</button></div>); })}</div>
                  </AdminPanelCard>
                </>
              ) : null}

              {activeTab === "content" ? (
                <>
                  <AdminPanelCard title="Hero Content" description="Control the most visible homepage content without code changes." action={<button type="button" onClick={() => void saveSiteContent("home", homeContent)} className="btn rounded-full px-5 py-3 text-sm">Save Content</button>}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div><label className={labelClass}>Hero Badge</label><input className={inputClass} value={homeContent.heroBadge} onChange={(event) => setHomeContent((prev) => ({ ...prev, heroBadge: event.target.value }))} /></div>
                      <div><label className={labelClass}>Hero Title</label><input className={inputClass} value={homeContent.heroTitle} onChange={(event) => setHomeContent((prev) => ({ ...prev, heroTitle: event.target.value }))} /></div>
                      <div className="md:col-span-2"><label className={labelClass}>Hero Subtitle</label><textarea className={`${inputClass} min-h-28`} value={homeContent.heroSubtitle} onChange={(event) => setHomeContent((prev) => ({ ...prev, heroSubtitle: event.target.value }))} /></div>
                      <div><label className={labelClass}>Primary CTA Label</label><input className={inputClass} value={homeContent.heroPrimaryCtaLabel} onChange={(event) => setHomeContent((prev) => ({ ...prev, heroPrimaryCtaLabel: event.target.value }))} /></div>
                      <div><label className={labelClass}>Primary CTA Link</label><input className={inputClass} value={homeContent.heroPrimaryCtaHref} onChange={(event) => setHomeContent((prev) => ({ ...prev, heroPrimaryCtaHref: event.target.value }))} /></div>
                      <div><label className={labelClass}>Secondary CTA Label</label><input className={inputClass} value={homeContent.heroSecondaryCtaLabel} onChange={(event) => setHomeContent((prev) => ({ ...prev, heroSecondaryCtaLabel: event.target.value }))} /></div>
                      <div><label className={labelClass}>Secondary CTA Link</label><input className={inputClass} value={homeContent.heroSecondaryCtaHref} onChange={(event) => setHomeContent((prev) => ({ ...prev, heroSecondaryCtaHref: event.target.value }))} /></div>
                    </div>
                  </AdminPanelCard>

                  <AdminPanelCard title="Programs" description="Manage visible home page program cards. Course master data stays in the Courses tab.">
                    <div className="grid gap-4">{homeContent.programs.map((program) => (<div key={program.id} className={nestedCardClass}><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><input className={inputClass} value={program.title} onChange={(event) => updateProgram(program.id, { title: event.target.value })} placeholder="Program title" /><input className={inputClass} value={program.subtitle} onChange={(event) => updateProgram(program.id, { subtitle: event.target.value })} placeholder="Program subtitle" /><input className={inputClass} value={program.ctaLabel} onChange={(event) => updateProgram(program.id, { ctaLabel: event.target.value })} placeholder="CTA label" /><input className={inputClass} value={program.ctaHref} onChange={(event) => updateProgram(program.id, { ctaHref: event.target.value })} placeholder="CTA href" /></div><div className="mt-4"><label className={labelClass}>Chips (comma separated)</label><textarea className={`${inputClass} min-h-24`} value={program.chips.join(", ")} onChange={(event) => updateProgram(program.id, { chips: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></div><div className="mt-3 flex justify-end"><button type="button" onClick={() => setHomeContent((prev) => ({ ...prev, programs: prev.programs.filter((item) => item.id !== program.id) }))} className={dangerButtonClass}>Remove Program</button></div></div>))}<button type="button" onClick={() => setHomeContent((prev) => ({ ...prev, programs: [...prev.programs, emptyProgram()] }))} className={secondaryButtonClass}>Add Program</button></div>
                  </AdminPanelCard>

                  <AdminPanelCard title="Testimonials" description="Add, edit, or remove homepage testimonials.">
                    <div className="grid gap-4">{homeContent.testimonials.map((testimonial) => (<div key={testimonial.id} className={nestedCardClass}><div className="grid gap-4 md:grid-cols-2"><input className={inputClass} value={testimonial.name} onChange={(event) => updateTestimonial(testimonial.id, { name: event.target.value })} placeholder="Name" /><input className={inputClass} value={testimonial.role} onChange={(event) => updateTestimonial(testimonial.id, { role: event.target.value })} placeholder="Role / Class" /></div><textarea className={`${inputClass} mt-4 min-h-24`} value={testimonial.quote} onChange={(event) => updateTestimonial(testimonial.id, { quote: event.target.value })} placeholder="Quote" /><div className="mt-3 flex justify-end"><button type="button" onClick={() => setHomeContent((prev) => ({ ...prev, testimonials: prev.testimonials.filter((item) => item.id !== testimonial.id) }))} className={dangerButtonClass}>Remove</button></div></div>))}<button type="button" onClick={() => setHomeContent((prev) => ({ ...prev, testimonials: [...prev.testimonials, emptyTestimonial()] }))} className={secondaryButtonClass}>Add Testimonial</button></div>
                  </AdminPanelCard>

                  <AdminPanelCard title="FAQs" description="Update the common questions shown on the website.">
                    <div className="grid gap-4">{homeContent.faqs.map((faq) => (<div key={faq.id} className={nestedCardClass}><input className={inputClass} value={faq.question} onChange={(event) => updateFaq(faq.id, { question: event.target.value })} placeholder="Question" /><textarea className={`${inputClass} mt-4 min-h-24`} value={faq.answer} onChange={(event) => updateFaq(faq.id, { answer: event.target.value })} placeholder="Answer" /><div className="mt-3 flex justify-end"><button type="button" onClick={() => setHomeContent((prev) => ({ ...prev, faqs: prev.faqs.filter((item) => item.id !== faq.id) }))} className={dangerButtonClass}>Remove</button></div></div>))}<button type="button" onClick={() => setHomeContent((prev) => ({ ...prev, faqs: [...prev.faqs, emptyFaq()] }))} className={secondaryButtonClass}>Add FAQ</button></div>
                  </AdminPanelCard>
                </>
              ) : null}

              {activeTab === "settings" ? (
                <AdminPanelCard title="Branding and Site Settings" description="Manage website title, logo URL, metadata, and contact details." action={<button type="button" onClick={() => void saveSiteContent("settings", siteSettings)} className="btn rounded-full px-5 py-3 text-sm">Save Settings</button>}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div><label className={labelClass}>Site Name</label><input className={inputClass} value={siteSettings.siteName} onChange={(event) => setSiteSettings((prev) => ({ ...prev, siteName: event.target.value }))} /></div>
                    <div><label className={labelClass}>Logo URL</label><input className={inputClass} value={siteSettings.logoUrl} onChange={(event) => setSiteSettings((prev) => ({ ...prev, logoUrl: event.target.value }))} placeholder="/logo.png or https://..." /></div>
                    <div className="md:col-span-2"><label className={labelClass}>Site Description</label><textarea className={`${inputClass} min-h-24`} value={siteSettings.siteDescription} onChange={(event) => setSiteSettings((prev) => ({ ...prev, siteDescription: event.target.value }))} /></div>
                    <div><label className={labelClass}>Contact Email</label><input className={inputClass} value={siteSettings.contactEmail} onChange={(event) => setSiteSettings((prev) => ({ ...prev, contactEmail: event.target.value }))} /></div>
                    <div><label className={labelClass}>Contact Phone</label><input className={inputClass} value={siteSettings.contactPhone} onChange={(event) => setSiteSettings((prev) => ({ ...prev, contactPhone: event.target.value }))} /></div>
                    <div className="md:col-span-2"><label className={labelClass}>Contact Address</label><input className={inputClass} value={siteSettings.contactAddress} onChange={(event) => setSiteSettings((prev) => ({ ...prev, contactAddress: event.target.value }))} /></div>
                    <div className="md:col-span-2"><label className={labelClass}>Footer Notice</label><input className={inputClass} value={siteSettings.footerNotice} onChange={(event) => setSiteSettings((prev) => ({ ...prev, footerNotice: event.target.value }))} /></div>
                  </div>
                </AdminPanelCard>
              ) : null}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}