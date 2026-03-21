"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";
import { useAuth } from "../AuthProvider";
import { buttonHover, createStaggerContainer, hoverLift, itemReveal, sectionReveal, tapPress, viewportOnce } from "../../lib/motion";

const authItems = createStaggerContainer(0.1, 0.04);

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

  const clearBrokenSession = async () => {
    if (!supabase) {
      return;
    }

    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Ignore cleanup failures; local auth state is best-effort here.
    }
  };

  const loginType = searchParams.get("type") || "student";
  const isAdminLogin = loginType === "admin";
  const callbackUrl = searchParams.get("callbackUrl");

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

  const getPreferredRedirect = (role?: string | null) => {
    const roleRedirect = getRoleRedirect(role);
    if (roleRedirect) {
      return roleRedirect;
    }

    if (callbackUrl && callbackUrl.startsWith("/")) {
      return callbackUrl;
    }

    return isAdminLogin ? "/admin/dashboard" : "/student/dashboard";
  };

  const forceNavigate = (target: string) => {
    router.replace(target);
    router.refresh();
  };

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
    supabase: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>,
    user: {
      app_metadata?: Record<string, unknown>;
      user_metadata?: Record<string, unknown>;
    }
  ) => {
    const metadataInstituteId =
      (user.app_metadata?.institute_id as string | undefined) ??
      (user.user_metadata?.institute_id as string | undefined);

    if (metadataInstituteId) {
      return metadataInstituteId;
    }

    const metadataSubdomain =
      (user.app_metadata?.subdomain as string | undefined) ??
      (user.user_metadata?.subdomain as string | undefined) ??
      getRuntimeSubdomain() ??
      undefined;

    if (!metadataSubdomain) {
      return null;
    }

    const { data: institute } = await supabase
      .from("institutes")
      .select("id")
      .eq("subdomain", metadataSubdomain)
      .maybeSingle();

    return institute?.id ?? null;
  };

  const resolveUserRoleForUser = async (
    user: {
      id: string;
      app_metadata?: Record<string, unknown>;
      user_metadata?: Record<string, unknown>;
    } | null
  ): Promise<"admin" | "student" | null> => {
    if (!supabase) {
      console.log("[login] Supabase client missing");
      return null;
    }

    if (!user) {
      console.log("[login] No user available for role resolution");
      return null;
    }

    console.log("[login] Step 3: fetching profile with maybeSingle()");
    let profile: { role?: string | null } | null = null;
    let profileError: { message?: string } | null = null;

    try {
      const response = await withTimeout(
        supabase
          .from("profiles")
          .select("role, institute_id")
          .eq("id", user.id)
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

    console.log("[login] Profile missing or empty role, checking users table", user.id);

    try {
      const response = await withTimeout(
        supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
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

    return normalizeRole(
      (user.app_metadata?.role as string | undefined) ??
      (user.user_metadata?.role as string | undefined) ??
      null
    );
  };

  const resolveUserRole = async (): Promise<"admin" | "student" | null> => {
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
  };

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    forceNavigate(getPreferredRedirect(role));
  }, [authLoading, role, user]);

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

  return (
    <section className="mobile-login-shell relative overflow-hidden bg-gray-50 px-6 py-24">
      <div className="pointer-events-none absolute left-0 top-16 h-72 w-72 rounded-full bg-slate-200/55 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-stone-200/45 blur-3xl" />
      <div className="mobile-login-frame mx-auto max-w-6xl">
      <div className="mobile-login-grid auth-grid">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={sectionReveal}
          whileHover={hoverLift}
          className="mobile-login-panel auth-panel"
        >
          <motion.div variants={authItems} initial="hidden" whileInView="show" viewport={viewportOnce} className="space-y-6">
          <div className="auth-badge">
            {isAdminLogin ? "Admin access" : "Student access"}
          </div>
          <motion.h1 variants={itemReveal} className="auth-title">
            {isAdminLogin ? "Welcome back to Nipra Admin" : "Welcome back to Nipra"}
          </motion.h1>
          <motion.p variants={itemReveal} className="auth-subtitle">
            {isAdminLogin
              ? "Secure sign-in for content management."
              : "Sign in to open your student dashboard and resources."}
          </motion.p>

          <motion.div variants={itemReveal} className="auth-note">
            <span className="auth-note-label">Security notice</span>
            <p className="auth-note-text">
              Repeated failed attempts may temporarily lock access. Use your
              verified admin email.
            </p>
          </motion.div>

          <motion.div variants={itemReveal} className="mobile-login-feature-grid grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] bg-white/75 p-4 shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Fast access</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Clean login flow with dashboard redirect</p>
            </div>
            <div className="rounded-[22px] bg-white/75 p-4 shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Protected</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Built for student and admin workspace access</p>
            </div>
          </motion.div>

          <motion.div variants={itemReveal} className="auth-links">
            <motion.a whileHover={buttonHover} whileTap={tapPress} href="/" className="auth-link-ghost">
              Back to home
            </motion.a>
          </motion.div>
          </motion.div>
        </motion.div>

        <motion.form
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={sectionReveal}
          whileHover={hoverLift}
          onSubmit={handleSubmit}
          className="mobile-login-card auth-card"
        >
          <div className="auth-card-head">
            <h2>{isAdminLogin ? "Admin login" : "Student login"}</h2>
            <p>
              {isAdminLogin
                ? "Use your verified email and password."
                : "Use your registered email and password."}
            </p>
          </div>

          <label className="auth-field">
            <span>{isAdminLogin ? "Admin email or login ID" : "Student email or login ID"}</span>
            <input
              type="text"
              placeholder={isAdminLogin ? "admin@yourdomain.com or admin ID" : "student email or login ID"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="auth-input"
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              placeholder="Your secure password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              required
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <motion.button
            whileHover={buttonHover}
            whileTap={tapPress}
            type="submit"
            className="mobile-login-submit auth-submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Continue"}
          </motion.button>

          <p className="auth-help">
            Need access? Contact support to verify your admin account.
          </p>
        </motion.form>
      </div>
      </div>
    </section>
  );
}

export default function Login() {
  return (
    <Suspense
      fallback={
        <section className="mobile-login-shell relative overflow-hidden bg-gray-50 px-6 py-24">
          <div className="mobile-login-frame mx-auto max-w-6xl">
            <div className="mobile-login-grid grid gap-6 lg:grid-cols-2">
              <div className="mobile-login-panel rounded-[28px] bg-white/85 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)] ring-1 ring-white/80">
                <div className="h-5 w-32 animate-pulse rounded-full bg-slate-200" />
                <div className="mt-4 h-12 w-3/4 animate-pulse rounded-2xl bg-slate-200" />
                <div className="mt-3 h-24 animate-pulse rounded-3xl bg-slate-100" />
              </div>
              <div className="mobile-login-card rounded-[28px] bg-white/85 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)] ring-1 ring-white/80">
                <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />
                <div className="mt-4 h-10 animate-pulse rounded-2xl bg-slate-100" />
                <div className="mt-6 h-12 animate-pulse rounded-2xl bg-slate-200" />
              </div>
            </div>
          </div>
        </section>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
