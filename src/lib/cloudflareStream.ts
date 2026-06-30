import {
  getCloudflareLiveInputUid,
  getCloudflarePlaybackUid,
  getCloudflareStreamUid,
  isCloudflareLiveInputReference,
  isCloudflareStreamReference,
  toCloudflareLiveInputReference,
  toCloudflareStreamReference,
} from "./storageReferences";

type CloudflareApiResponse<T> = {
  success?: boolean;
  result?: T;
  errors?: Array<{ message?: string }>;
};

type DirectUploadResult = {
  uid?: string;
  uploadURL?: string;
};

type StreamTokenResult = {
  token?: string;
};

type CloudflareVideo = {
  uid?: string;
  liveInput?: string | null;
  created?: string;
  modified?: string;
  readyToStream?: boolean;
  status?: {
    state?: string;
  };
  meta?: {
    name?: string;
    [key: string]: unknown;
  };
};

type LiveInputResult = {
  uid?: string;
  rtmps?: {
    url?: string;
    streamKey?: string;
  };
  srt?: {
    url?: string;
    streamId?: string;
    passphrase?: string;
  };
  webRTC?: {
    url?: string;
  };
};

type UploadStreamOptions = {
  file: File;
  title: string;
  courseId?: string;
  instituteId?: string;
};

type CreateLiveInputOptions = {
  title: string;
  sessionId: string;
  courseId: string;
  instituteId: string;
};

function getStreamConfig() {
  const accountId =
    process.env.CLOUDFLARE_STREAM_ACCOUNT_ID ??
    process.env.CLOUDFLARE_ACCOUNT_ID ??
    process.env.CF_ACCOUNT_ID ??
    "";
  const apiToken =
    process.env.CLOUDFLARE_STREAM_API_TOKEN ??
    process.env.CLOUDFLARE_API_TOKEN ??
    process.env.CF_STREAM_API_TOKEN ??
    "";

  if (!accountId || !apiToken) {
    throw new Error("Cloudflare Stream is not configured. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_STREAM_API_TOKEN.");
  }

  return {
    accountId,
    apiToken,
  };
}

function getStreamApiBase(accountId: string) {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`;
}

function getStreamAllowedOrigins() {
  const raw =
    process.env.CLOUDFLARE_STREAM_ALLOWED_ORIGINS ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "";

  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getStreamEmbedBaseUrl() {
  const customSubdomain = process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN?.trim();
  if (!customSubdomain) {
    return "https://iframe.videodelivery.net";
  }

  if (customSubdomain.startsWith("http://") || customSubdomain.startsWith("https://")) {
    return customSubdomain.replace(/\/+$/, "");
  }

  return `https://${customSubdomain.replace(/\/+$/, "")}`;
}

function getStreamTokenExpirySeconds() {
  const parsed = Number(process.env.CLOUDFLARE_STREAM_TOKEN_TTL_SECONDS ?? "");
  if (Number.isFinite(parsed) && parsed >= 300 && parsed <= 86400) {
    return Math.floor(parsed);
  }

  return 60 * 60;
}

async function readCloudflareResponse<T>(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => ({}))) as CloudflareApiResponse<T>;
  if (!response.ok || payload.success === false) {
    const message = payload.errors?.find((error) => error.message)?.message ?? fallback;
    throw new Error(message);
  }

  if (!payload.result) {
    throw new Error(fallback);
  }

  return payload.result;
}

