import crypto from "node:crypto";
import Razorpay from "razorpay";
import { findAcademyCatalogCourse } from "../../data/academyCatalog";
import { createStudentEmail, createTempPassword, sanitizeLoginId } from "../admin/route";
import { createSupabaseServiceClient } from "../supabase/service";
import type { AdmissionCredentials, AdmissionPaymentDetails, AdmissionResult } from "../../types/admission";

type ServiceClient = ReturnType<typeof createSupabaseServiceClient>;

type CourseRecord = {
  id: string;
  institute_id: string | null;
  title: string;
  price_text: string | null;
  status: string;
};

type AdmissionLedgerRecord = {
  id: string;
  institute_id: string | null;
  course_id: string | null;
  order_id: string;
  receipt: string;
  payment_id: string | null;
  signature: string | null;
  student_user_id: string | null;
  status: string;
  student_name: string;
  guardian_name: string;
  phone: string;
  email: string | null;
  board: string | null;
  class_level: string;
  address: string | null;
  interest: string | null;
  amount_paise: number;
  amount_label: string;
  currency: string;
  token_hash: string;
  payment_method: string | null;
  gateway_response: Record<string, unknown> | null;
  credentials_ciphertext: string | null;
  created_at: string;
  updated_at: string;
  verified_at: string | null;
  completed_at: string | null;
};

type IssuedCredentialPacket = {
  studentName: string;
  courseTitle: string;
  credentials: AdmissionCredentials;
  payment: AdmissionPaymentDetails;
};

type AdmissionTokenPayload = {
  version: 1;
  orderId: string;
  receipt: string;
  courseId: string;
  courseTitle: string;
  instituteId: string;
  studentName: string;
  guardianName: string;
  phone: string;
  email: string;
  board: string;
  classLevel: string;
  address: string;
  interest: string;
  amountPaise: number;
  amountLabel: string;
  monthlyFeeLabel: string;
  currency: string;
  issuedAt: number;
};

export type AdmissionDraftPayload = {
  courseId?: string;
  studentName?: string;
  guardianName?: string;
  phone?: string;
  email?: string;
  board?: string;
  classLevel?: string;
  address?: string;
  interest?: string;
};

export type ResolvedAdmissionDraft = {
  course: {
    id: string;
    title: string;
    instituteId: string;
    priceText: string | null;
  };
  studentName: string;
  guardianName: string;
  phone: string;
  email: string;
  board: string;
  classLevel: string;
  address: string;
  interest: string;
  amountPaise: number;
  amountLabel: string;
  monthlyFeeLabel: string;
  currency: "INR";
};

export type RazorpayVerificationPayload = {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  admissionToken?: string;
};

type RazorpayPaymentDetails = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  method?: string;
  email?: string;
  contact?: string;
};

type RazorpayPaymentsApi = {
  fetch: (paymentId: string) => Promise<unknown>;
  capture?: (paymentId: string, amount: number, currency: string) => Promise<unknown>;
};

export type AdmissionPaymentStatusResult =
  | AdmissionResult
  | {
      ready: false;
      status: string;
    };

export class PublicAdmissionError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function getServiceClient() {
  return createSupabaseServiceClient();
}

function getRazorpayKeyId() {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "";
}

function getRazorpaySecret() {
  return process.env.RAZORPAY_KEY_SECRET || "";
}

function getWebhookSecret() {
  return process.env.RAZORPAY_WEBHOOK_SECRET || "";
}

