"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../app/AuthProvider";
import { useAdaptiveMotion } from "../hooks/useAdaptiveMotion";
import { academyAdmissionNote, findAcademyCatalogCourse } from "../data/academyCatalog";
import {
  balancedItemReveal,
  balancedSectionReveal,
  buttonHover,
  createStaggerContainer,
  itemReveal,
  sectionReveal,
  tapPress,
  viewportOnce,
} from "../lib/motion";
import type { AdmissionCourse, AdmissionResult } from "../types/admission";
import type { SiteSettings } from "../types/site";

const stepVariants = createStaggerContainer(0.08, 0.02);

type JoinAdmissionFlowProps = {
  courses: AdmissionCourse[];
  siteSettings: SiteSettings;
  interest?: string;
  initialCourseId?: string;
  lockCourseSelection?: boolean;
  embedded?: boolean;
};

type AdmissionSuccessCardProps = {
  copiedLabel: string | null;
  onCopy: (label: string, value: string) => Promise<void>;
  onReset?: () => void;
  success: AdmissionResult;
};

type FormState = {
  studentName: string;
  guardianName: string;
  phone: string;
  email: string;
  board: string;
  classLevel: string;
  address: string;
};

type PaymentPhase = "idle" | "creating-order" | "checkout-open" | "verifying" | "failed" | "verified";

type RazorpayOrderResponse = {
  keyId?: string;
  orderId?: string;
  amount?: number;
  currency?: string;
  receipt?: string;
  admissionToken?: string;
  course?: {
    id: string;
    title: string;
    amountLabel: string;
    monthlyFeeLabel: string;
  };
  student?: {
    name: string;
    phone: string;
    email: string;
  };
  error?: string;
};

type RazorpayStatusResponse = AdmissionResult & {
  ready?: boolean;
  status?: string;
  error?: string;
};

type RazorpayCheckoutSuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutFailure = {
  error?: {
    description?: string;
    reason?: string;
  };
};

type RazorpayCheckoutInstance = {
  open: () => void;
  on: (event: string, handler: (response: RazorpayCheckoutFailure) => void) => void;
};

type RazorpayCheckoutConstructor = new (options: {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color: string;
  };
  retry?: {
    enabled: boolean;
    max_count: number;
  };
  modal?: {
    confirm_close?: boolean;
    escape?: boolean;
    backdropclose?: boolean;
    ondismiss?: () => void;
  };
  handler: (response: RazorpayCheckoutSuccess) => void;
}) => RazorpayCheckoutInstance;

type StoredAdmissionSession = {
  orderId: string;
  admissionToken: string;
  courseId: string;
  courseTitle: string;
  createdAt: number;
};

type StoredAdmissionDraft = {
  path: string;
  selectedCourseId: string;
  form: FormState;
  createdAt: number;
};

const emptyForm: FormState = {
  studentName: "",
  guardianName: "",
  phone: "",
  email: "",
  board: "CBSE",
  classLevel: "",
  address: "",
};

let razorpayScriptPromise: Promise<boolean> | null = null;
const pendingAdmissionStorageKey = "nipra.pendingAdmissionPayment";
const pendingAdmissionDraftStorageKey = "nipra.pendingAdmissionDraft";
const pendingAdmissionMaxAgeMs = 1000 * 60 * 60 * 24;

function normalizeSearchValue(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function resolveInitialCourseId(courses: AdmissionCourse[], interest: string, initialCourseId?: string) {
  if (courses.length === 0) {
    return "";
  }

  if (initialCourseId && courses.some((course) => course.id === initialCourseId)) {
    return initialCourseId;
  }

  const normalizedInterest = normalizeSearchValue(interest);
  if (!normalizedInterest) {
    return courses[0]?.id ?? "";
  }

  const interestCatalogCourse = findAcademyCatalogCourse(interest);

  const directMatch = courses.find((course) => {
    const normalizedTitle = normalizeSearchValue(course.title);
    return normalizedTitle.includes(normalizedInterest) || normalizedInterest.includes(normalizedTitle);
  });

  if (directMatch) {
    return directMatch.id;
  }

  if (interestCatalogCourse) {
    const mappedCourse = courses.find((course) => findAcademyCatalogCourse(course.title)?.id === interestCatalogCourse.id);
    if (mappedCourse) {
      return mappedCourse.id;
    }
  }

  return courses[0]?.id ?? "";
}

async function loadRazorpayCheckoutScript() {
  if (typeof window === "undefined") {
    return false;
  }

  const windowWithRazorpay = window as Window & { Razorpay?: RazorpayCheckoutConstructor };
  if (windowWithRazorpay.Razorpay) {
    return true;
  }

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise<boolean>((resolve) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay-checkout="true"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(true), { once: true });
        existing.addEventListener("error", () => resolve(false), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.dataset.razorpayCheckout = "true";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  return razorpayScriptPromise;
}

function formatPaymentSetupErrorMessage(error: unknown, contactPhone: string) {
  const fallbackMessage = "Unable to start secure checkout right now.";
  const message = error instanceof Error ? error.message : fallbackMessage;

  if (/NEXT_PUBLIC_RAZORPAY_KEY_ID|RAZORPAY_KEY_ID|RAZORPAY_KEY_SECRET|ADMISSION_SIGNING_SECRET|Missing Supabase service credentials/i.test(message)) {
    return `Secure Razorpay checkout is being configured right now. Call ${contactPhone} and the team can complete the admission manually until payment is restored.`;
  }

  return message;
}

function readPendingAdmissionSession() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(pendingAdmissionStorageKey);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<StoredAdmissionSession>;
    if (
      typeof parsed.orderId !== "string" ||
      typeof parsed.admissionToken !== "string" ||
      typeof parsed.courseId !== "string" ||
      typeof parsed.courseTitle !== "string" ||
      typeof parsed.createdAt !== "number"
    ) {
      window.localStorage.removeItem(pendingAdmissionStorageKey);
      return null;
    }

    if (Date.now() - parsed.createdAt > pendingAdmissionMaxAgeMs) {
      window.localStorage.removeItem(pendingAdmissionStorageKey);
      return null;
    }

    return parsed as StoredAdmissionSession;
  } catch {
    window.localStorage.removeItem(pendingAdmissionStorageKey);
    return null;
  }
}

