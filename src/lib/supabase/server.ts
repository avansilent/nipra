import { createClient } from "@supabase/supabase-js";

const createTimeoutFetch = () => {
  return (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const timeoutSignal =
      typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
        ? AbortSignal.timeout(8000)
        : undefined;

    return fetch(input, {
      ...init,
      signal: init?.signal ?? timeoutSignal,
    });
  };
};

export function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
    },
    global: {
      fetch: createTimeoutFetch(),
    },
  });
}
