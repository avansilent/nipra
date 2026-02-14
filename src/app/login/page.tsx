"use client";
import { motion } from "framer-motion";
import { Suspense } from "react";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";

function LoginInner() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  const callbackUrl = searchParams.get("callbackUrl") || "/";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl,
    });

    setLoading(false);

    if (!result || result.error) {
      setError("Invalid email or password");
      return;
    }

    router.push(callbackUrl);
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-5xl mx-auto py-10 md:py-16"
    >
      <div className="grid gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-center">
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">
            Log in to your account
          </h1>
          <p className="text-sm md:text-base text-slate-500 max-w-md">
            Use your admin credentials to manage the homepage categories and
            content.
          </p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
            Admin access only
          </p>
        </div>

        <motion.form
          whileHover={{ translateY: -2 }}
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-white/95 rounded-2xl shadow-md p-6 md:p-7 flex flex-col gap-5 border border-[#e2e8f0]"
        >
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#334155]">Email</label>
            <input
              type="email"
              placeholder="admin@edunext.com"
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

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          <button
            type="submit"
            className="btn w-full text-sm disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Log in"}
          </button>

          <p className="text-[11px] text-slate-400 mt-1">
            Only users with admin access can open the admin panel.
          </p>
        </motion.form>
      </div>
    </motion.section>
  );
}

export default function Login() {
  return (
    <Suspense
      fallback={
        <section className="w-full max-w-5xl mx-auto py-10 md:py-16">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 text-sm text-slate-600">
            Loading login…
          </div>
        </section>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
