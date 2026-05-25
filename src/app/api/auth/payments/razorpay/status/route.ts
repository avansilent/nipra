import { NextResponse } from "next/server";
import { getAdmissionPaymentStatus, PublicAdmissionError } from "../../../../../../lib/admission/payments";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "../../../../../../lib/security/rateLimit";

export async function POST(request: Request) {
  try {
    const ipLimit = checkRateLimit(`razorpay:status:${getClientIp(request)}`, { limit: 60, windowMs: 15 * 60 * 1000 });
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many payment status checks. Please wait before trying again." },
        { status: 429, headers: rateLimitHeaders(ipLimit) }
      );
    }

    const body = (await request.json()) as {
      orderId?: string;
      admissionToken?: string;
    };

    const result = await getAdmissionPaymentStatus(body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PublicAdmissionError) {
      if (error.status === 410) {
        return NextResponse.json({ ready: false, status: "expired" });
      }

      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Unable to restore the Razorpay payment state.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
