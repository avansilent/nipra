import { NextResponse } from "next/server";
import { normalizeMobileForOtp } from "../../../../../lib/auth/phone";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "../../../../../lib/security/rateLimit";
import { createSupabaseServerClient } from "../../../../../lib/supabase/server";

type PhoneStartPayload = {
  phone?: string;
};

const phoneOtpUnavailableMessage =
  "Mobile OTP is temporarily unavailable. Please use password login or Continue with Google.";

async function isPhoneOtpEnabled() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return null;
  }

  try {
    const settingsUrl = new URL("/auth/v1/settings", supabaseUrl).toString();
    const response = await fetch(settingsUrl, {
      headers: {
        apikey: anonKey,
      },
      signal: typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
        ? AbortSignal.timeout(4000)
        : undefined,
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const settings = (await response.json()) as { external?: { phone?: boolean } };
    return settings.external?.phone === true;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as PhoneStartPayload;
    const phone = normalizeMobileForOtp(String(body.phone ?? ""));

    if (!phone) {
      return NextResponse.json({ error: "Enter a valid mobile number." }, { status: 400 });
    }

    const phoneOtpEnabled = await isPhoneOtpEnabled();
    if (phoneOtpEnabled === false) {
      return NextResponse.json(
        { error: phoneOtpUnavailableMessage, code: "phone_otp_unavailable" },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    const ip = getClientIp(request);
    const ipLimit = await checkRateLimitAsync(`otp:start:ip:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 });
    const phoneLimit = await checkRateLimitAsync(`otp:start:phone:${phone}`, { limit: 3, windowMs: 10 * 60 * 1000 });
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
      console.warn("Phone OTP send failed", {
        status: error.status,
        code: error.code,
        message: error.message,
      });

      return NextResponse.json(
        { error: phoneOtpUnavailableMessage, code: "phone_otp_unavailable" },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to send OTP right now. Please try again shortly." },
      { status: 500 }
    );
  }
}
