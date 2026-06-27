import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  getObjectKey,
  isR2Reference,
  isR2VideoReference,
  isVideoReference,
  toR2ObjectReference,
  toR2VideoReference,
} from "./storageReferences";

export {
  getObjectKey,
  isR2Reference,
  isR2VideoReference,
  isVideoReference,
  toR2ObjectReference,
  toR2VideoReference,
};

type UploadFileOptions = {
  key: string;
  file: File;
  contentType?: string;
};

type SignedUrlOptions = {
  key: string;
  expiresIn?: number;
  responseContentDisposition?: string;
};

let cachedClient: S3Client | null = null;

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID ?? process.env.CLOUDFLARE_R2_ACCOUNT_ID ?? "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ?? "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ?? "";
  const bucketName = process.env.R2_BUCKET_NAME ?? process.env.CLOUDFLARE_R2_BUCKET_NAME ?? "";
  const endpoint =
    process.env.R2_ENDPOINT ??
    process.env.CLOUDFLARE_R2_ENDPOINT ??
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error("Cloudflare R2 is not configured. Add R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.");
  }

  return {
    endpoint,
    accessKeyId,
    secretAccessKey,
    bucketName,
  };
}

function getR2Client() {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getR2Config();
  cachedClient = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });

  return cachedClient;
}

export async function uploadR2File({ key, file, contentType }: UploadFileOptions) {
  const config = getR2Config();
  const body = Buffer.from(await file.arrayBuffer());

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: body,
      ContentType: contentType || file.type || "application/octet-stream",
    })
  );

  return key;
}

export async function deleteR2Object(reference?: string | null) {
  const key = getObjectKey(reference);
  if (!key) {
    return;
  }

  const config = getR2Config();
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    })
  );
}

export async function deleteR2Objects(references: Array<string | null | undefined>) {
  await Promise.all(references.map((reference) => deleteR2Object(reference)));
}

export async function createR2SignedUrl({ key, expiresIn = 300, responseContentDisposition }: SignedUrlOptions) {
  const config = getR2Config();
  return getSignedUrl(
    getR2Client(),
    new GetObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      ResponseContentDisposition: responseContentDisposition,
    }),
    { expiresIn }
  );
}

export async function createSignedStorageUrl(reference: string, expiresIn = 300, title?: string) {
  const key = getObjectKey(reference);
  if (!key) {
    return null;
  }

  const safeTitle = title?.replace(/[^\w\s.-]/g, "").trim();
  const disposition = safeTitle ? `inline; filename="${safeTitle}"` : undefined;

  try {
    return await createR2SignedUrl({
      key,
      expiresIn,
      responseContentDisposition: disposition,
    });
  } catch {
    return null;
  }
}

export function createPublicR2Url(reference: string) {
  const key = getObjectKey(reference);
  const baseUrl = process.env.R2_PUBLIC_BASE_URL ?? process.env.CLOUDFLARE_R2_PUBLIC_URL ?? "";

  if (!key || !baseUrl) {
    return null;
  }

  const normalizedBase = baseUrl.replace(/\/+$/, "");
  return `${normalizedBase}/${key.split("/").map(encodeURIComponent).join("/")}`;
}
