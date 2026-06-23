import { NextResponse } from "next/server";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "../../../../lib/security/rateLimit";
import { createSupabaseRouteClient } from "../../../../lib/supabase/route";
import { createSupabaseServiceClient } from "../../../../lib/supabase/service";

type PasswordLoginPayload = {
  identifier?: string;
  password?: string;
  loginType?: string;
};

function normalizeRole(role?: string | null) {
  return role === "admin" || role === "student" ? role : null;
}

function isEmailIdentifier(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getRequestedRole(value?: string | null) {
  return value === "admin" ? "admin" : "student";
}

async function resolveLoginEmail(identifier: string) {
  if (isEmailIdentifier(identifier)) {
    return identifier;
  }

  const serviceClient = createSupabaseServiceClient();
  const { data, error } = await serviceClient
    .from("users")
    .select("email")
    .eq("login_id", identifier)
    .maybeSingle();

  if (error || !data?.email) {
    return null;
  }

  return String(data.email).trim().toLowerCase();
}

async function resolveSignedInRole(userId: string, metadataRole?: string | null) {
  const serviceClient = createSupabaseServiceClient();
  const [{ data: profile }, { data: userRow }] = await Promise.all([
    serviceClient.from("profiles").select("role").eq("id", userId).maybeSingle(),
    serviceClient.from("users").select("role").eq("id", userId).maybeSingle(),
  ]);

  return normalizeRole(profile?.role ?? userRow?.role ?? metadataRole ?? null);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as PasswordLoginPayload;
    const identifier = String(body.identifier ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const requestedRole = getRequestedRole(body.loginType);

    const ipLimit = await checkRateLimitAsync(`password-login:ip:${getClientIp(request)}`, { limit: 20, windowMs: 15 * 60 * 1000 });
    const identifierLimit = identifier
      ? await checkRateLimitAsync(`password-login:identifier:${identifier}`, { limit: 8, windowMs: 15 * 60 * 1000 })
      : ipLimit;
    const blockedLimit = !ipLimit.allowed ? ipLimit : !identifierLimit.allowed ? identifierLimit : null;

    if (blockedLimit) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait before trying again." },
        { status: 429, headers: rateLimitHeaders(blockedLimit) }
      );
    }

    if (!identifier || !password) {
      return NextResponse.json({ error: "Enter your login ID/email and password." }, { status: 400 });
    }

    const email = await resolveLoginEmail(identifier);
    if (!email) {
      return NextResponse.json({ error: "Invalid login credentials." }, { status: 401 });
    }

    const supabase = await createSupabaseRouteClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      return NextResponse.json({ error: "Invalid login credentials." }, { status: 401 });
    }

    const role = await resolveSignedInRole(
      data.user.id,
      typeof data.user.app_metadata?.role === "string" ? data.user.app_metadata.role : null
    );

    if (role !== requestedRole) {
      await supabase.auth.signOut({ scope: "local" });
      return NextResponse.json({ error: `This account does not have ${requestedRole} access.` }, { status: 403 });
    }

    return NextResponse.json(
      {
        ok: true,
        role,
        redirectTo: role === "admin" ? "/admin/dashboard" : "/student/dashboard",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "Unable to sign in right now." }, { status: 500 });
  }
}
