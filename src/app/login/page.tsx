"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { normalizeMobileForOtp } from "../../lib/auth/phone";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";
import { useAuth } from "../AuthProvider";

const loginShellClassName =
  "login-page-shell relative overflow-hidden bg-[#f5f5f7] px-4 py-4 sm:px-6 sm:py-6 lg:flex lg:min-h-[calc(100svh-4rem)] lg:items-center lg:px-8";
const loginViewportClassName = "mx-auto w-full max-w-[25.5rem]";
const loginLayoutClassName = "flex justify-center";
const loginCardClassName =
  "login-card mx-auto w-full max-w-[25.5rem] rounded-[2rem] bg-white/98 p-5 shadow-[0_18px_42px_rgba(15,23,42,0.05)] sm:p-6";
const loginInputClassName =
  "login-input w-full min-h-11 appearance-none rounded-[1rem] border border-slate-200/80 bg-white px-4 py-3 text-[15px] text-slate-700 shadow-[0_6px_16px_rgba(15,23,42,0.04)] outline-none transition-[box-shadow,border-color] duration-300 placeholder:text-slate-400 focus:border-sky-200 focus:shadow-[0_0_0_4px_rgba(14,165,233,0.06),0_10px_20px_rgba(15,23,42,0.05)]";
const loginPrimaryButtonClassName =
  "inline-flex min-h-11 w-full items-center justify-center rounded-[1rem] bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition-[background-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-[0_16px_28px_rgba(15,23,42,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none";
const loginSecondaryActionClassName =
  "inline-flex min-h-11 w-full items-center justify-center rounded-[1rem] border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 shadow-[0_6px_14px_rgba(15,23,42,0.03)] transition-[background-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_10px_18px_rgba(15,23,42,0.05)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
const loginMessageClassName =
  "whitespace-pre-line rounded-[1rem] bg-rose-50/88 px-4 py-3 text-sm leading-6 text-rose-700 shadow-[0_8px_18px_rgba(254,205,211,0.28)]";

type LoadingAction = "google" | "password" | "phone-send" | "phone-verify" | null;

const defaultGoogleOAuthError =
  "Google sign-in could not be completed. Check the Google provider setup in Supabase and try again.";
const rememberedMobileStorageKey = "nipra-remembered-mobile-v1";
const phoneOtpSendStoragePrefix = "nipra-phone-otp-sent-at:";
const phoneOtpCooldownMs = 60_000;

function formatOAuthCallbackMessage(message: string | null) {
  if (!message) {
    return defaultGoogleOAuthError;
  }

  if (/requested path is invalid|redirect/i.test(message)) {
    return [
      message,
      "Add http://localhost:3000/auth/callback in Supabase Dashboard > Authentication > URL Configuration > Redirect URLs.",
      "In Google Cloud, the Authorized redirect URI must be the Supabase callback URL from the Google provider settings.",
    ].join("\n");
  }

  return message;
}

function maskMobileNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 4) {
    return value;
  }

  return `${value.startsWith("+") ? "+" : ""}${digits.slice(0, Math.max(0, digits.length - 10))}${digits.slice(-10, -7)}***${digits.slice(-4)}`;
}

function readRememberedMobile() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return window.localStorage.getItem(rememberedMobileStorageKey) ?? "";
  } catch {
    return "";
  }
}

function subscribeRememberedMobile(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function rememberVerifiedMobile(phone: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(rememberedMobileStorageKey, phone);
  } catch {
    // Session still works even if browser storage is blocked.
  }
}

function getOtpCooldownRemaining(phone: string) {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    const sentAt = Number(window.localStorage.getItem(`${phoneOtpSendStoragePrefix}${phone}`) ?? 0);
    if (!Number.isFinite(sentAt) || sentAt <= 0) {
      return 0;
    }

    return Math.max(0, phoneOtpCooldownMs - (Date.now() - sentAt));
  } catch {
    return 0;
  }
}

