"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type PublicTest = {
  id: string;
  course_title: string | null;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  duration_minutes: number;
  is_free: boolean;
  question_count: number;
  availability: {
    available: boolean;
    code: string;
    message: string;
  };
  attempt: AttemptSummary | null;
};

type TestAvailability = PublicTest["availability"];

type AttemptSummary = {
  id: string;
  status: string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  total_marks: number | null;
  percentage: number | null;
  correct_count: number | null;
  question_count: number | null;
  warning_count: number;
  ends_at?: string;
};

type PublicQuestion = {
  id: string;
  prompt: string;
  options: string[];
  marks: number;
  sort_order: number;
};

type TestResult = {
  score: number;
  totalMarks: number;
  percentage: number;
  correctCount: number;
  questionCount: number;
  warningCount: number;
  submittedAt: string;
};

type Answers = Record<string, number>;

const shellClass = "student-portal-shell relative mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10";
const surfaceClass = "student-surface rounded-[32px] bg-white/94 p-5 shadow-[0_24px_64px_rgba(226,232,240,0.92)] sm:p-7";
const cardClass = "student-soft-card rounded-[24px] bg-white/92 p-4 shadow-[0_14px_30px_rgba(226,232,240,0.86)]";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-[1.4rem] bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(56,189,248,0.24)] transition duration-300 hover:-translate-y-0.5 hover:bg-sky-700 hover:shadow-[0_18px_34px_rgba(56,189,248,0.3)] disabled:cursor-not-allowed disabled:opacity-70";
const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-[1.4rem] bg-[#f6f8fb] px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-[0_10px_22px_rgba(226,232,240,0.84)] transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_28px_rgba(226,232,240,0.92)]";

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : fallback);
  }
  return payload as T;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getLiveAvailability(test: PublicTest, now: number): TestAvailability {
  const startsAt = test.starts_at ? new Date(test.starts_at).getTime() : null;
  const endsAt = test.ends_at ? new Date(test.ends_at).getTime() : null;

  if (startsAt !== null && Number.isFinite(startsAt) && now < startsAt) {
    return { available: false, code: "not_started", message: "This test has not opened yet." };
  }

  if (endsAt !== null && Number.isFinite(endsAt) && now > endsAt) {
    return { available: false, code: "ended", message: "This test has ended." };
  }

  if (test.availability.code === "not_published") {
    return test.availability;
  }

  return { available: true, code: "available", message: "Test is available." };
}

function answerStorageKey(attemptId: string) {
  return `nipra-test-answers:${attemptId}`;
}

function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const toneClass = {
    neutral: "bg-stone-100 text-slate-900",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-rose-50 text-rose-700",
  }[tone];

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>;
}

