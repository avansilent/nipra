import { NextResponse } from "next/server";
import { finalizeVerifiedAdmissionPayment, PublicAdmissionError } from "../../../../../../lib/admission/payments";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = await finalizeVerifiedAdmissionPayment(body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PublicAdmissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Unable to verify the Razorpay payment.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
