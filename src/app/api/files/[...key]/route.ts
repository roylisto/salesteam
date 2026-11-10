import { GetObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { loadSessionContext } from "@/lib/session";
import { s3Bucket, s3Client } from "@/lib/storage";

/**
 * Streams a private S3 object to the signed-in member.
 * Only keys inside the member's own organization folder are allowed, so one
 * tenant can never guess another tenant's file URLs.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const context = await loadSessionContext();
  if (!context) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { key } = await params;
  const objectKey = key.map(decodeURIComponent).join("/");
  const variant = new URL(request.url).searchParams.get("thumbnail");
  const thumbnail = variant === "outlet" || variant === "catalog";

  if (
    !objectKey ||
    objectKey.includes("..") ||
    !objectKey.startsWith(`organizations/${context.organization.id}/`)
  ) {
    return new Response("Not found", { status: 404 });
  }

  const thumbnailFolders = variant === "catalog" ? ["brands", "products"] : ["outlets"];
  if (thumbnail && !thumbnailFolders.some((folder) => objectKey.startsWith(`organizations/${context.organization.id}/${folder}/`))) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const object = await s3Client.send(
      new GetObjectCommand({ Bucket: s3Bucket, Key: objectKey }),
    );

    if (!object.Body) return new Response("Not found", { status: 404 });

    const bytes = await object.Body.transformToByteArray();
    if (thumbnail) {
      const webp = await sharp(bytes, { limitInputPixels: 40_000_000 })
        .autoOrient()
        .resize(96, 96, { fit: "cover" })
        .webp({ quality: 65 })
        .toBuffer();

      return new Response(new Uint8Array(webp), {
        headers: {
          "Content-Type": "image/webp",
          "Content-Length": String(webp.byteLength),
          "Cache-Control": "private, max-age=3600",
          "Vary": "Cookie",
        },
      });
    }
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;

    return new Response(buffer, {
      headers: {
        "Content-Type": object.ContentType ?? "application/octet-stream",
        "Content-Length": String(object.ContentLength ?? bytes.byteLength),
        // Logo keys embed a timestamp, so each upload gets a fresh immutable URL.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
