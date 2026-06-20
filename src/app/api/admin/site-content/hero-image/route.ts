import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminRouteContext, type AdminRouteError } from "../../../../../lib/admin/route";
import { getSafeFileExtension, toSafeFileName } from "../../_shared/upload";

const siteAssetsBucket = "site-assets";
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
    const { serviceClient, instituteId, userId } = await getAdminRouteContext();
    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return jsonError("Choose an image file to upload.");
    }

    const validationError = validateHeroImage(image);
    if (validationError) {
      return jsonError(validationError);
    }

    const { data: bucket } = await serviceClient.storage.getBucket(siteAssetsBucket);
    if (!bucket) {
      const { error: createBucketError } = await serviceClient.storage.createBucket(siteAssetsBucket, {
        public: true,
        fileSizeLimit: maxHeroImageBytes,
        allowedMimeTypes: Array.from(allowedImageTypes.keys()),
      });

      if (createBucketError) {
        return jsonError(createBucketError.message, 500);
      }
    } else if (!bucket.public) {
      const { error: updateBucketError } = await serviceClient.storage.updateBucket(siteAssetsBucket, {
        public: true,
        fileSizeLimit: maxHeroImageBytes,
        allowedMimeTypes: Array.from(allowedImageTypes.keys()),
      });

      if (updateBucketError) {
        return jsonError(updateBucketError.message, 500);
      }
    }

    const safeName = toSafeFileName(image.name.replace(/\.[a-z0-9]{1,10}$/i, "") || "hero-image");
    const extension = normalizeImageExtension(image);
    const storagePath = `${instituteId}/hero/${Date.now()}-${randomUUID()}-${safeName}${extension}`;

    const { error: uploadError } = await serviceClient.storage.from(siteAssetsBucket).upload(storagePath, image, {
      cacheControl: "31536000",
      contentType: image.type || "application/octet-stream",
      upsert: false,
    });

    if (uploadError) {
      return jsonError(uploadError.message, 500);
    }

    const { data: publicUrl } = serviceClient.storage.from(siteAssetsBucket).getPublicUrl(storagePath);

    return NextResponse.json(
      {
        success: true,
        url: publicUrl.publicUrl,
        path: storagePath,
        uploadedBy: userId,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const typedError = error as AdminRouteError;
    return jsonError(typedError.message ?? "Unable to upload hero image", typedError.status ?? 500);
  }
}
