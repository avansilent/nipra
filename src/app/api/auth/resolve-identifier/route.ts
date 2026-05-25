import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "../../../../lib/security/rateLimit";
import { createSupabaseServiceClient } from "../../../../lib/supabase/service";

type ResolvePayload = {
  identifier?: string;
};

export async function POST(request: Request) {
  try {
    const ipLimit = checkRateLimit(`resolve-identifier:${getClientIp(request)}`, { limit: 20, windowMs: 15 * 60 * 1000 });
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait before trying again." },
        { status: 429, headers: rateLimitHeaders(ipLimit) }
      );
    }

    const body = (await request.json()) as ResolvePayload;
    const identifier = String(body.identifier ?? "").trim().toLowerCase();

    if (!identifier) {
      return NextResponse.json({ error: "Identifier is required." }, { status: 400 });
    }

    const serviceClient = createSupabaseServiceClient();
    const isEmail = identifier.includes("@");

    const { data: userRecord, error } = isEmail
      ? await serviceClient
          .from("users")
          .select("email, login_id, role")
          .eq("email", identifier)
          .limit(1)
          .maybeSingle()
      : await serviceClient
          .from("users")
          .select("email, login_id, role")
          .eq("login_id", identifier)
          .limit(1)
          .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Unable to resolve login credentials." }, { status: 500 });
    }

    return NextResponse.json({
      email: userRecord?.email ?? null,
      loginId: userRecord?.login_id ?? null,
      role: userRecord?.role ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Unable to resolve login credentials." }, { status: 500 });
  }
}
