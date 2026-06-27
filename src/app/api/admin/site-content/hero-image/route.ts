import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminRouteContext, type AdminRouteError } from "../../../../../lib/admin/route";
import { createPublicR2Url, deleteR2Object, toR2ObjectReference, uploadR2File } from "../../../../../lib/r2Storage";
import { getSafeFileExtension, toSafeFileName } from "../../_shared/upload";

const maxHeroImageBytes = 5 * 1024 * 1024;
const allowedImageTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/avif", ".avif"],
]);

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

function normalizeImageExtension(file: File) {
  const mimeExtension = allowedImageTypes.get(file.type);
  const fileExtension = getSafeFileExtension(file.name).toLowerCase();
  const allowedExtensions = new Set(allowedImageTypes.values());

  if (mimeExtension) {
    return mimeExtension;
  }

  return allowedExtensions.has(fileExtension) ? fileExtension : "";
}

function validateHeroImage(file: File) {
  const extension = normalizeImageExtension(file);

  if (!extension) {
    return "Upload a JPG, PNG, WebP, or AVIF image.";
  }

  if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
    return "SVG images are not allowed for hero uploads.";
  }

  if (file.size <= 0) {
    return "The selected image is empty.";
  }

  if (file.size > maxHeroImageBytes) {
    return "Hero image must be 5MB or smaller.";
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const { instituteId, userId } = await getAdminRouteContext();
    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return jsonError("Choose an image file to upload.");
    }

    const validationError = validateHeroImage(image);
    if (validationError) {
      return jsonError(validationError);
    }

    const safeName = toSafeFileName(image.name.replace(/\.[a-z0-9]{1,10}$/i, "") || "hero-image");
    const extension = normalizeImageExtension(image);
    const storagePath = `site-assets/${instituteId}/hero/${Date.now()}-${randomUUID()}-${safeName}${extension}`;
    const fileReference = toR2ObjectReference(storagePath);

    await uploadR2File({
      key: storagePath,
      file: image,
      contentType: image.type || "application/octet-stream",
    });

    const publicUrl = createPublicR2Url(fileReference);
    if (!publicUrl) {
      await deleteR2Object(fileReference);
      return jsonError("Set R2_PUBLIC_BASE_URL to use uploaded hero images.", 500);
    }

    return NextResponse.json(
      {
        success: true,
        url: publicUrl,
        path: fileReference,
        uploadedBy: userId,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const typedError = error as AdminRouteError;
    return jsonError(typedError.message ?? "Unable to upload hero image", typedError.status ?? 500);
  }
}
