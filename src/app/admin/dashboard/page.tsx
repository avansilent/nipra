"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../../lib/supabase/browser";

type CourseRow = { id: string; title: string; description: string | null };
type StudentRow = { id: string; name: string; role: string };
type EnrollmentRow = {
  student_id: string;
  course_id: string;
  student: { id: string; name: string } | Array<{ id: string; name: string }> | null;
  course: { id: string; title: string } | Array<{ id: string; title: string }> | null;
};
type MaterialRow = { id: string; title: string; course_id: string; file_url: string; created_at: string };
type TestRow = { id: string; title: string; test_date: string; course_id: string };
type ResultRow = {
  student_id: string;
  test_id: string;
  marks: number;
  student: { id: string; name: string } | Array<{ id: string; name: string }> | null;
  test: { id: string; title: string } | Array<{ id: string; title: string }> | null;
};
type AnnouncementRow = { id: string; title: string; body: string; created_at: string };

type TabKey =
  | "overview"
  | "courses"
  | "materials"
  | "enrollments"
  | "tests"
  | "results"
  | "announcements";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "courses", label: "Courses" },
  { key: "materials", label: "Materials" },
  { key: "enrollments", label: "Enrollments" },
  { key: "tests", label: "Tests" },
  { key: "results", label: "Results" },
  { key: "announcements", label: "Announcements" },
];

