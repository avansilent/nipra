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

  const callbackUrl = searchParams.get("callbackUrl") || "/admin";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
      setLoading(false);
    }
  };

  return (
    <section className="w-full max-w-5xl mx-auto py-10 md:py-16">
      <div className="grid gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-center">
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">
            Log in to your account
          </h1>
          <p className="text-sm md:text-base text-slate-500 max-w-md">
            Use your admin credentials to manage content and updates.
          </p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
            Admin access only
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-white/95 rounded-2xl shadow-md p-6 md:p-7 flex flex-col gap-5 border border-[#e2e8f0]"
        >
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#334155]">Email</label>
            <input
              type="email"
              placeholder="admin@yourdomain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full text-sm"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-[#334155]">Password</label>
            <input
              type="password"
              placeholder="Your secure password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input w-full text-sm"
              required
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            className="btn w-full text-sm disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Log in"}
          </button>

          <p className="text-[11px] text-slate-400 mt-1">
            Admin access is restricted to verified accounts.
          </p>
        </form>
      </div>
    </section>
  );
}
