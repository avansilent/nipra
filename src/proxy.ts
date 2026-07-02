import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabaseAuthStorageKey } from "./lib/supabase/config";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;

  const isApiRoute = pathname.startsWith("/api/");
  const isAuthApiRoute = pathname.startsWith("/api/auth/");
  const isPublicResourceDownloadRoute = /^\/api\/(notes|materials)\/[^/]+\/download$/.test(pathname);
  const isPublicResourceFileRoute = /^\/api\/(notes|materials)\/[^/]+\/file$/.test(pathname);
  const isProtectedApiRoute = isApiRoute && !isAuthApiRoute && !isPublicResourceDownloadRoute && !isPublicResourceFileRoute;

  const isAdminRoute = pathname.startsWith("/admin");
  const isStudentRoute = pathname.startsWith("/student");
  const isDashboardRoute = pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  const requiresSession = isAdminRoute || isStudentRoute || isDashboardRoute || isProtectedApiRoute;

  if (!requiresSession || isAuthApiRoute) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const storageKey = getSupabaseAuthStorageKey(supabaseUrl);

  const redirectToLogin = () => {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    if (!pathname.startsWith("/admin")) {
      loginUrl.searchParams.set("type", "student");
    }
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  };

  const hasAuthCookie = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    request.cookies.getAll().some((cookie) => cookie.name === storageKey || cookie.name.startsWith(`${storageKey}.`))
  );

  if (!hasAuthCookie) {
    if (isProtectedApiRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return redirectToLogin();
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/student/:path*", "/dashboard/:path*", "/dashboard", "/api/:path*"],
};