const normalizeRole = (role?: string | null): "admin" | "student" | null => {
  if (role === "admin" || role === "student") {
    return role;
  }
  return null;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [instituteId, setInstituteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [tests, setTests] = useState<TestRow[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);

  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseDescription, setNewCourseDescription] = useState("");

  const [assignCourseId, setAssignCourseId] = useState("");
  const [assignStudentId, setAssignStudentId] = useState("");

  const [materialCourseId, setMaterialCourseId] = useState("");
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);

  const [testCourseId, setTestCourseId] = useState("");
  const [testTitle, setTestTitle] = useState("");
  const [testDate, setTestDate] = useState("");

  const [markStudentId, setMarkStudentId] = useState("");
  const [markTestId, setMarkTestId] = useState("");
  const [markValue, setMarkValue] = useState("");

  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");

  const resetFeedback = () => {
    setError(null);
    setSuccess(null);
  };

  const loadDashboardData = async (tenantId: string) => {
    if (!supabase) {
      return;
    }

    const [coursesResp, tenantProfilesResp, enrollmentsResp, materialsResp, testsResp, resultsResp, announcementsResp] =
      await Promise.all([
        supabase.from("courses").select("id, title, description").eq("institute_id", tenantId).order("created_at", { ascending: false }),
        supabase.from("profiles").select("id").eq("role", "student").eq("institute_id", tenantId),
        supabase
          .from("enrollments")
          .select("student_id, course_id, student:users(id, name), course:courses(id, title)")
          .eq("institute_id", tenantId)
          .order("enrolled_at", { ascending: false }),
        supabase
          .from("materials")
          .select("id, title, course_id, file_url, created_at")
          .eq("institute_id", tenantId)
          .order("created_at", { ascending: false }),
        supabase.from("tests").select("id, title, test_date, course_id").eq("institute_id", tenantId).order("test_date", { ascending: true }),
        supabase
          .from("results")
          .select("student_id, test_id, marks, student:users(id, name), test:tests(id, title)")
          .eq("institute_id", tenantId)
          .order("recorded_at", { ascending: false })
          .limit(100),
        supabase
          .from("announcements")
          .select("id, title, body, created_at")
          .eq("institute_id", tenantId)
          .order("created_at", { ascending: false }),
      ]);

    if (coursesResp.error) throw new Error(coursesResp.error.message);
    if (tenantProfilesResp.error) throw new Error(tenantProfilesResp.error.message);
    if (enrollmentsResp.error) throw new Error(enrollmentsResp.error.message);
    if (materialsResp.error) throw new Error(materialsResp.error.message);
    if (testsResp.error) throw new Error(testsResp.error.message);
    if (resultsResp.error) throw new Error(resultsResp.error.message);
    if (announcementsResp.error) throw new Error(announcementsResp.error.message);

    setCourses((coursesResp.data ?? []) as CourseRow[]);

    const tenantStudentIds = (tenantProfilesResp.data ?? []).map((profile) => profile.id);
    if (tenantStudentIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, name, role")
        .in("id", tenantStudentIds)
        .order("created_at", { ascending: false });

      if (usersError) throw new Error(usersError.message);
      setStudents((usersData ?? []) as StudentRow[]);
    } else {
      setStudents([]);
    }

    setEnrollments((enrollmentsResp.data ?? []) as EnrollmentRow[]);
    setMaterials((materialsResp.data ?? []) as MaterialRow[]);
    setTests((testsResp.data ?? []) as TestRow[]);
    setResults((resultsResp.data ?? []) as ResultRow[]);
    setAnnouncements((announcementsResp.data ?? []) as AnnouncementRow[]);
  };

  useEffect(() => {
    if (!supabase) {
      setError("Supabase is not configured.");
      setReady(true);
      return;
    }

    const init = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login?type=admin");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role, institute_id")
          .eq("id", user.id)
          .maybeSingle();

        const role = normalizeRole(profile?.role ?? null);
        if (role !== "admin") {
          router.replace(role === "student" ? "/student/dashboard" : "/login");
          return;
        }

        const tenantId = profile?.institute_id ?? null;
        if (!tenantId) {
          setError("Institute not assigned for this admin.");
          return;
        }

        setInstituteId(tenantId);
        await loadDashboardData(tenantId);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load admin dashboard");
      } finally {
        setReady(true);
      }
    };

    init();
  }, [router, supabase]);

  const createCourse = async () => {
    resetFeedback();
    if (!supabase || !instituteId) return;
    if (!newCourseTitle.trim()) {
      setError("Course title is required.");
      return;
    }

    const { error: insertError } = await supabase.from("courses").insert({
      title: newCourseTitle.trim(),
      description: newCourseDescription.trim() || null,
      institute_id: instituteId,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setNewCourseTitle("");
    setNewCourseDescription("");
    setSuccess("Course created.");
    await loadDashboardData(instituteId);
  };

  const updateCourse = async (course: CourseRow) => {
    resetFeedback();
    if (!supabase || !instituteId) return;

    const { error: updateError } = await supabase
      .from("courses")
      .update({
        title: course.title.trim(),
        description: course.description?.trim() || null,
      })
      .eq("id", course.id)
      .eq("institute_id", instituteId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess("Course updated.");
    await loadDashboardData(instituteId);
  };

  const deleteCourse = async (courseId: string) => {
    resetFeedback();
    if (!supabase || !instituteId) return;

    const { error: deleteError } = await supabase.from("courses").delete().eq("id", courseId).eq("institute_id", instituteId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setSuccess("Course deleted.");
    await loadDashboardData(instituteId);
  };

  const assignStudentToCourse = async () => {
    resetFeedback();
    if (!supabase || !instituteId) return;

    if (!assignCourseId || !assignStudentId) {
      setError("Select student and course.");
      return;
    }

    const { error: insertError } = await supabase.from("enrollments").insert({
      student_id: assignStudentId,
      course_id: assignCourseId,
      institute_id: instituteId,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSuccess("Enrollment created.");
    await loadDashboardData(instituteId);
  };

  const removeEnrollment = async (studentId: string, courseId: string) => {
    resetFeedback();
    if (!supabase || !instituteId) return;

    const { error: deleteError } = await supabase
      .from("enrollments")
      .delete()
      .eq("student_id", studentId)
      .eq("course_id", courseId)
      .eq("institute_id", instituteId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setSuccess("Enrollment removed.");
    await loadDashboardData(instituteId);
  };

  const uploadMaterial = async () => {
    resetFeedback();
    if (!materialCourseId || !materialFile) {
      setError("Course and PDF file are required.");
      return;
    }

    const formData = new FormData();
    formData.append("courseId", materialCourseId);
    formData.append("title", materialTitle);
    formData.append("file", materialFile);

    setUploadingMaterial(true);
    try {
      const response = await fetch("/api/admin/materials/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Unable to upload material");

      setMaterialTitle("");
      setMaterialFile(null);
      setSuccess("Material uploaded.");
      if (instituteId) await loadDashboardData(instituteId);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload material");
    } finally {
      setUploadingMaterial(false);
    }
  };

  const createTest = async () => {
    resetFeedback();
    if (!supabase || !instituteId) return;
    if (!testCourseId || !testTitle.trim() || !testDate) {
      setError("Course, test title and date are required.");
      return;
    }

    const { error: insertError } = await supabase.from("tests").insert({
      course_id: testCourseId,
      title: testTitle.trim(),
      test_date: testDate,
      institute_id: instituteId,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setTestTitle("");
    setTestDate("");
    setSuccess("Test created.");
    await loadDashboardData(instituteId);
  };

  const saveMarks = async () => {
    resetFeedback();
    if (!supabase || !instituteId) return;

    const numericMarks = Number(markValue);
    if (!markStudentId || !markTestId || Number.isNaN(numericMarks)) {
      setError("Student, test and marks are required.");
      return;
    }

    const { error: upsertError } = await supabase.from("results").upsert(
      {
        student_id: markStudentId,
        test_id: markTestId,
        marks: numericMarks,
        institute_id: instituteId,
      },
      { onConflict: "student_id,test_id" }
    );

    if (upsertError) {
      setError(upsertError.message);
      return;
    }

    setMarkValue("");
    setSuccess("Result saved.");
    await loadDashboardData(instituteId);
  };

  const createAnnouncement = async () => {
    resetFeedback();
    if (!supabase || !instituteId) return;
    if (!announcementTitle.trim() || !announcementBody.trim()) {
      setError("Announcement title and body are required.");
      return;
    }

    const { error: insertError } = await supabase.from("announcements").insert({
      institute_id: instituteId,
      title: announcementTitle.trim(),
      body: announcementBody.trim(),
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setAnnouncementTitle("");
    setAnnouncementBody("");
    setSuccess("Announcement published.");
    await loadDashboardData(instituteId);
  };

  const deleteAnnouncement = async (announcementId: string) => {
    resetFeedback();
    if (!supabase || !instituteId) return;

    const { error: deleteError } = await supabase
      .from("announcements")
      .delete()
      .eq("id", announcementId)
      .eq("institute_id", instituteId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setSuccess("Announcement removed.");
    await loadDashboardData(instituteId);
  };

  if (!ready) {
    return (
      <section className="p-6 md:p-10">
        <div className="glass-readable p-6 animate-pulse">
          <div className="h-6 w-56 rounded bg-slate-200" />
          <div className="mt-6 grid md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-20 rounded-[14px] bg-slate-200" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full px-4 md:px-8 py-6 md:py-8">
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="glass-readable p-3 h-fit sticky top-24">
          <div className="px-2 py-3 border-b border-slate-200/70">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Admin Panel</p>
            <h1 className="text-lg font-bold text-slate-900 mt-1">Institute ERP</h1>
          </div>
          <nav className="mt-3 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`w-full text-left px-3 py-2 rounded-[14px] text-sm font-medium smooth-hover ${
                  activeTab === tab.key
                    ? "bg-gradient-to-r from-indigo-600 to-sky-500 text-white shadow"
                    : "text-slate-700 hover:bg-white/70"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="glass-readable p-4 md:p-6">
          {(error || success) && (
            <div className="mb-4 text-sm">
              {error ? <p className="text-red-600">{error}</p> : null}
              {success ? <p className="text-emerald-700">{success}</p> : null}
            </div>
          )}

          {activeTab === "overview" && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Dashboard Overview</h2>
              <p className="text-sm text-slate-600 mt-1">Separate admin workspace with institute-level controls.</p>
              <div className="mt-4 grid grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="glass-readable p-4"><p className="text-xs text-slate-500">Total Students</p><p className="text-2xl font-bold">{students.length}</p></div>
                <div className="glass-readable p-4"><p className="text-xs text-slate-500">Total Courses</p><p className="text-2xl font-bold">{courses.length}</p></div>
                <div className="glass-readable p-4"><p className="text-xs text-slate-500">Materials</p><p className="text-2xl font-bold">{materials.length}</p></div>
                <div className="glass-readable p-4"><p className="text-xs text-slate-500">Announcements</p><p className="text-2xl font-bold">{announcements.length}</p></div>
              </div>
            </div>
          )}

          {activeTab === "courses" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">Add / Edit / Delete Courses</h2>
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <input className="border border-slate-200 px-3 py-2 rounded-[14px]" placeholder="Course title" value={newCourseTitle} onChange={(e) => setNewCourseTitle(e.target.value)} />
                <input className="border border-slate-200 px-3 py-2 rounded-[14px]" placeholder="Description" value={newCourseDescription} onChange={(e) => setNewCourseDescription(e.target.value)} />
                <button className="btn" type="button" onClick={createCourse}>Create</button>
              </div>
              <div className="space-y-3">
                {courses.map((course) => (
                  <div key={course.id} className="glass-readable p-3 grid gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
                    <input className="border border-slate-200 px-3 py-2 rounded-[14px]" value={course.title} onChange={(e) => setCourses((prev) => prev.map((x) => x.id === course.id ? { ...x, title: e.target.value } : x))} />
                    <input className="border border-slate-200 px-3 py-2 rounded-[14px]" value={course.description ?? ""} onChange={(e) => setCourses((prev) => prev.map((x) => x.id === course.id ? { ...x, description: e.target.value } : x))} />
                    <button className="btn" type="button" onClick={() => updateCourse(course)}>Save</button>
                    <button className="px-4 py-2 rounded-[14px] border border-red-200 text-red-600" type="button" onClick={() => deleteCourse(course.id)}>Delete</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "materials" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">Upload Study Materials (PDF)</h2>
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                <select className="border border-slate-200 px-3 py-2 rounded-[14px]" value={materialCourseId} onChange={(e) => setMaterialCourseId(e.target.value)}>
                  <option value="">Select course</option>
                  {courses.map((course) => (<option key={course.id} value={course.id}>{course.title}</option>))}
                </select>
                <input className="border border-slate-200 px-3 py-2 rounded-[14px]" placeholder="Material title" value={materialTitle} onChange={(e) => setMaterialTitle(e.target.value)} />
                <input className="border border-slate-200 px-3 py-2 rounded-[14px]" type="file" accept="application/pdf,.pdf" onChange={(e) => setMaterialFile(e.target.files?.[0] ?? null)} />
                <button className="btn" type="button" onClick={uploadMaterial} disabled={uploadingMaterial}>{uploadingMaterial ? "Uploading..." : "Upload"}</button>
              </div>
              <div className="space-y-2">
                {materials.map((material) => (
                  <div key={material.id} className="glass-readable p-3 text-sm">
                    <p className="font-semibold text-slate-900">{material.title}</p>
                    <p className="text-xs text-slate-500 mt-1">Course: {courses.find((c) => c.id === material.course_id)?.title ?? material.course_id}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "enrollments" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">Assign Course to Student</h2>
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <select className="border border-slate-200 px-3 py-2 rounded-[14px]" value={assignStudentId} onChange={(e) => setAssignStudentId(e.target.value)}>
                  <option value="">Select student</option>
                  {students.map((student) => (<option key={student.id} value={student.id}>{student.name}</option>))}
                </select>
                <select className="border border-slate-200 px-3 py-2 rounded-[14px]" value={assignCourseId} onChange={(e) => setAssignCourseId(e.target.value)}>
                  <option value="">Select course</option>
                  {courses.map((course) => (<option key={course.id} value={course.id}>{course.title}</option>))}
                </select>
                <button className="btn" type="button" onClick={assignStudentToCourse}>Assign</button>
              </div>
              <div className="space-y-2">
                {enrollments.map((enrollment) => {
                  const student = Array.isArray(enrollment.student) ? enrollment.student[0] : enrollment.student;
                  const course = Array.isArray(enrollment.course) ? enrollment.course[0] : enrollment.course;
                  return (
                    <div key={`${enrollment.student_id}-${enrollment.course_id}`} className="glass-readable p-3 flex items-center justify-between gap-4 text-sm">
                      <span>{student?.name ?? enrollment.student_id} → {course?.title ?? enrollment.course_id}</span>
                      <button className="text-red-600 font-semibold" type="button" onClick={() => removeEnrollment(enrollment.student_id, enrollment.course_id)}>Remove</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "tests" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">Create Tests</h2>
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                <select className="border border-slate-200 px-3 py-2 rounded-[14px]" value={testCourseId} onChange={(e) => setTestCourseId(e.target.value)}>
                  <option value="">Select course</option>
                  {courses.map((course) => (<option key={course.id} value={course.id}>{course.title}</option>))}
                </select>
                <input className="border border-slate-200 px-3 py-2 rounded-[14px]" placeholder="Test title" value={testTitle} onChange={(e) => setTestTitle(e.target.value)} />
                <input className="border border-slate-200 px-3 py-2 rounded-[14px]" type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} />
                <button className="btn" type="button" onClick={createTest}>Create</button>
              </div>
            </div>
          )}

          {activeTab === "results" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">View Results / Enter Marks</h2>
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                <select className="border border-slate-200 px-3 py-2 rounded-[14px]" value={markStudentId} onChange={(e) => setMarkStudentId(e.target.value)}>
                  <option value="">Select student</option>
                  {students.map((student) => (<option key={student.id} value={student.id}>{student.name}</option>))}
                </select>
                <select className="border border-slate-200 px-3 py-2 rounded-[14px]" value={markTestId} onChange={(e) => setMarkTestId(e.target.value)}>
                  <option value="">Select test</option>
                  {tests.map((test) => (<option key={test.id} value={test.id}>{test.title}</option>))}
                </select>
                <input className="border border-slate-200 px-3 py-2 rounded-[14px]" type="number" min="0" step="0.01" value={markValue} onChange={(e) => setMarkValue(e.target.value)} placeholder="Marks" />
                <button className="btn" type="button" onClick={saveMarks}>Save</button>
              </div>
              <div className="space-y-2">
                {results.map((result) => {
                  const student = Array.isArray(result.student) ? result.student[0] : result.student;
                  const test = Array.isArray(result.test) ? result.test[0] : result.test;
                  return (
                    <div key={`${result.student_id}-${result.test_id}`} className="glass-readable p-3 text-sm">
                      <p className="font-semibold text-slate-900">{student?.name ?? result.student_id}</p>
                      <p className="text-xs text-slate-500">{test?.title ?? result.test_id}</p>
                      <p className="text-indigo-700 font-semibold mt-1">Marks: {result.marks}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "announcements" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">Manage Announcements</h2>
              <div className="grid gap-3">
                <input className="border border-slate-200 px-3 py-2 rounded-[14px]" placeholder="Announcement title" value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} />
                <textarea className="border border-slate-200 px-3 py-2 rounded-[14px] min-h-24" placeholder="Announcement body" value={announcementBody} onChange={(e) => setAnnouncementBody(e.target.value)} />
                <div>
                  <button className="btn" type="button" onClick={createAnnouncement}>Publish</button>
                </div>
              </div>
              <div className="space-y-2">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="glass-readable p-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{announcement.title}</p>
                      <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{announcement.body}</p>
                    </div>
                    <button className="text-red-600 text-sm font-semibold" type="button" onClick={() => deleteAnnouncement(announcement.id)}>Delete</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
