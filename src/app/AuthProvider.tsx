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
import {
  clearSupabaseBrowserAuthStorage,
  createSupabaseBrowserClient,
} from "../lib/supabase/browser";

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

  const resetLocalAuthState = useCallback(() => {
    setSession(null);
    setUser(null);
    setRole(null);
    setInstituteId(null);
    setRoleResolved(true);
    setLoading(false);
  }, []);

  const clearBrowserSessionArtifacts = useCallback(() => {
    clearSupabaseBrowserAuthStorage(process.env.NEXT_PUBLIC_SUPABASE_URL);
  }, []);

  const attemptSignOut = useCallback(
    async (scope?: "global" | "local") => {
      if (!supabase) {
        return;
      }

      try {
        const signOutPromise = scope
          ? supabase.auth.signOut({ scope })
          : supabase.auth.signOut();

        await Promise.race([
          signOutPromise,
          new Promise((resolve) => {
            setTimeout(resolve, 1500);
          }),
        ]);
      } catch {
        // Ignore transport failures and continue with local cleanup.
      }
    },
    [supabase]
  );

  const clearBrokenSession = useCallback(async () => {
    if (!supabase) {
      clearBrowserSessionArtifacts();
      return;
    }

    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Ignore cleanup failures; the goal is to stop repeated refresh attempts.
    } finally {
      clearBrowserSessionArtifacts();
    }
  }, [clearBrowserSessionArtifacts, supabase]);

  const resolveRole = useCallback(
    async (nextUser: User | null) => {
      if (!supabase || !nextUser) {
        setRole(null);
        setInstituteId(null);
        setRoleResolved(true);
        return;
      }

      let profile: { role?: string | null; institute_id?: string | null } | null = null;
      let userRow: { role?: string | null } | null = null;
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

      if (!profile?.role) {
        try {
          const { data } = await withTimeout(
            supabase
              .from("users")
              .select("role")
              .eq("id", nextUser.id)
              .maybeSingle(),
            1500
          );
          userRow = data;
        } catch {
          userRow = null;
        }
      }

      const nextRole = normalizeRole(
        profile?.role ??
          userRow?.role ??
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
        let sessionData: Session | null = null;
        try {
          const { data } = await withTimeout(supabase.auth.getSession(), 3000);
          sessionData = data.session ?? null;
        } catch {
          await clearBrokenSession();
          sessionData = null;
        }

        const nextUser = sessionData?.user ?? null;

        if (!mounted) {
          return;
        }

        setSession(sessionData);
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
          const verifiedUser = nextSession?.user ?? null;
          setUser(verifiedUser);
          await resolveRole(verifiedUser);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [clearBrokenSession, resolveRole, supabase]);

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

  const logout = useCallback(async () => {
    if (!supabase) {
      resetLocalAuthState();
      clearBrowserSessionArtifacts();
      router.replace("/");
      router.refresh();
      return;
    }

    resetLocalAuthState();
    clearBrowserSessionArtifacts();

    try {
      await attemptSignOut();
      await attemptSignOut("local");
    } catch {
      await clearBrokenSession();
    } finally {
      resetLocalAuthState();
      clearBrowserSessionArtifacts();
      router.replace("/");
      router.refresh();
    }
  }, [attemptSignOut, clearBrokenSession, clearBrowserSessionArtifacts, resetLocalAuthState, router, supabase]);

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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
