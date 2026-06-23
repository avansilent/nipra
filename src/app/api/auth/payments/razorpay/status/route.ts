import { NextResponse } from "next/server";
import { getAdmissionPaymentStatus, PublicAdmissionError } from "../../../../../../lib/admission/payments";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "../../../../../../lib/security/rateLimit";

export async function POST(request: Request) {
  try {
    const ipLimit = await checkRateLimitAsync(`razorpay:status:${getClientIp(request)}`, { limit: 60, windowMs: 15 * 60 * 1000 });
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

      const message = error.status >= 500 ? "Payment status is temporarily unavailable." : error.message;
      return NextResponse.json({ error: message }, { status: error.status });
    }

    return NextResponse.json({ error: "Unable to restore the Razorpay payment state." }, { status: 500 });
  }
}