function rememberOtpSend(phone: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(`${phoneOtpSendStoragePrefix}${phone}`, String(Date.now()));
  } catch {
    // Supabase still applies its own OTP rate limits.
  }
}

function formatPhoneOtpError(error: unknown) {
  const message = extractOAuthErrorMessage(error);

  if (/sms|phone|provider|otp/i.test(message)) {
    return `${message}\nMake sure Phone OTP is enabled in Supabase Auth with an SMS provider.`;
  }

  return message;
}

function isSafeAppPath(value: string | null): value is string {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//"));
}

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
  const rememberedMobile = useSyncExternalStore(subscribeRememberedMobile, readRememberedMobile, () => "");
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const callbackRequestsAdmin = isSafeAppPath(callbackUrl) && callbackUrl.startsWith("/admin");
  const loginType = searchParams.get("type") || (callbackRequestsAdmin ? "admin" : "student");
  const requestedLoginMethod = searchParams.get("method") || (callbackRequestsAdmin ? "password" : "phone");
  const authError = searchParams.get("error");
  const authMessage = searchParams.get("message");
  const [error, setError] = useState<string | null>(() =>
    authError === "oauth" ? formatOAuthCallbackMessage(authMessage) : null
  );
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { user, role, roleResolved, loading: authLoading } = useAuth();
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
  const isForcedStudentLogin = !isAdminLogin && searchParams.get("force") === "1";
  const loginMethod = isForcedStudentLogin ? "phone" : requestedLoginMethod;
  const isStudentPasswordLogin = !isAdminLogin && loginMethod === "password";
  const isForcedPhoneLogin = !isAdminLogin && isForcedStudentLogin;
  const mobileInputValue = phoneNumber ?? rememberedMobile;
  const authenticatedPhone = user?.phone ? normalizeMobileForOtp(user.phone) : null;
  const typedPhone = normalizeMobileForOtp(mobileInputValue);
  const activePhoneSession =
    !isAdminLogin && Boolean(user && authenticatedPhone && typedPhone && authenticatedPhone === typedPhone);
  const rememberedPhoneLabel = typedPhone ? maskMobileNumber(typedPhone) : null;
  const buildStudentLoginHref = (method: "phone" | "password", force = false) => {
    const params = new URLSearchParams({ type: "student", method });
    if (callbackUrl) {
      params.set("callbackUrl", callbackUrl);
    }
    if (force) {
      params.set("force", "1");
    }
    return `/login?${params.toString()}`;
  };
  const studentPasswordLoginHref = buildStudentLoginHref("password");
  const studentPhoneLoginHref = buildStudentLoginHref("phone", isForcedStudentLogin);

  const getPreferredRedirect = useCallback(
    (nextRole?: string | null) => {
      if (isSafeAppPath(callbackUrl)) {
        return callbackUrl;
      }

      const roleRedirect = getRoleRedirect(nextRole);
      if (roleRedirect) {
        return roleRedirect;
      }

      return isAdminLogin ? "/admin/dashboard" : "/student/dashboard";
    },
    [callbackUrl, isAdminLogin]
  );

  const forceNavigate = useCallback(
    (target: string) => {
      if (typeof window !== "undefined") {
        window.location.replace(target);
        return;
      }

      router.replace(target);
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
      (currentUser.app_metadata?.institute_id as string | undefined);

    if (metadataInstituteId) {
      return metadataInstituteId;
    }

    const metadataSubdomain =
      (currentUser.app_metadata?.subdomain as string | undefined) ?? getRuntimeSubdomain() ?? undefined;

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
      return null;
    }

    if (!currentUser) {
      return null;
    }

    const metadataRole = normalizeRole(
      (currentUser.app_metadata?.role as string | undefined) ?? null
    );

    if (metadataRole) {
      return metadataRole;
    }

    let profile: { role?: string | null } | null = null;

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
    } catch {
      profile = null;
    }

    if (profile?.role) {
      return normalizeRole(profile.role ?? null);
    }

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

      if (userRow?.role) {
        return normalizeRole(userRow.role ?? null);
      }
    } catch {
      // Role fallback remains metadata-only when the public profile lookup is unavailable.
    }

    return metadataRole;
  }, [supabase]);

  const resolveUserRole = useCallback(async (): Promise<"admin" | "student" | null> => {
    if (!supabase) {
      return null;
    }

    try {
      const { data: userData } = await withTimeout(supabase.auth.getUser(), 2500);
      return await resolveUserRoleForUser(userData.user ?? null);
    } catch {
      await clearBrokenSession();
      return null;
    }
  }, [clearBrokenSession, resolveUserRoleForUser, supabase]);

  useEffect(() => {
    if (authLoading || !user || !roleResolved) {
      return;
    }

    if (isForcedPhoneLogin) {
      if (authenticatedPhone) {
        forceNavigate(getPreferredRedirect(role ?? "student"));
      }
      return;
    }

    forceNavigate(getPreferredRedirect(role));
  }, [authLoading, authenticatedPhone, forceNavigate, getPreferredRedirect, isForcedPhoneLogin, role, roleResolved, user]);

  useEffect(() => {
    void resolveUserRole();
  }, [resolveUserRole]);

  const handlePhoneOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isAdminLogin) {
      setError("Mobile OTP login is available for students only.");
      return;
    }

    if (!supabase) {
      setError("Supabase is not configured yet. Please add env vars.");
      return;
    }

    const normalizedPhone = normalizeMobileForOtp(mobileInputValue);
    if (!normalizedPhone) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    setError(null);

    if (user && authenticatedPhone === normalizedPhone) {
      rememberVerifiedMobile(normalizedPhone);
      forceNavigate(getPreferredRedirect(role ?? "student"));
      return;
    }

    if (!otpSent) {
      const cooldownRemaining = getOtpCooldownRemaining(normalizedPhone);
      if (cooldownRemaining > 0) {
        const seconds = Math.ceil(cooldownRemaining / 1000);
        setError(`OTP was already sent to this number. Please wait ${seconds}s before requesting again.`);
        return;
      }

      setLoadingAction("phone-send");
      try {
        const response = await withTimeout(
          fetch("/api/auth/phone/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: normalizedPhone }),
          }),
          8000
        );
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to send OTP.");
        }

        rememberOtpSend(normalizedPhone);
        setOtpSent(true);
      } catch (otpError) {
        setError(formatPhoneOtpError(otpError));
      } finally {
        setLoadingAction(null);
      }
      return;
    }

    const normalizedOtp = otpCode.replace(/\D/g, "");
    if (normalizedOtp.length < 4) {
      setError("Enter the OTP sent to your mobile number.");
      return;
    }

    setLoadingAction("phone-verify");
    try {
      const response = await withTimeout(
        fetch("/api/auth/phone/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: normalizedPhone, token: normalizedOtp }),
        }),
        8000
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to verify OTP.");
      }

      rememberVerifiedMobile(normalizedPhone);
      forceNavigate(getPreferredRedirect(payload.role ?? "student"));
    } catch (verifyError) {
      setError(formatPhoneOtpError(verifyError));
    } finally {
      setLoadingAction(null);
    }
  };

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

      const signInPayload = {
        email: resolvedEmail,
        password,
      };

      const { data: signInData, error: signInError } = await withTimeout(
        supabase.auth.signInWithPassword(signInPayload),
        8000
      );

      if (signInError) {
        setError(signInError.message);
        return;
      }

      const resolvedRole = await resolveUserRoleForUser(signInData.user ?? null);
      forceNavigate(getPreferredRedirect(resolvedRole));
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign in.";
      setError(message);
    } finally {
      setLoadingAction(null);
    }
  };

  const title = isAdminLogin ? "Secure Login" : "Student Login";
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

              <form
                onSubmit={isAdminLogin || isStudentPasswordLogin ? handleSubmit : handlePhoneOtpSubmit}
                autoComplete="on"
                aria-busy={loading}
                className="space-y-3.5"
              >
                <fieldset disabled={loading} className="m-0 min-w-0 space-y-3.5 border-0 p-0 disabled:opacity-100">
                  {isAdminLogin || isStudentPasswordLogin ? (
                    <>
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
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label htmlFor="phoneNumber" className="text-sm font-medium text-slate-600">
                          Mobile number
                        </label>
                        <input
                          id="phoneNumber"
                          name="phoneNumber"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel"
                          placeholder="10-digit mobile number"
                          value={mobileInputValue}
                          onChange={(event) => {
                            setPhoneNumber(event.target.value);
                            setOtpSent(false);
                            setOtpCode("");
                          }}
                          className={loginInputClassName}
                          required
                        />
                        {!otpSent && rememberedPhoneLabel ? (
                          <p className="text-xs leading-5 text-slate-500">
                            {activePhoneSession
                              ? `Verified on this device: ${rememberedPhoneLabel}`
                              : `Remembered mobile: ${rememberedPhoneLabel}`}
                          </p>
                        ) : null}
                      </div>

                      {otpSent ? (
                        <div className="space-y-2">
                          <label htmlFor="otpCode" className="text-sm font-medium text-slate-600">
                            OTP
                          </label>
                          <input
                            id="otpCode"
                            name="otpCode"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder="Enter OTP"
                            value={otpCode}
                            onChange={(event) => setOtpCode(event.target.value)}
                            className={loginInputClassName}
                            required
                          />
                          <p className="text-xs leading-5 text-slate-500">OTP sent. Check SMS and verify.</p>
                        </div>
                      ) : null}
                    </>
                  )}

                  {error ? (
                    <div role="alert" className={loginMessageClassName}>
                      {error}
                    </div>
                  ) : null}

                  <div className="space-y-2.5">
                    <button type="submit" className={loginPrimaryButtonClassName} disabled={loading}>
                      {isAdminLogin || isStudentPasswordLogin ? (
                        loadingAction === "password" ? (
                          <span className="inline-flex items-center gap-2" role="status" aria-live="polite">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden="true" />
                            Signing in...
                          </span>
                        ) : (
                          isAdminLogin ? "Sign in as Admin" : "Login with password"
                        )
                      ) : loadingAction === "phone-send" || loadingAction === "phone-verify" ? (
                        <span className="inline-flex items-center gap-2" role="status" aria-live="polite">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden="true" />
                          {loadingAction === "phone-send" ? "Sending OTP..." : "Verifying OTP..."}
                        </span>
                      ) : otpSent ? (
                        "Verify OTP"
                      ) : activePhoneSession ? (
                        "Continue"
                      ) : (
                        "Send OTP"
                      )}
                    </button>

                    {!isAdminLogin && !isStudentPasswordLogin && !isForcedPhoneLogin ? (
                      <Link href={studentPasswordLoginHref} className={loginSecondaryActionClassName}>
                        Use password instead
                      </Link>
                    ) : null}

                    {!isAdminLogin && isStudentPasswordLogin ? (
                      <Link href={studentPhoneLoginHref} className={loginSecondaryActionClassName}>
                        Login with mobile OTP
                      </Link>
                    ) : null}

                    {!isAdminLogin && !isForcedPhoneLogin ? (
                      <button
                        type="button"
                        onClick={() => void handleGoogleSignIn()}
                        className={loginSecondaryActionClassName}
                        disabled={loading}
                      >
                        {loadingAction === "google" ? (
                          <span className="inline-flex items-center gap-2" role="status" aria-live="polite">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" aria-hidden="true" />
                            Opening Google...
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-3">
                            <span className="google-logo-shell inline-flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
                              <GoogleLogoMark />
                            </span>
                            <span>Continue with Google</span>
                          </span>
                        )}
                      </button>
                    ) : null}

                    {isAdminLogin || isStudentPasswordLogin ? (
                      <button
                        type="button"
                        onClick={() => setError("Password reset is not configured yet. Please contact the institute.")}
                        className={loginSecondaryActionClassName}
                      >
                        Forgot password?
                      </button>
                    ) : null}
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
