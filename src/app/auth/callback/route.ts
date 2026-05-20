import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "../../../lib/supabase/route";

function resolveNextPath(value: string | null) {
  if (!value || !value.startsWith("/")) {
    return "/student/dashboard";
  }

  return value;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = resolveNextPath(requestUrl.searchParams.get("next"));

  if (code) {
    try {
      const supabase = await createSupabaseRouteClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
      }
    } catch {
      // Fall through to the login screen with an OAuth error marker.
    }
  }

  const loginUrl = new URL("/login", requestUrl.origin);
  loginUrl.searchParams.set("type", "student");
  loginUrl.searchParams.set("error", "oauth");

  if (nextPath !== "/student/dashboard") {
    loginUrl.searchParams.set("callbackUrl", nextPath);
  }

  return NextResponse.redirect(loginUrl);
}