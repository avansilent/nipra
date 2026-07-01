"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import {
  rememberedStudentSessionMaxAgeMs,
  rememberedStudentSessionStorageKey,
} from "../lib/auth/sessionPolicy";
import {
  clearSupabaseBrowserAuthStorage,
  createSupabaseBrowserClient,
  getSupabaseBrowserAuthStorageKeys,
} from "../lib/supabase/browser";

type AuthRole = "admin" | "student" | null;

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  role: AuthRole;
  roleResolved: boolean;
  instituteId: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const authSessionReadTimeoutMs = 10_000;
const authSessionRetryDelayMs = 900;
const authSessionMaxRecoveryAttempts = 3;

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

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

function readRememberedStudentSessionActiveAt() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedValue = window.localStorage.getItem(rememberedStudentSessionStorageKey);
    const activeAt = Number(storedValue);
    return Number.isFinite(activeAt) && activeAt > 0 ? activeAt : null;
  } catch {
    return null;
  }
}

function hasRememberedStudentSessionExpired() {
  const activeAt = readRememberedStudentSessionActiveAt();
  return activeAt !== null && Date.now() - activeAt > rememberedStudentSessionMaxAgeMs;
}

function refreshRememberedStudentSessionActivity() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(rememberedStudentSessionStorageKey, String(Date.now()));
  } catch {
    // Browser storage can be unavailable in private modes; Supabase session remains the source of truth.
  }
}

function clearRememberedStudentSessionActivity() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(rememberedStudentSessionStorageKey);
  } catch {
    // Best-effort cleanup only.
  }
}

