export type EnrollmentAccessStatus = "active" | "payment_due" | "expired" | "completed" | "suspended";
export type EnrollmentPaymentStatus = "paid" | "due" | "overdue" | "pending";

export type EnrollmentAccessRow = {
  access_status?: string | null;
  payment_status?: string | null;
  access_ends_at?: string | null;
  payment_due_at?: string | null;
  last_payment_at?: string | null;
};

const activeAccessStatus: EnrollmentAccessStatus = "active";
const paidPaymentStatus: EnrollmentPaymentStatus = "paid";

function normalizeText(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim().toLowerCase();
  return normalized || fallback;
}

function toTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

export function isEnrollmentAccessActive(enrollment: EnrollmentAccessRow | null | undefined, now = Date.now()) {
  if (!enrollment) {
    return false;
  }

  const accessStatus = normalizeText(enrollment.access_status, activeAccessStatus);
  const paymentStatus = normalizeText(enrollment.payment_status, paidPaymentStatus);

  if (accessStatus !== activeAccessStatus || paymentStatus !== paidPaymentStatus) {
    return false;
  }

  const accessEndsAt = toTime(enrollment.access_ends_at);
  if (accessEndsAt !== null && accessEndsAt <= now) {
    return false;
  }

  const paymentDueAt = toTime(enrollment.payment_due_at);
  if (paymentDueAt !== null && paymentDueAt <= now) {
    return false;
  }

  return true;
}

export function getEnrollmentAccessLabel(enrollment: EnrollmentAccessRow | null | undefined, now = Date.now()) {
  if (!enrollment) {
    return "Not enrolled";
  }

  const accessStatus = normalizeText(enrollment.access_status, activeAccessStatus);
  const paymentStatus = normalizeText(enrollment.payment_status, paidPaymentStatus);
  const accessEndsAt = toTime(enrollment.access_ends_at);
  const paymentDueAt = toTime(enrollment.payment_due_at);

  if (accessStatus === "payment_due" || paymentStatus === "due" || paymentStatus === "overdue") {
    return "Fee due";
  }

  if (paymentStatus === "pending") {
    return "Payment pending";
  }

  if (accessStatus === "completed") {
    return "Course completed";
  }

  if (accessStatus === "expired" || (accessEndsAt !== null && accessEndsAt <= now)) {
    return "Course ended";
  }

  if (accessStatus === "suspended") {
    return "Access paused";
  }

  if (paymentDueAt !== null && paymentDueAt <= now) {
    return "Fee due";
  }

  return "Active";
}

export function getEnrollmentAccessMessage(enrollment: EnrollmentAccessRow | null | undefined, now = Date.now()) {
  const label = getEnrollmentAccessLabel(enrollment, now);

  if (label === "Active") {
    return "Course access is active.";
  }

  if (label === "Fee due") {
    return "Fee payment is due for this course. Pay the due or choose a course to reopen the portal.";
  }

  if (label === "Payment pending") {
    return "Payment is still pending for this course.";
  }

  if (label === "Course completed" || label === "Course ended") {
    return "This course access has ended. Choose a course or complete the required payment to continue.";
  }

  if (label === "Access paused") {
    return "Course access is paused. Contact the institute or complete the required payment to continue.";
  }

  return "Course access is not available right now.";
}

export function getEnrollmentAccessTone(enrollment: EnrollmentAccessRow | null | undefined, now = Date.now()) {
  return isEnrollmentAccessActive(enrollment, now) ? "success" : "danger";
}

export function isEnrollmentAccessColumnError(message: string) {
  return (
    /(access_status|payment_status|access_ends_at|payment_due_at|last_payment_at)/i.test(message) &&
    /(column|schema cache|could not find)/i.test(message)
  );
}
