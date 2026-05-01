export const DEFAULT_LOGO_SRC = "/logo%203.jpeg";

const LEGACY_LOGO_SOURCES = new Set([
  "/logo.png",
  "/logo.svg",
  "/logo2.png",
  "/logo 3.jpeg",
  "logo 3.jpeg",
  DEFAULT_LOGO_SRC,
]);

export function resolveLogoSrc(logoUrl?: string | null) {
  const candidate = logoUrl?.trim();

  if (!candidate || LEGACY_LOGO_SOURCES.has(candidate)) {
    return DEFAULT_LOGO_SRC;
  }

  return candidate;
}
