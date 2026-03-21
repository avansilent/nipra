import { createBrowserClient } from "@supabase/ssr";
import { processLock, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAuthStorageKey, getSupabaseProjectRef } from "./config";

let browserClient: SupabaseClient | null | undefined;

function clearLegacyAuthStorage(projectRef: string, storageKey: string) {
  if (typeof window === "undefined") {
    return;
  }

  const legacyKeys = [
    `sb-${projectRef}-auth-token`,
    `sb-${projectRef}-auth-token-code-verifier`,
  ];

  legacyKeys.forEach((key) => {
    if (key !== storageKey) {
      window.localStorage.removeItem(key);
    }
  });
}

export function getSupabaseBrowserAuthStorageKeys(url?: string | null) {
  const projectRef = getSupabaseProjectRef(url);
  const storageKey = getSupabaseAuthStorageKey(url);

  return {
    projectRef,
    storageKey,
    legacyKeys: [
      `sb-${projectRef}-auth-token`,
      `sb-${projectRef}-auth-token-code-verifier`,
    ],
  };
}

export function clearSupabaseBrowserAuthStorage(url?: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  const { storageKey, legacyKeys } = getSupabaseBrowserAuthStorageKeys(url);

  [storageKey, ...legacyKeys].forEach((key) => {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  });
}

export function createSupabaseBrowserClient(): SupabaseClient | null {
  if (browserClient !== undefined) {
    return browserClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    browserClient = null;
    return null;
  }

  const { projectRef, storageKey } = getSupabaseBrowserAuthStorageKeys(url);

  clearLegacyAuthStorage(projectRef, storageKey);

  browserClient = createBrowserClient(url, anonKey, {
    auth: {
      storageKey,
      detectSessionInUrl: false,
      lock: processLock,
      lockAcquireTimeout: 10000,
    },
    cookieOptions: {
      name: storageKey,
    },
  });

  return browserClient;
}
