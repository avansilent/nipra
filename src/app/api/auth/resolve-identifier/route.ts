import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "../../../../lib/supabase/service";

type ResolvePayload = {
  identifier?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ResolvePayload;
    const identifier = String(body.identifier ?? "").trim().toLowerCase();

    if (!identifier) {
      return NextResponse.json({ error: "Identifier is required." }, { status: 400 });
    }

    const serviceClient = createSupabaseServiceClient();

    const { data: userRecord, error } = await serviceClient
      .from("users")
      .select("email, login_id, role")
      .or(`email.eq.${identifier},login_id.eq.${identifier}`)
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