import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAuthStorageKey, getSupabaseProjectRef } from "./config";

let browserClient: SupabaseClient | null | undefined;
const browserLockTails = new Map<string, Promise<void>>();

async function withBrowserLock<T>(
  name: string,
  acquireTimeout: number,
  fn: () => Promise<T>
): Promise<T> {
  const previousTail = browserLockTails.get(name) ?? Promise.resolve();
  let releaseLock: () => void = () => undefined;

  const currentTail = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  browserLockTails.set(
    name,
    previousTail.catch(() => undefined).then(() => currentTail)
  );

  if (acquireTimeout > 0) {
    await Promise.race([
      previousTail.catch(() => undefined),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Timed out waiting for browser auth lock: ${name}`));
        }, acquireTimeout);
      }),
    ]);
  } else {
    await previousTail.catch(() => undefined);
  }

  try {
    return await fn();
  } finally {
    releaseLock();
    if (browserLockTails.get(name) === currentTail) {
      browserLockTails.delete(name);
    }
  }
}

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
      lock: withBrowserLock,
      lockAcquireTimeout: 10000,
    },
    cookieOptions: {
      name: storageKey,
    },
  });

  return browserClient;
}