async function createDirectStreamUpload(options: UploadStreamOptions) {
  const { accountId, apiToken } = getStreamConfig();
  const allowedOrigins = getStreamAllowedOrigins();
  const response = await fetch(`${getStreamApiBase(accountId)}/direct_upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      maxSizeBytes: options.file.size,
      requireSignedURLs: true,
      allowedOrigins: allowedOrigins.length > 0 ? allowedOrigins : undefined,
      meta: {
        name: options.title,
        courseId: options.courseId,
        instituteId: options.instituteId,
      },
    }),
  });

  const result = await readCloudflareResponse<DirectUploadResult>(response, "Unable to create Cloudflare Stream upload.");
  if (!result.uid || !result.uploadURL) {
    throw new Error("Cloudflare Stream did not return an upload URL.");
  }

  return {
    uid: result.uid,
    uploadUrl: result.uploadURL,
  };
}

export async function uploadCloudflareStreamFile(options: UploadStreamOptions) {
  const { uid, uploadUrl } = await createDirectStreamUpload(options);
  const uploadForm = new FormData();
  uploadForm.append("file", options.file, options.file.name);

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    body: uploadForm,
  });

  if (!uploadResponse.ok) {
    throw new Error("Unable to upload video to Cloudflare Stream.");
  }

  return toCloudflareStreamReference(uid);
}

export async function createCloudflareLiveInput(options: CreateLiveInputOptions) {
  const { accountId, apiToken } = getStreamConfig();
  const allowedOrigins = getStreamAllowedOrigins();
  const response = await fetch(`${getStreamApiBase(accountId)}/live_inputs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      meta: {
        name: options.title,
        sessionId: options.sessionId,
        courseId: options.courseId,
        instituteId: options.instituteId,
      },
      recording: {
        mode: "automatic",
        requireSignedURLs: true,
        allowedOrigins: allowedOrigins.length > 0 ? allowedOrigins : undefined,
        timeoutSeconds: 0,
        hideLiveViewerCount: true,
      },
    }),
  });

  const result = await readCloudflareResponse<LiveInputResult>(response, "Unable to create Cloudflare Stream live input.");
  if (!result.uid || !result.rtmps?.url || !result.rtmps?.streamKey) {
    throw new Error("Cloudflare Stream did not return RTMPS details.");
  }

  return {
    uid: result.uid,
    reference: toCloudflareLiveInputReference(result.uid),
    rtmpsUrl: result.rtmps.url,
    streamKey: result.rtmps.streamKey,
    srtUrl: result.srt?.url ?? null,
    webRtcUrl: result.webRTC?.url ?? null,
  };
}

export async function getCloudflareLiveInputHostDetails(reference: string) {
  const uid = getCloudflareLiveInputUid(reference);
  if (!uid) {
    return null;
  }

  const { accountId, apiToken } = getStreamConfig();
  const response = await fetch(`${getStreamApiBase(accountId)}/live_inputs/${encodeURIComponent(uid)}`, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });

  const result = await readCloudflareResponse<LiveInputResult>(response, "Unable to load Cloudflare live input.");
  return {
    uid: result.uid ?? uid,
    webRtcUrl: result.webRTC?.url ?? null,
    rtmpsUrl: result.rtmps?.url ?? null,
    streamKey: result.rtmps?.streamKey ?? null,
  };
}

export async function deleteCloudflareLiveInput(reference?: string | null) {
  const uid = getCloudflareLiveInputUid(reference);
  if (!uid) {
    return;
  }

  const { accountId, apiToken } = getStreamConfig();
  const response = await fetch(`${getStreamApiBase(accountId)}/live_inputs/${encodeURIComponent(uid)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error("Unable to delete Cloudflare Stream live input.");
  }
}

export async function findLatestCloudflareLiveRecording(liveInputReference: string, startDate?: string | null) {
  const liveInputUid = getCloudflareLiveInputUid(liveInputReference);
  if (!liveInputUid) {
    return null;
  }

  const { accountId, apiToken } = getStreamConfig();
  const params = new URLSearchParams();
  params.set("asc", "false");
  if (startDate) {
    params.set("start", startDate);
  }

  const response = await fetch(`${getStreamApiBase(accountId)}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });

  const videos = await readCloudflareResponse<CloudflareVideo[]>(response, "Unable to list Cloudflare Stream videos.");
  const recording = videos.find((video) => video.liveInput === liveInputUid && video.uid);
  if (!recording?.uid) {
    return null;
  }

  return {
    uid: recording.uid,
    reference: toCloudflareStreamReference(recording.uid),
    title: recording.meta?.name ?? null,
    createdAt: recording.created ?? null,
    readyToStream: Boolean(recording.readyToStream),
    status: recording.status?.state ?? null,
  };
}

export async function deleteCloudflareStreamVideo(reference?: string | null) {
  const uid = getCloudflareStreamUid(reference);
  if (!uid) {
    return;
  }

  const { accountId, apiToken } = getStreamConfig();
  const response = await fetch(`${getStreamApiBase(accountId)}/${encodeURIComponent(uid)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error("Unable to delete Cloudflare Stream video.");
  }
}

export async function createCloudflareStreamEmbedUrl(reference: string) {
  const uid = getCloudflarePlaybackUid(reference);
  if (!uid || (!isCloudflareStreamReference(reference) && !isCloudflareLiveInputReference(reference))) {
    return null;
  }

  const { accountId, apiToken } = getStreamConfig();
  const expiresIn = getStreamTokenExpirySeconds();
  const response = await fetch(`${getStreamApiBase(accountId)}/${encodeURIComponent(uid)}/token`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + expiresIn,
    }),
  });

  const result = await readCloudflareResponse<StreamTokenResult>(response, "Unable to create secure video token.");
  const playbackId = result.token ?? uid;
  return `${getStreamEmbedBaseUrl()}/${encodeURIComponent(playbackId)}`;
}
