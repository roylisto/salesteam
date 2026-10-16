/**
 * Helpers to translate the value stored in `*_url` columns into a URL the
 * browser can actually load. Files live in a private bucket, so the browser
 * goes through the authenticated `/api/files` endpoint instead of S3 directly.
 *
 * New rows store the bare S3 key (`organizations/1/logo/...png`). Older rows
 * may still hold a full public-style S3 URL; both shapes are accepted.
 */

const ORG_PREFIX = "organizations/";

export function normalizeFileKey(stored: string | null): string | null {
  if (!stored) return null;
  if (!stored.includes("://")) return stored;

  const index = stored.indexOf(ORG_PREFIX);
  if (index === -1) return null;
  return stored.slice(index);
}

/** Browser-loadable URL for a stored file key (or legacy full S3 URL). */
export function toFileSrc(stored: string | null): string | null {
  const key = normalizeFileKey(stored);
  if (!key) return null;
  return `/api/files/${key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}
