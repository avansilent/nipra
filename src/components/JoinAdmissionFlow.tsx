"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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

function AdmissionSuccessCard({ copiedLabel, onCopy, onReset, success }: AdmissionSuccessCardProps) {
  const successPayment = success.payment ?? null;

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
        The payment was verified securely and the selected course is already attached to the student account.
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

      <div className="admission-credential-grid">
        <div className="admission-credential-item">
          <span>Student ID</span>
          <strong>{success.credentials.studentId}</strong>
          <button type="button" onClick={() => void onCopy("student-id", success.credentials.studentId)} className="admission-copy-button">
            {copiedLabel === "student-id" ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="admission-credential-item">
          <span>Password</span>
          <strong>{success.credentials.password}</strong>
          <button type="button" onClick={() => void onCopy("password", success.credentials.password)} className="admission-copy-button">
            {copiedLabel === "password" ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="admission-credential-item admission-credential-item-full">
          <span>Login email</span>
          <strong>{success.credentials.email}</strong>
          <button type="button" onClick={() => void onCopy("email", success.credentials.email)} className="admission-copy-button">
            {copiedLabel === "email" ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div className="admission-success-actions">
        <Link href="/login?type=student" className="btn inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold">
          Go to Student Login
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
  const [selectedCourseId, setSelectedCourseId] = useState(() => resolveInitialCourseId(courses, interest, initialCourseId));
  const [form, setForm] = useState<FormState>(emptyForm);
  const [paymentPhase, setPaymentPhase] = useState<PaymentPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<AdmissionResult | null>(null);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [resumeChecked, setResumeChecked] = useState(false);
  const { allowHoverMotion, allowRichMotion } = useAdaptiveMotion();

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
  const successPayment = success?.payment ?? null;
  const sectionVariants = allowRichMotion ? sectionReveal : balancedSectionReveal;
  const itemVariants = allowRichMotion ? itemReveal : balancedItemReveal;
  const buttonMotion = allowHoverMotion ? buttonHover : undefined;
  const showCourseSelection = !(lockCourseSelection && selectedCourse);
  const shellClassName = embedded ? "admission-shell admission-shell-embedded" : "admission-shell";
  const paymentSecurityCardClassName =
    embedded
      ? "overflow-hidden rounded-[1.65rem] border border-slate-200/75 bg-white p-5 text-slate-950 shadow-[0_12px_24px_rgba(15,23,42,0.04)]"
      : "overflow-hidden rounded-[1.65rem] border border-slate-200/75 bg-white p-5 text-slate-950 shadow-[0_14px_28px_rgba(15,23,42,0.05)]";
  const paymentSubmitButtonClassName =
    embedded
      ? "mt-6 inline-flex min-h-[3.2rem] w-full items-center justify-center rounded-full border border-slate-950 bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_26px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
      : "mt-6 inline-flex min-h-[3.2rem] w-full items-center justify-center rounded-full border border-slate-200/80 bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_14px_28px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70";
  const showLockedCourseCard = !showCourseSelection && selectedCourse && !embedded;
  const showSelectionPanel = !embedded || showCourseSelection;
  const showSummaryAside = !embedded;

  const phoneDialUrl = useMemo(
    () => `tel:${siteSettings.contactPhone.replace(/\s+/g, "")}`,
    [siteSettings.contactPhone]
  );

  const normalizedPhone = useMemo(() => form.phone.replace(/\D/g, ""), [form.phone]);

  useEffect(() => {
    if (resumeChecked) {
      return;
    }

    setResumeChecked(true);
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

    let cancelled = false;

    const restorePendingPayment = async () => {
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

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to restore the pending payment right now.");
        }

        if (payload.ready === false) {
          if (payload.status === "failed") {
            setPaymentPhase("failed");
            setError("The last payment attempt did not complete. You can retry securely.");
          }

          return;
        }

        clearPendingAdmissionSession(pendingSession.orderId);
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
  }, [courses, resumeChecked]);

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
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : paymentPhase === "failed"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : paymentPhase === "creating-order" || paymentPhase === "checkout-open" || paymentPhase === "verifying"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-slate-50 text-slate-600";

  const paymentStepDescription =
    paymentPhase === "verified"
      ? `${successPayment?.paymentId ?? "Verified payment"} secured successfully.`
      : paymentPhase === "creating-order"
        ? "Creating a secure Razorpay order for the admission fee."
        : paymentPhase === "checkout-open"
          ? "Checkout opened. Complete the payment to unlock credentials."
          : paymentPhase === "verifying"
            ? "Payment captured. Verifying signature and issuing student access."
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
      description: success ? "Student ID and password are ready." : "Credentials appear only after verified payment.",
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
      if (!response.ok || !payload.credentials) {
        throw new Error(payload.error ?? "Payment verification failed. Please contact support before retrying.");
      }

      setSuccess(payload);
      setPaymentPhase("verified");
      clearPendingAdmissionSession(checkoutResponse.razorpay_order_id);
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
      setError(paymentError instanceof Error ? paymentError.message : "Unable to start secure checkout right now.");
    }
  };

  return (
    <section className={embedded ? "relative" : "app-page-shell relative overflow-hidden"}>
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
              Fill the admission form once, complete the Razorpay checkout, and receive the student ID and password only after verified payment.
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
                <span className="admission-note-label">Credential rule</span>
                <strong>Issued only after verified payment</strong>
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
                          onClick={() => setSelectedCourseId(course.id)}
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
                  <h2 className="admission-panel-title">{embedded ? "Fill the main details" : "Fill the form"}</h2>
                </div>
                <p className="admission-panel-copy">
                  {embedded
                    ? "Only the main student details are required to start. Optional details can be added below if needed."
                    : "These details are used to create the student account after Razorpay verification."}
                </p>
              </div>

              {embedded && selectedCourse ? (
                <div className="mb-5 rounded-[1.45rem] border border-slate-200/75 bg-slate-50/80 p-4">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Selected course</p>
                  <div className="mt-3 flex flex-wrap gap-2.5">
                    <span className="inline-flex rounded-full border border-slate-200/80 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900">
                      {selectedCourse.title}
                    </span>
                    <span className="inline-flex rounded-full border border-slate-200/80 bg-white px-3.5 py-2 text-sm font-medium text-slate-700">
                      Admission {selectedAdmissionFee}
                    </span>
                    {selectedMonthlyFee ? (
                      <span className="inline-flex rounded-full border border-slate-200/80 bg-white px-3.5 py-2 text-sm font-medium text-slate-600">
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
                    value={form.studentName}
                    onChange={(event) => updateField("studentName", event.target.value)}
                    placeholder="Aarav Kumar"
                    required
                  />
                </label>

                <label className="admission-field">
                  <span>Parent or guardian name</span>
                  <input
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
                    inputMode="numeric"
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    placeholder="9876543210"
                    required
                  />
                </label>

                <label className="admission-field">
                  <span>Class</span>
                  <input
                    value={form.classLevel}
                    onChange={(event) => updateField("classLevel", event.target.value)}
                    placeholder="Class 10"
                    required
                  />
                </label>
              </div>

              <details className="mt-4 rounded-[1.45rem] border border-slate-200/75 bg-slate-50/80 p-4 text-sm text-slate-600">
                <summary className="cursor-pointer list-none font-semibold text-slate-700">
                  Add optional details
                </summary>
                <div className="admission-form-grid mt-4">
                  <label className="admission-field">
                    <span>Email address</span>
                    <input
                      type="email"
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
                <p className="admission-panel-copy">Use the hosted checkout so the payment is verified server-side before access is created.</p>
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
                  <span className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold ${paymentStateBadgeClassName}`}>
                    {paymentStateLabel}
                  </span>
                </div>

                <div className="mt-5 overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white">
                  <div className="flex items-start justify-between gap-4 px-4 py-3.5 text-sm">
                    <span className="text-slate-500">Course</span>
                    <strong className="max-w-[16rem] text-right font-semibold text-slate-950">{selectedCourse?.title ?? "Choose a course first"}</strong>
                  </div>
                  <div className="flex items-start justify-between gap-4 border-t border-slate-200/80 px-4 py-3.5 text-sm">
                    <span className="text-slate-500">Admission fee</span>
                    <strong className="text-right font-semibold text-slate-950">{selectedAdmissionFee}</strong>
                  </div>
                  {selectedMonthlyFee ? (
                    <div className="flex items-start justify-between gap-4 border-t border-slate-200/80 px-4 py-3.5 text-sm">
                      <span className="text-slate-500">Monthly fee</span>
                      <strong className="text-right font-semibold text-slate-950">{selectedMonthlyFee}</strong>
                    </div>
                  ) : null}
                  <div className="flex items-start justify-between gap-4 border-t border-slate-200/80 px-4 py-3.5 text-sm">
                    <span className="text-slate-500">Payment methods</span>
                    <strong className="text-right font-semibold text-slate-950">UPI, cards, net banking</strong>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {academyAdmissionNote} No student ID or password is created until the payment is captured and verified on the server.
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
                  <h3 className="admission-summary-title">Student credentials will appear here.</h3>
                  <p className="admission-summary-copy">
                    After Razorpay checkout succeeds and the server verifies the payment signature, this panel will reveal the student ID and password.
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