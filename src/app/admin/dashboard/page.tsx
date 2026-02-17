"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../../lib/supabase/browser";

type CourseRow = {
	id: string;
	title: string;
	description: string | null;
};

type StudentRow = {
	id: string;
	name: string;
	role: string;
};

type EnrollmentRow = {
	student_id: string;
	course_id: string;
	student: { id: string; name: string } | Array<{ id: string; name: string }> | null;
	course: { id: string; title: string } | Array<{ id: string; title: string }> | null;
};

type TestRow = {
	id: string;
	title: string;
	test_date: string;
	course_id: string;
};

type NoteRow = {
	id: string;
	title: string;
	course_id: string;
	file_url: string;
	created_at: string;
};

type ResultRow = {
	student_id: string;
	test_id: string;
	marks: number;
	student: { id: string; name: string } | Array<{ id: string; name: string }> | null;
	test: { id: string; title: string } | Array<{ id: string; title: string }> | null;
};

const normalizeRole = (role?: string | null): "admin" | "student" =>
	role === "admin" ? "admin" : "student";

export default function AdminDashboardPage() {
	const router = useRouter();
	const supabase = useMemo(() => createSupabaseBrowserClient(), []);

	const [ready, setReady] = useState(false);
	const [isAdmin, setIsAdmin] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const [courses, setCourses] = useState<CourseRow[]>([]);
	const [students, setStudents] = useState<StudentRow[]>([]);
	const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
	const [tests, setTests] = useState<TestRow[]>([]);
	const [notes, setNotes] = useState<NoteRow[]>([]);
	const [results, setResults] = useState<ResultRow[]>([]);

	const [newCourseTitle, setNewCourseTitle] = useState("");
	const [newCourseDescription, setNewCourseDescription] = useState("");

	const [assignCourseId, setAssignCourseId] = useState("");
	const [assignStudentId, setAssignStudentId] = useState("");

	const [noteCourseId, setNoteCourseId] = useState("");
	const [noteTitle, setNoteTitle] = useState("");
	const [noteFile, setNoteFile] = useState<File | null>(null);
	const [uploadingNote, setUploadingNote] = useState(false);

	const [testCourseId, setTestCourseId] = useState("");
	const [testTitle, setTestTitle] = useState("");
	const [testDate, setTestDate] = useState("");

	const [markStudentId, setMarkStudentId] = useState("");
	const [markTestId, setMarkTestId] = useState("");
	const [markValue, setMarkValue] = useState("");

	const resetFeedback = () => {
		setError(null);
		setSuccess(null);
	};

	const loadDashboardData = async () => {
		if (!supabase) {
			setError("Supabase is not configured yet.");
			return;
		}

		const [coursesResp, studentsResp, enrollmentsResp, testsResp, notesResp, resultsResp] =
			await Promise.all([
				supabase.from("courses").select("id, title, description").order("created_at", { ascending: false }),
				supabase.from("users").select("id, name, role").eq("role", "student").order("created_at", { ascending: false }),
				supabase
					.from("enrollments")
					.select("student_id, course_id, student:users(id, name), course:courses(id, title)")
					.order("enrolled_at", { ascending: false }),
				supabase.from("tests").select("id, title, test_date, course_id").order("test_date", { ascending: true }),
				supabase.from("notes").select("id, title, course_id, file_url, created_at").order("created_at", { ascending: false }),
				supabase
					.from("results")
					.select("student_id, test_id, marks, student:users(id, name), test:tests(id, title)")
					.order("recorded_at", { ascending: false })
					.limit(50),
			]);

		if (coursesResp.error) throw new Error(coursesResp.error.message);
		if (studentsResp.error) throw new Error(studentsResp.error.message);
		if (enrollmentsResp.error) throw new Error(enrollmentsResp.error.message);
		if (testsResp.error) throw new Error(testsResp.error.message);
		if (notesResp.error) throw new Error(notesResp.error.message);
		if (resultsResp.error) throw new Error(resultsResp.error.message);

		setCourses((coursesResp.data ?? []) as CourseRow[]);
		setStudents((studentsResp.data ?? []) as StudentRow[]);
		setEnrollments((enrollmentsResp.data ?? []) as EnrollmentRow[]);
		setTests((testsResp.data ?? []) as TestRow[]);
		setNotes((notesResp.data ?? []) as NoteRow[]);
		setResults((resultsResp.data ?? []) as ResultRow[]);
	};

	useEffect(() => {
		if (!supabase) {
			setReady(true);
			setError("Supabase is not configured yet.");
			return;
		}

		const init = async () => {
			try {
				const { data } = await supabase.auth.getUser();
				const user = data.user;

				if (!user) {
					router.replace("/login?type=admin");
					return;
				}

				const { data: profile } = await supabase
					.from("profiles")
					.select("role")
					.eq("id", user.id)
					.maybeSingle();

				const role = normalizeRole(
					profile?.role ?? user.app_metadata?.role ?? user.user_metadata?.role ?? "student"
				);

				if (role !== "admin") {
					router.replace("/student/dashboard");
					return;
				}

				setIsAdmin(true);
				await loadDashboardData();
			} catch (loadError) {
				setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard");
			} finally {
				setReady(true);
			}
		};

		init();
	}, [router, supabase]);

	const createCourse = async () => {
		resetFeedback();
		if (!supabase) return;

		if (!newCourseTitle.trim()) {
			setError("Course title is required.");
			return;
		}

		const { error: insertError } = await supabase.from("courses").insert({
			title: newCourseTitle.trim(),
			description: newCourseDescription.trim() || null,
		});

		if (insertError) {
			setError(insertError.message);
			return;
		}

		setNewCourseTitle("");
		setNewCourseDescription("");
		setSuccess("Course created.");
		await loadDashboardData();
	};

	const updateCourse = async (course: CourseRow) => {
		resetFeedback();
		if (!supabase) return;

		const { error: updateError } = await supabase
			.from("courses")
			.update({
				title: course.title.trim(),
				description: course.description?.trim() || null,
			})
			.eq("id", course.id);

		if (updateError) {
			setError(updateError.message);
			return;
		}

		setSuccess("Course updated.");
		await loadDashboardData();
	};

	const deleteCourse = async (courseId: string) => {
		resetFeedback();
		if (!supabase) return;

		const { error: deleteError } = await supabase.from("courses").delete().eq("id", courseId);
		if (deleteError) {
			setError(deleteError.message);
			return;
		}

		setSuccess("Course deleted.");
		await loadDashboardData();
	};

	const assignStudentToCourse = async () => {
		resetFeedback();
		if (!supabase) return;

		if (!assignCourseId || !assignStudentId) {
			setError("Select both student and course.");
			return;
		}

		const { error: insertError } = await supabase.from("enrollments").insert({
			student_id: assignStudentId,
			course_id: assignCourseId,
		});

		if (insertError) {
			setError(insertError.message);
			return;
		}

		setSuccess("Student assigned to course.");
		await loadDashboardData();
	};

	const removeEnrollment = async (studentId: string, courseId: string) => {
		resetFeedback();
		if (!supabase) return;

		const { error: deleteError } = await supabase
			.from("enrollments")
			.delete()
			.eq("student_id", studentId)
			.eq("course_id", courseId);

		if (deleteError) {
			setError(deleteError.message);
			return;
		}

		setSuccess("Enrollment removed.");
		await loadDashboardData();
	};

	const uploadNote = async () => {
		resetFeedback();
		if (!noteCourseId || !noteFile) {
			setError("Course and PDF file are required.");
			return;
		}

		const formData = new FormData();
		formData.append("courseId", noteCourseId);
		formData.append("title", noteTitle);
		formData.append("file", noteFile);

		setUploadingNote(true);
		try {
			const response = await fetch("/api/admin/notes/upload", {
				method: "POST",
				body: formData,
			});

			const data = await response.json();
			if (!response.ok) {
				throw new Error(data?.error ?? "Unable to upload note");
			}

			setNoteTitle("");
			setNoteFile(null);
			setSuccess("Note uploaded and attached to course.");
			await loadDashboardData();
		} catch (uploadError) {
			setError(uploadError instanceof Error ? uploadError.message : "Unable to upload note");
		} finally {
			setUploadingNote(false);
		}
	};

	const createTest = async () => {
		resetFeedback();
		if (!supabase) return;
		if (!testCourseId || !testTitle.trim() || !testDate) {
			setError("Course, test title, and date are required.");
			return;
		}

		const { error: insertError } = await supabase.from("tests").insert({
			course_id: testCourseId,
			title: testTitle.trim(),
			test_date: testDate,
		});

		if (insertError) {
			setError(insertError.message);
			return;
		}

		setTestTitle("");
		setTestDate("");
		setSuccess("Test created.");
		await loadDashboardData();
	};

	const saveMarks = async () => {
		resetFeedback();
		if (!supabase) return;

		const numericMarks = Number(markValue);
		if (!markStudentId || !markTestId || Number.isNaN(numericMarks)) {
			setError("Student, test, and valid marks are required.");
			return;
		}

		const selectedTest = tests.find((test) => test.id === markTestId);
		if (!selectedTest) {
			setError("Selected test not found.");
			return;
		}

		const isAssigned = enrollments.some(
			(row) => row.student_id === markStudentId && row.course_id === selectedTest.course_id
		);

		if (!isAssigned) {
			setError("Student is not assigned to this test's course.");
			return;
		}

		const { error: upsertError } = await supabase.from("results").upsert(
			{
				student_id: markStudentId,
				test_id: markTestId,
				marks: numericMarks,
			},
			{ onConflict: "student_id,test_id" }
		);

		if (upsertError) {
			setError(upsertError.message);
			return;
		}

		setMarkValue("");
		setSuccess("Marks saved.");
		await loadDashboardData();
	};

	const getStudentName = (studentId: string) =>
		students.find((student) => student.id === studentId)?.name ?? studentId;

	const getCourseTitle = (courseId: string) =>
		courses.find((course) => course.id === courseId)?.title ?? courseId;

	if (!ready) {
		return (
			<section className="admin-shell">
				<div className="admin-card admin-card--compact animate-pulse">
					<div className="h-5 w-48 rounded bg-slate-200" />
					<div className="mt-4 grid gap-3 md:grid-cols-3">
						{Array.from({ length: 6 }).map((_, idx) => (
							<div
								key={`admin-skeleton-${idx}`}
								className="h-20 rounded-xl bg-slate-200"
							/>
						))}
					</div>
				</div>
			</section>
		);
	}

	if (!isAdmin) {
		return (
			<section className="admin-shell">
				<div className="admin-card admin-card--compact">
					<h1 className="text-2xl font-semibold text-slate-900">Admin access required</h1>
					<p className="mt-2 text-sm text-slate-600">Please log in with an admin account.</p>
				</div>
			</section>
		);
	}

	return (
		<section className="admin-shell">
			<header className="admin-header admin-header--premium">
				<div>
					<p className="admin-kicker">Operations</p>
					<h1 className="admin-title">Course Management System</h1>
					<p className="admin-subtitle">Manage courses, enrollments, notes, tests, and student results.</p>
				</div>
			</header>

			{(error || success) && (
				<div className="mb-5 text-sm">
					{error ? <p className="text-red-600">{error}</p> : null}
					{success ? <p className="text-emerald-700">{success}</p> : null}
				</div>
			)}

			<div className="admin-stack">
				<section className="admin-card">
					<h2 className="admin-section-title">Create Course</h2>
					<div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
						<input
							className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
							placeholder="Course title"
							value={newCourseTitle}
							onChange={(event) => setNewCourseTitle(event.target.value)}
						/>
						<input
							className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
							placeholder="Course description"
							value={newCourseDescription}
							onChange={(event) => setNewCourseDescription(event.target.value)}
						/>
						<button type="button" className="admin-primary" onClick={createCourse}>
							Create
						</button>
					</div>
				</section>

				<section className="admin-card">
					<h2 className="admin-section-title">Edit / Delete Courses</h2>
					<div className="space-y-3">
						{courses.map((course) => (
							<div key={course.id} className="admin-role-row grid gap-3 p-3 md:grid-cols-[1fr_1fr_auto_auto]">
								<input
									className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
									value={course.title}
									onChange={(event) => {
										setCourses((prev) =>
											prev.map((item) =>
												item.id === course.id ? { ...item, title: event.target.value } : item
											)
										);
									}}
								/>
								<input
									className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
									value={course.description ?? ""}
									onChange={(event) => {
										setCourses((prev) =>
											prev.map((item) =>
												item.id === course.id
													? { ...item, description: event.target.value }
													: item
											)
										);
									}}
								/>
								<button type="button" className="admin-secondary" onClick={() => updateCourse(course)}>
									Save
								</button>
								<button
									type="button"
									className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-600"
									onClick={() => deleteCourse(course.id)}
								>
									Delete
								</button>
							</div>
						))}
						{courses.length === 0 ? <p className="text-sm text-slate-500">No courses yet.</p> : null}
					</div>
				</section>

				<section className="admin-card">
					<h2 className="admin-section-title">Assign Students to Courses</h2>
					<div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
						<select
							className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
							value={assignStudentId}
							onChange={(event) => setAssignStudentId(event.target.value)}
						>
							<option value="">Select student</option>
							{students.map((student) => (
								<option key={student.id} value={student.id}>
									{student.name}
								</option>
							))}
						</select>
						<select
							className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
							value={assignCourseId}
							onChange={(event) => setAssignCourseId(event.target.value)}
						>
							<option value="">Select course</option>
							{courses.map((course) => (
								<option key={course.id} value={course.id}>
									{course.title}
								</option>
							))}
						</select>
						<button type="button" className="admin-primary" onClick={assignStudentToCourse}>
							Assign
						</button>
					</div>

					<div className="mt-4 space-y-2">
						{enrollments.map((enrollment) => {
							const student = Array.isArray(enrollment.student)
								? enrollment.student[0]
								: enrollment.student;
							const course = Array.isArray(enrollment.course)
								? enrollment.course[0]
								: enrollment.course;

							return (
								<div
									key={`${enrollment.student_id}-${enrollment.course_id}`}
									className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm"
								>
									<span>
										{(student?.name ?? enrollment.student_id)} → {(course?.title ?? enrollment.course_id)}
									</span>
									<button
										type="button"
										className="text-xs font-semibold text-red-600"
										onClick={() => removeEnrollment(enrollment.student_id, enrollment.course_id)}
									>
										Remove
									</button>
								</div>
							);
						})}
						{enrollments.length === 0 ? (
							<p className="text-sm text-slate-500">No enrollments yet.</p>
						) : null}
					</div>
				</section>

				<section className="admin-card">
					<h2 className="admin-section-title">Upload Course Notes (PDF)</h2>
					<div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
						<select
							className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
							value={noteCourseId}
							onChange={(event) => setNoteCourseId(event.target.value)}
						>
							<option value="">Select course</option>
							{courses.map((course) => (
								<option key={course.id} value={course.id}>
									{course.title}
								</option>
							))}
						</select>
						<input
							className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
							placeholder="Note title"
							value={noteTitle}
							onChange={(event) => setNoteTitle(event.target.value)}
						/>
						<input
							className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
							type="file"
							accept="application/pdf,.pdf"
							onChange={(event) => setNoteFile(event.target.files?.[0] ?? null)}
						/>
						<button type="button" className="admin-primary" onClick={uploadNote} disabled={uploadingNote}>
							{uploadingNote ? "Uploading..." : "Upload"}
						</button>
					</div>

					<div className="mt-4 space-y-2">
						{notes.map((note) => (
							<div key={note.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
								<p className="font-semibold text-slate-900">{note.title}</p>
								<p className="text-xs text-slate-500 mt-1">Course: {getCourseTitle(note.course_id)}</p>
							</div>
						))}
						{notes.length === 0 ? <p className="text-sm text-slate-500">No notes uploaded.</p> : null}
					</div>
				</section>

				<section className="admin-card">
					<h2 className="admin-section-title">Create Test</h2>
					<div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
						<select
							className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
							value={testCourseId}
							onChange={(event) => setTestCourseId(event.target.value)}
						>
							<option value="">Select course</option>
							{courses.map((course) => (
								<option key={course.id} value={course.id}>
									{course.title}
								</option>
							))}
						</select>
						<input
							className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
							placeholder="Test title"
							value={testTitle}
							onChange={(event) => setTestTitle(event.target.value)}
						/>
						<input
							className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
							type="date"
							value={testDate}
							onChange={(event) => setTestDate(event.target.value)}
						/>
						<button type="button" className="admin-primary" onClick={createTest}>
							Create
						</button>
					</div>
					<div className="mt-4 space-y-2">
						{tests.length === 0 ? (
							<p className="text-sm text-slate-500">No tests scheduled.</p>
						) : (
							tests.map((test) => (
								<div key={test.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
									<p className="font-semibold text-slate-900">{test.title}</p>
									<p className="text-xs text-slate-500 mt-1">
										{getCourseTitle(test.course_id)} • {new Date(test.test_date).toLocaleDateString()}
									</p>
								</div>
							))
						)}
					</div>
				</section>

				<section className="admin-card">
					<h2 className="admin-section-title">Enter Student Marks</h2>
					<div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
						<select
							className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
							value={markStudentId}
							onChange={(event) => setMarkStudentId(event.target.value)}
						>
							<option value="">Select student</option>
							{students.map((student) => (
								<option key={student.id} value={student.id}>
									{student.name}
								</option>
							))}
						</select>
						<select
							className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
							value={markTestId}
							onChange={(event) => setMarkTestId(event.target.value)}
						>
							<option value="">Select test</option>
							{tests.map((test) => (
								<option key={test.id} value={test.id}>
									{test.title} ({getCourseTitle(test.course_id)})
								</option>
							))}
						</select>
						<input
							className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
							type="number"
							step="0.01"
							min="0"
							placeholder="Marks"
							value={markValue}
							onChange={(event) => setMarkValue(event.target.value)}
						/>
						<button type="button" className="admin-primary" onClick={saveMarks}>
							Save
						</button>
					</div>

					<div className="mt-4 space-y-2">
						{results.map((result) => {
							const student = Array.isArray(result.student) ? result.student[0] : result.student;
							const test = Array.isArray(result.test) ? result.test[0] : result.test;
							return (
								<div key={`${result.student_id}-${result.test_id}`} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
									<p className="font-semibold text-slate-900">{student?.name ?? result.student_id}</p>
									<p className="text-xs text-slate-500">{test?.title ?? result.test_id}</p>
									<p className="text-xs font-semibold text-indigo-700 mt-1">Marks: {result.marks}</p>
								</div>
							);
						})}
						{results.length === 0 ? <p className="text-sm text-slate-500">No results entered yet.</p> : null}
					</div>
				</section>
			</div>
		</section>
	);
}
