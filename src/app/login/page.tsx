"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";
import { useAuth } from "../AuthProvider";

const loginShellClassName =
  "relative overflow-hidden bg-[#f5f5f7] px-4 py-4 sm:px-6 sm:py-6 lg:flex lg:min-h-[calc(100svh-4rem)] lg:items-center lg:px-8";
const loginViewportClassName = "mx-auto w-full max-w-[25.5rem]";
const loginLayoutClassName = "flex justify-center";
const loginCardClassName =
  "mx-auto w-full max-w-[25.5rem] rounded-[2rem] bg-white/98 p-5 shadow-[0_18px_42px_rgba(15,23,42,0.05)] sm:p-6";
const loginSegmentedControlClassName =
  "grid grid-cols-2 gap-1.5 rounded-[1.15rem] bg-[#eef2f6] p-1";
const loginSegmentTabClassName =
  "inline-flex min-h-11 items-center justify-center rounded-[0.9rem] px-4 text-sm font-semibold transition-[background-color,color,box-shadow,transform] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
const loginInputClassName =
  "w-full min-h-11 appearance-none rounded-[1rem] border border-slate-200/80 bg-white px-4 py-3 text-[15px] text-slate-700 shadow-[0_6px_16px_rgba(15,23,42,0.04)] outline-none transition-[box-shadow,border-color] duration-300 placeholder:text-slate-400 focus:border-sky-200 focus:shadow-[0_0_0_4px_rgba(14,165,233,0.06),0_10px_20px_rgba(15,23,42,0.05)]";
const loginPrimaryButtonClassName =
  "inline-flex min-h-11 w-full items-center justify-center rounded-[1rem] bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition-[background-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-[0_16px_28px_rgba(15,23,42,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none";
const loginSecondaryActionClassName =
  "inline-flex min-h-11 w-full items-center justify-center rounded-[1rem] border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 shadow-[0_6px_14px_rgba(15,23,42,0.03)] transition-[background-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_10px_18px_rgba(15,23,42,0.05)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
const loginMessageClassName =
  "rounded-[1rem] bg-rose-50/88 px-4 py-3 text-sm leading-6 text-rose-700 shadow-[0_8px_18px_rgba(254,205,211,0.28)]";

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

  const title = isAdminLogin ? "Admin Login" : "Student Login";
  return (
    <main className={loginShellClassName}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),transparent_70%)]" />

      <section className={loginViewportClassName} aria-label="Nipracademy login">
        <div className={loginLayoutClassName}>
          <div className={loginCardClassName}>
            <div className="space-y-5">
              <div className="space-y-1 text-center">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Nipracademy</p>
                <h1 className="text-[clamp(1.7rem,4vw,2.1rem)] font-semibold tracking-[-0.05em] text-slate-700">
                  {title}
                </h1>
              </div>

              <nav className={loginSegmentedControlClassName} aria-label="Choose portal type">
                <Link
                  href={studentLoginHref}
                  aria-current={!isAdminLogin ? "page" : undefined}
                  className={`${loginSegmentTabClassName} ${
                    !isAdminLogin
                      ? "bg-white text-slate-700 shadow-[0_6px_14px_rgba(15,23,42,0.05)]"
                      : "bg-transparent text-slate-500 hover:bg-white/70 hover:text-slate-600"
                  }`}
                >
                  Student
                </Link>
                <Link
                  href={adminLoginHref}
                  aria-current={isAdminLogin ? "page" : undefined}
                  className={`${loginSegmentTabClassName} ${
                    isAdminLogin
                      ? "bg-white text-slate-700 shadow-[0_6px_14px_rgba(15,23,42,0.05)]"
                      : "bg-transparent text-slate-500 hover:bg-white/70 hover:text-slate-600"
                  }`}
                >
                  Admin
                </Link>
              </nav>

              <form onSubmit={handleSubmit} autoComplete="on" aria-busy={loading} className="space-y-3.5">
                <fieldset disabled={loading} className="m-0 min-w-0 space-y-3.5 border-0 p-0 disabled:opacity-100">
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

                  {error ? (
                    <div role="alert" className={loginMessageClassName}>
                      {error}
                    </div>
                  ) : null}

                  <div className="space-y-2.5">
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

                    <button
                      type="button"
                      onClick={() => setError("Password reset is not configured yet. Please contact the institute.")}
                      className={loginSecondaryActionClassName}
                    >
                      Forgot password?
                    </button>
                  </div>
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
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),transparent_70%)]" />
          <section className={loginViewportClassName} aria-label="Loading Nipracademy login">
            <div className={loginLayoutClassName}>
              <div className={loginCardClassName}>
                <div className="space-y-6 animate-pulse">
                  <div className="flex items-center justify-center gap-3">
                    <div className="h-11 w-11 rounded-[1rem] bg-white shadow-[0_10px_22px_rgba(15,23,42,0.04)]" />
                    <div className="space-y-2">
                      <div className="h-3 w-28 rounded-full bg-slate-200" />
                      <div className="h-3 w-24 rounded-full bg-slate-200" />
                    </div>
                  </div>
                  <div className="space-y-2 text-center">
                    <div className="mx-auto h-8 w-40 rounded-full bg-slate-200" />
                    <div className="mx-auto h-3 w-36 rounded-full bg-slate-200" />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 rounded-[1.15rem] bg-slate-100 p-1">
                    <div className="h-11 rounded-[0.9rem] bg-white" />
                    <div className="h-11 rounded-[0.9rem] bg-slate-200" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-11 rounded-[1rem] bg-slate-100" />
                    <div className="h-11 rounded-[1rem] bg-slate-100" />
                    <div className="h-11 rounded-[1rem] bg-slate-200" />
                    <div className="h-11 rounded-[1rem] bg-slate-100" />
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