function getAdmissionSigningSecret() {
  return process.env.ADMISSION_SIGNING_SECRET || getRazorpaySecret() || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function requireSecret(value: string, name: string) {
  if (!value) {
    throw new PublicAdmissionError(`${name} is missing from the environment configuration.`, 500);
  }

  return value;
}

function getCipherKey() {
  const secret = requireSecret(getAdmissionSigningSecret(), "ADMISSION_SIGNING_SECRET");
  return crypto.createHash("sha256").update(secret).digest();
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizePhone(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function ensureAdmissionLedgerError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/admission_payments/i.test(message) || /relation .* does not exist/i.test(message)) {
    throw new PublicAdmissionError(
      "Admission payment ledger is not available yet. Apply the latest Supabase schema before using Razorpay admissions.",
      500
    );
  }

  throw new PublicAdmissionError(message || "Unable to access the admission payment ledger.", 500);
}

function parseAmountToPaise(label: string) {
  const match = label.replace(/,/g, "").match(/(\d+(?:\.\d{1,2})?)/);
  if (!match) {
    return 0;
  }

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  return Math.round(amount * 100);
}

function createReceipt() {
  return `adm_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`.slice(0, 40);
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function signPayload(payload: string) {
  const secret = requireSecret(getAdmissionSigningSecret(), "ADMISSION_SIGNING_SECRET");
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeCompare(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function sealCredentialPacket(packet: IssuedCredentialPacket) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getCipherKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(packet), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv, ciphertext, tag].map((segment) => segment.toString("base64url")).join(".");
}

function openCredentialPacket(ciphertext: string) {
  const [ivPart, dataPart, tagPart] = ciphertext.split(".");
  if (!ivPart || !dataPart || !tagPart) {
    throw new PublicAdmissionError("Stored admission credentials could not be restored.", 500);
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getCipherKey(),
    Buffer.from(ivPart, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));

  const value = Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");

  return JSON.parse(value) as IssuedCredentialPacket;
}

export function createAdmissionToken(payload: AdmissionTokenPayload) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signPayload(encoded);
  return `${encoded}.${signature}`;
}

export function verifyAdmissionToken(token: string) {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    throw new PublicAdmissionError("Admission session is invalid. Start the payment again.", 400);
  }

  const expectedSignature = signPayload(encoded);
  if (!safeCompare(signature, expectedSignature)) {
    throw new PublicAdmissionError("Admission session verification failed. Start the payment again.", 400);
  }

  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as AdmissionTokenPayload;
  if (!payload.issuedAt || Date.now() - payload.issuedAt > 1000 * 60 * 30) {
    throw new PublicAdmissionError("This payment session expired. Start the payment again.", 410);
  }

  return payload;
}

export function verifyRazorpayPaymentSignature(orderId: string, paymentId: string, signature: string) {
  const secret = requireSecret(getRazorpaySecret(), "RAZORPAY_KEY_SECRET");
  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeCompare(expected, signature);
}

export function verifyRazorpayWebhookSignature(body: string, signature: string) {
  const secret = requireSecret(getWebhookSecret(), "RAZORPAY_WEBHOOK_SECRET");
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return safeCompare(expected, signature);
}

