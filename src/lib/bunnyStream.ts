import { createHash } from "crypto";
import { bunnyStreamPrefix, isBunnyStreamReference } from "./bunnyStreamReference";

export { isBunnyStreamReference };

export type BunnyStreamReference = {
  libraryId: string;
  videoId: string;
};

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function createBunnyStreamReference(reference: BunnyStreamReference) {
  return `${bunnyStreamPrefix}${encodeBase64Url(JSON.stringify(reference))}`;
}

export function parseBunnyStreamReference(value?: string | null): BunnyStreamReference | null {
  if (!isBunnyStreamReference(value)) {
    return null;
  }

  const referenceValue = value ?? "";

  try {
    const decoded = JSON.parse(decodeBase64Url(referenceValue.slice(bunnyStreamPrefix.length))) as Partial<BunnyStreamReference>;
    if (!decoded.libraryId || !decoded.videoId) {
      return null;
    }

    return {
      libraryId: String(decoded.libraryId),
      videoId: String(decoded.videoId),
    };
  } catch {
    return null;
  }
}

export function getDefaultBunnyStreamLibraryId() {
  return process.env.BUNNY_STREAM_LIBRARY_ID ?? process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID ?? "";
}

export function getBunnyStreamApiKey() {
  return process.env.BUNNY_STREAM_API_KEY ?? "";
}

export function getBunnyStreamEmbedTokenKey() {
  return process.env.BUNNY_STREAM_EMBED_TOKEN_KEY ?? process.env.BUNNY_STREAM_API_KEY ?? "";
}

export function isValidBunnyLibraryId(value: string) {
  return /^\d{2,18}$/.test(value.trim());
}

export function isValidBunnyVideoId(value: string) {
  return /^[a-zA-Z0-9-]{8,80}$/.test(value.trim());
}

export function buildBunnyStreamEmbedUrl(reference: BunnyStreamReference) {
  const baseUrl = new URL(`https://iframe.mediadelivery.net/embed/${reference.libraryId}/${reference.videoId}`);
  baseUrl.searchParams.set("autoplay", "false");
  baseUrl.searchParams.set("preload", "false");
  baseUrl.searchParams.set("responsive", "true");

  const tokenKey = getBunnyStreamEmbedTokenKey();
  if (tokenKey) {
    const expires = Math.floor(Date.now() / 1000) + 10 * 60;
    const token = createHash("sha256").update(`${tokenKey}${reference.videoId}${expires}`).digest("hex");
    baseUrl.searchParams.set("token", token);
    baseUrl.searchParams.set("expires", String(expires));
  }

  return baseUrl.toString();
}
