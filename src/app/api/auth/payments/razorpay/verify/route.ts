import { NextResponse } from "next/server";
import { finalizeVerifiedAdmissionPayment, PublicAdmissionError } from "../../../../../../lib/admission/payments";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "../../../../../../lib/security/rateLimit";

export async function POST(request: Request) {
  try {
    const ipLimit = await checkRateLimitAsync(`razorpay:verify:${getClientIp(request)}`, { limit: 30, windowMs: 15 * 60 * 1000 });
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many payment verification attempts. Please wait before trying again." },
        { status: 429, headers: rateLimitHeaders(ipLimit) }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const result = await finalizeVerifiedAdmissionPayment(body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PublicAdmissionError) {
      const message = error.status >= 500 ? "Payment verification is temporarily unavailable." : error.message;
      return NextResponse.json({ error: message }, { status: error.status });
    }

    return NextResponse.json({ error: "Unable to verify the Razorpay payment." }, { status: 500 });
  }
}
