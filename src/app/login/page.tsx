"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";
import { DEFAULT_LOGO_SRC } from "../../lib/branding";
import { useAuth } from "../AuthProvider";

const loginShellClassName =
  "relative overflow-hidden bg-[#f5f5f7] px-4 py-8 sm:px-6 sm:py-10 lg:flex lg:min-h-[calc(100svh-4rem)] lg:items-center lg:px-8";
const loginViewportClassName = "mx-auto w-full max-w-6xl";
const loginLayoutClassName = "grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(22.75rem,24.5rem)] lg:items-center lg:gap-16";
const loginInfoPanelClassName = "order-2 space-y-8 text-center lg:order-1 lg:max-w-2xl lg:text-left";
const loginInfoPillClassName =
  "inline-flex items-center rounded-full bg-white/74 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-slate-500 backdrop-blur-sm";
const loginInfoFeatureGridClassName = "space-y-4";
const loginInfoFeatureCardClassName =
  "group flex items-start gap-4 py-1 text-left transition-[transform,opacity] duration-300 hover:translate-x-1";
const loginCardClassName =
  "order-1 mx-auto w-full max-w-[24rem] rounded-[3.2rem] bg-white/96 p-6 shadow-[0_14px_38px_rgba(241,245,249,0.96)] transition-[transform,box-shadow] duration-500 hover:-translate-y-0.5 hover:shadow-[0_18px_46px_rgba(241,245,249,0.98)] sm:p-8 lg:order-2";
const loginBrandMarkClassName =
  "flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[1.15rem] bg-white/94 shadow-[0_8px_18px_rgba(226,232,240,0.92)]";
const loginSegmentedControlClassName =
  "grid grid-cols-2 gap-2 rounded-[2.1rem] bg-[#fafbfd] p-1.5";
const loginSegmentTabClassName =
  "inline-flex min-h-12 items-center justify-center rounded-full px-4 text-sm font-medium transition-[background-color,color,box-shadow,transform] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
const loginInputClassName =
  "w-full min-h-12 appearance-none rounded-full border-0 bg-[#fbfcfe] px-4 py-3 text-[15px] text-slate-600 shadow-[0_4px_12px_rgba(241,245,249,0.98)] outline-none transition-[box-shadow,background-color,transform] duration-300 placeholder:text-slate-400 hover:bg-white hover:shadow-[0_8px_18px_rgba(241,245,249,0.98)] focus:bg-white focus:shadow-[0_0_0_4px_rgba(14,165,233,0.06),0_10px_22px_rgba(224,242,254,0.92)]";
const loginCheckboxInputClassName = "peer sr-only";
const loginCheckboxControlClassName =
  "flex h-5 w-5 items-center justify-center rounded-[0.95rem] bg-[#fafbfd] shadow-[0_6px_14px_rgba(241,245,249,0.96)] transition-[background-color,box-shadow,transform] duration-300 peer-checked:bg-sky-500 peer-checked:shadow-[0_10px_20px_rgba(56,189,248,0.2)] peer-focus-visible:ring-2 peer-focus-visible:ring-sky-100 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-white";
const loginPrimaryButtonClassName =
  "inline-flex min-h-12 w-full items-center justify-center rounded-full bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(56,189,248,0.22)] transition-[background-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:bg-sky-600 hover:shadow-[0_14px_28px_rgba(56,189,248,0.26)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:bg-sky-300 disabled:shadow-none";
const loginSecondaryActionClassName =
  "text-sm font-medium text-sky-700 transition-[color,transform] duration-300 hover:translate-x-0.5 hover:text-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
const loginMessageClassName =
  "rounded-[1.7rem] bg-rose-50/88 px-4 py-3 text-sm leading-6 text-rose-700 shadow-[0_8px_18px_rgba(254,205,211,0.4)]";

const normalizeRole = (role?: string | null): "admin" | "student" | null => {
  if (role === "admin" || role === "student") {
    return role;
  }
  return null;
};

const getRoleRedirect = (role?: string | null) => {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "admin") {
    return "/admin/dashboard";
  }
  if (normalizedRole === "student") {
    return "/student/dashboard";
  }
  return null;
};

