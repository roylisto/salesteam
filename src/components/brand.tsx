import { toFileSrc } from "@/lib/files";
import { cn } from "@/lib/utils";

// NOTE: plain <img> on purpose. The logo is served from the private bucket
// via the authenticated `/api/files` endpoint, which needs the user's session
// cookie. next/image would fetch it server-side without cookies and fail.
export function Brand({
  className,
  name,
  logoUrl,
}: {
  className?: string;
  name?: string;
  logoUrl?: string | null;
}) {
  const label = name ?? "Salesteam";
  const logoSrc = toFileSrc(logoUrl ?? null);

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {logoSrc ? (
        <span className="relative block size-8 shrink-0 overflow-hidden rounded-lg shadow-sm ring-1 ring-foreground/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt={`${label} logo`}
            className="size-full object-cover"
          />
        </span>
      ) : (
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-linear-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-sm font-semibold text-white shadow-sm">
          {label.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="font-heading truncate text-[0.95rem] font-semibold tracking-tight">
        {label}
      </span>
    </div>
  );
}