function writePendingAdmissionSession(session: StoredAdmissionSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(pendingAdmissionStorageKey, JSON.stringify(session));
}

function clearPendingAdmissionSession(orderId?: string) {
  if (typeof window === "undefined") {
    return;
  }

  if (!orderId) {
    window.localStorage.removeItem(pendingAdmissionStorageKey);
    return;
  }

  const currentSession = readPendingAdmissionSession();
  if (currentSession?.orderId === orderId) {
    window.localStorage.removeItem(pendingAdmissionStorageKey);
  }
}

function getCurrentAdmissionPath() {
  if (typeof window === "undefined") {
    return "/join#admission";
  }

  const { pathname, search, hash } = window.location;
  return `${pathname}${search}${hash || "#admission"}`;
}

function readPendingAdmissionDraft(expectedPath?: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(pendingAdmissionDraftStorageKey);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<StoredAdmissionDraft>;
    if (
      typeof parsed.path !== "string" ||
      typeof parsed.selectedCourseId !== "string" ||
      typeof parsed.createdAt !== "number" ||
      typeof parsed.form !== "object" ||
      parsed.form === null
    ) {
      window.sessionStorage.removeItem(pendingAdmissionDraftStorageKey);
      return null;
    }

    if (Date.now() - parsed.createdAt > pendingAdmissionMaxAgeMs) {
      window.sessionStorage.removeItem(pendingAdmissionDraftStorageKey);
      return null;
    }

    if (expectedPath && parsed.path !== expectedPath) {
      return null;
    }

    return parsed as StoredAdmissionDraft;
  } catch {
    window.sessionStorage.removeItem(pendingAdmissionDraftStorageKey);
    return null;
  }
}

function writePendingAdmissionDraft(draft: StoredAdmissionDraft) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(pendingAdmissionDraftStorageKey, JSON.stringify(draft));
}

function clearPendingAdmissionDraft(path?: string) {
  if (typeof window === "undefined") {
    return;
  }

  if (!path) {
    window.sessionStorage.removeItem(pendingAdmissionDraftStorageKey);
    return;
  }

  const currentDraft = readPendingAdmissionDraft();
  if (currentDraft?.path === path) {
    window.sessionStorage.removeItem(pendingAdmissionDraftStorageKey);
  }
}

