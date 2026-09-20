import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, Gauge, ShieldAlert, ShieldCheck, Search } from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { AppShell, PageHeader } from "@/components/AppShell";
import { StatCard } from "@/components/crime/StatCard";
import { RiskBadge, RiskMeter, riskColorVar } from "@/components/crime/RiskBadge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  riskLevelFromScore,
  type EntityRecord,
  type RiskLevel,
} from "@/lib/mock-data";
import { useEntities, sourceLabel } from "@/hooks/useNetworkData";

export const Route = createFileRoute("/risk")({
  head: () => ({
    meta: [
      { title: "Risk Assessment — CrimeNet AI Entity Risk Scoring" },
      {
        name: "description",
        content:
          "AI-generated risk scores from 0 to 100 for every entity, with the weighted factors, suspicious activities and cases behind each score.",
      },
      { property: "og:title", content: "Risk Assessment — CrimeNet AI Entity Risk Scoring" },
      {
        property: "og:description",
        content: "Understand why the AI assigned each entity its risk score, factor by factor.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RiskAssessment,
});

const levels: (RiskLevel | "All")[] = ["All", "Critical", "High", "Medium", "Low"];

function RiskAssessment() {
  const { entities, isLive } = useEntities();
  const sorted = [...entities].sort((a, b) => b.riskScore - a.riskScore);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<RiskLevel | "All">("All");
  const [query, setQuery] = useState("");

  const selected: EntityRecord = sorted.find((e) => e.id === selectedId) ?? sorted[0]!;
  const setSelected = (entity: EntityRecord) => setSelectedId(entity.id);

  const riskDistribution = (["Low", "Medium", "High", "Critical"] as RiskLevel[]).map((name) => ({
    name,
    value: entities.filter((e) => riskLevelFromScore(e.riskScore) === name).length,
  }));

  const list = sorted.filter(
    (e) =>
      (filter === "All" || riskLevelFromScore(e.riskScore) === filter) &&
      (!query || e.name.toLowerCase().includes(query.toLowerCase())),
  );

  const selLevel = riskLevelFromScore(selected.riskScore);

  return (
    <AppShell>
      <PageHeader
        title="Risk Assessment"
        subtitle="Every resolved entity carries an explainable AI risk score from 0 to 100, computed from network position, transaction behaviour and case involvement."
        actions={
          <span className="rounded-full border border-border px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
            {sourceLabel(isLive)}
          </span>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Critical Risk (81-100)" value={riskDistribution[3]!.value} icon={ShieldAlert} tone="critical" />
          <StatCard label="High Risk (61-80)" value={riskDistribution[2]!.value} icon={AlertTriangle} tone="high" />
          <StatCard label="Medium Risk (31-60)" value={riskDistribution[1]!.value} icon={Gauge} />
          <StatCard label="Low Risk (0-30)" value={riskDistribution[0]!.value} icon={ShieldCheck} tone="low" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
          <div className="panel">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground">
                Scored Entities
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search entity…"
                    className="h-9 w-48 pl-9"
                  />
                </div>
                {levels.map((l) => (
                  <button
                    key={l}
                    onClick={() => setFilter(l)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      filter === l
                        ? "border-primary/50 bg-primary/12 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <ul className="divide-y divide-border">
              {list.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => setSelected(e)}
                    className={cn(
                      "w-full px-5 py-4 text-left transition-colors hover:bg-surface-2/50",
                      selected.id === e.id && "bg-surface-2/70",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{e.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {e.type} · {e.connections} connections · {e.suspiciousActivities.length}{" "}
                          suspicious activities · cases {e.cases.join(", ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <RiskBadge score={e.riskScore} />
                        <span
                          className="w-9 text-right font-mono text-lg font-bold"
                          style={{ color: riskColorVar(riskLevelFromScore(e.riskScore)) }}
                        >
                          {e.riskScore}
                        </span>
                      </div>
                    </div>
                    <RiskMeter score={e.riskScore} className="mt-2.5" />
                  </button>
                </li>
              ))}
              {list.length === 0 && (
                <li className="py-14 text-center text-sm text-muted-foreground">
                  No entities in this risk band.
                </li>
              )}
            </ul>
          </div>

          <div className="space-y-6">
            <div className="panel p-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Why this score?
              </p>
              <h3 className="mt-1 text-lg font-bold text-foreground">{selected.name}</h3>
              <p className="text-xs text-muted-foreground">{selected.type}</p>

              <div className="mx-auto mt-2 h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    innerRadius="72%"
                    outerRadius="100%"
                    data={[{ name: selected.name, value: selected.riskScore }]}
                    startAngle={220}
                    endAngle={-40}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar
                      dataKey="value"
                      cornerRadius={8}
                      fill={riskColorVar(selLevel)}
                      background={{ fill: "var(--muted)" }}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <p
                  className="-mt-28 text-center font-mono text-4xl font-bold"
                  style={{ color: riskColorVar(selLevel) }}
                >
                  {selected.riskScore}
                </p>
                <p className="mt-1 text-center text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {selLevel} risk
                </p>
              </div>

              <h4 className="mt-8 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Contributing factors
              </h4>
              <ul className="mt-3 space-y-3">
                {selected.riskFactors.map((f) => (
                  <li key={f.factor}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-foreground">{f.factor}</p>
                      <span className="font-mono text-xs text-primary">+{f.weight}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${f.weight * 2.2}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{f.detail}</p>
                  </li>
                ))}
              </ul>

              <h4 className="mt-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Suspicious activities
              </h4>
              <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                {selected.suspiciousActivities.map((s) => (
                  <li key={s} className="flex gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-risk-high" />
                    {s}
                  </li>
                ))}
              </ul>

              <h4 className="mt-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Related cases
              </h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {selected.cases.map((c) => (
                  <span
                    key={c}
                    className="rounded border border-primary/25 bg-primary/8 px-2 py-0.5 font-mono text-xs text-primary"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <div className="panel p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground">
                Portfolio Risk Split
              </h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskDistribution}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {riskDistribution.map((d) => (
                        <Cell key={d.name} fill={riskColorVar(d.name as RiskLevel)} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {riskDistribution.map((d) => (
                  <span key={d.name} className="flex items-center gap-2 text-muted-foreground">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: riskColorVar(d.name as RiskLevel) }}
                    />
                    {d.name}: {d.value}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
