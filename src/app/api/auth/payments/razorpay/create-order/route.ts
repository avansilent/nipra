import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "../../../../../../lib/supabase/route";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "../../../../../../lib/security/rateLimit";
import {
  buildAdmissionToken,
  createAdmissionOrderReceipt,
  getPublicRazorpayKeyId,
  getRazorpayClient,
  insertAdmissionLedgerEntry,
  PublicAdmissionError,
  resolveAdmissionDraft,
} from "../../../../../../lib/admission/payments";

async function resolveAuthenticatedStudentUserId() {
  const supabase = await createSupabaseRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new PublicAdmissionError("Please sign in as a student before starting payment.", 401);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const metadataRole = profile?.role ?? (user.app_metadata?.role as string | undefined) ?? "student";

  if (metadataRole === "admin") {
    throw new PublicAdmissionError("Sign in with a student account before paying for a course.", 403);
  }

  if (!user.phone) {
    throw new PublicAdmissionError("Login with mobile OTP before paying for a course.", 403);
  }

  return user.id;
}

export async function POST(request: Request) {
  try {
    const ipLimit = await checkRateLimitAsync(`razorpay:create:${getClientIp(request)}`, { limit: 12, windowMs: 15 * 60 * 1000 });
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many payment attempts. Please wait before trying again." },
        { status: 429, headers: rateLimitHeaders(ipLimit) }
      );
    }

    const studentUserId = await resolveAuthenticatedStudentUserId();
    const body = (await request.json()) as Record<string, unknown>;
    const draft = await resolveAdmissionDraft(body);
    const receipt = createAdmissionOrderReceipt();
    const razorpay = getRazorpayClient();

    const order = await razorpay.orders.create({
      amount: draft.amountPaise,
      currency: draft.currency,
      receipt,
      notes: {
        course_id: draft.course.id,
        institute_id: draft.course.instituteId,
        learning_mode: draft.learningMode,
        fee_plan: draft.feePlan,
        fee_label: draft.amountLabel.slice(0, 64),
        student_name: draft.studentName.slice(0, 64),
        phone: draft.phone.slice(-10),
      },
    });

    const admissionToken = buildAdmissionToken(order.id, receipt, draft, studentUserId);
    await insertAdmissionLedgerEntry({
      orderId: order.id,
      receipt,
      token: admissionToken,
      draft,
    });

    return NextResponse.json({
      keyId: getPublicRazorpayKeyId(),
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt,
      admissionToken,
      course: {
        id: draft.course.id,
        title: draft.course.title,
        amountLabel: draft.amountLabel,
        monthlyFeeLabel: draft.monthlyFeeLabel,
        learningMode: draft.learningMode,
        feePlan: draft.feePlan,
      },
      student: {
        name: draft.studentName,
        phone: draft.phone,
        email: draft.email,
      },
    });
  } catch (error) {
    if (error instanceof PublicAdmissionError) {
      const message = error.status >= 500 ? "Payment setup is temporarily unavailable." : error.message;
      return NextResponse.json({ error: message }, { status: error.status });
    }

    return NextResponse.json({ error: "Unable to create the Razorpay admission order." }, { status: 500 });
  }
}
