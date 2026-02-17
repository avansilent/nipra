"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const loginType = searchParams.get("type") || "student";
  const isAdminLogin = loginType === "admin";

  const normalizeRole = (role?: string | null): "admin" | "student" =>
    role === "admin" ? "admin" : "student";

  const getRoleRedirect = (role?: string | null) => {
    const normalizedRole = normalizeRole(role);
    if (normalizedRole === "admin") {
      return "/admin/dashboard";
    }
    return "/student/dashboard";
  };

  const resolveUserRole = async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      console.log("[login] Supabase client missing");
      return null;
    }

    console.log("[login] Step 1: reading user with auth.getUser()");
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      console.log("[login] No user returned from auth.getUser()");
      return null;
    }

    console.log("[login] Step 3: fetching profile with maybeSingle()");
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.log("[login] Profile read error", profileError.message);
    }

    if (!profile) {
      console.log("[login] Step 4: profile missing, creating profile row");
      const { error: insertError } = await supabase.from("profiles").insert({
        id: user.id,
        role: "student",
      });

      if (insertError) {
        console.log("[login] Profile auto-create failed", insertError.message);
        return normalizeRole(
          user.app_metadata?.role ??
            user.user_metadata?.role ??
            "student"
        );
      }

      return "student";
    }

    console.log("[login] Profile role found", profile.role);

      return normalizeRole(
      profile?.role ??
      user.app_metadata?.role ??
      user.user_metadata?.role ??
      "student"
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setError("Supabase is not configured yet. Please add env vars.");
        return;
      }

      console.log("[login] Signing in with password");
      const signInPayload = {
        email: email.trim(),
        password,
      };

      const { error: signInError } = await supabase.auth.signInWithPassword(signInPayload);

      if (signInError) {
        console.log("[login] Sign-in failed", signInError.message);
        setError(signInError.message);
        return;
      }

      console.log("[login] Step 2: sign-in success");
      const role = await resolveUserRole();
      console.log("[login] Step 5: redirecting by role", role);
      router.replace(getRoleRedirect(role));
    } catch (err) {
      console.log("[login] Unexpected error", err);
      const message = err instanceof Error ? err.message : "Unable to sign in.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-shell">
      <div className="auth-grid">
        <div className="auth-panel">
          <div className="auth-badge">
            {isAdminLogin ? "Admin access" : "Student access"}
          </div>
          <h1 className="auth-title">
            {isAdminLogin ? "Welcome back to Nipra Admin" : "Welcome back to Nipra"}
          </h1>
          <p className="auth-subtitle">
            {isAdminLogin
              ? "Secure sign-in for content management."
              : "Sign in to open your student dashboard and resources."}
          </p>

          <div className="auth-note">
            <span className="auth-note-label">Security notice</span>
            <p className="auth-note-text">
              Repeated failed attempts may temporarily lock access. Use your
              verified admin email.
            </p>
          </div>

          <div className="auth-links">
            <a href="/" className="auth-link-ghost">
              Back to home
            </a>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-card">
          <div className="auth-card-head">
            <h2>{isAdminLogin ? "Admin login" : "Student login"}</h2>
            <p>
              {isAdminLogin
                ? "Use your verified email and password."
                : "Use your registered email and password."}
            </p>
          </div>

          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              placeholder="admin@yourdomain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Continue"}
          </button>

          <p className="auth-help">
            Need access? Contact support to verify your admin account.
          </p>
        </form>
      </div>
    </section>
  );
}
