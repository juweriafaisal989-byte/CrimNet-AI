import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  delta?: string;
  icon: LucideIcon;
  tone?: "primary" | "critical" | "high" | "low";
}) {
  const toneClass = {
    primary: "text-primary",
    critical: "text-risk-critical",
    high: "text-risk-high",
    low: "text-risk-low",
  }[tone];

  return (
    <div className="panel relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-current opacity-[0.06] blur-xl" />
      <div className="flex items-start justify-between">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <Icon className={cn("size-4", toneClass)} />
      </div>
      <p className="mt-3 font-mono text-3xl font-bold text-foreground">{value}</p>
      {delta && <p className={cn("mt-1 text-xs", toneClass)}>{delta}</p>}
    </div>
  );
}
