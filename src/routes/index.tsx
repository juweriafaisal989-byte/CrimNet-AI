import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi, casesApi } from "@/services/api";
import {
  Activity,
  AlertTriangle,
  FolderSearch,
  Link2,
  Users,
  ArrowUpRight,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell, PageHeader } from "@/components/AppShell";
import { StatCard } from "@/components/crime/StatCard";
import { RiskBadge, RiskMeter, riskColorVar } from "@/components/crime/RiskBadge";
import {
  cases,
  crimeTypeDistribution,
  dashboardStats,
  entities,
  riskDistribution,
  riskLevelFromScore,
  suspiciousActivities,
  type RiskLevel,
} from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CrimeNet AI — Criminal Network Intelligence Dashboard" },
      {
        name: "description",
        content:
          "CrimeNet AI dashboard for law enforcement: monitor cases, high-risk entities, suspicious connections and AI risk scoring in one investigative view.",
      },
      { property: "og:title", content: "CrimeNet AI — Criminal Network Intelligence Dashboard" },
      {
        property: "og:description",
        content:
          "Monitor cases, high-risk entities and suspicious connections with AI-powered criminal network analysis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const casesQuery = useQuery({ queryKey: ["cases"], queryFn: casesApi.list, retry: false });
  const statsQuery = useQuery({ queryKey: ["stats"], queryFn: analyticsApi.stats, retry: false });

  const liveCases = casesQuery.data && casesQuery.data.length > 0 ? casesQuery.data : cases;
  const usingLive = Boolean(casesQuery.data && casesQuery.data.length > 0);
  const stats = statsQuery.data;

  const recentCases = [...liveCases].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const highRisk = [...entities].sort((a, b) => b.riskScore - a.riskScore).slice(0, 6);

  return (
    <AppShell>
      <PageHeader
        title="Command Dashboard"
        subtitle="Live overview of active investigations, entity risk and network anomalies across all connected data sources."
        actions={
          <div className="rounded-md border border-border bg-surface/70 px-3 py-2 font-mono text-[11px] text-muted-foreground">
            {usingLive ? "SOURCE · LIVE BACKEND" : "SOURCE · OFFLINE DEMO DATA"}
          </div>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Cases"
            value={stats?.cases ?? dashboardStats.totalCases}
            delta={stats ? `${stats.openCases} currently open` : "+6 this month"}
            icon={FolderSearch}
          />
          <StatCard
            label="Persons Identified"
            value={stats?.entities ?? dashboardStats.totalPersons}
            delta={stats ? "resolved entities in register" : "+19 via entity resolution"}
            icon={Users}
            tone="low"
          />
          <StatCard
            label="High Risk Entities"
            value={stats?.highRiskCases ?? dashboardStats.highRiskEntities}
            delta={stats ? "cases scoring above 80" : "9 escalated to critical"}
            icon={AlertTriangle}
            tone="critical"
          />
          <StatCard
            label="Suspicious Connections"
            value={stats?.relationships ?? dashboardStats.suspiciousConnections}
            delta={stats ? "linked entity relationships" : "+38 flagged in 24h"}
            icon={Link2}
            tone="high"
          />
        </section>


        <section className="grid gap-6 xl:grid-cols-3">
          <div className="panel xl:col-span-2">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground">
                Recent Cases
              </h2>
              <Link to="/cases" className="flex items-center gap-1 text-xs text-primary hover:underline">
                View all <ArrowUpRight className="size-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {recentCases.map((c) => (
                <Link
                  key={c.id}
                  to="/cases/$caseId"
                  params={{ caseId: c.id }}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-surface-2/60"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] text-primary">{c.id}</p>
                    <p className="truncate text-sm font-medium text-foreground">{c.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {c.crimeType} · {c.location} · {c.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                      {c.status}
                    </span>
                    <RiskBadge score={c.riskScore} />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground">
                High Risk Individuals
              </h2>
            </div>
            <ul className="divide-y divide-border">
              {highRisk.map((e) => (
                <li key={e.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{e.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.type} · {e.connections} connections
                      </p>
                    </div>
                    <span
                      className="font-mono text-lg font-bold"
                      style={{ color: riskColorVar(riskLevelFromScore(e.riskScore)) }}
                    >
                      {e.riskScore}
                    </span>
                  </div>
                  <RiskMeter score={e.riskScore} className="mt-2" />
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="panel xl:col-span-2">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground">
                Recent Suspicious Activities
              </h2>
              <Activity className="size-4 text-primary" />
            </div>
            <ul className="divide-y divide-border">
              {suspiciousActivities.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-mono text-primary">{a.entity}</span> · case {a.case} · {a.time}
                    </p>
                  </div>
                  <RiskBadge level={a.severity as RiskLevel} />
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-6">
            <div className="panel p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground">
                Crime Type Distribution
              </h2>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={crimeTypeDistribution} layout="vertical" margin={{ left: 8, right: 12 }}>
                    <CartesianGrid horizontal={false} stroke="var(--border)" />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={104}
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--surface-2)" }}
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="var(--chart-1)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground">
                Risk Level Summary
              </h2>
              <div className="mt-4 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskDistribution}>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: "var(--surface-2)" }}
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {riskDistribution.map((d) => (
                        <Cell key={d.name} fill={riskColorVar(d.name as RiskLevel)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
