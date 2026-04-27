import { NextResponse } from "next/server";
import { getAdmissionPaymentStatus, PublicAdmissionError } from "../../../../../../lib/admission/payments";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      orderId?: string;
      admissionToken?: string;
    };

    const result = await getAdmissionPaymentStatus(body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PublicAdmissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Unable to restore the Razorpay payment state.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}