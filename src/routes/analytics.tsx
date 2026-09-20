import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Brain, EyeOff, Loader2, Network, Radar, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar as RadarShape,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell, PageHeader } from "@/components/AppShell";
import { StatCard } from "@/components/crime/StatCard";
import { RiskBadge } from "@/components/crime/RiskBadge";
import { analyticsApi, type AnalyticsOverview } from "@/services/api";
import { sourceLabel } from "@/hooks/useNetworkData";
import {
  anomalies as demoAnomalies,
  anomalyTimeline as demoTimeline,
  centralityRanking as demoCentrality,
  crimePatterns as demoPatterns,
  hiddenConnections as demoHidden,
  monthlyActivity as demoMonthly,
  suspiciousDetections as demoSuspicious,
  type AiInsight,
} from "@/lib/mock-data";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "AI Analytics — CrimeNet AI Network Intelligence" },
      {
        name: "description",
        content:
          "Network centrality, suspicious activity detection, hidden connections, crime pattern analysis and anomaly detection powered by CrimeNet AI.",
      },
      { property: "og:title", content: "AI Analytics — CrimeNet AI Network Intelligence" },
      {
        property: "og:description",
        content: "Centrality rankings, hidden connections and anomaly detection across the criminal network.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Analytics,
});

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

function InsightCard({ insight }: { insight: AiInsight }) {
  return (
    <div className="rounded-md border border-border bg-surface-2/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{insight.title}</p>
        <RiskBadge level={insight.risk} />
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{insight.description}</p>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${insight.confidence}%` }} />
        </div>
        <span className="font-mono text-[11px] text-primary">{insight.confidence}% conf.</span>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  hint,
  children,
}: {
  title: string;
  icon: typeof Brain;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground">
            {title}
          </h2>
        </div>
        {hint && <span className="font-mono text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function EmptyPanelNote({ label }: { label: string }) {
  return (
    <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
      No {label} produced by the models yet — add or import more cases to build the network.
    </p>
  );
}

function Analytics() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-overview"],
    queryFn: () => analyticsApi.overview(),
    retry: false,
    staleTime: 15_000,
  });

  const isLive = !!data && data.centrality.length > 0;

  const centrality: AnalyticsOverview["centrality"] = isLive
    ? data!.centrality
    : demoCentrality.map((c) => ({
        id: c.name,
        name: c.name,
        type: c.type,
        degree: c.degree,
        betweenness: c.betweenness,
        pagerank: c.pagerank,
        riskScore: 0,
      }));
  const anomalyList = isLive ? data!.anomalies : demoAnomalies;
  const hidden = isLive ? data!.hiddenConnections : demoHidden;
  const suspicious = isLive ? data!.suspiciousActivity : demoSuspicious;
  const patterns = isLive ? data!.crimePatterns : demoPatterns;
  const monthly = isLive ? data!.monthlyActivity : demoMonthly;
  const timeline = isLive ? data!.anomalyTimeline : demoTimeline;
  const summary = isLive
    ? data!.summary
    : { insights: 64, anomalies: 19, criticalAnomalies: 4, hiddenLinks: 27, avgConfidence: 83, modelsActive: 5 };

  const maxDegree = Math.max(1, ...centrality.map((c) => c.degree));
  const radarData = centrality.slice(0, 6).map((c) => ({
    name: c.name.length > 14 ? `${c.name.slice(0, 12)}…` : c.name,
    value: Math.round(c.pagerank * 1000),
  }));

  return (
    <AppShell>
      <PageHeader
        title="AI Analytics"
        subtitle="Graph algorithms and anomaly models running over the resolved entity network — centrality, layering detection, hidden links and pattern mining."
        actions={
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-border px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
              {sourceLabel(isLive)}
            </span>
            <div className="rounded-md border border-border bg-surface/70 px-3 py-2 font-mono text-[11px] text-primary">
              {isLoading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-3 animate-spin" /> RUNNING
                </span>
              ) : (
                `MODELS ACTIVE · ${summary.modelsActive}/5`
              )}
            </div>
          </div>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Insights Generated"
            value={summary.insights}
            delta="From the latest model run"
            icon={Brain}
          />
          <StatCard
            label="Anomalies Detected"
            value={summary.anomalies}
            delta={`${summary.criticalAnomalies} critical severity`}
            icon={Activity}
            tone="critical"
          />
          <StatCard
            label="Hidden Links Surfaced"
            value={summary.hiddenLinks}
            delta="Two-hop bridges"
            icon={EyeOff}
            tone="high"
          />
          <StatCard
            label="Avg Model Confidence"
            value={`${summary.avgConfidence}%`}
            delta="Across anomaly models"
            icon={TrendingUp}
            tone="low"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Panel title="1 · Network Centrality" icon={Network} hint="Degree · betweenness · pagerank">
            {centrality.length === 0 ? (
              <EmptyPanelNote label="centrality rankings" />
            ) : (
              <>
                <div className="space-y-3">
                  {centrality.map((c, i) => (
                    <div key={c.id} className="flex items-center gap-3">
                      <span className="w-6 font-mono text-xs text-muted-foreground">#{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm text-foreground">{c.name}</p>
                          <span className="font-mono text-xs text-primary">
                            BC {c.betweenness.toFixed(3)}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${(c.degree / maxDegree) * 100}%` }}
                          />
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {c.type} · degree {c.degree} · pagerank {c.pagerank}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
                      <RadarShape
                        dataKey="value"
                        stroke="var(--chart-1)"
                        fill="var(--chart-1)"
                        fillOpacity={0.28}
                      />
                      <Tooltip contentStyle={tooltipStyle} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </Panel>

          <Panel title="2 · Suspicious Activity Detection" icon={Radar} hint="Transactions & relationships">
            {suspicious.length === 0 ? (
              <EmptyPanelNote label="suspicious activity signals" />
            ) : (
              <div className="space-y-3">
                {suspicious.map((i) => (
                  <InsightCard key={i.title} insight={i} />
                ))}
              </div>
            )}
          </Panel>

          <Panel title="3 · Hidden Connection Detection" icon={EyeOff} hint="Indirect / multi-hop links">
            {hidden.length === 0 ? (
              <EmptyPanelNote label="hidden connections" />
            ) : (
              <div className="space-y-3">
                {hidden.map((i) => (
                  <InsightCard key={i.title} insight={i} />
                ))}
              </div>
            )}
          </Panel>

          <Panel title="4 · Crime Pattern Analysis" icon={TrendingUp} hint="Location · people · type">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip cursor={{ fill: "var(--surface-2)" }} contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="cases" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="alerts" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-3">
              {patterns.length === 0 ? (
                <EmptyPanelNote label="crime patterns" />
              ) : (
                patterns.map((i) => <InsightCard key={i.title} insight={i} />)
              )}
            </div>
          </Panel>
        </div>

        <Panel title="5 · Anomaly Detection" icon={Activity} hint="Deviation vs case baseline">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline}>
                  <defs>
                    <linearGradient id="anom" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--risk-critical)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--risk-critical)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="var(--risk-critical)"
                    fill="url(#anom)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="baseline"
                    stroke="var(--muted-foreground)"
                    fill="transparent"
                    strokeDasharray="4 4"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
              {anomalyList.length === 0 ? (
                <EmptyPanelNote label="anomalies" />
              ) : (
                anomalyList.map((i) => <InsightCard key={i.title} insight={i} />)
              )}
            </div>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
