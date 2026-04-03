"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { academyAdmissionNote, findAcademyCatalogCourse } from "../data/academyCatalog";
import {
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
const UPI_MOBILE_NUMBER = "7324868574";

type JoinAdmissionFlowProps = {
  courses: AdmissionCourse[];
  siteSettings: SiteSettings;
  interest?: string;
};

type AdmissionResponse = {
  student?: {
    name: string;
  };
  course?: {
    title: string;
    priceText?: string | null;
  };
  credentials?: AdmissionResult["credentials"];
  error?: string;
};

type FormState = {
  studentName: string;
  guardianName: string;
  phone: string;
  email: string;
  board: string;
  classLevel: string;
  address: string;
  paymentReference: string;
};

const emptyForm: FormState = {
  studentName: "",
  guardianName: "",
  phone: "",
  email: "",
  board: "CBSE",
  classLevel: "",
  address: "",
  paymentReference: "",
};

function normalizeSearchValue(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function resolveInitialCourseId(courses: AdmissionCourse[], interest: string) {
  if (courses.length === 0) {
    return "";
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

export default function JoinAdmissionFlow({ courses, siteSettings, interest = "" }: JoinAdmissionFlowProps) {
  const [selectedCourseId, setSelectedCourseId] = useState(() => resolveInitialCourseId(courses, interest));
  const [form, setForm] = useState<FormState>(emptyForm);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<AdmissionResult | null>(null);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );

  const selectedCatalogCourse = useMemo(
    () => findAcademyCatalogCourse(selectedCourse?.title ?? interest),
    [selectedCourse?.title, interest]
  );

  const selectedCourseCopy = selectedCourse?.description ?? selectedCatalogCourse?.summary ?? "Select a course to see the admission details here.";
  const selectedAdmissionFee = selectedCatalogCourse?.admissionFee ?? selectedCourse?.priceText ?? "Use the institute-shared admission fee";
  const selectedMonthlyFee = selectedCatalogCourse?.monthlyFee ?? null;

  const phoneDialUrl = useMemo(
    () => `tel:${siteSettings.contactPhone.replace(/\s+/g, "")}`,
    [siteSettings.contactPhone]
  );

  const isFormReady =
    Boolean(selectedCourseId) &&
    form.studentName.trim().length > 1 &&
    form.guardianName.trim().length > 1 &&
    form.classLevel.trim().length > 0 &&
    form.phone.replace(/\D/g, "").length >= 10 &&
    form.paymentReference.trim().length >= 6 &&
    paymentConfirmed;

  const progressItems = [
    {
      label: "Choose course",
      description: selectedCourse ? selectedCourse.title : "Select the program you want to join.",
      state: selectedCourse ? "done" : "active",
    },
    {
      label: "Fill admission form",
      description: form.studentName && form.guardianName ? "Student details captured." : "Add student, guardian, and class details.",
      state: form.studentName && form.guardianName && form.classLevel ? "done" : selectedCourse ? "active" : "pending",
    },
    {
      label: "Pay and confirm",
      description: paymentConfirmed ? `Reference ${form.paymentReference || "saved"}` : `Pay the admission fee ${selectedCatalogCourse ? `(${selectedCatalogCourse.admissionFee}) ` : ""}and enter the UPI reference.`,
      state: paymentConfirmed ? "done" : selectedCourse ? "active" : "pending",
    },
    {
      label: "Receive student access",
      description: success ? "Student ID and password are ready." : "Credentials appear instantly after submission.",
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedCourse) {
      setError("Choose a course before completing admission.");
      return;
    }

    if (!isFormReady) {
      setError("Complete the form, payment reference, and confirmation before continuing.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/student-admission", {
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
          paymentReference: form.paymentReference,
          confirmedPayment: paymentConfirmed,
        }),
      });

      const payload = (await response.json()) as AdmissionResponse;

      if (!response.ok || !payload.credentials || !payload.course || !payload.student) {
        throw new Error(payload.error ?? "Unable to complete admission right now.");
      }

      setSuccess({
        studentName: payload.student.name,
        courseTitle: payload.course.title,
        credentials: payload.credentials,
      });
    } catch (submitError) {
      setSuccess(null);
      setError(submitError instanceof Error ? submitError.message : "Unable to complete admission right now.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetFlow = () => {
    setForm(emptyForm);
    setPaymentConfirmed(false);
    setError(null);
    setSuccess(null);
    setCopiedLabel(null);
    setSelectedCourseId(resolveInitialCourseId(courses, interest));
  };

  return (
    <section className="app-page-shell">
      <div className="admission-shell">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={sectionReveal}
          className="admission-hero"
        >
          <span className="admission-kicker">Admission And Enrollment</span>
          <h1 className="admission-title">Apply once, pay cleanly, and receive student portal access without confusion.</h1>
          <p className="admission-copy">
            Choose the course, fill the admission form, complete the UPI payment, and receive the student login credentials needed for the portal.
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
        </motion.div>

        <div className="admission-layout">
          <div className="admission-main">
            <motion.article
              initial="hidden"
              whileInView="show"
              viewport={viewportOnce}
              variants={sectionReveal}
              className="admission-panel"
            >
              <div className="admission-panel-head">
                <div>
                  <p className="admission-panel-kicker">Step 1</p>
                  <h2 className="admission-panel-title">Choose the course</h2>
                </div>
                <p className="admission-panel-copy">Select the published program you want to enroll in before moving to payment.</p>
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
                        variants={itemReveal}
                        whileHover={buttonHover}
                        whileTap={tapPress}
                        onClick={() => setSelectedCourseId(course.id)}
                        className={`admission-course-card ${isSelected ? "is-selected" : ""}`}
                      >
                        <div className="admission-course-topline">
                          <span className="admission-course-state">{isSelected ? "Selected" : "Available"}</span>
                          <div className="admission-course-price-stack">
                            <span className="admission-course-price">{catalogCourse ? `Admission ${catalogCourse.admissionFee}` : course.priceText ?? "Ask fee"}</span>
                            {catalogCourse?.monthlyFee ? <span className="admission-course-price admission-course-price-secondary">{catalogCourse.monthlyFee}</span> : null}
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
                        <p className="admission-course-copy">{course.description ?? catalogCourse?.summary ?? "Structured classes, guided revision, and portal access after admission."}</p>
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

            <motion.form
              initial="hidden"
              whileInView="show"
              viewport={viewportOnce}
              variants={sectionReveal}
              onSubmit={handleSubmit}
              className="admission-panel"
            >
              <div className="admission-panel-head">
                <div>
                  <p className="admission-panel-kicker">Step 2</p>
                  <h2 className="admission-panel-title">Fill the admission form</h2>
                </div>
                <p className="admission-panel-copy">These details are used to create the student account and attach the course after payment.</p>
              </div>

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
                  <span>Email address</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    placeholder="Optional"
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

                <label className="admission-field">
                  <span>Class</span>
                  <input
                    value={form.classLevel}
                    onChange={(event) => updateField("classLevel", event.target.value)}
                    placeholder="Class 10"
                    required
                  />
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

              <div className="admission-divider" />

              <div className="admission-panel-head">
                <div>
                  <p className="admission-panel-kicker">Step 3</p>
                  <h2 className="admission-panel-title">Pay with UPI QR</h2>
                </div>
                <p className="admission-panel-copy">Scan the QR, pay only the admission fee for the selected course, then enter the UPI reference to complete the first admission step.</p>
              </div>

              <div className="admission-payment-grid">
                <div className="admission-payment-copy">
                  <div className="admission-inline-note">
                    <span className="admission-note-label">Selected course</span>
                    <strong>{selectedCourse?.title ?? "Choose a course first"}</strong>
                  </div>
                  <div className="admission-inline-note">
                    <span className="admission-note-label">Admission fee due now</span>
                    <strong className="admission-payment-amount">{selectedAdmissionFee}</strong>
                  </div>
                  {selectedMonthlyFee ? (
                    <div className="admission-inline-note">
                      <span className="admission-note-label">Monthly fee range</span>
                      <strong>{selectedMonthlyFee}</strong>
                    </div>
                  ) : null}
                  <div className="admission-inline-note">
                    <span className="admission-note-label">UPI mobile number</span>
                    <div className="admission-copy-row">
                      <strong>{UPI_MOBILE_NUMBER}</strong>
                      <button type="button" onClick={() => void copyValue("upi", UPI_MOBILE_NUMBER)} className="admission-copy-button">
                        {copiedLabel === "upi" ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                  <p className="admission-payment-note">
                    {academyAdmissionNote} After the payment is complete, enter the UPI transaction reference below and confirm the payment. The student ID and password will appear immediately after submission.
                  </p>
                </div>

                <div className="admission-qr-card">
                  <div className="admission-qr-frame">
                    <Image src="/qr%20code.jpeg" alt="Nipracademy payment QR code" width={136} height={136} className="admission-qr-image" />
                  </div>
                  <p className="admission-qr-caption">Scan to pay through GPay or any UPI app</p>
                </div>
              </div>

              <div className="admission-form-grid">
                <label className="admission-field">
                  <span>UPI transaction reference</span>
                  <input
                    value={form.paymentReference}
                    onChange={(event) => updateField("paymentReference", event.target.value.toUpperCase())}
                    placeholder="Last 6 digits or full UPI ref"
                    required
                  />
                </label>
              </div>

              <label className="admission-check">
                <input type="checkbox" checked={paymentConfirmed} onChange={(event) => setPaymentConfirmed(event.target.checked)} />
                <span>I have completed the admission-fee payment and entered the correct UPI reference.</span>
              </label>

              {error ? <p className="admission-error">{error}</p> : null}

              <div className="admission-submit-row">
                <p className="admission-submit-note">Student access is created only after the course, form, admission-fee payment, and confirmation are complete.</p>
                <motion.button
                  whileHover={buttonHover}
                  whileTap={tapPress}
                  type="submit"
                  disabled={submitting || courses.length === 0}
                  className="btn admission-submit-button rounded-full px-6 py-3 text-sm font-semibold"
                >
                  {submitting ? "Completing admission..." : "Complete admission and get portal access"}
                </motion.button>
              </div>
            </motion.form>
          </div>

          <motion.aside
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            variants={sectionReveal}
            className="admission-summary"
          >
            <div className="admission-summary-head">
              <p className="admission-panel-kicker">Admission Summary</p>
              <h2 className="admission-panel-title">One clean path from course selection to student login</h2>
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
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.26 }}
                  className="admission-success-card"
                >
                  <p className="admission-success-kicker">Admission completed</p>
                  <h3 className="admission-success-title">{success.studentName} is ready for the student portal.</h3>
                  <p className="admission-success-copy">Use these credentials on the student login page. The selected course has already been attached to the account.</p>

                  <div className="admission-credential-grid">
                    <div className="admission-credential-item">
                      <span>Student ID</span>
                      <strong>{success.credentials.studentId}</strong>
                      <button type="button" onClick={() => void copyValue("student-id", success.credentials.studentId)} className="admission-copy-button">
                        {copiedLabel === "student-id" ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <div className="admission-credential-item">
                      <span>Password</span>
                      <strong>{success.credentials.password}</strong>
                      <button type="button" onClick={() => void copyValue("password", success.credentials.password)} className="admission-copy-button">
                        {copiedLabel === "password" ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <div className="admission-credential-item admission-credential-item-full">
                      <span>Email</span>
                      <strong>{success.credentials.email}</strong>
                      <button type="button" onClick={() => void copyValue("email", success.credentials.email)} className="admission-copy-button">
                        {copiedLabel === "email" ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>

                  <div className="admission-success-actions">
                    <Link href="/login?type=student" className="btn inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold">
                      Go to Student Login
                    </Link>
                    <button type="button" onClick={resetFlow} className="admission-copy-button admission-copy-button-secondary">
                      Start another admission
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="pending"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="admission-summary-card"
                >
                  <p className="admission-note-label">After payment</p>
                  <h3 className="admission-summary-title">The student credentials will appear here.</h3>
                  <p className="admission-summary-copy">You will receive the student ID, password, and portal entry button in this panel after the admission is completed.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.aside>
        </div>
      </div>
    </section>
  );
}