export function getRazorpayClient() {
  const keyId = requireSecret(getRazorpayKeyId(), "RAZORPAY_KEY_ID");
  const keySecret = requireSecret(getRazorpaySecret(), "RAZORPAY_KEY_SECRET");
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

async function createUniqueLoginId(serviceClient: ServiceClient, seed: string) {
  const fallbackBase = `student-${Date.now().toString().slice(-6)}`;
  const base = sanitizeLoginId(seed) || fallbackBase;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${Date.now().toString().slice(-4)}${attempt}`;
    const candidate = sanitizeLoginId(`${base}${suffix}`) || `${fallbackBase}-${attempt}`;
    const { data, error } = await serviceClient
      .from("users")
      .select("id")
      .eq("login_id", candidate)
      .maybeSingle();

    if (!error && !data) {
      return candidate;
    }
  }

  return sanitizeLoginId(`student-${Date.now().toString().slice(-8)}`) || fallbackBase;
}

export async function resolveAdmissionDraft(payload: AdmissionDraftPayload) {
  const serviceClient = getServiceClient();
  const courseId = normalizeText(payload.courseId);
  const studentName = normalizeText(payload.studentName);
  const guardianName = normalizeText(payload.guardianName);
  const email = normalizeEmail(payload.email);
  const board = normalizeText(payload.board) || "CBSE";
  const classLevel = normalizeText(payload.classLevel);
  const address = normalizeText(payload.address);
  const interest = normalizeText(payload.interest);
  const phone = normalizePhone(payload.phone);

  if (!courseId) {
    throw new PublicAdmissionError("Please choose a course before continuing.");
  }

  if (!studentName || !guardianName || !classLevel) {
    throw new PublicAdmissionError("Please complete the student, guardian, and class details.");
  }

  if (phone.length < 10) {
    throw new PublicAdmissionError("Please enter a valid mobile number.");
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new PublicAdmissionError("Please enter a valid email address.");
  }

  const { data: course, error: courseError } = await serviceClient
    .from("courses")
    .select("id, institute_id, title, price_text, status")
    .eq("id", courseId)
    .eq("status", "published")
    .maybeSingle();

  const selectedCourse = course as CourseRecord | null;
  if (courseError || !selectedCourse || !selectedCourse.institute_id) {
    throw new PublicAdmissionError("That course is not available for admission right now.", 404);
  }

  const catalogCourse = findAcademyCatalogCourse(selectedCourse.title);
  const amountLabel = catalogCourse?.admissionFee || selectedCourse.price_text || "";
  const monthlyFeeLabel = catalogCourse?.monthlyFee || "Monthly fee shared after admission";
  const amountPaise = parseAmountToPaise(amountLabel);

  if (amountPaise <= 0) {
    throw new PublicAdmissionError(
      "The admission fee for this course is not configured correctly. Ask the institute to update the fee before accepting payments.",
      500
    );
  }

  return {
    course: {
      id: selectedCourse.id,
      title: selectedCourse.title,
      instituteId: selectedCourse.institute_id,
      priceText: selectedCourse.price_text,
    },
    studentName,
    guardianName,
    phone,
    email,
    board,
    classLevel,
    address,
    interest,
    amountPaise,
    amountLabel,
    monthlyFeeLabel,
    currency: "INR",
  } satisfies ResolvedAdmissionDraft;
}

export async function insertAdmissionLedgerEntry(args: {
  orderId: string;
  receipt: string;
  token: string;
  draft: ResolvedAdmissionDraft;
}) {
  try {
    const serviceClient = getServiceClient();
    const { error } = await serviceClient.from("admission_payments").insert({
      institute_id: args.draft.course.instituteId,
      course_id: args.draft.course.id,
      order_id: args.orderId,
      receipt: args.receipt,
      status: "created",
      student_name: args.draft.studentName,
      guardian_name: args.draft.guardianName,
      phone: args.draft.phone,
      email: args.draft.email || null,
      board: args.draft.board || null,
      class_level: args.draft.classLevel,
      address: args.draft.address || null,
      interest: args.draft.interest || null,
      amount_paise: args.draft.amountPaise,
      amount_label: args.draft.amountLabel,
      currency: args.draft.currency,
      token_hash: hashToken(args.token),
    });

    if (error) {
      ensureAdmissionLedgerError(new Error(error.message));
    }
  } catch (error) {
    ensureAdmissionLedgerError(error);
  }
}

export async function loadAdmissionLedgerByOrderId(orderId: string) {
  try {
    const serviceClient = getServiceClient();
    const { data, error } = await serviceClient
      .from("admission_payments")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();

    if (error) {
      ensureAdmissionLedgerError(new Error(error.message));
    }

    return (data as AdmissionLedgerRecord | null) ?? null;
  } catch (error) {
    ensureAdmissionLedgerError(error);
  }
}

export async function loadAdmissionLedgerByPaymentId(paymentId: string) {
  try {
    const serviceClient = getServiceClient();
    const { data, error } = await serviceClient
      .from("admission_payments")
      .select("*")
      .eq("payment_id", paymentId)
      .maybeSingle();

    if (error) {
      ensureAdmissionLedgerError(new Error(error.message));
    }

    return (data as AdmissionLedgerRecord | null) ?? null;
  } catch (error) {
    ensureAdmissionLedgerError(error);
  }
}

export async function updateAdmissionLedger(orderId: string, patch: Record<string, unknown>) {
  try {
    const serviceClient = getServiceClient();
    const { error } = await serviceClient
      .from("admission_payments")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("order_id", orderId);

    if (error) {
      ensureAdmissionLedgerError(new Error(error.message));
    }
  } catch (error) {
    ensureAdmissionLedgerError(error);
  }
}

export async function markWebhookAdmissionStatus(orderId: string, patch: Record<string, unknown>) {
  const currentLedger = await loadAdmissionLedgerByOrderId(orderId);
  if (!currentLedger) {
    return;
  }

  const incomingStatus = typeof patch.status === "string" ? patch.status : currentLedger.status;

  if (incomingStatus === "failed" && ["paid", "verified", "credentials_issued"].includes(currentLedger.status)) {
    return;
  }

  const nextPatch: Record<string, unknown> = { ...patch };

  if (currentLedger.status === "verified" || currentLedger.status === "credentials_issued") {
    nextPatch.status = currentLedger.status;
  }

  await updateAdmissionLedger(orderId, nextPatch);
}

export function buildAdmissionToken(orderId: string, receipt: string, draft: ResolvedAdmissionDraft) {
  return createAdmissionToken({
    version: 1,
    orderId,
    receipt,
    courseId: draft.course.id,
    courseTitle: draft.course.title,
    instituteId: draft.course.instituteId,
    studentName: draft.studentName,
    guardianName: draft.guardianName,
    phone: draft.phone,
    email: draft.email,
    board: draft.board,
    classLevel: draft.classLevel,
    address: draft.address,
    interest: draft.interest,
    amountPaise: draft.amountPaise,
    amountLabel: draft.amountLabel,
    monthlyFeeLabel: draft.monthlyFeeLabel,
    currency: draft.currency,
    issuedAt: Date.now(),
  });
}

export function createAdmissionOrderReceipt() {
  return createReceipt();
}

export function getPublicRazorpayKeyId() {
  return requireSecret(getRazorpayKeyId(), "RAZORPAY_KEY_ID");
}

async function loadCapturedRazorpayPayment(orderId: string, paymentId: string) {
  const razorpay = getRazorpayClient();
  const paymentsApi = razorpay.payments as unknown as RazorpayPaymentsApi;
  const payment = (await paymentsApi.fetch(paymentId)) as RazorpayPaymentDetails;

  if (payment.order_id !== orderId) {
    throw new PublicAdmissionError("The payment does not belong to this admission order.", 409);
  }

  if (payment.status === "captured") {
    return payment;
  }

  if (payment.status !== "authorized") {
    throw new PublicAdmissionError("The payment is not captured yet. Wait a moment and try verification again.", 409);
  }

  try {
    if (typeof paymentsApi.capture === "function") {
      const captured = (await paymentsApi.capture(payment.id, payment.amount, payment.currency)) as RazorpayPaymentDetails;

      if (captured.order_id === orderId && captured.status === "captured") {
        return captured;
      }
    }
  } catch {
    // The dashboard may have already captured the payment. Re-fetch before failing.
  }

  const refreshedPayment = (await paymentsApi.fetch(paymentId)) as RazorpayPaymentDetails;

  if (refreshedPayment.order_id !== orderId) {
    throw new PublicAdmissionError("The payment does not belong to this admission order.", 409);
  }

  if (refreshedPayment.status === "captured") {
    return refreshedPayment;
  }

  throw new PublicAdmissionError("Payment is authorized but not captured yet. Wait a moment and try verification again.", 409);
}

async function resolveAdmissionSession(orderId: string, tokenValue: string) {
  if (!orderId || !tokenValue) {
    throw new PublicAdmissionError("Payment verification payload is incomplete.");
  }

  const token = verifyAdmissionToken(tokenValue);
  if (token.orderId !== orderId) {
    throw new PublicAdmissionError("The payment order does not match this admission session.", 409);
  }

  const ledger = await loadAdmissionLedgerByOrderId(orderId);
  if (!ledger) {
    throw new PublicAdmissionError("This admission order could not be found. Start the payment again.", 404);
  }

  if (ledger.token_hash !== hashToken(tokenValue)) {
    throw new PublicAdmissionError("Admission session hash mismatch. Start the payment again.", 409);
  }

  return { token, ledger };
}

export async function fetchVerifiedPayment(orderId: string, paymentId: string, signature: string) {
  if (!verifyRazorpayPaymentSignature(orderId, paymentId, signature)) {
    throw new PublicAdmissionError("Payment signature verification failed. Do not retry the payment. Contact support.", 400);
  }

  return loadCapturedRazorpayPayment(orderId, paymentId);
}

async function createIssuedCredentials(
  serviceClient: ServiceClient,
  token: AdmissionTokenPayload,
  payment: RazorpayPaymentDetails,
  signature: string | null
) {
  const loginId = await createUniqueLoginId(serviceClient, `${token.studentName}-${token.phone.slice(-4)}`);
  const finalEmail = createStudentEmail(loginId);
  const password = createTempPassword();

  const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
    email: finalEmail,
    password,
    email_confirm: true,
    user_metadata: {
      name: token.studentName,
      full_name: token.studentName,
      role: "student",
      institute_id: token.instituteId,
      login_id: loginId,
      guardian_name: token.guardianName,
      phone: token.phone,
      board: token.board,
      class_level: token.classLevel,
      address: token.address,
      contact_email: token.email || null,
      admission_interest: token.interest || null,
      admission_source: "razorpay-public-join-flow",
      enrolled_course_id: token.courseId,
      enrolled_course_title: token.courseTitle,
      admission_order_id: payment.order_id,
      admission_payment_id: payment.id,
      admission_payment_method: payment.method ?? null,
      admission_amount_paise: token.amountPaise,
      razorpay_signature: signature ?? null,
    },
    app_metadata: {
      role: "student",
      institute_id: token.instituteId,
    },
  });

  if (createError || !created.user) {
    throw new PublicAdmissionError(createError?.message ?? "Unable to issue student access after payment.", 400);
  }

  const { error: enrollmentError } = await serviceClient.from("enrollments").upsert(
    {
      student_id: created.user.id,
      course_id: token.courseId,
      institute_id: token.instituteId,
    },
    { onConflict: "student_id,course_id" }
  );

  if (enrollmentError) {
    await serviceClient.auth.admin.deleteUser(created.user.id);
    throw new PublicAdmissionError("Payment was verified, but course enrollment could not be completed.", 500);
  }

  const { error: userUpdateError } = await serviceClient
    .from("users")
    .update({
      name: token.studentName,
      email: finalEmail,
      login_id: loginId,
      role: "student",
    })
    .eq("id", created.user.id);

  if (userUpdateError) {
    await serviceClient.auth.admin.deleteUser(created.user.id);
    throw new PublicAdmissionError("Payment was verified, but student records could not be finalized.", 500);
  }

  return {
    studentUserId: created.user.id,
    packet: {
      studentName: token.studentName,
      courseTitle: token.courseTitle,
      credentials: {
        studentId: loginId,
        email: finalEmail,
        password,
      },
      payment: {
        orderId: payment.order_id,
        paymentId: payment.id,
        amountLabel: token.amountLabel,
        method: payment.method ?? null,
        status: payment.status === "captured" ? "captured" : "verified",
      },
    } satisfies IssuedCredentialPacket,
  };
}

async function syncIssuedAdmissionCredentials(
  ledger: AdmissionLedgerRecord,
  token: AdmissionTokenPayload,
  payment: RazorpayPaymentDetails,
  signature: string | null
) {
  const latestLedger = await loadAdmissionLedgerByOrderId(ledger.order_id);

  if (latestLedger?.status === "credentials_issued" && latestLedger.credentials_ciphertext) {
    return openCredentialPacket(latestLedger.credentials_ciphertext);
  }

  const persistedSignature = signature ?? latestLedger?.signature ?? ledger.signature ?? null;

  await updateAdmissionLedger(ledger.order_id, {
    payment_id: payment.id,
    ...(persistedSignature ? { signature: persistedSignature } : {}),
    status: "verified",
    payment_method: payment.method ?? null,
    gateway_response: payment as unknown as Record<string, unknown>,
    verified_at: new Date().toISOString(),
  });

  const serviceClient = getServiceClient();
  const issued = await createIssuedCredentials(serviceClient, token, payment, persistedSignature);
  const credentialsCiphertext = sealCredentialPacket(issued.packet);

  await updateAdmissionLedger(ledger.order_id, {
    payment_id: payment.id,
    ...(persistedSignature ? { signature: persistedSignature } : {}),
    student_user_id: issued.studentUserId,
    status: "credentials_issued",
    payment_method: payment.method ?? null,
    gateway_response: payment as unknown as Record<string, unknown>,
    credentials_ciphertext: credentialsCiphertext,
    verified_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  });

  return issued.packet;
}

export async function getAdmissionPaymentStatus(input: {
  orderId?: string;
  admissionToken?: string;
}): Promise<AdmissionPaymentStatusResult> {
  const orderId = normalizeText(input.orderId);
  const tokenValue = normalizeText(input.admissionToken);
  const { token, ledger } = await resolveAdmissionSession(orderId, tokenValue);

  if (ledger.status === "credentials_issued" && ledger.credentials_ciphertext) {
    return openCredentialPacket(ledger.credentials_ciphertext);
  }

  if (!ledger.payment_id || (ledger.status !== "paid" && ledger.status !== "verified")) {
    return {
      ready: false,
      status: ledger.status,
    };
  }

  const payment = await loadCapturedRazorpayPayment(orderId, ledger.payment_id);
  if (payment.amount !== token.amountPaise || payment.currency !== token.currency) {
    throw new PublicAdmissionError("The verified payment amount does not match the admission fee.", 409);
  }

  return syncIssuedAdmissionCredentials(ledger, token, payment, ledger.signature);
}

export async function finalizeVerifiedAdmissionPayment(input: RazorpayVerificationPayload): Promise<AdmissionResult> {
  const orderId = normalizeText(input.razorpay_order_id);
  const paymentId = normalizeText(input.razorpay_payment_id);
  const signature = normalizeText(input.razorpay_signature);
  const tokenValue = normalizeText(input.admissionToken);

  if (!orderId || !paymentId || !signature || !tokenValue) {
    throw new PublicAdmissionError("Payment verification payload is incomplete.");
  }

  const { token, ledger } = await resolveAdmissionSession(orderId, tokenValue);

  const duplicatePayment = await loadAdmissionLedgerByPaymentId(paymentId);
  if (duplicatePayment && duplicatePayment.order_id !== orderId) {
    throw new PublicAdmissionError("This payment is already attached to another admission order.", 409);
  }

  if (ledger.status === "credentials_issued" && ledger.credentials_ciphertext) {
    if (ledger.payment_id && ledger.payment_id !== paymentId) {
      throw new PublicAdmissionError("This admission order has already been completed with another payment.", 409);
    }

    const packet = openCredentialPacket(ledger.credentials_ciphertext);
    return packet;
  }

  if (ledger.payment_id && ledger.payment_id !== paymentId && ledger.status !== "failed") {
    throw new PublicAdmissionError("This admission order is already bound to another payment.", 409);
  }

  const payment = await fetchVerifiedPayment(orderId, paymentId, signature);
  if (payment.amount !== token.amountPaise || payment.currency !== token.currency) {
    throw new PublicAdmissionError("The verified payment amount does not match the admission fee.", 409);
  }

  return syncIssuedAdmissionCredentials(ledger, token, payment, signature);
}
