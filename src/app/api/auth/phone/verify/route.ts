import { NextResponse } from "next/server";
import { normalizeMobileForOtp } from "../../../../../lib/auth/phone";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "../../../../../lib/security/rateLimit";
import { createSupabaseRouteClient } from "../../../../../lib/supabase/route";

type PhoneVerifyPayload = {
  phone?: string;
  token?: string;
};

function normalizeRole(role?: string | null) {
  return role === "admin" || role === "student" ? role : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as PhoneVerifyPayload;
    const phone = normalizeMobileForOtp(String(body.phone ?? ""));
    const token = String(body.token ?? "").replace(/\D/g, "");

    if (!phone || token.length < 4) {
      return NextResponse.json({ error: "Enter the OTP sent to your mobile number." }, { status: 400 });
    }

    const ip = getClientIp(request);
    const ipLimit = checkRateLimit(`otp:verify:ip:${ip}`, { limit: 20, windowMs: 15 * 60 * 1000 });
    const phoneLimit = checkRateLimit(`otp:verify:phone:${phone}`, { limit: 8, windowMs: 15 * 60 * 1000 });
    const blockedLimit = !ipLimit.allowed ? ipLimit : !phoneLimit.allowed ? phoneLimit : null;

    if (blockedLimit) {
      return NextResponse.json(
        { error: "Too many OTP attempts. Please wait before trying again." },
        { status: 429, headers: rateLimitHeaders(blockedLimit) }
      );
    }

    const supabase = await createSupabaseRouteClient();
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });

    if (error || !data.user) {
      return NextResponse.json({ error: error?.message ?? "Unable to verify OTP." }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, institute_id")
      .eq("id", data.user.id)
      .maybeSingle();

    const role = normalizeRole(
      profile?.role ??
        (typeof data.user.app_metadata?.role === "string" ? data.user.app_metadata.role : null) ??
        "student"
    );

    if (role === "admin") {
      await supabase.auth.signOut({ scope: "local" });
      return NextResponse.json({ error: "Mobile OTP login is available for students only." }, { status: 403 });
    }

    return NextResponse.json(
      {
        ok: true,
        role: role ?? "student",
        instituteId: profile?.institute_id ?? null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to verify OTP." },
      { status: 500 }
    );
  }
}