function hasStoredSupabaseBrowserSession(url?: string | null) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const { storageKey, legacyKeys } = getSupabaseBrowserAuthStorageKeys(url);
    const keys = [storageKey, ...legacyKeys];
    const hasStorageValue = keys.some((key) => window.localStorage.getItem(key) || window.sessionStorage.getItem(key));
    if (hasStorageValue) {
      return true;
    }

    const cookieNames = document.cookie
      .split(";")
      .map((cookie) => cookie.trim().split("=")[0])
      .filter(Boolean);

    return keys.some((key) => cookieNames.some((cookieName) => cookieName === key || cookieName.startsWith(`${key}.`)));
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AuthRole>(null);
  const [roleResolved, setRoleResolved] = useState(() => !hasSupabaseConfig);
  const [instituteId, setInstituteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => hasSupabaseConfig);

  const router = useRouter();
  const pathname = usePathname();

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const pathnameRef = useRef(pathname);
  const sessionRef = useRef<Session | null>(null);
  const userRef = useRef<User | null>(null);
  const roleRef = useRef<AuthRole>(null);
  const roleResolvedRef = useRef(roleResolved);
  const instituteIdRef = useRef<string | null>(null);
  const sessionRecoveryAttemptsRef = useRef(0);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    roleResolvedRef.current = roleResolved;
  }, [roleResolved]);

  useEffect(() => {
    instituteIdRef.current = instituteId;
  }, [instituteId]);

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
    clearRememberedStudentSessionActivity();
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
    async (nextUser: User | null, options?: { preserveCurrent?: boolean }) => {
      if (!supabase || !nextUser) {
        setRole(null);
        setInstituteId(null);
        setRoleResolved(true);
        return;
      }

      const canPreserveCurrent =
        Boolean(options?.preserveCurrent) &&
        userRef.current?.id === nextUser.id &&
        roleResolvedRef.current &&
        Boolean(roleRef.current);

      const metadataRole = normalizeRole(
        nextUser.app_metadata?.role
      );
      const metadataInstituteId =
        (nextUser.app_metadata?.institute_id as string | undefined) ?? null;

      if (metadataRole && metadataInstituteId) {
        setRole(metadataRole);
        setInstituteId(metadataInstituteId);
        setRoleResolved(true);
        return;
      }

      let profile: { role?: string | null; institute_id?: string | null } | null = null;
      let userRow: { role?: string | null } | null = null;

      if (!metadataRole || !metadataInstituteId) {
        try {
          const { data } = await withTimeout(
            supabase
              .from("profiles")
              .select("role, institute_id")
              .eq("id", nextUser.id)
              .maybeSingle(),
            8000
          );
          profile = data;
        } catch {
          profile = null;
        }
      }

      if (!metadataRole && !profile?.role) {
        try {
          const { data } = await withTimeout(
            supabase
              .from("users")
              .select("role")
              .eq("id", nextUser.id)
              .maybeSingle(),
            8000
          );
          userRow = data;
        } catch {
          userRow = null;
        }
      }

      const nextRole = normalizeRole(
        profile?.role ??
          userRow?.role ??
          metadataRole
      );

      const nextInstituteId = profile?.institute_id ?? metadataInstituteId ?? null;

      if (canPreserveCurrent && (!nextRole || !nextInstituteId)) {
        setRole(roleRef.current);
        setInstituteId(instituteIdRef.current);
        setRoleResolved(true);
        return;
      }

      setRole(nextRole);
      setInstituteId(nextInstituteId);
      setRoleResolved(true);
    },
    [supabase]
  );

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

    const initialize = async (options?: { silent?: boolean }) => {
      const silent = Boolean(options?.silent && sessionRef.current);
      let keepLoadingForRetry = false;
      if (!silent) {
        setLoading(true);
        setRoleResolved(false);
      }
      try {
        let sessionData: Session | null = null;
        let sessionReadFailed = false;
        try {
          const { data } = await withTimeout(supabase.auth.getSession(), authSessionReadTimeoutMs);
          sessionData = data.session ?? null;
        } catch {
          sessionReadFailed = true;
          try {
            await delay(authSessionRetryDelayMs);
            const { data } = await withTimeout(supabase.auth.getSession(), authSessionReadTimeoutMs);
            sessionData = data.session ?? null;
            sessionReadFailed = false;
          } catch {
            sessionData = sessionRef.current;
          }
        }

        if (
          !silent &&
          !sessionData &&
          sessionReadFailed &&
          hasStoredSupabaseBrowserSession(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
          sessionRecoveryAttemptsRef.current < authSessionMaxRecoveryAttempts
        ) {
          sessionRecoveryAttemptsRef.current += 1;
          keepLoadingForRetry = true;
          window.setTimeout(() => {
            if (mounted) {
              void initialize();
            }
          }, authSessionRetryDelayMs * sessionRecoveryAttemptsRef.current);
          return;
        }

        if (sessionData) {
          sessionRecoveryAttemptsRef.current = 0;
          if (hasRememberedStudentSessionExpired()) {
            await clearBrokenSession();
            sessionData = null;
          } else {
            refreshRememberedStudentSessionActivity();
          }
        } else {
          clearRememberedStudentSessionActivity();
        }

        const nextUser = sessionData?.user ?? null;

        if (!mounted) {
          return;
        }

        setSession(sessionData);
        setUser(nextUser);
        await resolveRole(nextUser, { preserveCurrent: silent });
      } finally {
        if (mounted && !keepLoadingForRetry) {
          setLoading(false);
        }
      }
    };

    initialize();
    let lastSilentRefreshAt = 0;

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        try {
          const verifiedUser = nextSession?.user ?? null;
          const sameUser = Boolean(verifiedUser?.id && verifiedUser.id === userRef.current?.id);
          if (!sameUser || !roleResolvedRef.current) {
            setRoleResolved(false);
          }

          if (nextSession) {
            if (hasRememberedStudentSessionExpired()) {
              await clearBrokenSession();
              resetLocalAuthState();
              return;
            }
            refreshRememberedStudentSessionActivity();
          } else {
            clearRememberedStudentSessionActivity();
          }

          setSession(nextSession);
          setUser(verifiedUser);
          await resolveRole(verifiedUser, { preserveCurrent: sameUser });
        } finally {
          setLoading(false);
        }
      }
    );

    const refreshVisibleSession = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      const now = Date.now();
      if (now - lastSilentRefreshAt < 5000) {
        return;
      }

      lastSilentRefreshAt = now;
      void initialize({ silent: true });
    };

    window.addEventListener("focus", refreshVisibleSession);
    document.addEventListener("visibilitychange", refreshVisibleSession);

    return () => {
      mounted = false;
      window.removeEventListener("focus", refreshVisibleSession);
      document.removeEventListener("visibilitychange", refreshVisibleSession);
      listener.subscription.unsubscribe();
    };
  }, [clearBrokenSession, resetLocalAuthState, resolveRole, supabase]);

  useEffect(() => {
    if (user) {
      refreshRememberedStudentSessionActivity();
    }
  }, [pathname, user]);

  useEffect(() => {
    if (loading || (user && !roleResolved)) {
      return;
    }

    const onLoginPage = pathname === "/login";
    const currentSearchParams =
      typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
    const forcedStudentPhoneLogin =
      onLoginPage &&
      currentSearchParams.get("type") === "student" &&
      currentSearchParams.get("method") === "phone" &&
      currentSearchParams.get("force") === "1";

    if (forcedStudentPhoneLogin) {
      return;
    }

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
      const params = new URLSearchParams({ callbackUrl: pathname });
      if (!pathname.startsWith("/admin")) {
        params.set("type", "student");
      }
      router.replace(`/login?${params.toString()}`);
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
      return;
    }

    if (user && role === "admin" && pathname.startsWith("/student")) {
      router.replace("/admin/dashboard");
      return;
    }

    if (user && role === "student" && pathname.startsWith("/admin")) {
      router.replace("/student/dashboard");
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
      roleResolved,
      instituteId,
      loading,
      isAuthenticated: !!user,
      logout,
    }),
    [instituteId, loading, logout, role, roleResolved, session, user]
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
