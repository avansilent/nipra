import { NextResponse } from "next/server";
import { normalizeMobileForOtp } from "../../../../../lib/auth/phone";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "../../../../../lib/security/rateLimit";
import { createSupabaseServerClient } from "../../../../../lib/supabase/server";

type PhoneStartPayload = {
  phone?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as PhoneStartPayload;
    const phone = normalizeMobileForOtp(String(body.phone ?? ""));

    if (!phone) {
      return NextResponse.json({ error: "Enter a valid mobile number." }, { status: 400 });
    }

    const ip = getClientIp(request);
    const ipLimit = checkRateLimit(`otp:start:ip:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 });
    const phoneLimit = checkRateLimit(`otp:start:phone:${phone}`, { limit: 3, windowMs: 10 * 60 * 1000 });
    const blockedLimit = !ipLimit.allowed ? ipLimit : !phoneLimit.allowed ? phoneLimit : null;

    if (blockedLimit) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please wait before trying again." },
        { status: 429, headers: rateLimitHeaders(blockedLimit) }
      );
    }

    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        data: {
          role: "student",
        },
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to send OTP." },
      { status: 500 }
    );
  }
}
