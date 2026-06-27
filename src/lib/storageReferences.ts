export const r2ObjectPrefix = "r2:";
export const r2VideoPrefix = "r2-video:";
export const cloudflareStreamPrefix = "cf-stream:";
export const cloudflareLiveInputPrefix = "cf-live:";
export const legacyBunnyStreamPrefix = "bunny-stream:";

export function toR2ObjectReference(key: string) {
  return `${r2ObjectPrefix}${key}`;
}

export function toR2VideoReference(key: string) {
  return `${r2VideoPrefix}${key}`;
}

export function toCloudflareStreamReference(uid: string) {
  return `${cloudflareStreamPrefix}${uid}`;
}

export function toCloudflareLiveInputReference(uid: string) {
  return `${cloudflareLiveInputPrefix}${uid}`;
}

export function isR2Reference(value?: string | null) {
  return Boolean(value?.startsWith(r2ObjectPrefix) || value?.startsWith(r2VideoPrefix));
}

export function isR2VideoReference(value?: string | null) {
  return Boolean(value?.startsWith(r2VideoPrefix));
}

export function isCloudflareStreamReference(value?: string | null) {
  return Boolean(value?.startsWith(cloudflareStreamPrefix));
}

export function isCloudflareLiveInputReference(value?: string | null) {
  return Boolean(value?.startsWith(cloudflareLiveInputPrefix));
}

export function isLegacyBunnyStreamReference(value?: string | null) {
  return Boolean(value?.startsWith(legacyBunnyStreamPrefix));
}

export function isVideoReference(value?: string | null) {
  return isCloudflareStreamReference(value) || isR2VideoReference(value) || isLegacyBunnyStreamReference(value);
}

export function getCloudflareStreamUid(reference?: string | null) {
  if (!reference?.startsWith(cloudflareStreamPrefix)) {
    return null;
  }

  const uid = reference.slice(cloudflareStreamPrefix.length);
  return /^[a-zA-Z0-9_-]{10,128}$/.test(uid) ? uid : null;
}

export function getCloudflareLiveInputUid(reference?: string | null) {
  if (!reference?.startsWith(cloudflareLiveInputPrefix)) {
    return null;
  }

  const uid = reference.slice(cloudflareLiveInputPrefix.length);
  return /^[a-zA-Z0-9_-]{10,128}$/.test(uid) ? uid : null;
}

export function getCloudflarePlaybackUid(reference?: string | null) {
  return getCloudflareStreamUid(reference) ?? getCloudflareLiveInputUid(reference);
}

export function getObjectKey(reference?: string | null) {
  if (!reference) {
    return null;
  }

  if (reference.startsWith(r2VideoPrefix)) {
    return reference.slice(r2VideoPrefix.length);
  }

  if (reference.startsWith(r2ObjectPrefix)) {
    return reference.slice(r2ObjectPrefix.length);
  }

  if (reference.startsWith(cloudflareStreamPrefix)) {
    return null;
  }

  if (reference.startsWith(cloudflareLiveInputPrefix)) {
    return null;
  }

  if (reference.startsWith(legacyBunnyStreamPrefix)) {
    return null;
  }

  return reference;
}
