"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

type CourseOption = {
  id: string;
  title: string;
};

type QuestionForm = {
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  marks: string;
  explanation: string;
};

type TestForm = {
  title: string;
  description: string;
  courseId: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: string;
  defaultMarksPerQuestion: string;
  isPublished: boolean;
  isFree: boolean;
  questions: QuestionForm[];
};

type AdminTest = {
  id: string;
  course_id: string;
  course_title: string | null;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  test_date: string;
  duration_minutes: number;
  default_marks_per_question: number;
  is_published: boolean;
  is_free: boolean;
  questions: Array<{
    id: string;
    prompt: string;
    options: string[];
    correct_option_index: number;
    marks: number;
    explanation: string | null;
    sort_order: number;
  }>;
  attempt_summary: {
    total: number;
    submitted: number;
    in_progress: number;
    warnings: number;
    average_score: number | null;
  };
};

type AttemptDetail = {
  id: string;
  student_id: string;
  status: string;
  score: number | null;
  total_marks: number | null;
  percentage: number | null;
  correct_count: number | null;
  question_count: number | null;
  warning_count: number;
  warning_events?: Array<{ at: string; reason: string }>;
  started_at: string;
  submitted_at: string | null;
  student: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    login_id?: string | null;
  } | null;
};

type TestDetail = {
  test: AdminTest;
  questions: AdminTest["questions"];
  attempts: AttemptDetail[];
};

type TestSeriesManagerProps = {
  courses: CourseOption[];
  disabled?: boolean;
  onNotice: (message: string | null) => void;
  onError: (message: string | null) => void;
};

const inputClass =
  "w-full rounded-[22px] bg-[#f8fafd] px-4 py-3 text-sm text-slate-900 outline-none shadow-[0_10px_24px_rgba(226,232,240,0.8)] transition duration-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(186,230,253,0.55),0_14px_28px_rgba(226,232,240,0.9)]";
const textareaClass = `${inputClass} min-h-[110px] resize-y`;
const labelClass = "mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-[1.45rem] bg-sky-600 px-4 py-2.5 text-[0.92rem] font-semibold text-white shadow-[0_14px_30px_rgba(56,189,248,0.24)] transition duration-300 hover:-translate-y-0.5 hover:bg-sky-700 hover:shadow-[0_18px_36px_rgba(56,189,248,0.3)] disabled:cursor-not-allowed disabled:opacity-60 sm:px-5 sm:py-3 sm:text-sm";
const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-[1.45rem] bg-[#f6f8fb] px-4 py-2.5 text-[0.92rem] font-semibold text-slate-900 shadow-[0_10px_22px_rgba(226,232,240,0.84)] transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_28px_rgba(226,232,240,0.92)] disabled:cursor-not-allowed disabled:opacity-60 sm:px-5 sm:py-3 sm:text-sm";
const dangerButtonClass =
  "inline-flex items-center justify-center rounded-[1.35rem] bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 shadow-[0_10px_22px_rgba(252,165,165,0.16)] transition duration-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60";
const cardClass = "rounded-[28px] bg-white/92 p-5 shadow-[0_18px_40px_rgba(226,232,240,0.9)]";
const nestedCardClass = "rounded-[24px] bg-white/92 p-4 shadow-[0_14px_30px_rgba(226,232,240,0.86)]";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const toneClass = {
    neutral: "bg-stone-100 text-slate-900",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-rose-50 text-rose-700",
  }[tone];

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>;
}

function defaultDateTime(offsetMinutes: number) {
  const date = new Date(Date.now() + offsetMinutes * 60 * 1000);
  date.setSeconds(0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000).toISOString().slice(0, 16);
}

function toDateTimeInput(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000).toISOString().slice(0, 16);
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

function emptyQuestion(): QuestionForm {
  return {
    prompt: "",
    options: ["", "", "", ""],
    correctOptionIndex: 0,
    marks: "",
    explanation: "",
  };
}

function emptyForm(courseId = ""): TestForm {
  return {
    title: "",
    description: "",
    courseId,
    startsAt: defaultDateTime(30),
    endsAt: defaultDateTime(7 * 24 * 60),
    durationMinutes: "30",
    defaultMarksPerQuestion: "1",
    isPublished: true,
    isFree: true,
    questions: [emptyQuestion()],
  };
}

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : fallback);
  }
  return payload as T;
}

