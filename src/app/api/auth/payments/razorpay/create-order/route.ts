import { NextResponse } from "next/server";
import {
  buildAdmissionToken,
  createAdmissionOrderReceipt,
  getPublicRazorpayKeyId,
  getRazorpayClient,
  insertAdmissionLedgerEntry,
  PublicAdmissionError,
  resolveAdmissionDraft,
} from "../../../../../../lib/admission/payments";

export async function POST(request: Request) {
  try {
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
        student_name: draft.studentName.slice(0, 64),
        phone: draft.phone.slice(-10),
      },
    });

    const admissionToken = buildAdmissionToken(order.id, receipt, draft);
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
      },
      student: {
        name: draft.studentName,
        phone: draft.phone,
        email: draft.email,
      },
    });
  } catch (error) {
    if (error instanceof PublicAdmissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Unable to create the Razorpay admission order.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