const withTimeout = async <T,>(
  promise: Promise<T> | PromiseLike<T>,
  ms = 2000,
  fallbackValue?: T
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<T>((resolve, reject) => {
    timeoutId = setTimeout(() => {
      if (fallbackValue !== undefined) {
        resolve(fallbackValue);
        return;
      }
      reject(new Error("Timed out"));
    }, ms);
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

function LoginContent() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { user, role, loading: authLoading } = useAuth();

  const clearBrokenSession = useCallback(async () => {
    if (!supabase) {
      return;
    }

    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Ignore cleanup failures; local auth state is best-effort here.
    }
  }, [supabase]);

  const loginType = searchParams.get("type") || "student";
  const isAdminLogin = loginType === "admin";
  const callbackUrl = searchParams.get("callbackUrl");
  const studentLoginHref = callbackUrl ? `/login?type=student&callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login?type=student";
  const adminLoginHref = callbackUrl ? `/login?type=admin&callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login?type=admin";

  const getPreferredRedirect = useCallback(
    (nextRole?: string | null) => {
      const roleRedirect = getRoleRedirect(nextRole);
      if (roleRedirect) {
        return roleRedirect;
      }

      if (callbackUrl && callbackUrl.startsWith("/")) {
        return callbackUrl;
      }

      return isAdminLogin ? "/admin/dashboard" : "/student/dashboard";
    },
    [callbackUrl, isAdminLogin]
  );

  const forceNavigate = useCallback(
    (target: string) => {
      router.replace(target);
      router.refresh();
    },
    [router]
  );

  const getRuntimeSubdomain = () => {
    if (typeof window === "undefined") {
      return null;
    }

    const hostname = window.location.hostname.toLowerCase();
    if (hostname === "localhost" || hostname.endsWith(".localhost")) {
      return null;
    }

    const parts = hostname.split(".");
    if (parts.length < 3) {
      return null;
    }

    const candidate = parts[0];
    if (candidate === "www") {
      return null;
    }
    return candidate;
  };

  const resolveInstituteId = async (
    supabaseClient: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>,
    currentUser: {
      app_metadata?: Record<string, unknown>;
      user_metadata?: Record<string, unknown>;
    }
  ) => {
    const metadataInstituteId =
      (currentUser.app_metadata?.institute_id as string | undefined) ??
      (currentUser.user_metadata?.institute_id as string | undefined);

    if (metadataInstituteId) {
      return metadataInstituteId;
    }

    const metadataSubdomain =
      (currentUser.app_metadata?.subdomain as string | undefined) ??
      (currentUser.user_metadata?.subdomain as string | undefined) ??
      getRuntimeSubdomain() ??
      undefined;

    if (!metadataSubdomain) {
      return null;
    }

    const { data: institute } = await supabaseClient
      .from("institutes")
      .select("id")
      .eq("subdomain", metadataSubdomain)
      .maybeSingle();

    return institute?.id ?? null;
  };

  const resolveUserRoleForUser = useCallback(async (
    currentUser: {
      id: string;
      app_metadata?: Record<string, unknown>;
      user_metadata?: Record<string, unknown>;
    } | null
  ): Promise<"admin" | "student" | null> => {
    if (!supabase) {
      console.log("[login] Supabase client missing");
      return null;
    }

    if (!currentUser) {
      console.log("[login] No user available for role resolution");
      return null;
    }

    const metadataRole = normalizeRole(
      (currentUser.app_metadata?.role as string | undefined) ??
        (currentUser.user_metadata?.role as string | undefined) ??
        null
    );

    if (metadataRole) {
      console.log("[login] Role resolved from auth metadata", metadataRole);
      return metadataRole;
    }

    console.log("[login] Step 3: fetching profile with maybeSingle()");
    let profile: { role?: string | null } | null = null;
    let profileError: { message?: string } | null = null;

    try {
      const response = await withTimeout(
        supabase
          .from("profiles")
          .select("role, institute_id")
          .eq("id", currentUser.id)
          .maybeSingle(),
        2000
      );
      profile = response.data;
      profileError = response.error;
    } catch {
      profile = null;
      profileError = null;
    }

    if (profileError) {
      console.log("[login] Profile read error", profileError.message);
    }

    if (profile?.role) {
      console.log("[login] Profile role found", profile.role);
      return normalizeRole(profile.role ?? null);
    }

    console.log("[login] Profile missing or empty role, checking users table", currentUser.id);

    try {
      const response = await withTimeout(
        supabase
          .from("users")
          .select("role")
          .eq("id", currentUser.id)
          .maybeSingle(),
        2000
      );

      const userRow = response.data;
      const userRowError = response.error;

      if (userRowError) {
        console.log("[login] Users row read error", userRowError.message);
      }

      if (userRow?.role) {
        console.log("[login] Users table role found", userRow.role);
        return normalizeRole(userRow.role ?? null);
      }
    } catch (usersError) {
      console.log("[login] Users table lookup failed", usersError);
    }

    return metadataRole;
  }, [supabase]);

  const resolveUserRole = useCallback(async (): Promise<"admin" | "student" | null> => {
    if (!supabase) {
      return null;
    }

    console.log("[login] Step 1: reading user with auth.getUser()");
    try {
      const { data: userData } = await withTimeout(supabase.auth.getUser(), 2500);
      return await resolveUserRoleForUser(userData.user ?? null);
    } catch (authError) {
      console.log("[login] auth.getUser failed", authError);
      await clearBrokenSession();
      return null;
    }
  }, [clearBrokenSession, resolveUserRoleForUser, supabase]);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    forceNavigate(getPreferredRedirect(role));
  }, [authLoading, forceNavigate, getPreferredRedirect, role, user]);

  useEffect(() => {
    void resolveUserRole();
  }, [resolveUserRole]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!supabase) {
        setError("Supabase is not configured yet. Please add env vars.");
        return;
      }

      const normalizedIdentifier = identifier.trim().toLowerCase();
      let resolvedEmail = normalizedIdentifier;

      if (!normalizedIdentifier.includes("@")) {
        const resolveResponse = await fetch("/api/auth/resolve-identifier", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: normalizedIdentifier }),
        });

        const resolvePayload = await resolveResponse.json();

        if (!resolveResponse.ok) {
          setError(resolvePayload.error ?? "Unable to resolve login ID.");
          return;
        }

        if (!resolvePayload.email) {
          setError("No account found for this email or login ID.");
          return;
        }

        if (isAdminLogin && resolvePayload.role && resolvePayload.role !== "admin") {
          setError("This account does not have admin access.");
          return;
        }

        if (!isAdminLogin && resolvePayload.role && resolvePayload.role !== "student") {
          setError("This account does not have student access.");
          return;
        }

        resolvedEmail = String(resolvePayload.email).trim().toLowerCase();
      }

      console.log("[login] Signing in with password");
      const signInPayload = {
        email: resolvedEmail,
        password,
      };

      const { data: signInData, error: signInError } = await withTimeout(
        supabase.auth.signInWithPassword(signInPayload),
        8000
      );

      if (signInError) {
        console.log("[login] Sign-in failed", signInError.message);
        setError(signInError.message);
        return;
      }

      console.log("[login] Step 2: sign-in success");
      const resolvedRole = await resolveUserRoleForUser(signInData.user ?? null);
      console.log("[login] Step 5: redirecting by role", resolvedRole);
      forceNavigate(getPreferredRedirect(resolvedRole));
      return;
    } catch (err) {
      console.log("[login] Unexpected error", err);
      const message = err instanceof Error ? err.message : "Unable to sign in.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const title = isAdminLogin ? "Sign in to the admin workspace" : "Sign in to your student workspace";
  const supportingText = isAdminLogin
    ? "Access the Nipracademy operations dashboard with your verified institute credentials."
    : "Continue to classes, study resources, tests, and your student dashboard with your institute credentials.";
  const websiteHighlights = [
    {
      title: "Learning",
      copy: "Courses, notes, tests, and study material stay in one calm workspace.",
    },
    {
      title: "Progress",
      copy: "Students stay aligned with dashboards, updates, and structured learning flow.",
    },
    {
      title: "Operations",
      copy: "Institutes manage admissions, publishing, and academic delivery from one system.",
    },
  ];
  const websiteDescription =
    "Nipracademy is a focused academic platform built for modern institutes, combining learning access, study resources, assessments, and administration in a clean everyday interface.";
  const websitePortalNote = isAdminLogin
    ? "Admin access is reserved for verified institute staff and operational teams."
    : "Student access opens your courses, notes, tests, updates, and daily learning tools.";

  return (
    <main className={loginShellClassName}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.92),transparent_72%)]" />
      <div className="pointer-events-none absolute left-[8%] top-24 h-56 w-56 rounded-full bg-white/70 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 right-[10%] h-64 w-64 rounded-full bg-sky-100/30 blur-3xl" />

      <section className={loginViewportClassName} aria-label="Nipracademy login">
        <div className={loginLayoutClassName}>
          <div className={loginInfoPanelClassName}>
            <div className="space-y-5">
              <div className={loginInfoPillClassName}>About Nipracademy</div>

              <div className="flex items-center justify-center gap-3 text-left lg:justify-start">
                <div className={loginBrandMarkClassName} aria-hidden="true">
                  <Image src={DEFAULT_LOGO_SRC} alt="" width={40} height={40} className="h-10 w-10 object-contain" />
                </div>
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-slate-500">Nipracademy</p>
                  <p className="mt-1 text-sm font-medium text-slate-600">Modern academic platform</p>
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="text-[clamp(2.35rem,5vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.06em] text-slate-600">
                  Clean learning access for students and institutes.
                </h1>
                <p className="max-w-2xl text-[1rem] leading-8 text-slate-600">{websiteDescription}</p>
                <p className="text-sm leading-7 text-slate-500">{websitePortalNote}</p>
              </div>
            </div>

            <div className={loginInfoFeatureGridClassName}>
              {websiteHighlights.map((item) => (
                <div key={item.title} className={loginInfoFeatureCardClassName}>
                  <span className="mt-2 h-2.5 w-2.5 rounded-full bg-sky-400/75" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold tracking-[-0.02em] text-slate-700">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={loginCardClassName}>
            <div className="space-y-8">
              <div className="space-y-3 text-center sm:text-left">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-slate-500">Secure Sign-In</p>
                <h2 className="text-[clamp(1.9rem,4vw,2.5rem)] font-semibold tracking-[-0.045em] text-slate-600">
                  {title}
                </h2>
                <p className="text-sm leading-7 text-slate-600 sm:text-[0.95rem]">{supportingText}</p>
              </div>

              <nav className={loginSegmentedControlClassName} aria-label="Choose portal type">
                <Link
                  href={studentLoginHref}
                  aria-current={!isAdminLogin ? "page" : undefined}
                  className={`${loginSegmentTabClassName} ${
                    !isAdminLogin
                      ? "bg-white text-slate-600 shadow-[0_4px_10px_rgba(241,245,249,0.98)]"
                      : "text-slate-400 hover:bg-white/80 hover:text-slate-600 hover:shadow-[0_3px_8px_rgba(241,245,249,0.94)]"
                  }`}
                >
                  Student
                </Link>
                <Link
                  href={adminLoginHref}
                  aria-current={isAdminLogin ? "page" : undefined}
                  className={`${loginSegmentTabClassName} ${
                    isAdminLogin
                      ? "bg-white text-slate-600 shadow-[0_4px_10px_rgba(241,245,249,0.98)]"
                      : "text-slate-400 hover:bg-white/80 hover:text-slate-600 hover:shadow-[0_3px_8px_rgba(241,245,249,0.94)]"
                  }`}
                >
                  Admin
                </Link>
              </nav>

              <form onSubmit={handleSubmit} autoComplete={rememberMe ? "on" : "off"} aria-busy={loading} className="space-y-5">
                <fieldset disabled={loading} className="m-0 min-w-0 space-y-5 border-0 p-0 disabled:opacity-100">
                  <div className="space-y-2">
                    <label htmlFor="identifier" className="text-sm font-medium text-slate-600">
                      {isAdminLogin ? "Admin email or login ID" : "Student email or login ID"}
                    </label>
                    <input
                      id="identifier"
                      name="identifier"
                      type="text"
                      inputMode="email"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder={isAdminLogin ? "admin@nipracademy.com" : "student@nipracademy.com"}
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      className={loginInputClassName}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium text-slate-600">
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className={loginInputClassName}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="inline-flex items-center gap-3 text-sm text-slate-600">
                      <span className="relative flex h-5 w-5 items-center justify-center">
                        <input
                          type="checkbox"
                          name="remember"
                          checked={rememberMe}
                          onChange={(event) => setRememberMe(event.target.checked)}
                          className={loginCheckboxInputClassName}
                        />
                        <span className={`${loginCheckboxControlClassName} absolute inset-0`} aria-hidden="true" />
                        <svg
                          viewBox="0 0 16 16"
                          className="pointer-events-none absolute h-3.5 w-3.5 text-white opacity-0 transition-opacity duration-200 peer-checked:opacity-100"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path d="M4 8.2 6.6 10.8 12 5.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span>Remember me</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setError("Password reset is not configured yet. Please contact the institute.")}
                      className={`${loginSecondaryActionClassName} self-start sm:self-auto`}
                    >
                      Forgot password?
                    </button>
                  </div>

                  {error ? (
                    <div role="alert" className={loginMessageClassName}>
                      {error}
                    </div>
                  ) : null}

                  <button type="submit" className={loginPrimaryButtonClassName} disabled={loading}>
                    {loading ? (
                      <span className="inline-flex items-center gap-2" role="status" aria-live="polite">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden="true" />
                        Signing in...
                      </span>
                    ) : (
                      `Sign in as ${isAdminLogin ? "Admin" : "Student"}`
                    )}
                  </button>
                </fieldset>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function Login() {
  return (
    <Suspense
      fallback={
        <main className={loginShellClassName}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.92),transparent_72%)]" />
          <section className={loginViewportClassName} aria-label="Loading Nipracademy login">
            <div className={loginLayoutClassName}>
              <div className="order-2 space-y-8 animate-pulse lg:order-1">
                <div className="h-9 w-36 rounded-full bg-white/80 shadow-[0_10px_24px_rgba(15,23,42,0.04)]" />
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-[1.15rem] bg-white shadow-[0_10px_22px_rgba(15,23,42,0.04)]" />
                  <div className="space-y-2">
                    <div className="h-3 w-28 rounded-full bg-slate-200" />
                    <div className="h-3 w-36 rounded-full bg-slate-200" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-14 w-4/5 rounded-3xl bg-slate-200" />
                  <div className="h-4 w-full rounded-full bg-slate-200" />
                  <div className="h-4 w-5/6 rounded-full bg-slate-200" />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="h-28 rounded-[1.4rem] bg-white/80 shadow-[0_12px_28px_rgba(15,23,42,0.04)]" />
                  <div className="h-28 rounded-[1.4rem] bg-white/80 shadow-[0_12px_28px_rgba(15,23,42,0.04)]" />
                  <div className="h-28 rounded-[1.4rem] bg-white/80 shadow-[0_12px_28px_rgba(15,23,42,0.04)]" />
                </div>
              </div>

              <div className={loginCardClassName}>
                <div className="space-y-8 animate-pulse">
                  <div className="space-y-3">
                    <div className="h-3 w-28 rounded-full bg-slate-200" />
                    <div className="h-10 w-3/4 rounded-2xl bg-slate-200" />
                    <div className="h-4 w-full rounded-full bg-slate-200" />
                  </div>
                  <div className="grid grid-cols-2 gap-1 rounded-[1.15rem] bg-slate-100 p-1">
                    <div className="h-11 rounded-[0.95rem] bg-white" />
                    <div className="h-11 rounded-[0.95rem] bg-slate-200" />
                  </div>
                  <div className="space-y-4">
                    <div className="h-14 rounded-[1.1rem] bg-slate-100" />
                    <div className="h-14 rounded-[1.1rem] bg-slate-100" />
                    <div className="flex items-center justify-between gap-4">
                      <div className="h-4 w-28 rounded-full bg-slate-200" />
                      <div className="h-4 w-28 rounded-full bg-slate-200" />
                    </div>
                    <div className="h-12 rounded-[1.1rem] bg-slate-200" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}