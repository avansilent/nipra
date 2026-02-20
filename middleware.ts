import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;

  const normalizeRole = (role?: string | null): "admin" | "student" | null => {
    if (role === "admin" || role === "student") {
      return role;
    }
    return null;
  };

  type SupabaseCookieOptions = {
    domain?: string;
    expires?: Date;
    httpOnly?: boolean;
    maxAge?: number;
    path?: string;
    sameSite?: "lax" | "strict" | "none";
    secure?: boolean;
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: SupabaseCookieOptions) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: SupabaseCookieOptions) {
        response.cookies.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });

  const { data } = await supabase.auth.getSession();
  const session = data.session;

  const isApiRoute = pathname.startsWith("/api/");
  const isAuthApiRoute = pathname.startsWith("/api/auth/");
  const isProtectedApiRoute = isApiRoute && !isAuthApiRoute;

  const isAdminRoute = pathname.startsWith("/admin");
  const isStudentRoute = pathname.startsWith("/student");
  const isAdminApiRoute = pathname.startsWith("/api/admin/");
  const isStudentApiRoute = pathname.startsWith("/api/student/");

  const requiresSession =
    isAdminRoute ||
    isStudentRoute ||
    isProtectedApiRoute;

  if (!session && requiresSession) {
    if (isProtectedApiRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    const loginType = pathname.startsWith("/admin")
      ? "admin"
      : "student";
    loginUrl.searchParams.set("type", loginType);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!session) {
    return response;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, institute_id")
    .eq("id", session.user.id)
    .maybeSingle();

  const role = normalizeRole(
    profile?.role ??
    session.user.app_metadata?.role ??
    session.user.user_metadata?.role ??
    null
  );

  const instituteId =
    profile?.institute_id ??
    session.user.app_metadata?.institute_id ??
    session.user.user_metadata?.institute_id ??
    null;

  if (!instituteId && (isAdminRoute || isStudentRoute || isProtectedApiRoute)) {
    if (isProtectedApiRoute) {
      return NextResponse.json({ error: "Institute not assigned" }, { status: 403 });
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  if (!role && (isAdminRoute || isStudentRoute || isProtectedApiRoute)) {
    if (isProtectedApiRoute) {
      return NextResponse.json({ error: "Role not configured" }, { status: 403 });
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  if ((isAdminRoute || isAdminApiRoute) && role !== "admin") {
    if (isProtectedApiRoute) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = role === "student" ? "/student/dashboard" : "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if ((isStudentRoute || isStudentApiRoute) && role !== "student") {
    if (isProtectedApiRoute) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = role === "admin" ? "/admin/dashboard" : "/login";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/student/:path*", "/api/:path*"],
};
