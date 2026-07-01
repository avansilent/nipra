import { NextResponse } from "next/server";
import { createSignedStorageUrl, getObjectKey } from "./r2Storage";

type StorageDisposition = "inline" | "attachment";

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

export async function createStorageFileResponse(
  request: Request,
  reference: string,
  title: string,
  disposition: StorageDisposition
) {
  const key = getObjectKey(reference);

  if (!key) {
    return createUnavailableResponse(404);
  }

  const signedUrl = await createSignedStorageUrl(reference, 60, title, disposition);

  if (!signedUrl) {
    return createUnavailableResponse();
  }

  const range = request.headers.get("range");
  const upstream = await fetch(signedUrl, {
    cache: "no-store",
    headers: range ? { Range: range } : undefined,
  });

  if (!upstream.ok && upstream.status !== 206) {
    return createUnavailableResponse(upstream.status === 404 ? 404 : 502);
  }

  const extension = getFileExtension(key);
  const upstreamContentType = upstream.headers.get("content-type");
  const safeFileName = buildSafeFileName(key, title);
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

  const contentLength = upstream.headers.get("content-length");
  const contentRange = upstream.headers.get("content-range");

  if (contentLength) {
    headers.set("Content-Length", contentLength);
  }

  if (contentRange) {
    headers.set("Content-Range", contentRange);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status === 206 ? 206 : 200,
    headers,
  });
}
