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
  "whitespace-pre-line rounded-[1rem] bg-rose-50/88 px-4 py-3 text-sm leading-6 text-rose-700 shadow-[0_8px_18px_rgba(254,205,211,0.28)]";

function getSupabaseGoogleCallbackUrl() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return null;
  }

  try {
    return new URL("/auth/v1/callback", supabaseUrl).toString();
  } catch {
    return null;
  }
}

async function isGoogleProviderEnabled() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return null;
  }

  try {
    const settingsUrl = new URL("/auth/v1/settings", supabaseUrl).toString();
    const response = await fetch(settingsUrl, {
      method: "GET",
      headers: {
        apikey: anonKey,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { external?: { google?: boolean } };
    return payload.external?.google === true;
  } catch {
    return null;
  }
}

function extractOAuthErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return extractOAuthErrorMessage(error.message);
  }

  if (typeof error === "string") {
    try {
      const parsed = JSON.parse(error) as { msg?: string; message?: string; error_description?: string };
      if (typeof parsed.msg === "string") {
        return parsed.msg;
      }
      if (typeof parsed.message === "string") {
        return parsed.message;
      }
      if (typeof parsed.error_description === "string") {
        return parsed.error_description;
      }
    } catch {
      // Keep the original string when it is not JSON.
    }

    return error;
  }

  if (typeof error === "object" && error) {
    const maybeMessage =
      "msg" in error
        ? error.msg
        : "message" in error
          ? error.message
          : "error_description" in error
            ? error.error_description
            : null;

    if (typeof maybeMessage === "string") {
      return maybeMessage;
    }
  }

  return "Unable to start Google sign-in.";
}

function formatGoogleOAuthError(error: unknown, appCallbackUrl: string) {
  const message = extractOAuthErrorMessage(error);

  if (/unsupported provider|provider is not enabled/i.test(message)) {
    return getGoogleOAuthSetupMessage(appCallbackUrl);
  }

  return message;
}

function getGoogleOAuthSetupMessage(appCallbackUrl: string) {
  const providerCallbackUrl = getSupabaseGoogleCallbackUrl();

  return [
    "Google login is not enabled in Supabase yet.",
    "Enable it in Supabase Dashboard > Authentication > Providers > Google and add the Google client ID and secret.",
    `Add ${appCallbackUrl} in Supabase Dashboard > Authentication > URL Configuration > Redirect URLs.`,
    providerCallbackUrl
      ? `Add ${providerCallbackUrl} as an Authorized redirect URI in Google Cloud.`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function GoogleLogoMark() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className="h-[1.05rem] w-[1.05rem] shrink-0">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.56 2.68-3.86 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.33-1.58-5.04-3.7H.96v2.34A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.96 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.28-1.72V4.94H.96A9 9 0 0 0 0 9c0 1.46.35 2.84.96 4.06l3-2.34Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.36l2.58-2.58C13.46.9 11.42 0 9 0A9 9 0 0 0 .96 4.94l3 2.34C4.67 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

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
  const [loadingAction, setLoadingAction] = useState<"google" | "password" | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginType = searchParams.get("type") || "student";
  const authError = searchParams.get("error");
  const [error, setError] = useState<string | null>(() =>
    authError === "oauth" ? "Google sign-in could not be completed. Check the Google provider setup in Supabase and try again." : null
  );
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { user, role, loading: authLoading } = useAuth();
  const loading = loadingAction !== null;

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

  const handleGoogleSignIn = async () => {
    if (isAdminLogin) {
      setError("Google sign-in is available for student access only.");
      return;
    }

    if (!supabase) {
      setError("Supabase is not configured yet. Please add env vars.");
      return;
    }

    setLoadingAction("google");
    setError(null);
    const redirectUrl = new URL("/auth/callback", window.location.origin);

    try {
      const googleProviderEnabled = await isGoogleProviderEnabled();
      if (googleProviderEnabled === false) {
        setError(getGoogleOAuthSetupMessage(redirectUrl.toString()));
        setLoadingAction(null);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl.toString(),
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (signInError) {
        throw signInError;
      }
    } catch (oauthError) {
      setError(formatGoogleOAuthError(oauthError, redirectUrl.toString()));
      setLoadingAction(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoadingAction("password");
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
      setLoadingAction(null);
    }
  };

  const title = isAdminLogin ? "Admin Login" : "Student Login";
  return (
    <main className={loginShellClassName}>
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
                    {!isAdminLogin ? (
                      <button
                        type="button"
                        onClick={() => void handleGoogleSignIn()}
                        className={loginPrimaryButtonClassName}
                        disabled={loading}
                      >
                        {loadingAction === "google" ? (
                          <span className="inline-flex items-center gap-2" role="status" aria-live="polite">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden="true" />
                            Opening Google...
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-3">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
                              <GoogleLogoMark />
                            </span>
                            <span>Continue with Google</span>
                          </span>
                        )}
                      </button>
                    ) : (
                      <button type="submit" className={loginPrimaryButtonClassName} disabled={loading}>
                        {loadingAction === "password" ? (
                          <span className="inline-flex items-center gap-2" role="status" aria-live="polite">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden="true" />
                            Signing in...
                          </span>
                        ) : (
                          "Sign in as Admin"
                        )}
                      </button>
                    )}

                    {!isAdminLogin ? (
                      <button type="submit" className={loginSecondaryActionClassName} disabled={loading}>
                        {loadingAction === "password" ? (
                          <span className="inline-flex items-center gap-2" role="status" aria-live="polite">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" aria-hidden="true" />
                            Signing in...
                          </span>
                        ) : (
                          "Login with password"
                        )}
                      </button>
                    ) : null}

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
