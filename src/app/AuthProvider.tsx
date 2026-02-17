"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";

type AuthRole = "admin" | "student" | null;

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  role: AuthRole;
  loading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const normalizeRole = (role?: string | null): AuthRole => {
  if (!role) {
    return null;
  }
  return role === "admin" ? "admin" : "student";
};

const withTimeout = async <T,>(
  promise: Promise<T> | PromiseLike<T>,
  ms = 1500,
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AuthRole>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const resolveRole = useCallback(
    async (nextUser: User | null) => {
      if (!supabase || !nextUser) {
        setRole(null);
        return;
      }

      let profile: { role?: string | null } | null = null;
      try {
        const { data } = await withTimeout(
          supabase
            .from("profiles")
            .select("role")
            .eq("id", nextUser.id)
            .maybeSingle(),
          1500
        );
        profile = data;
      } catch {
        profile = null;
      }

      let nextRole = normalizeRole(
        profile?.role ??
          nextUser.app_metadata?.role ??
          nextUser.user_metadata?.role
      );

      if (!nextRole) {
        try {
          const { error: insertError } = await withTimeout(
            supabase.from("profiles").insert({
              id: nextUser.id,
              role: "student",
            }),
            1500
          );

          if (!insertError) {
            nextRole = "student";
          }
        } catch {
          nextRole = "student";
        }
      }

      setRole(nextRole ?? "student");
    },
    [supabase]
  );

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const initialize = async () => {
      setLoading(true);
      try {
        const { data } = await withTimeout(
          supabase.auth.getSession(),
          3000,
          { data: { session: null }, error: null }
        );
        const nextSession = data.session ?? null;
        const nextUser = nextSession?.user ?? null;

        if (!mounted) {
          return;
        }

        setSession(nextSession);
        setUser(nextUser);
        await resolveRole(nextUser);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        try {
          setSession(nextSession);
          const nextUser = nextSession?.user ?? null;
          setUser(nextUser);
          await resolveRole(nextUser);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [resolveRole, supabase]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const onLoginPage = pathname === "/login";
    if (onLoginPage && user) {
      router.replace(role === "admin" ? "/admin/dashboard" : "/student/dashboard");
    }
  }, [loading, pathname, role, router, user]);

  const shouldBlockScreen = loading && pathname === "/login";

  const logout = useCallback(async () => {
    if (!supabase) {
      setSession(null);
      setUser(null);
      setRole(null);
      router.push("/");
      return;
    }

    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
    router.push("/");
    router.refresh();
  }, [router, supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      role,
      loading,
      isAuthenticated: !!user,
      logout,
    }),
    [loading, logout, role, session, user]
  );

  if (shouldBlockScreen) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc] text-slate-600">
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm text-sm">
          Checking session...
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
