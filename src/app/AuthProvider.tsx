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
  instituteId: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const normalizeRole = (role?: string | null): AuthRole => {
  if (role === "admin" || role === "student") {
    return role;
  }
  return null;
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
  const [roleResolved, setRoleResolved] = useState(false);
  const [instituteId, setInstituteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const resolveRole = useCallback(
    async (nextUser: User | null) => {
      if (!supabase || !nextUser) {
        setRole(null);
        setInstituteId(null);
        setRoleResolved(true);
        return;
      }

      let profile: { role?: string | null; institute_id?: string | null } | null = null;
      try {
        const { data } = await withTimeout(
          supabase
            .from("profiles")
            .select("role, institute_id")
            .eq("id", nextUser.id)
            .maybeSingle(),
          1500
        );
        profile = data;
      } catch {
        profile = null;
      }

      const nextRole = normalizeRole(
        profile?.role ??
          nextUser.app_metadata?.role ??
          nextUser.user_metadata?.role
      );

      setRole(nextRole);
      setInstituteId(
        profile?.institute_id ??
          (nextUser.app_metadata?.institute_id as string | undefined) ??
          (nextUser.user_metadata?.institute_id as string | undefined) ??
          null
      );
      setRoleResolved(true);
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
      setRoleResolved(false);
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
          setRoleResolved(false);
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
    if (loading || (user && !roleResolved)) {
      return;
    }

    const onLoginPage = pathname === "/login";
    if (onLoginPage && user) {
      if (role === "admin") {
        router.replace("/admin/dashboard");
      } else if (role === "student") {
        router.replace("/student/dashboard");
      }
      return;
    }

    const isProtectedPage = pathname.startsWith("/admin") || pathname.startsWith("/student") || pathname === "/dashboard";
    if (!user && isProtectedPage) {
      const loginType = pathname.startsWith("/admin") ? "admin" : "student";
      router.replace(`/login?type=${loginType}`);
      return;
    }

    if (user && pathname === "/dashboard") {
      if (role === "admin") {
        router.replace("/admin/dashboard");
      } else if (role === "student") {
        router.replace("/student/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [loading, pathname, role, roleResolved, router, user]);

  const shouldBlockScreen = loading && pathname === "/login";

  const logout = useCallback(async () => {
    if (!supabase) {
      setSession(null);
      setUser(null);
      setRole(null);
      setInstituteId(null);
      router.push("/");
      return;
    }

    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
    setInstituteId(null);
    router.push("/");
    router.refresh();
  }, [router, supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      role,
      instituteId,
      loading,
      isAuthenticated: !!user,
      logout,
    }),
    [instituteId, loading, logout, role, session, user]
  );

  if (shouldBlockScreen) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc] text-slate-600">
        <div className="w-64 rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
          <div className="mt-3 h-3 w-40 rounded bg-slate-200 animate-pulse" />
          <div className="mt-2 h-3 w-32 rounded bg-slate-200 animate-pulse" />
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
