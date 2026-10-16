import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-linear-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-sm font-semibold text-white shadow-sm">
        S
      </span>
      <span className="font-heading text-[0.95rem] font-semibold tracking-tight">
        Salesteam
      </span>
    </div>
  );
}
