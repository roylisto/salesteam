import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const endpoint = process.env.S3_ENDPOINT;
const region = process.env.S3_REGION;
const bucket = process.env.S3_BUCKET;
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) {
  throw new Error(
    "S3 environment is not configured. Set S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY in .env.",
  );
}

/**
 * Shared S3 client for the Cloudeka-compatible object storage.
 * Uses path-style addressing, which most S3-compatible providers require.
 */
export const s3Client = new S3Client({
  endpoint,
  region,
  forcePathStyle: true,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export const s3Bucket = bucket;

export function buildObjectKey(prefix: string, filename: string): string {
  const safePrefix = prefix.replace(/^\/+|\/+$/g, "");
  const safeName = filename.replace(/^\/+/, "");
  return `${safePrefix}/${Date.now()}-${safeName}`;
}

export async function uploadToS3(
  key: string,
  body: Buffer | Uint8Array | Blob | string,
  contentType: string,
): Promise<string> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: s3Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return key;
}

export async function deleteFromS3(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: s3Bucket,
      Key: key,
    }),
  );
}

/** Short-lived signed URL so private objects can be previewed in the UI. */
export async function getSignedFileUrl(
  key: string,
  expiresInSeconds = 3600,
): Promise<string> {
  return getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: s3Bucket, Key: key }),
    { expiresIn: expiresInSeconds },
  );
}

const s3Endpoint = endpoint as string;

/** Public-style URL for buckets/objects served directly by the endpoint. */
export function getPublicFileUrl(key: string): string {
  const base = s3Endpoint.replace(/\/+$/, "");
  return `${base}/${s3Bucket}/${key}`;
}
