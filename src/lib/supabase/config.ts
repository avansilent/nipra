export function getSupabaseProjectRef(url?: string | null) {
  try {
    return new URL(url ?? "").hostname.split(".")[0] ?? "nipra";
  } catch {
    return "nipra";
  }
}

export function getSupabaseAuthStorageKey(url?: string | null) {
  const projectRef = getSupabaseProjectRef(url);
  return `sb-${projectRef}-auth-token-nipra-v2`;
}