export default function TestSeriesManager({ courses, disabled = false, onNotice, onError }: TestSeriesManagerProps) {
  const [tests, setTests] = useState<AdminTest[]>([]);
  const [form, setForm] = useState<TestForm>(() => emptyForm(courses[0]?.id ?? ""));
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<TestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const currentCourseTitle = useMemo(
    () => courses.find((course) => course.id === form.courseId)?.title ?? "Select course",
    [courses, form.courseId]
  );

  const loadTests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/tests", { cache: "no-store" });
      const payload = await readJson<{ tests: AdminTest[] }>(response, "Unable to load tests");
      setTests(payload.tests ?? []);
      onError(null);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to load tests");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  const loadDetail = useCallback(async (testId: string) => {
    try {
      const response = await fetch(`/api/admin/tests/${encodeURIComponent(testId)}`, { cache: "no-store" });
      const payload = await readJson<TestDetail>(response, "Unable to load attempts");
      setSelectedDetail(payload);
      setSelectedTestId(testId);
      onError(null);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to load attempts");
    }
  }, [onError]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTests();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadTests]);

  const updateQuestion = (index: number, patch: Partial<QuestionForm>) => {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...patch } : question
      ),
    }));
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) => {
        if (index !== questionIndex) {
          return question;
        }

        return {
          ...question,
          options: question.options.map((option, nextOptionIndex) => nextOptionIndex === optionIndex ? value : option),
        };
      }),
    }));
  };

  const addOption = (questionIndex: number) => {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) =>
        index === questionIndex && question.options.length < 6
          ? { ...question, options: [...question.options, ""] }
          : question
      ),
    }));
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) => {
        if (index !== questionIndex || question.options.length <= 2) {
          return question;
        }

        const nextOptions = question.options.filter((_, nextOptionIndex) => nextOptionIndex !== optionIndex);
        return {
          ...question,
          options: nextOptions,
          correctOptionIndex: Math.min(question.correctOptionIndex, nextOptions.length - 1),
        };
      }),
    }));
  };

  const startEditing = (test: AdminTest) => {
    setEditingTestId(test.id);
    setForm({
      title: test.title,
      description: test.description ?? "",
      courseId: test.course_id,
      startsAt: toDateTimeInput(test.starts_at),
      endsAt: toDateTimeInput(test.ends_at),
      durationMinutes: String(test.duration_minutes ?? 30),
      defaultMarksPerQuestion: String(test.default_marks_per_question ?? 1),
      isPublished: test.is_published,
      isFree: test.is_free,
      questions: test.questions.length > 0
        ? test.questions.map((question) => ({
            prompt: question.prompt,
            options: question.options.length >= 2 ? question.options : ["", ""],
            correctOptionIndex: question.correct_option_index,
            marks: String(question.marks ?? ""),
            explanation: question.explanation ?? "",
          }))
        : [emptyQuestion()],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditingTestId(null);
    setForm(emptyForm(courses[0]?.id ?? ""));
  };

  const saveTest = async () => {
    setBusy(true);
    onNotice(null);
    onError(null);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        courseId: form.courseId,
        startsAt: form.startsAt,
        endsAt: form.endsAt,
        durationMinutes: form.durationMinutes,
        defaultMarksPerQuestion: form.defaultMarksPerQuestion,
        isPublished: form.isPublished,
        isFree: form.isFree,
        questions: form.questions.map((question, index) => ({
          prompt: question.prompt,
          options: question.options,
          correctOptionIndex: question.correctOptionIndex,
          marks: question.marks || form.defaultMarksPerQuestion,
          explanation: question.explanation,
          sortOrder: index,
        })),
      };

      const response = await fetch(editingTestId ? `/api/admin/tests/${encodeURIComponent(editingTestId)}` : "/api/admin/tests", {
        method: editingTestId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      await readJson(response, editingTestId ? "Unable to update test" : "Unable to create test");
      onNotice(editingTestId ? "Test series updated." : "Test series published.");
      resetForm();
      await loadTests();
      if (selectedTestId) {
        await loadDetail(selectedTestId);
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to save test");
    } finally {
      setBusy(false);
    }
  };

  const deleteTest = async (testId: string) => {
    if (!window.confirm("Delete this test, questions, attempts, and linked results?")) {
      return;
    }

    setBusy(true);
    onNotice(null);
    onError(null);
    try {
      const response = await fetch(`/api/admin/tests/${encodeURIComponent(testId)}`, { method: "DELETE" });
      await readJson(response, "Unable to delete test");
      onNotice("Test deleted.");
      if (editingTestId === testId) {
        resetForm();
      }
      if (selectedTestId === testId) {
        setSelectedTestId(null);
        setSelectedDetail(null);
      }
      await loadTests();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to delete test");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <section className={cardClass}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">MCQ Test Series</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
              {editingTestId ? "Edit test" : "Create test"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Add timed MCQ tests with secure scoring and student warning tracking.
            </p>
          </div>
          <Badge tone={form.isPublished ? "success" : "warning"}>{form.isPublished ? "Published" : "Draft"}</Badge>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Test title">
            <input className={inputClass} value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Class 10 Science MCQ Test" />
          </Field>
          <Field label="Course">
            <select className={inputClass} value={form.courseId} onChange={(event) => setForm((prev) => ({ ...prev, courseId: event.target.value }))}>
              <option value="">Select course</option>
              {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
            </select>
          </Field>
          <Field label="Start time">
            <input type="datetime-local" className={inputClass} value={form.startsAt} onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))} />
          </Field>
          <Field label="End time">
            <input type="datetime-local" className={inputClass} value={form.endsAt} onChange={(event) => setForm((prev) => ({ ...prev, endsAt: event.target.value }))} />
          </Field>
          <Field label="Full test time">
            <input type="number" min="1" max="360" className={inputClass} value={form.durationMinutes} onChange={(event) => setForm((prev) => ({ ...prev, durationMinutes: event.target.value }))} placeholder="30" />
          </Field>
          <Field label="Default marks">
            <input type="number" min="1" max="100" step="0.5" className={inputClass} value={form.defaultMarksPerQuestion} onChange={(event) => setForm((prev) => ({ ...prev, defaultMarksPerQuestion: event.target.value }))} placeholder="1" />
          </Field>
          <div className="md:col-span-2">
            <Field label="Description">
              <textarea className={textareaClass} value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Short instruction shown before students enter the test." />
            </Field>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className={`${nestedCardClass} flex items-center justify-between gap-3`}>
            <span>
              <span className="block text-sm font-semibold text-slate-900">Free test</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">Available free for now.</span>
            </span>
            <input type="checkbox" checked={form.isFree} onChange={(event) => setForm((prev) => ({ ...prev, isFree: event.target.checked }))} />
          </label>
          <label className={`${nestedCardClass} flex items-center justify-between gap-3`}>
            <span>
              <span className="block text-sm font-semibold text-slate-900">Publish</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">Students can see it after publish.</span>
            </span>
            <input type="checkbox" checked={form.isPublished} onChange={(event) => setForm((prev) => ({ ...prev, isPublished: event.target.checked }))} />
          </label>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Questions</p>
              <p className="mt-1 text-sm text-slate-600">{form.questions.length} question{form.questions.length === 1 ? "" : "s"} for {currentCourseTitle}</p>
            </div>
            <button type="button" className={secondaryButtonClass} onClick={() => setForm((prev) => ({ ...prev, questions: [...prev.questions, emptyQuestion()] }))} disabled={busy || disabled}>
              Add Question
            </button>
          </div>

          {form.questions.map((question, questionIndex) => (
            <div key={`question-${questionIndex}`} className={nestedCardClass}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Badge>Question {questionIndex + 1}</Badge>
                <button
                  type="button"
                  className={dangerButtonClass}
                  disabled={form.questions.length <= 1 || busy || disabled}
                  onClick={() => setForm((prev) => ({ ...prev, questions: prev.questions.filter((_, index) => index !== questionIndex) }))}
                >
                  Remove
                </button>
              </div>
              <div className="mt-4 grid gap-4">
                <Field label="Question">
                  <textarea className={textareaClass} value={question.prompt} onChange={(event) => updateQuestion(questionIndex, { prompt: event.target.value })} placeholder="Type the MCQ question here." />
                </Field>
                <div className="grid gap-3">
                  {question.options.map((option, optionIndex) => (
                    <div key={`question-${questionIndex}-option-${optionIndex}`} className="grid gap-2 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                      <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <input
                          type="radio"
                          checked={question.correctOptionIndex === optionIndex}
                          onChange={() => updateQuestion(questionIndex, { correctOptionIndex: optionIndex })}
                        />
                        Correct
                      </label>
                      <input className={inputClass} value={option} onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)} placeholder={`Option ${optionIndex + 1}`} />
                      <button type="button" className={dangerButtonClass} disabled={question.options.length <= 2} onClick={() => removeOption(questionIndex, optionIndex)}>Remove</button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  <button type="button" className={secondaryButtonClass} disabled={question.options.length >= 6} onClick={() => addOption(questionIndex)}>Add Option</button>
                  <input className={`${inputClass} max-w-36`} type="number" min="1" step="0.5" value={question.marks} onChange={(event) => updateQuestion(questionIndex, { marks: event.target.value })} placeholder="Marks" />
                </div>
                <Field label="Explanation">
                  <input className={inputClass} value={question.explanation} onChange={(event) => updateQuestion(questionIndex, { explanation: event.target.value })} placeholder="Optional explanation for admin record." />
                </Field>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className={primaryButtonClass} disabled={busy || disabled} onClick={() => void saveTest()}>
            {busy ? "Saving..." : editingTestId ? "Update Test" : "Create Test"}
          </button>
          <button type="button" className={secondaryButtonClass} disabled={busy || disabled} onClick={resetForm}>Clear</button>
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Live Test Board</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Tests and attempts</h3>
          </div>
          <button type="button" className={secondaryButtonClass} onClick={() => void loadTests()} disabled={loading || busy}>Refresh</button>
        </div>

        <div className="mt-5 space-y-3">
          {loading ? (
            <div className={nestedCardClass}><p className="text-sm text-slate-600">Loading tests...</p></div>
          ) : tests.length === 0 ? (
            <div className={nestedCardClass}>
              <p className="font-semibold text-slate-900">No test series yet</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">Create the first MCQ test to let students attend from their portal.</p>
            </div>
          ) : (
            tests.map((test) => (
              <div key={test.id} className={nestedCardClass}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{test.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{test.course_title ?? "Course"} · {formatDateTime(test.starts_at)} · {test.duration_minutes} min</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tone={test.is_published ? "success" : "warning"}>{test.is_published ? "Published" : "Draft"}</Badge>
                      <Badge tone={test.is_free ? "success" : "neutral"}>{test.is_free ? "Free" : "Course only"}</Badge>
                      <Badge>{test.questions.length} Q</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <button type="button" className={secondaryButtonClass} onClick={() => startEditing(test)}>Edit</button>
                    <button type="button" className={secondaryButtonClass} onClick={() => void loadDetail(test.id)}>Attempts</button>
                    <button type="button" className={dangerButtonClass} onClick={() => void deleteTest(test.id)} disabled={busy}>Delete</button>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                  <div className="rounded-[18px] bg-[#f8fafd] px-3 py-2"><p className="text-xs text-slate-500">Attended</p><p className="font-semibold text-slate-950">{test.attempt_summary.submitted}</p></div>
                  <div className="rounded-[18px] bg-[#f8fafd] px-3 py-2"><p className="text-xs text-slate-500">In progress</p><p className="font-semibold text-slate-950">{test.attempt_summary.in_progress}</p></div>
                  <div className="rounded-[18px] bg-[#f8fafd] px-3 py-2"><p className="text-xs text-slate-500">Warnings</p><p className="font-semibold text-slate-950">{test.attempt_summary.warnings}</p></div>
                  <div className="rounded-[18px] bg-[#f8fafd] px-3 py-2"><p className="text-xs text-slate-500">Average</p><p className="font-semibold text-slate-950">{test.attempt_summary.average_score ?? "-"}</p></div>
                </div>
              </div>
            ))
          )}
        </div>

        {selectedDetail ? (
          <div className="mt-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Attempt Ledger</p>
                <h4 className="mt-1 text-lg font-semibold text-slate-950">{selectedDetail.test.title}</h4>
              </div>
              <Badge>{selectedDetail.attempts.length} students</Badge>
            </div>
            <div className="mt-3 space-y-3">
              {selectedDetail.attempts.length === 0 ? (
                <div className={nestedCardClass}>
                  <p className="font-semibold text-slate-900">No attempts yet</p>
                  <p className="mt-1 text-sm text-slate-600">Student attempts will appear here with warning count and score.</p>
                </div>
              ) : (
                selectedDetail.attempts.map((attempt) => (
                  <div key={attempt.id} className={nestedCardClass}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{attempt.student?.name ?? attempt.student_id}</p>
                        <p className="mt-1 text-sm text-slate-600">{attempt.student?.phone ?? attempt.student?.login_id ?? attempt.student?.email ?? "Student"}</p>
                        <p className="mt-1 text-xs text-slate-500">Started {formatDateTime(attempt.started_at)} · Submitted {formatDateTime(attempt.submitted_at)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <Badge tone={attempt.status === "submitted" ? "success" : attempt.status === "in_progress" ? "warning" : "danger"}>{attempt.status}</Badge>
                        <Badge tone={Number(attempt.warning_count) > 0 ? "danger" : "neutral"}>{attempt.warning_count} warnings</Badge>
                        <Badge tone="success">{attempt.score ?? "-"} / {attempt.total_marks ?? "-"}</Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
