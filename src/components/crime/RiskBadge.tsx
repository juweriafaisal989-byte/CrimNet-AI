import { cn } from "@/lib/utils";
import { riskLevelFromScore, type RiskLevel } from "@/lib/mock-data";

const styles: Record<RiskLevel, string> = {
  Low: "border-risk-low/40 bg-risk-low/12 text-risk-low",
  Medium: "border-risk-medium/40 bg-risk-medium/12 text-risk-medium",
  High: "border-risk-high/40 bg-risk-high/12 text-risk-high",
  Critical: "border-risk-critical/45 bg-risk-critical/15 text-risk-critical",
};

export function RiskBadge({
  level,
  score,
  className,
}: {
  level?: RiskLevel;
  score?: number;
  className?: string;
}) {
  const resolved: RiskLevel = level ?? riskLevelFromScore(score ?? 0);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider",
        styles[resolved],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {resolved}
      {typeof score === "number" ? ` · ${score}` : ""}
    </span>
  );
}

export function riskColorVar(level: RiskLevel) {
  return {
    Low: "var(--risk-low)",
    Medium: "var(--risk-medium)",
    High: "var(--risk-high)",
    Critical: "var(--risk-critical)",
  }[level];
}

export function RiskMeter({ score, className }: { score: number; className?: string }) {
  const level = riskLevelFromScore(score);
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${score}%`, backgroundColor: riskColorVar(level) }}
      />
    </div>
  );
}