export default function StudentTestRunner({ testId }: { testId: string }) {
  const [test, setTest] = useState<PublicTest | null>(null);
  const [attempt, setAttempt] = useState<AttemptSummary | null>(null);
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [result, setResult] = useState<TestResult | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [availabilityNow, setAvailabilityNow] = useState(() => Date.now());
  const [warningCount, setWarningCount] = useState(0);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastWarningAtRef = useRef(0);
  const submittedRef = useRef(false);

  const activeAttempt = attempt?.status === "in_progress" && questions.length > 0 && !result;
  const answeredCount = useMemo(() => questions.filter((question) => typeof answers[question.id] === "number").length, [answers, questions]);
  const liveAvailability = useMemo(() => (test ? getLiveAvailability(test, availabilityNow) : null), [availabilityNow, test]);
  const canStartTest = Boolean(test && liveAvailability?.available && test.question_count > 0);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/student/tests/${encodeURIComponent(testId)}`, { cache: "no-store" });
      const payload = await readJson<{ test: PublicTest }>(response, "Unable to load test");
      setAvailabilityNow(Date.now());
      setTest(payload.test);
      setAttempt(payload.test.attempt);
      setWarningCount(Number(payload.test.attempt?.warning_count ?? 0));
      if (payload.test.attempt?.status === "submitted") {
        setResult({
          score: Number(payload.test.attempt.score ?? 0),
          totalMarks: Number(payload.test.attempt.total_marks ?? 0),
          percentage: Number(payload.test.attempt.percentage ?? 0),
          correctCount: Number(payload.test.attempt.correct_count ?? 0),
          questionCount: Number(payload.test.attempt.question_count ?? payload.test.question_count ?? 0),
          warningCount: Number(payload.test.attempt.warning_count ?? 0),
          submittedAt: payload.test.attempt.submitted_at ?? "",
        });
      }
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Unable to load test");
    } finally {
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPreview();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadPreview]);

  useEffect(() => {
    if (!test || activeAttempt || result) {
      return;
    }

    const startsAt = test.starts_at ? new Date(test.starts_at).getTime() : null;
    const endsAt = test.ends_at ? new Date(test.ends_at).getTime() : null;
    const shouldTrackWindow =
      (startsAt !== null && Number.isFinite(startsAt) && Date.now() <= startsAt) ||
      (endsAt !== null && Number.isFinite(endsAt) && Date.now() <= endsAt);

    if (!shouldTrackWindow) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setAvailabilityNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [activeAttempt, result, test]);

  useEffect(() => {
    if (!attempt?.id) {
      return;
    }

    try {
      window.localStorage.setItem(answerStorageKey(attempt.id), JSON.stringify(answers));
    } catch {
      // The server attempt remains authoritative; local storage only helps reload recovery.
    }
  }, [answers, attempt?.id]);

  useEffect(() => {
    if (!attempt?.ends_at || attempt.status !== "in_progress" || result) {
      return;
    }

    const endAt = new Date(attempt.ends_at).getTime();
    const updateRemaining = () => {
      setRemainingMs(Math.max(0, endAt - Date.now()));
    };

    updateRemaining();
    const intervalId = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(intervalId);
  }, [attempt, result]);

  const submitTest = useCallback(async () => {
    if (!attempt || submittedRef.current) {
      return;
    }

    submittedRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/student/tests/${encodeURIComponent(testId)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const payload = await readJson<{ result: TestResult; test: PublicTest }>(response, "Unable to submit test");
      setResult(payload.result);
      setAttempt(payload.test.attempt);
      setTest(payload.test);
      setQuestions([]);
      setWarningCount(Number(payload.result.warningCount ?? warningCount));
      try {
        window.localStorage.removeItem(answerStorageKey(attempt.id));
      } catch {
        // Best-effort cleanup only.
      }
    } catch (submitError) {
      submittedRef.current = false;
      setError(submitError instanceof Error ? submitError.message : "Unable to submit test");
    } finally {
      setBusy(false);
    }
  }, [answers, attempt, testId, warningCount]);

  useEffect(() => {
    if (remainingMs === 0 && activeAttempt && !busy) {
      const timer = window.setTimeout(() => {
        void submitTest();
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [activeAttempt, busy, remainingMs, submitTest]);

  const startTest = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/student/tests/${encodeURIComponent(testId)}/start`, { method: "POST" });
      const payload = await readJson<{
        test: PublicTest;
        attempt: AttemptSummary;
        questions: PublicQuestion[];
        alreadySubmitted?: boolean;
      }>(response, "Unable to start test");

      setTest(payload.test);
      setAttempt(payload.attempt);
      setQuestions(payload.questions ?? []);
      setWarningCount(Number(payload.attempt.warning_count ?? 0));
      submittedRef.current = false;

      if (payload.alreadySubmitted || payload.attempt.status === "submitted") {
        setResult({
          score: Number(payload.attempt.score ?? 0),
          totalMarks: Number(payload.attempt.total_marks ?? 0),
          percentage: Number(payload.attempt.percentage ?? 0),
          correctCount: Number(payload.attempt.correct_count ?? 0),
          questionCount: Number(payload.attempt.question_count ?? payload.test.question_count ?? 0),
          warningCount: Number(payload.attempt.warning_count ?? 0),
          submittedAt: payload.attempt.submitted_at ?? "",
        });
        return;
      }

      try {
        const storedAnswers = window.localStorage.getItem(answerStorageKey(payload.attempt.id));
        setAnswers(storedAnswers ? JSON.parse(storedAnswers) as Answers : {});
      } catch {
        setAnswers({});
      }
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Unable to start test");
    } finally {
      setBusy(false);
    }
  };

  const recordWarning = useCallback(async (reason: string) => {
    if (!activeAttempt || !attempt || submittedRef.current) {
      return;
    }

    const now = Date.now();
    if (now - lastWarningAtRef.current < 8000) {
      return;
    }

    lastWarningAtRef.current = now;
    setWarningMessage(warningCount <= 0 ? "Warning recorded. Stay on the test screen." : "Another warning was recorded for admin review.");

    try {
      const response = await fetch(`/api/student/tests/${encodeURIComponent(testId)}/warning`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const payload = await readJson<{ warning: { warning_count: number } }>(response, "Unable to record warning");
      setWarningCount(Number(payload.warning.warning_count ?? warningCount + 1));
    } catch {
      setWarningCount((current) => current + 1);
    }
  }, [activeAttempt, attempt, testId, warningCount]);

  useEffect(() => {
    if (!activeAttempt) {
      return;
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void recordWarning("tab_hidden");
      }
    };
    const onBlur = () => {
      void recordWarning("window_blur");
    };
    const onResize = () => {
      if (window.screen.width >= 768 && window.innerWidth / window.screen.width < 0.55) {
        void recordWarning("small_window_or_split_screen");
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("resize", onResize);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("resize", onResize);
    };
  }, [activeAttempt, recordWarning]);

  const chooseAnswer = (questionId: string, optionIndex: number) => {
    setAnswers((current) => ({ ...current, [questionId]: optionIndex }));
  };

  if (loading) {
    return (
      <section className={shellClass}>
        <div className={`${surfaceClass} min-h-[32rem] animate-pulse`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="h-3 w-24 rounded-full bg-stone-200" />
              <div className="mt-4 h-10 w-3/4 rounded-full bg-stone-200" />
              <div className="mt-4 h-4 w-full max-w-2xl rounded-full bg-stone-200" />
              <div className="mt-2 h-4 w-1/2 rounded-full bg-stone-200" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-20 rounded-full bg-stone-100" />
              <div className="h-8 w-20 rounded-full bg-stone-100" />
            </div>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div className={cardClass}>
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={`test-loading-${index}`}>
                    <div className="h-3 w-16 rounded-full bg-stone-200" />
                    <div className="mt-3 h-5 w-28 rounded-full bg-stone-200" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="h-11 w-28 rounded-[1.4rem] bg-stone-200" />
              <div className="h-11 w-28 rounded-[1.4rem] bg-stone-100" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={shellClass}>
      <div className={surfaceClass}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">Test Series</p>
            <h1 className="mt-3 text-[clamp(1.85rem,5vw,3rem)] font-semibold leading-tight tracking-[-0.06em] text-slate-950">
              {test?.title ?? "Student test"}
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {test?.description || `${test?.course_title ?? "Course"} MCQ practice`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {test?.is_free ? <StatusBadge tone="success">Free</StatusBadge> : <StatusBadge>Course access</StatusBadge>}
            <StatusBadge tone={activeAttempt ? "warning" : result ? "success" : "neutral"}>
              {activeAttempt ? "Running" : result ? "Submitted" : "Ready"}
            </StatusBadge>
          </div>
        </div>

        {error ? (
          <div role="alert" className="mt-5 rounded-[22px] bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700 shadow-[0_10px_24px_rgba(254,205,211,0.34)]">
            {error}
          </div>
        ) : null}

        {warningMessage ? (
          <div className="mt-5 rounded-[22px] bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 shadow-[0_10px_24px_rgba(253,230,138,0.34)]">
            {warningMessage}
          </div>
        ) : null}

        {result ? (
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className={cardClass}><p className="text-xs text-slate-500">Score</p><p className="mt-2 text-2xl font-semibold text-slate-950">{result.score} / {result.totalMarks}</p></div>
            <div className={cardClass}><p className="text-xs text-slate-500">Correct</p><p className="mt-2 text-2xl font-semibold text-slate-950">{result.correctCount}/{result.questionCount}</p></div>
            <div className={cardClass}><p className="text-xs text-slate-500">Percent</p><p className="mt-2 text-2xl font-semibold text-slate-950">{result.percentage}%</p></div>
            <div className={cardClass}><p className="text-xs text-slate-500">Warnings</p><p className="mt-2 text-2xl font-semibold text-slate-950">{result.warningCount}</p></div>
            <div className="md:col-span-4 flex flex-wrap gap-3">
              <Link href="/student/dashboard" className={primaryButtonClass}>View Dashboard</Link>
              <Link href="/test-series" className={secondaryButtonClass}>More Tests</Link>
            </div>
          </div>
        ) : activeAttempt ? (
          <div className="mt-6 space-y-5">
            <div className="sticky top-20 z-10 rounded-[24px] bg-slate-950 px-4 py-3 text-white shadow-[0_18px_40px_rgba(15,23,42,0.2)]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold">Time left: {formatRemaining(remainingMs ?? 0)}</p>
                <p className="text-xs text-white/70">{answeredCount}/{questions.length} answered · {warningCount} warnings</p>
              </div>
            </div>

            {questions.map((question, questionIndex) => (
              <article key={question.id} className={cardClass}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Question {questionIndex + 1}</p>
                    <h2 className="mt-2 text-lg font-semibold leading-7 text-slate-950">{question.prompt}</h2>
                  </div>
                  <StatusBadge>{question.marks} mark{question.marks === 1 ? "" : "s"}</StatusBadge>
                </div>
                <div className="mt-4 grid gap-3">
                  {question.options.map((option, optionIndex) => {
                    const selected = answers[question.id] === optionIndex;
                    return (
                      <button
                        key={`${question.id}-${optionIndex}`}
                        type="button"
                        onClick={() => chooseAnswer(question.id, optionIndex)}
                        className={`rounded-[20px] px-4 py-3 text-left text-sm font-semibold transition ${
                          selected
                            ? "bg-sky-600 text-white shadow-[0_12px_28px_rgba(56,189,248,0.25)]"
                            : "bg-[#f8fafd] text-slate-700 shadow-[0_10px_22px_rgba(226,232,240,0.78)] hover:bg-white"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </article>
            ))}

            <div className="flex flex-wrap gap-3">
              <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => void submitTest()}>
                {busy ? "Submitting..." : "Submit Test"}
              </button>
              <Link href="/student/dashboard" className={secondaryButtonClass}>Dashboard</Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div className={cardClass}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><p className="text-xs text-slate-500">Opens</p><p className="mt-1 font-semibold text-slate-950">{formatDateTime(test?.starts_at)}</p></div>
                <div><p className="text-xs text-slate-500">Closes</p><p className="mt-1 font-semibold text-slate-950">{formatDateTime(test?.ends_at)}</p></div>
                <div><p className="text-xs text-slate-500">Duration</p><p className="mt-1 font-semibold text-slate-950">{test?.duration_minutes ?? 0} minutes</p></div>
                <div><p className="text-xs text-slate-500">Questions</p><p className="mt-1 font-semibold text-slate-950">{test?.question_count ?? 0}</p></div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" className={primaryButtonClass} disabled={busy || !canStartTest} onClick={() => void startTest()}>
                {busy ? "Opening..." : attempt?.status === "in_progress" ? "Resume Test" : "Start Test"}
              </button>
              <Link href="/student/dashboard" className={secondaryButtonClass}>Dashboard</Link>
            </div>
            {!liveAvailability?.available ? (
              <p className="text-sm leading-6 text-amber-700 md:col-span-2">{liveAvailability?.message}</p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
