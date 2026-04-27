"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";
import { useAuth } from "../AuthProvider";

const loginShellClassName =
  "relative overflow-hidden bg-[#f5f5f7] px-4 py-8 sm:px-6 sm:py-10 lg:flex lg:min-h-[calc(100svh-4rem)] lg:items-center lg:px-8";
const loginViewportClassName = "mx-auto w-full max-w-6xl";
const loginLayoutClassName = "grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,26rem)] lg:items-center lg:gap-14";
const loginInfoPanelClassName = "order-2 space-y-8 text-center lg:order-1 lg:max-w-2xl lg:text-left";
const loginInfoPillClassName =
  "inline-flex items-center rounded-full bg-white/70 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-slate-500 shadow-[0_12px_26px_rgba(15,23,42,0.04)] backdrop-blur-sm";
const loginInfoFeatureGridClassName = "grid gap-3 sm:grid-cols-3";
const loginInfoFeatureCardClassName =
  "rounded-[1.4rem] bg-white/72 px-5 py-4 text-left shadow-[0_16px_34px_rgba(15,23,42,0.05)] backdrop-blur-sm transition-[transform,box-shadow,background-color] duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[0_22px_44px_rgba(15,23,42,0.08)]";
const loginCardClassName =
  "order-1 mx-auto w-full max-w-[25.5rem] rounded-[2rem] bg-white/84 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-xl transition-[transform,box-shadow,background-color] duration-500 hover:-translate-y-1 hover:bg-white/92 hover:shadow-[0_32px_90px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.9)] sm:p-8 lg:order-2";
const loginBrandMarkClassName =
  "flex h-11 w-11 items-center justify-center rounded-[1.15rem] bg-sky-50/80 text-sm font-semibold text-sky-700 shadow-[0_10px_24px_rgba(14,165,233,0.1)]";
const loginSegmentedControlClassName =
  "grid grid-cols-2 gap-1 rounded-[1.15rem] bg-[#f7f7f8]/92 p-1 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.035)]";
const loginSegmentTabClassName =
  "inline-flex min-h-11 items-center justify-center rounded-[0.95rem] px-4 text-sm font-medium transition-[background-color,color,box-shadow,border-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
const loginInputClassName =
  "w-full rounded-[1.1rem] bg-[#f7f7f8] px-4 py-3.5 text-[15px] text-slate-950 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.035),0_10px_24px_rgba(15,23,42,0.02)] outline-none transition-[box-shadow,background-color,transform] duration-300 placeholder:text-slate-400 hover:bg-white hover:shadow-[inset_0_0_0_1px_rgba(15,23,42,0.05),0_14px_30px_rgba(15,23,42,0.04)] focus:bg-white focus:shadow-[inset_0_0_0_1px_rgba(125,211,252,0.9),0_0_0_4px_rgba(14,165,233,0.08),0_16px_34px_rgba(15,23,42,0.05)]";
const loginCheckboxClassName =
  "h-4 w-4 rounded border-slate-300/90 text-sky-600 focus:ring-2 focus:ring-sky-200 focus:ring-offset-0";
const loginPrimaryButtonClassName =
  "inline-flex min-h-12 w-full items-center justify-center rounded-[1.1rem] bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(2,132,199,0.16)] transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:bg-sky-700 hover:shadow-[0_18px_34px_rgba(2,132,199,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:bg-sky-400 disabled:shadow-none";
const loginSecondaryActionClassName =
  "text-sm font-medium text-sky-700 transition-[color,transform] duration-200 hover:translate-x-0.5 hover:text-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
const loginMessageClassName =
  "rounded-[1.1rem] bg-rose-50/85 px-4 py-3 text-sm leading-6 text-rose-700 shadow-[inset_0_0_0_1px_rgba(251,191,191,0.55)]";

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
                  N
                </div>
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-slate-500">Nipracademy</p>
                  <p className="mt-1 text-sm font-medium text-slate-600">Modern academic platform</p>
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="text-[clamp(2.35rem,5vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.06em] text-slate-950">
                  Clean learning access for students and institutes.
                </h1>
                <p className="max-w-2xl text-[1rem] leading-8 text-slate-600">{websiteDescription}</p>
                <p className="text-sm leading-7 text-slate-500">{websitePortalNote}</p>
              </div>
            </div>

            <div className={loginInfoFeatureGridClassName}>
              {websiteHighlights.map((item) => (
                <div key={item.title} className={loginInfoFeatureCardClassName}>
                  <p className="text-sm font-semibold tracking-[-0.02em] text-slate-950">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={loginCardClassName}>
            <div className="space-y-8">
              <div className="space-y-3 text-center sm:text-left">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-slate-500">Secure Sign-In</p>
                <h2 className="text-[clamp(1.9rem,4vw,2.5rem)] font-semibold tracking-[-0.045em] text-slate-950">
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
                      ? "bg-white text-slate-950 shadow-[0_12px_24px_rgba(15,23,42,0.06)]"
                      : "text-slate-500 hover:bg-white/80 hover:text-slate-950 hover:shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
                  }`}
                >
                  Student
                </Link>
                <Link
                  href={adminLoginHref}
                  aria-current={isAdminLogin ? "page" : undefined}
                  className={`${loginSegmentTabClassName} ${
                    isAdminLogin
                      ? "bg-white text-slate-950 shadow-[0_12px_24px_rgba(15,23,42,0.06)]"
                      : "text-slate-500 hover:bg-white/80 hover:text-slate-950 hover:shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
                  }`}
                >
                  Admin
                </Link>
              </nav>

              <form onSubmit={handleSubmit} autoComplete={rememberMe ? "on" : "off"} aria-busy={loading} className="space-y-5">
                <fieldset disabled={loading} className="space-y-5 disabled:opacity-100">
                  <div className="space-y-2">
                    <label htmlFor="identifier" className="text-sm font-medium text-slate-700">
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
                    <label htmlFor="password" className="text-sm font-medium text-slate-700">
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
                      <input
                        type="checkbox"
                        name="remember"
                        checked={rememberMe}
                        onChange={(event) => setRememberMe(event.target.checked)}
                        className={loginCheckboxClassName}
                      />
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