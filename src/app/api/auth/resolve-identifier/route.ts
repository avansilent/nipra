import { NextResponse } from "next/server";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "../../../../lib/security/rateLimit";

type ResolvePayload = {
  identifier?: string;
};

export async function POST(request: Request) {
  try {
    const ipLimit = await checkRateLimitAsync(`resolve-identifier:${getClientIp(request)}`, { limit: 20, windowMs: 15 * 60 * 1000 });
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

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to resolve login credentials." }, { status: 500 });
  }
}