function AdmissionSuccessCard({ copiedLabel, onCopy, onReset, success }: AdmissionSuccessCardProps) {
  const successPayment = success.payment ?? null;
  const generatedCredentials = success.credentials ?? null;
  const hasGeneratedCredentials = Boolean(generatedCredentials);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26 }}
      className="admission-success-card"
    >
      <p className="admission-success-kicker">Payment verified</p>
      <h3 className="admission-success-title">{success.studentName} is ready for the portal.</h3>
      <p className="admission-success-copy">
        {success.portalAccess.mode === "existing-account"
          ? "The payment was verified securely and the selected course is already attached to the signed-in student portal."
          : "The payment was verified securely and the selected course is already attached to the new student account."}
      </p>

      {successPayment ? (
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <div className="admission-credential-item">
            <span>Payment ID</span>
            <strong>{successPayment.paymentId}</strong>
            <button type="button" onClick={() => void onCopy("payment-id", successPayment.paymentId)} className="admission-copy-button">
              {copiedLabel === "payment-id" ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="admission-credential-item">
            <span>Order ID</span>
            <strong>{successPayment.orderId}</strong>
            <button type="button" onClick={() => void onCopy("order-id", successPayment.orderId)} className="admission-copy-button">
              {copiedLabel === "order-id" ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      ) : null}

      {generatedCredentials ? (
        <div className="admission-credential-grid">
          <div className="admission-credential-item">
            <span>Student ID</span>
            <strong>{generatedCredentials.studentId}</strong>
            <button type="button" onClick={() => void onCopy("student-id", generatedCredentials.studentId)} className="admission-copy-button">
              {copiedLabel === "student-id" ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="admission-credential-item">
            <span>Password</span>
            <strong>{generatedCredentials.password}</strong>
            <button type="button" onClick={() => void onCopy("password", generatedCredentials.password)} className="admission-copy-button">
              {copiedLabel === "password" ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="admission-credential-item admission-credential-item-full">
            <span>Login email</span>
            <strong>{generatedCredentials.email}</strong>
            <button type="button" onClick={() => void onCopy("email", generatedCredentials.email)} className="admission-copy-button">
              {copiedLabel === "email" ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      ) : (
        <div className="admission-credential-grid">
          <div className="admission-credential-item admission-credential-item-full">
            <span>Portal account</span>
            <strong>{success.portalAccess.email ?? "Signed-in student account"}</strong>
            {success.portalAccess.email ? (
              <button type="button" onClick={() => void onCopy("portal-email", success.portalAccess.email ?? "")} className="admission-copy-button">
                {copiedLabel === "portal-email" ? "Copied" : "Copy"}
              </button>
            ) : null}
          </div>
        </div>
      )}

      <div className="admission-success-actions">
        <Link href={hasGeneratedCredentials ? "/login?type=student" : success.portalAccess.dashboardPath} className="btn inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold">
          {hasGeneratedCredentials ? "Go to Student Login" : "Open Student Portal"}
        </Link>
        {onReset ? (
          <button type="button" onClick={onReset} className="admission-copy-button admission-copy-button-secondary">
            Start another admission
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}

export default function JoinAdmissionFlow({
  courses,
  siteSettings,
  interest = "",
  initialCourseId,
  lockCourseSelection = false,
  embedded = false,
}: JoinAdmissionFlowProps) {
  const initialSelectedCourseId = resolveInitialCourseId(courses, interest, initialCourseId);
  const [selectedCourseId, setSelectedCourseId] = useState(initialSelectedCourseId);
  const [form, setForm] = useState<FormState>(() => {
    const initialSelectedCourse = courses.find((course) => course.id === initialSelectedCourseId) ?? null;
    const initialCatalogCourse = findAcademyCatalogCourse(initialSelectedCourse?.title ?? interest);
    const initialClassLevel = initialCatalogCourse?.subtitle.split("|")[0]?.trim() ?? "";

    return initialClassLevel
      ? {
          ...emptyForm,
          classLevel: initialClassLevel,
        }
      : emptyForm;
  });
  const [paymentPhase, setPaymentPhase] = useState<PaymentPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<AdmissionResult | null>(null);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const resumeCheckRef = useRef(false);
  const draftRestoreRef = useRef(false);
  const { allowHoverMotion, allowRichMotion } = useAdaptiveMotion();
  const { user, role, loading: authLoading } = useAuth();

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );

  const selectedCatalogCourse = useMemo(
    () => findAcademyCatalogCourse(selectedCourse?.title ?? interest),
    [selectedCourse?.title, interest]
  );

  const selectedCourseCopy =
    selectedCourse?.description ?? selectedCatalogCourse?.summary ?? "Select a course to see the admission details here.";
  const selectedAdmissionFee =
    selectedCatalogCourse?.admissionFee ?? selectedCourse?.priceText ?? "Institute admission fee will appear at checkout";
  const selectedMonthlyFee = selectedCatalogCourse?.monthlyFee ?? null;
  const suggestedClassLevel = selectedCatalogCourse?.subtitle.split("|")[0]?.trim() ?? "";
  const successPayment = success?.payment ?? null;
  const sectionVariants = allowRichMotion ? sectionReveal : balancedSectionReveal;
  const itemVariants = allowRichMotion ? itemReveal : balancedItemReveal;
  const buttonMotion = allowHoverMotion ? buttonHover : undefined;
  const showCourseSelection = !(lockCourseSelection && selectedCourse);
  const shellClassName = embedded ? "admission-shell admission-shell-embedded" : "admission-shell";
  const paymentSecurityCardClassName =
    embedded
      ? "overflow-hidden rounded-[1.7rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-5 text-slate-950 shadow-[0_18px_38px_rgba(15,23,42,0.05)]"
      : "overflow-hidden rounded-[1.65rem] border border-slate-200/75 bg-white p-5 text-slate-950 shadow-[0_14px_28px_rgba(15,23,42,0.05)]";
  const paymentSubmitButtonClassName =
    embedded
      ? "mt-6 inline-flex min-h-[3.2rem] w-full items-center justify-center rounded-full bg-[linear-gradient(180deg,#0f172a,#1e293b)] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
      : "mt-6 inline-flex min-h-[3.2rem] w-full items-center justify-center rounded-full border border-slate-200/80 bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_14px_28px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70";
  const showLockedCourseCard = !showCourseSelection && selectedCourse && !embedded;
  const showSelectionPanel = !embedded || showCourseSelection;
  const showSummaryAside = !embedded;
  const isStudentAuthenticated = Boolean(user && role === "student");
  const hasWrongPortalRole = Boolean(user && role && role !== "student");

  const phoneDialUrl = useMemo(
    () => `tel:${siteSettings.contactPhone.replace(/\s+/g, "")}`,
    [siteSettings.contactPhone]
  );

  const normalizedPhone = useMemo(() => form.phone.replace(/\D/g, ""), [form.phone]);

  useEffect(() => {
    if (draftRestoreRef.current) {
      return;
    }

    draftRestoreRef.current = true;

    const draftPath = getCurrentAdmissionPath();
    const pendingDraft = readPendingAdmissionDraft(draftPath);
    if (!pendingDraft) {
      return;
    }

    queueMicrotask(() => {
      if (pendingDraft.selectedCourseId && courses.some((course) => course.id === pendingDraft.selectedCourseId)) {
        setSelectedCourseId(pendingDraft.selectedCourseId);
      }

      setForm((current) => {
        const hasTypedValues = Object.values(current).some((value) => value.trim().length > 0);
        return hasTypedValues ? current : pendingDraft.form;
      });
    });
  }, [courses]);

  const continueWithStudentLogin = () => {
    if (typeof window === "undefined") {
      return;
    }

    const callbackPath = getCurrentAdmissionPath();
    writePendingAdmissionDraft({
      path: callbackPath,
      selectedCourseId,
      form,
      createdAt: Date.now(),
    });

    const loginUrl = new URL("/login", window.location.origin);
    loginUrl.searchParams.set("type", "student");
    loginUrl.searchParams.set("callbackUrl", callbackPath);
    window.location.assign(loginUrl.toString());
  };

  const selectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);

    setForm((current) => {
      const nextCourse = courses.find((course) => course.id === courseId) ?? null;
      const nextSuggestedClassLevel = findAcademyCatalogCourse(nextCourse?.title)?.subtitle.split("|")[0]?.trim() ?? "";

      if (!nextSuggestedClassLevel) {
        return current;
      }

      if (current.classLevel.trim() && current.classLevel.trim() !== suggestedClassLevel) {
        return current;
      }

      return {
        ...current,
        classLevel: nextSuggestedClassLevel,
      };
    });
  };

  useEffect(() => {
    if (resumeCheckRef.current) {
      return;
    }

    resumeCheckRef.current = true;

    let cancelled = false;

    const restorePendingPayment = async () => {
      const pendingSession = readPendingAdmissionSession();
      if (!pendingSession) {
        return;
      }

      if (pendingSession.courseId && courses.some((course) => course.id === pendingSession.courseId)) {
        setSelectedCourseId((currentCourseId) =>
          currentCourseId === pendingSession.courseId ? currentCourseId : pendingSession.courseId
        );
      }

      setActiveOrderId(pendingSession.orderId);

      try {
        const response = await fetch("/api/auth/payments/razorpay/status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: pendingSession.orderId,
            admissionToken: pendingSession.admissionToken,
          }),
        });

        const payload = (await response.json()) as RazorpayStatusResponse;
        if (cancelled) {
          return;
        }

        if (response.status === 410) {
          clearPendingAdmissionSession(pendingSession.orderId);
          setActiveOrderId(null);
          setPaymentPhase("idle");
          setError(null);
          return;
        }

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to restore the pending payment right now.");
        }

        if (payload.ready === false) {
          if (payload.status === "expired") {
            clearPendingAdmissionSession(pendingSession.orderId);
            setActiveOrderId(null);
            setPaymentPhase("idle");
            setError(null);
            return;
          }

          if (payload.status === "failed") {
            setPaymentPhase("failed");
            setError("The last payment attempt did not complete. You can retry securely.");
          }

          return;
        }

        clearPendingAdmissionSession(pendingSession.orderId);
        clearPendingAdmissionDraft(getCurrentAdmissionPath());
        setSuccess(payload);
        setPaymentPhase("verified");
        setError(null);
        setActiveOrderId(payload.payment?.orderId ?? pendingSession.orderId);
      } catch (resumeError) {
        if (cancelled) {
          return;
        }

        setPaymentPhase("idle");
        setError(
          resumeError instanceof Error
            ? resumeError.message
            : "Unable to restore the pending payment right now."
        );
      }
    };

    void restorePendingPayment();

    return () => {
      cancelled = true;
    };
  }, [courses]);

  const isFormReady =
    Boolean(selectedCourseId) &&
    form.studentName.trim().length > 1 &&
    form.guardianName.trim().length > 1 &&
    form.classLevel.trim().length > 0 &&
    normalizedPhone.length >= 10;

  const paymentBusy = paymentPhase === "creating-order" || paymentPhase === "verifying";
  const paymentStateLabel =
    paymentPhase === "creating-order"
      ? "Creating order"
      : paymentPhase === "checkout-open"
        ? "Checkout open"
        : paymentPhase === "verifying"
          ? "Verifying"
          : paymentPhase === "verified"
            ? "Verified"
            : paymentPhase === "failed"
              ? "Retry ready"
              : "Ready";
  const paymentStateBadgeClassName =
    paymentPhase === "verified"
      ? "bg-emerald-50/95 text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
      : paymentPhase === "failed"
        ? "bg-rose-50/95 text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
        : paymentPhase === "creating-order" || paymentPhase === "checkout-open" || paymentPhase === "verifying"
          ? "bg-amber-50/95 text-amber-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
          : "bg-slate-100/90 text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]";

  const paymentStepDescription =
    paymentPhase === "verified"
      ? `${successPayment?.paymentId ?? "Verified payment"} secured successfully.`
      : paymentPhase === "creating-order"
        ? "Creating a secure Razorpay order for the admission fee."
        : paymentPhase === "checkout-open"
          ? "Checkout opened. Complete the payment to unlock the course in the student portal."
          : paymentPhase === "verifying"
            ? "Payment captured. Verifying signature and preparing student portal access."
            : paymentPhase === "failed"
              ? "The last payment attempt was not completed. You can retry securely."
              : `Pay the admission fee ${selectedCatalogCourse ? `(${selectedCatalogCourse.admissionFee}) ` : ""}through Razorpay checkout.`;

  const progressItems = [
    {
      label: "Choose course",
      description: selectedCourse ? selectedCourse.title : "Select the program you want to join.",
      state: selectedCourse ? "done" : "active",
    },
    {
      label: "Fill admission form",
      description:
        form.studentName && form.guardianName ? "Student details captured." : "Add student, guardian, and class details.",
      state: isFormReady ? "done" : selectedCourse ? "active" : "pending",
    },
    {
      label: "Secure Razorpay payment",
      description: paymentStepDescription,
      state:
        paymentPhase === "verified"
          ? "done"
          : paymentPhase === "creating-order" || paymentPhase === "checkout-open" || paymentPhase === "verifying"
            ? "active"
            : selectedCourse
              ? "active"
              : "pending",
    },
    {
      label: "Receive student access",
      description: success
        ? success.portalAccess.mode === "existing-account"
          ? "The course is now available in the student portal."
          : "Student login credentials are ready."
        : "Portal access is confirmed only after verified payment.",
      state: success ? "done" : "pending",
    },
  ] as const;

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const copyValue = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedLabel(label);
      window.setTimeout(() => {
        setCopiedLabel((current) => (current === label ? null : current));
      }, 1600);
    } catch {
      setCopiedLabel(null);
    }
  };

  const resetFlow = () => {
    clearPendingAdmissionSession(activeOrderId ?? undefined);
    clearPendingAdmissionDraft(getCurrentAdmissionPath());
    setForm(emptyForm);
    setPaymentPhase("idle");
    setError(null);
    setSuccess(null);
    setCopiedLabel(null);
    setActiveOrderId(null);
    setSelectedCourseId(resolveInitialCourseId(courses, interest, initialCourseId));
  };

  const finalizePayment = async (checkoutResponse: RazorpayCheckoutSuccess, admissionToken: string) => {
    setPaymentPhase("verifying");
    setError(null);

    try {
      const response = await fetch("/api/auth/payments/razorpay/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...checkoutResponse,
          admissionToken,
        }),
      });

      const payload = (await response.json()) as AdmissionResult & { error?: string };
      if (!response.ok || !payload.portalAccess) {
        throw new Error(payload.error ?? "Payment verification failed. Please contact support before retrying.");
      }

      setSuccess(payload);
      setPaymentPhase("verified");
      clearPendingAdmissionSession(checkoutResponse.razorpay_order_id);
      clearPendingAdmissionDraft(getCurrentAdmissionPath());
      setActiveOrderId(payload.payment?.orderId ?? checkoutResponse.razorpay_order_id);
    } catch (verifyError) {
      setSuccess(null);
      setPaymentPhase("failed");
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "Payment was captured, but verification failed. Contact support before retrying."
      );
    }
  };

  const handleSecurePayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedCourse) {
      setError("Choose a course before starting payment.");
      return;
    }

    if (!isFormReady) {
      setError("Complete the form before opening secure checkout.");
      return;
    }

    if (authLoading) {
      setError("Checking your student login. Please wait a moment.");
      return;
    }

    if (hasWrongPortalRole) {
      setError("Sign in with a student account before paying for a course.");
      return;
    }

    if (!isStudentAuthenticated) {
      continueWithStudentLogin();
      return;
    }

    setPaymentPhase("creating-order");
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/auth/payments/razorpay/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          studentName: form.studentName,
          guardianName: form.guardianName,
          phone: form.phone,
          email: form.email,
          board: form.board,
          classLevel: form.classLevel,
          address: form.address,
          interest,
        }),
      });

      const payload = (await response.json()) as RazorpayOrderResponse;
      if (!response.ok || !payload.keyId || !payload.orderId || !payload.amount || !payload.currency || !payload.admissionToken) {
        throw new Error(payload.error ?? "Unable to create the secure Razorpay order.");
      }

      setActiveOrderId(payload.orderId);
      writePendingAdmissionSession({
        orderId: payload.orderId,
        admissionToken: payload.admissionToken,
        courseId: selectedCourse.id,
        courseTitle: payload.course?.title ?? selectedCourse.title,
        createdAt: Date.now(),
      });

      const scriptReady = await loadRazorpayCheckoutScript();
      if (!scriptReady) {
        throw new Error("Razorpay checkout failed to load. Check your connection and try again.");
      }

      const RazorpayConstructor = (window as Window & { Razorpay?: RazorpayCheckoutConstructor }).Razorpay;
      if (!RazorpayConstructor) {
        throw new Error("Razorpay checkout is unavailable right now.");
      }

      const razorpay = new RazorpayConstructor({
        key: payload.keyId,
        amount: payload.amount,
        currency: payload.currency,
        name: siteSettings.siteName,
        description: `Admission fee for ${payload.course?.title ?? selectedCourse.title}`,
        order_id: payload.orderId,
        prefill: {
          name: form.studentName,
          email: form.email || undefined,
          contact: normalizedPhone || undefined,
        },
        notes: {
          course_title: payload.course?.title ?? selectedCourse.title,
          interest: interest || selectedCourse.title,
        },
        retry: {
          enabled: true,
          max_count: 1,
        },
        modal: {
          confirm_close: true,
          escape: false,
          backdropclose: false,
          ondismiss: () => {
            setPaymentPhase((current) => (current === "verifying" || current === "verified" ? current : "failed"));
            setError((current) => current ?? "Checkout was closed before payment completed. You can retry securely.");
          },
        },
        theme: {
          color: "#0f172a",
        },
        handler: (checkoutResponse) => {
          void finalizePayment(checkoutResponse, payload.admissionToken as string);
        },
      });

      razorpay.on("payment.failed", (failure) => {
        setPaymentPhase("failed");
        setError(
          failure.error?.description ||
            failure.error?.reason ||
            "The payment did not complete. No student access has been created yet."
        );
      });

      setPaymentPhase("checkout-open");
      razorpay.open();
    } catch (paymentError) {
      setPaymentPhase("failed");
      setSuccess(null);
      setError(formatPaymentSetupErrorMessage(paymentError, siteSettings.contactPhone));
    }
  };

  return (
    <section className={embedded ? "relative" : "app-page-shell admission-page-shell relative overflow-hidden"}>
      {!embedded ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[24rem] bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.14),transparent_58%)]" />
          <div className="pointer-events-none absolute left-0 top-16 h-80 w-80 rounded-full bg-stone-200/70 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-8 h-96 w-96 rounded-full bg-slate-200/60 blur-3xl" />
        </>
      ) : null}

      <div className={shellClassName}>
        {!embedded ? (
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            variants={sectionVariants}
            className="admission-hero"
          >
            <span className="admission-kicker">Admission And Enrollment</span>
            <h1 className="admission-title">Secure payment, instant student access.</h1>
            <p className="admission-copy">
              Sign in once, complete the admission form, and let verified payment unlock the selected course directly in the student portal.
            </p>
            <div className="admission-hero-actions">
              <Link href="/#contact" className="home-secondary-action inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold">
                Talk to Counselors
              </Link>
              <a href={phoneDialUrl} className="btn inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold">
                Call {siteSettings.contactPhone}
              </a>
            </div>
            {interest ? (
              <div className="admission-interest-pill">
                You came from: <span>{interest}</span>
              </div>
            ) : null}

            <div className="admission-hero-fact-grid">
              <div className="admission-hero-fact">
                <span className="admission-note-label">Gateway</span>
                <strong>Razorpay secured checkout</strong>
              </div>
              <div className="admission-hero-fact">
                <span className="admission-note-label">Portal rule</span>
                <strong>Course unlocks after verified payment</strong>
              </div>
              <div className="admission-hero-fact">
                <span className="admission-note-label">Support</span>
                <strong>{siteSettings.contactPhone}</strong>
              </div>
            </div>
          </motion.div>
        ) : null}

        <div className="admission-layout">
          <div className="admission-main">
            {showSelectionPanel ? (
              <motion.article
                initial="hidden"
                whileInView="show"
                viewport={viewportOnce}
                variants={sectionVariants}
                className="admission-panel"
              >
                <div className="admission-panel-head">
                  <div>
                    <p className="admission-panel-kicker">Step 1</p>
                    <h2 className="admission-panel-title">Choose your course</h2>
                  </div>
                  <p className="admission-panel-copy">Select the published program before moving to payment.</p>
                </div>

                {courses.length === 0 ? (
                  <div className="admission-empty-state">
                    <p className="admission-empty-title">No public courses are published yet.</p>
                    <p className="admission-empty-copy">Contact the institute and they can help you complete the admission manually.</p>
                  </div>
                ) : (
                  <motion.div variants={stepVariants} initial="hidden" whileInView="show" viewport={viewportOnce} className="admission-course-grid">
                    {courses.map((course) => {
                      const isSelected = selectedCourseId === course.id;
                      const catalogCourse = findAcademyCatalogCourse(course.title);

                      return (
                        <motion.button
                          key={course.id}
                          type="button"
                          variants={itemVariants}
                          whileHover={buttonMotion}
                          whileTap={tapPress}
                          onClick={() => selectCourse(course.id)}
                          className={`admission-course-card ${isSelected ? "is-selected" : ""}`}
                        >
                          <div className="admission-course-topline">
                            <span className="admission-course-state">{isSelected ? "Selected" : "Available"}</span>
                            <div className="admission-course-price-stack">
                              <span className="admission-course-price">
                                {catalogCourse ? `Admission ${catalogCourse.admissionFee}` : course.priceText ?? "Ask fee"}
                              </span>
                              {catalogCourse?.monthlyFee ? (
                                <span className="admission-course-price admission-course-price-secondary">{catalogCourse.monthlyFee}</span>
                              ) : null}
                            </div>
                          </div>
                          {catalogCourse?.imageSrc ? (
                            <div className="admission-course-media">
                              <Image
                                src={catalogCourse.imageSrc}
                                alt={catalogCourse.imageAlt}
                                fill
                                sizes="(min-width: 1024px) 420px, 100vw"
                                className="admission-course-media-image"
                              />
                            </div>
                          ) : null}
                          <h3 className="admission-course-title">{course.title}</h3>
                          <p className="admission-course-copy">
                            {course.description ?? catalogCourse?.summary ?? "Structured classes, guided revision, and portal access after admission."}
                          </p>
                          {catalogCourse ? (
                            <div className="admission-course-chip-row">
                              {catalogCourse.subjects.slice(0, 3).map((subject) => (
                                <span key={subject} className="admission-course-chip">{subject}</span>
                              ))}
                            </div>
                          ) : null}
                          <span className="admission-course-cta">{catalogCourse?.ctaLabel || course.ctaLabel || "Join this course"}</span>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}
              </motion.article>
            ) : null}

            {showLockedCourseCard ? (
              <motion.article
                initial="hidden"
                whileInView="show"
                viewport={viewportOnce}
                variants={sectionVariants}
                className="admission-panel"
              >
                <div className="admission-summary-card">
                  {selectedCatalogCourse?.imageSrc ? (
                    <div className="admission-summary-media-frame">
                      <Image
                        src={selectedCatalogCourse.imageSrc}
                        alt={selectedCatalogCourse.imageAlt}
                        fill
                        sizes="(min-width: 1024px) 420px, 100vw"
                        className="admission-summary-media-image"
                      />
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="admission-course-state">Selected</span>
                    <span className="admission-course-price">Admission {selectedAdmissionFee}</span>
                    {selectedMonthlyFee ? (
                      <span className="admission-course-price admission-course-price-secondary">{selectedMonthlyFee}</span>
                    ) : null}
                  </div>

                  <h3 className="admission-summary-title mt-4">{selectedCourse.title}</h3>
                  <p className="admission-summary-copy mt-3">{selectedCourseCopy}</p>
                </div>
              </motion.article>
            ) : null}

            <motion.form
              initial="hidden"
              whileInView="show"
              viewport={viewportOnce}
              variants={sectionVariants}
              onSubmit={handleSecurePayment}
              className="admission-panel"
            >
              <div className="admission-panel-head">
                <div>
                  <p className="admission-panel-kicker">{embedded ? "Application" : "Step 2"}</p>
                  <h2 className="admission-panel-title">{embedded ? "Quick details to start" : "Fill the form"}</h2>
                </div>
                <p className="admission-panel-copy">
                  {embedded
                    ? "Only four fields are needed to open checkout. Optional details can stay for later."
                    : "These details are used to unlock the selected course inside the student portal after Razorpay verification."}
                </p>
              </div>

              <div className="mt-4 rounded-[1.35rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.9))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_12px_24px_rgba(15,23,42,0.03)]">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Portal access</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {isStudentAuthenticated
                    ? `Signed in as ${user?.email ?? "student"}. After payment, this course will unlock directly in the student portal.`
                    : hasWrongPortalRole
                      ? "You are signed in with a non-student account. Switch to a student login before starting payment."
                      : "Sign in before payment so the selected course is added directly to the student portal."}
                </p>
                {!isStudentAuthenticated ? (
                  <div className="mt-3 flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={continueWithStudentLogin}
                      disabled={authLoading}
                      className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {authLoading ? "Checking login..." : "Student login or Google sign-in"}
                    </button>
                    <p className="text-sm leading-6 text-slate-500">Your filled details stay here and reopen after login.</p>
                  </div>
                ) : null}
              </div>

              {embedded ? (
                <p className="mt-4 text-sm leading-6 text-slate-500">
                  Student name, guardian name, mobile number, and class are enough to start. The class is suggested from the selected course.
                </p>
              ) : null}

              {embedded && selectedCourse ? (
                <div className="mb-5 rounded-[1.5rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.9))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_14px_30px_rgba(15,23,42,0.035)]">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Selected course</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_8px_18px_rgba(15,23,42,0.04)]">
                      {selectedCourse.title}
                    </span>
                    <span className="inline-flex rounded-full bg-white/90 px-3.5 py-2 text-sm font-medium text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
                      Admission {selectedAdmissionFee}
                    </span>
                    {selectedMonthlyFee ? (
                      <span className="inline-flex rounded-full bg-white/90 px-3.5 py-2 text-sm font-medium text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
                        {selectedMonthlyFee}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="admission-form-grid">
                <label className="admission-field">
                  <span>Student name</span>
                  <input
                    autoCapitalize="words"
                    autoComplete="name"
                    value={form.studentName}
                    onChange={(event) => updateField("studentName", event.target.value)}
                    placeholder="Aarav Kumar"
                    required
                  />
                </label>

                <label className="admission-field">
                  <span>Parent or guardian name</span>
                  <input
                    autoCapitalize="words"
                    autoComplete="name"
                    value={form.guardianName}
                    onChange={(event) => updateField("guardianName", event.target.value)}
                    placeholder="Rakesh Kumar"
                    required
                  />
                </label>

                <label className="admission-field">
                  <span>Mobile number</span>
                  <input
                    type="tel"
                    autoComplete="tel"
                    inputMode="numeric"
                    maxLength={10}
                    pattern="[0-9]{10}"
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    placeholder="10-digit mobile number"
                    required
                  />
                </label>

                <label className="admission-field">
                  <span>Class</span>
                  <input
                    autoComplete="off"
                    value={form.classLevel}
                    onChange={(event) => updateField("classLevel", event.target.value)}
                    placeholder={suggestedClassLevel || "Class 10"}
                    required
                  />
                </label>
              </div>

              <details className="mt-4 rounded-[1.45rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.9))] p-4 text-sm text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_22px_rgba(15,23,42,0.03)]">
                <summary className="cursor-pointer list-none font-semibold text-slate-700">
                  Optional details
                </summary>
                <p className="mt-2 text-sm leading-6 text-slate-500">You can leave these empty and still complete the payment.</p>
                <div className="admission-form-grid mt-4">
                  <label className="admission-field">
                    <span>Email address</span>
                    <input
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      placeholder="Optional for counselor follow-up"
                    />
                  </label>

                  <label className="admission-field">
                    <span>Board</span>
                    <select value={form.board} onChange={(event) => updateField("board", event.target.value)}>
                      <option value="CBSE">CBSE</option>
                      <option value="Bihar Board">Bihar Board</option>
                      <option value="ICSE">ICSE</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>

                  <label className="admission-field admission-field-full">
                    <span>Address</span>
                    <textarea
                      autoComplete="street-address"
                      value={form.address}
                      onChange={(event) => updateField("address", event.target.value)}
                      placeholder="Deo, Aurangabad, Bihar"
                      rows={3}
                    />
                  </label>
                </div>
              </details>

              <div className="admission-divider" />

              <div className="admission-panel-head">
                <div>
                  <p className="admission-panel-kicker">{embedded ? "Payment" : "Step 3"}</p>
                  <h2 className="admission-panel-title">Secure Razorpay payment</h2>
                </div>
                <p className="admission-panel-copy">Use the hosted checkout so the payment is verified server-side before the course is unlocked in the portal.</p>
              </div>

              <div className={paymentSecurityCardClassName}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {embedded ? "Payment summary" : "Secure payment panel"}
                    </p>
                    <h3 className="mt-2 text-[1.2rem] font-semibold tracking-[-0.05em] text-slate-950">
                      {embedded ? "Pay the admission fee only." : "Easy admission, secure checkout."}
                    </h3>
                  </div>
                  <span className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold ${paymentStateBadgeClassName}`}>
                    {paymentStateLabel}
                  </span>
                </div>

                <div className="mt-5 grid gap-2 rounded-[1.35rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.9))] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_22px_rgba(15,23,42,0.03)]">
                  <div className="flex flex-col items-start gap-2 rounded-[1rem] bg-white/82 px-4 py-3.5 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <span className="text-slate-500">Course</span>
                    <strong className="max-w-[16rem] font-semibold text-slate-950 sm:text-right">{selectedCourse?.title ?? "Choose a course first"}</strong>
                  </div>
                  <div className="flex flex-col items-start gap-2 rounded-[1rem] bg-white/82 px-4 py-3.5 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <span className="text-slate-500">Admission fee</span>
                    <strong className="font-semibold text-slate-950 sm:text-right">{selectedAdmissionFee}</strong>
                  </div>
                  {selectedMonthlyFee ? (
                    <div className="flex flex-col items-start gap-2 rounded-[1rem] bg-white/82 px-4 py-3.5 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <span className="text-slate-500">Monthly fee</span>
                      <strong className="font-semibold text-slate-950 sm:text-right">{selectedMonthlyFee}</strong>
                    </div>
                  ) : null}
                  <div className="flex flex-col items-start gap-2 rounded-[1rem] bg-white/82 px-4 py-3.5 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <span className="text-slate-500">Payment methods</span>
                    <strong className="font-semibold text-slate-950 sm:text-right">UPI, cards, net banking</strong>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {academyAdmissionNote} The selected course appears in the student portal only after the payment is captured and verified on the server.
                </p>

                <p className="mt-3 break-all text-xs text-slate-500">
                  {activeOrderId ? `Order reference: ${activeOrderId}` : "Order reference will appear here after you start checkout."}
                </p>

                {activeOrderId ? (
                  <p className="mt-2 text-xs leading-6 text-slate-500">
                    If payment succeeds but the browser gets interrupted, reopening this page will try to restore the same order automatically.
                  </p>
                ) : null}

                <motion.button
                  whileHover={buttonMotion}
                  whileTap={tapPress}
                  type="submit"
                  disabled={paymentBusy || courses.length === 0 || paymentPhase === "verified"}
                  className={paymentSubmitButtonClassName}
                >
                  {paymentPhase === "creating-order"
                    ? "Creating secure order..."
                    : paymentPhase === "verifying"
                      ? "Verifying payment..."
                      : paymentPhase === "verified"
                        ? "Payment verified"
                        : paymentPhase === "checkout-open"
                          ? "Checkout open..."
                          : !isStudentAuthenticated
                            ? "Sign in to continue payment"
                            : "Pay admission fee securely"}
                </motion.button>
              </div>

              {error ? <p className="admission-error">{error}</p> : null}

              {embedded && success ? (
                <div className="mt-6">
                  <AdmissionSuccessCard copiedLabel={copiedLabel} onCopy={copyValue} onReset={resetFlow} success={success} />
                </div>
              ) : null}
            </motion.form>
          </div>

          {showSummaryAside ? (
          <motion.aside
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            variants={sectionVariants}
            className="admission-summary"
          >
            <div className="admission-summary-head">
              <p className="admission-panel-kicker">Admission Summary</p>
              <h2 className="admission-panel-title">One clean path from course to login</h2>
            </div>

            <div className="admission-step-list">
              {progressItems.map((item) => (
                <div key={item.label} className={`admission-step is-${item.state}`}>
                  <span className="admission-step-dot" />
                  <div>
                    <p className="admission-step-title">{item.label}</p>
                    <p className="admission-step-copy">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="admission-summary-card">
              {selectedCatalogCourse?.imageSrc ? (
                <div className="admission-summary-media-frame">
                  <Image
                    src={selectedCatalogCourse.imageSrc}
                    alt={selectedCatalogCourse.imageAlt}
                    fill
                    sizes="(min-width: 1024px) 320px, 100vw"
                    className="admission-summary-media-image"
                  />
                </div>
              ) : null}
              <p className="admission-note-label">Current selection</p>
              <h3 className="admission-summary-title">{selectedCourse?.title ?? "No course selected yet"}</h3>
              <p className="admission-summary-copy">{selectedCourseCopy}</p>
              <div className="admission-summary-meta">
                <span className="admission-summary-fee">Admission {selectedAdmissionFee}</span>
                {selectedMonthlyFee ? <span className="admission-summary-fee">{selectedMonthlyFee}</span> : null}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {success ? (
                <AdmissionSuccessCard copiedLabel={copiedLabel} onCopy={copyValue} onReset={resetFlow} success={success} />
              ) : (
                <motion.div
                  key="pending"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="admission-summary-card"
                >
                  <p className="admission-note-label">After verified payment</p>
                  <h3 className="admission-summary-title">Student portal access will appear here.</h3>
                  <p className="admission-summary-copy">
                    After Razorpay checkout succeeds and the server verifies the payment signature, this panel will confirm that the course is live in the student portal.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.aside>
          ) : null}
        </div>
      </div>
    </section>
  );
}