import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createSupabaseRouteClient } from "../../../lib/supabase/route";
import { createSupabaseServiceClient } from "../../../lib/supabase/service";

function resolveNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/api/") || value.startsWith("/auth/")) {
    return "/student/dashboard";
  }

  return value;
}

function getStudentName(user: User) {
  const metadataName =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null;

  return metadataName || user.email?.split("@")[0] || "Student";
}

async function ensureStudentProfile(user: User) {
  try {
    const service = createSupabaseServiceClient();
    const [{ data: profile }, { data: userRow }] = await Promise.all([
      service.from("profiles").select("role, institute_id").eq("id", user.id).maybeSingle(),
      service.from("users").select("role").eq("id", user.id).maybeSingle(),
    ]);

    const existingRole =
      profile?.role ??
      userRow?.role ??
      (typeof user.app_metadata?.role === "string" ? user.app_metadata.role : null);

    if (existingRole === "admin") {
      return;
    }

    if (!profile) {
      await service.from("profiles").upsert(
        {
          id: user.id,
          role: "student",
        },
        { onConflict: "id" }
      );
    } else if (!profile.role) {
      await service.from("profiles").update({ role: "student" }).eq("id", user.id);
    }

    if (!userRow) {
      await service.from("users").upsert(
        {
          id: user.id,
          name: getStudentName(user),
          role: "student",
          email: user.email ?? null,
        },
        { onConflict: "id" }
      );
    } else if (!userRow.role) {
      await service.from("users").update({ role: "student" }).eq("id", user.id);
    }
  } catch {
    // The database trigger normally creates this row. If service credentials
    // are unavailable, let the signed-in student continue and resolve in-app.
  }
}

function redirectToLogin(origin: string, nextPath: string, message?: string | null) {
  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("type", "student");
  loginUrl.searchParams.set("error", "oauth");

  if (message) {
    loginUrl.searchParams.set("message", message);
  }

  if (nextPath !== "/student/dashboard") {
    loginUrl.searchParams.set("callbackUrl", nextPath);
  }

  return NextResponse.redirect(loginUrl);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = resolveNextPath(requestUrl.searchParams.get("next"));
  const providerError = requestUrl.searchParams.get("error");
  const providerErrorDescription = requestUrl.searchParams.get("error_description");

  if (providerError) {
    return redirectToLogin(
      requestUrl.origin,
      nextPath,
      providerErrorDescription || "Google sign-in was cancelled or rejected by the provider."
    );
  }

  if (!code) {
    return redirectToLogin(requestUrl.origin, nextPath, "Google did not return an authorization code.");
  }

  try {
    const supabase = await createSupabaseRouteClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return redirectToLogin(requestUrl.origin, nextPath, error.message);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await ensureStudentProfile(user);
    }

    return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
  } catch {
    return redirectToLogin(
      requestUrl.origin,
      nextPath,
      "Google sign-in could not be completed. Please check the Supabase redirect URL setup and try again."
    );
  }
}
