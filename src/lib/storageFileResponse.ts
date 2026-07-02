import { NextResponse } from "next/server";
import { createSignedStorageUrl, getObjectKey, isR2Reference } from "./r2Storage";
import { createSupabaseServiceClient } from "./supabase/service";

type StorageDisposition = "inline" | "attachment";
type LegacyStorageBucket = "notes" | "materials";
type StorageSource = {
  key: string;
  response: Response;
};

function getFileExtension(key: string) {
  const match = key.split("/").pop()?.match(/(\.[a-z0-9]{1,12})$/i);
  return match?.[1]?.toLowerCase() ?? "";
}

function getContentTypeFromExtension(extension: string) {
  const contentTypes: Record<string, string> = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };

  return contentTypes[extension] ?? "application/octet-stream";
}

function buildSafeFileName(key: string, title?: string | null) {
  const fallbackName = key.split("/").pop()?.replace(/^\d+-/, "") || "file";
  const extension = getFileExtension(key);
  const rawName = title || fallbackName;
  let safeName = rawName.replace(/[^\w\s.-]/g, "").replace(/\s+/g, " ").trim();

  if (!safeName) {
    safeName = fallbackName.replace(/[^\w\s.-]/g, "").replace(/\s+/g, " ").trim() || "file";
  }

  if (extension && !safeName.toLowerCase().endsWith(extension)) {
    safeName += extension;
  }

  return safeName.replace(/"/g, "");
}

function createUnavailableResponse(status = 503) {
  return NextResponse.json(
    { error: "This file is not available right now. Please try again shortly." },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

function isReadableStorageResponse(response: Response) {
  return response.ok || response.status === 206;
}

async function fetchWithOptionalRange(url: string, request: Request) {
  const range = request.headers.get("range");

  return fetch(url, {
    cache: "no-store",
    headers: range ? { Range: range } : undefined,
  });
}

function getSafeExternalKey(url: URL) {
  return decodeURIComponent(url.pathname.split("/").pop() || "file");
}

function getSafeExternalFileUrl(reference: string) {
  let url: URL;

  try {
    url = new URL(reference);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }

  const allowedOrigins = [
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.R2_PUBLIC_BASE_URL,
    process.env.CLOUDFLARE_R2_PUBLIC_URL,
  ]
    .map((value) => {
      try {
        return value ? new URL(value).origin : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return allowedOrigins.includes(url.origin) ? url : null;
}

async function fetchR2Source(
  request: Request,
  reference: string,
  title: string,
  disposition: StorageDisposition
): Promise<StorageSource | null> {
  const key = getObjectKey(reference);

  if (!key) {
    return null;
  }

  const signedUrl = await createSignedStorageUrl(reference, 60, title, disposition);

  if (!signedUrl) {
    return null;
  }

  const response = await fetchWithOptionalRange(signedUrl, request);

  return isReadableStorageResponse(response) ? { key, response } : null;
}

async function fetchLegacySupabaseSource(
  request: Request,
  reference: string,
  bucket: LegacyStorageBucket
): Promise<StorageSource | null> {
  const service = createSupabaseServiceClient();
  const { data, error } = await service.storage.from(bucket).createSignedUrl(reference, 60);

  if (error || !data?.signedUrl) {
    return null;
  }

  const response = await fetchWithOptionalRange(data.signedUrl, request);

  return isReadableStorageResponse(response) ? { key: reference, response } : null;
}

async function fetchExternalSource(request: Request, reference: string): Promise<StorageSource | null> {
  const url = getSafeExternalFileUrl(reference);

  if (!url) {
    return null;
  }

  const response = await fetchWithOptionalRange(url.toString(), request);

  return isReadableStorageResponse(response) ? { key: getSafeExternalKey(url), response } : null;
}

async function resolveStorageSource(
  request: Request,
  reference: string,
  title: string,
  disposition: StorageDisposition,
  legacyBucket?: LegacyStorageBucket
) {
  const externalSource = await fetchExternalSource(request, reference);

  if (externalSource) {
    return externalSource;
  }

  if (isR2Reference(reference)) {
    return fetchR2Source(request, reference, title, disposition);
  }

  if (legacyBucket) {
    const legacySource = await fetchLegacySupabaseSource(request, reference, legacyBucket);

    if (legacySource) {
      return legacySource;
    }
  }

  return fetchR2Source(request, reference, title, disposition);
}

export async function createStorageFileResponse(
  request: Request,
  reference: string,
  title: string,
  disposition: StorageDisposition,
  legacyBucket?: LegacyStorageBucket
) {
  const source = await resolveStorageSource(request, reference, title, disposition, legacyBucket);

  if (!source) {
    return createUnavailableResponse(404);
  }

  const extension = getFileExtension(source.key);
  const upstreamContentType = source.response.headers.get("content-type");
  const safeFileName = buildSafeFileName(source.key, title);
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Disposition": `${disposition}; filename="${safeFileName}"`,
    "Content-Type":
      upstreamContentType && upstreamContentType !== "application/octet-stream"
        ? upstreamContentType
        : getContentTypeFromExtension(extension),
    "X-Content-Type-Options": "nosniff",
  });

  const contentLength = source.response.headers.get("content-length");
  const contentRange = source.response.headers.get("content-range");

  if (contentLength) {
    headers.set("Content-Length", contentLength);
  }

  if (contentRange) {
    headers.set("Content-Range", contentRange);
  }

  return new NextResponse(source.response.body, {
    status: source.response.status === 206 ? 206 : 200,
    headers,
  });
}
