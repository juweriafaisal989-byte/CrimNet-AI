import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Minus, Plus, RotateCcw, Search, X } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { RiskBadge, riskColorVar } from "@/components/crime/RiskBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  riskLevelFromScore,
  type GraphNode,
  type GraphNodeType,
  type RiskLevel,
} from "@/lib/mock-data";
import { useGraph, sourceLabel } from "@/hooks/useNetworkData";

export const Route = createFileRoute("/graph")({
  head: () => ({
    meta: [
      { title: "Network Graph — CrimeNet AI Criminal Link Analysis" },
      {
        name: "description",
        content:
          "Interactive criminal network graph: pan, zoom, filter and inspect suspects, victims, phones, accounts, locations and their relationships.",
      },
      { property: "og:title", content: "Network Graph — CrimeNet AI Criminal Link Analysis" },
      {
        property: "og:description",
        content: "Explore criminal relationships as an interactive node-and-edge network graph.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NetworkGraph,
});

const nodeTypes: (GraphNodeType | "All")[] = [
  "All",
  "Suspect",
  "Victim",
  "Organization",
  "Phone Number",
  "Bank Account",
  "Location",
];

const typeColor: Record<GraphNodeType, string> = {
  Suspect: "var(--risk-critical)",
  Victim: "var(--chart-5)",
  Organization: "var(--chart-2)",
  "Phone Number": "var(--chart-1)",
  "Bank Account": "var(--chart-3)",
  Location: "var(--muted-foreground)",
};

const relationColor: Record<string, string> = {
  KNOWS: "var(--chart-2)",
  CALLED: "var(--chart-1)",
  TRANSFERRED_MONEY_TO: "var(--risk-high)",
  ASSOCIATED_WITH: "var(--muted-foreground)",
  LOCATED_AT: "var(--chart-5)",
  INVOLVED_IN: "var(--risk-critical)",
};

function NetworkGraph() {
  const [scale, setScale] = useState(0.6);
  const [pan, setPan] = useState({ x: 20, y: 20 });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<GraphNodeType | "All">("All");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "All">("All");
  const [query, setQuery] = useState("");
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { nodes: graphNodes, edges: graphEdges, isLive, isLoading } = useGraph();

  const visibleIds = useMemo(() => {
    const q = query.toLowerCase();
    return new Set(
      graphNodes
        .filter(
          (n) =>
            (typeFilter === "All" || n.type === typeFilter) &&
            (riskFilter === "All" || riskLevelFromScore(n.riskScore) === riskFilter) &&
            (!q || n.label.toLowerCase().includes(q)),
        )
        .map((n) => n.id),
    );
  }, [graphNodes, typeFilter, riskFilter, query]);

  const selected = graphNodes.find((n) => n.id === selectedId) ?? null;

  const neighbours = useMemo(() => {
    if (!selectedId) return new Set<string>();
    const set = new Set<string>();
    graphEdges.forEach((e) => {
      if (e.source === selectedId) set.add(e.target);
      if (e.target === selectedId) set.add(e.source);
    });
    return set;
  }, [graphEdges, selectedId]);

  const selectedEdges = graphEdges.filter(
    (e) => e.source === selectedId || e.target === selectedId,
  );
  const nodeById = (id: string) => graphNodes.find((n) => n.id === id) as GraphNode;

  const zoom = (delta: number) => setScale((s) => Math.min(2.4, Math.max(0.3, s + delta)));

  return (
    <AppShell>
      <PageHeader
        title="Criminal Network Graph"
        subtitle="Link analysis across suspects, victims, organizations, communication and financial nodes. Drag to pan, scroll to zoom, click a node to inspect."
        actions={
          <div className="flex items-center gap-3">
          <span className="rounded-full border border-border px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
            {sourceLabel(isLive)}
          </span>
          <Button
            variant="secondary"
            className="gap-2"
            onClick={() => {
              setScale(0.6);
              setPan({ x: 20, y: 20 });
              setSelectedId(null);
            }}
          >
            <RotateCcw className="size-4" /> Reset view
          </Button>
          </div>
        }
      />

      <div className="grid gap-4 p-6 lg:p-8 xl:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-56 flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search entity in graph…"
                className="pl-9"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as GraphNodeType | "All")}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none"
            >
              {nodeTypes.map((t) => (
                <option key={t} value={t} className="bg-surface">
                  {t === "All" ? "All entity types" : t}
                </option>
              ))}
            </select>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as RiskLevel | "All")}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none"
            >
              {["All", "Low", "Medium", "High", "Critical"].map((t) => (
                <option key={t} value={t} className="bg-surface">
                  {t === "All" ? "All risk levels" : `${t} risk`}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-1">
              <Button size="icon" variant="ghost" onClick={() => zoom(-0.15)} aria-label="Zoom out">
                <Minus className="size-4" />
              </Button>
              <span className="w-12 text-center font-mono text-xs text-muted-foreground">
                {Math.round(scale * 100)}%
              </span>
              <Button size="icon" variant="ghost" onClick={() => zoom(0.15)} aria-label="Zoom in">
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          <div className="panel relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 scan-grid" />
            <svg
              ref={svgRef}
              className={cn("relative h-[34rem] w-full touch-none select-none", drag ? "cursor-grabbing" : "cursor-grab")}
              onMouseDown={(e) => setDrag({ x: e.clientX - pan.x, y: e.clientY - pan.y })}
              onMouseMove={(e) => {
                if (drag) setPan({ x: e.clientX - drag.x, y: e.clientY - drag.y });
              }}
              onMouseUp={() => setDrag(null)}
              onMouseLeave={() => setDrag(null)}
              onWheel={(e) => zoom(e.deltaY > 0 ? -0.08 : 0.08)}
            >
              <defs>
                <filter id="node-glow" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="6" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <g transform={`translate(${pan.x} ${pan.y}) scale(${scale})`}>
                {graphEdges.map((e, i) => {
                  const a = nodeById(e.source);
                  const b = nodeById(e.target);
                  if (!a || !b) return null;
                  const dim =
                    !visibleIds.has(a.id) ||
                    !visibleIds.has(b.id) ||
                    (selectedId ? e.source !== selectedId && e.target !== selectedId : false);
                  return (
                    <g key={i} opacity={dim ? 0.12 : 0.85}>
                      <line
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke={relationColor[e.type]}
                        strokeWidth={selectedId && !dim ? 2.2 : 1.2}
                      />
                      {selectedId && !dim && (
                        <text
                          x={(a.x + b.x) / 2}
                          y={(a.y + b.y) / 2 - 6}
                          fill="var(--muted-foreground)"
                          fontSize={10}
                          textAnchor="middle"
                          className="font-mono"
                        >
                          {e.type}
                        </text>
                      )}
                    </g>
                  );
                })}

                {graphNodes.map((n) => {
                  const visible = visibleIds.has(n.id);
                  const highlighted =
                    !selectedId || n.id === selectedId || neighbours.has(n.id);
                  const r = 12 + (n.riskScore / 100) * 14;
                  return (
                    <g
                      key={n.id}
                      transform={`translate(${n.x} ${n.y})`}
                      opacity={visible ? (highlighted ? 1 : 0.2) : 0.12}
                      className="cursor-pointer"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setSelectedId(n.id === selectedId ? null : n.id);
                      }}
                    >
                      <circle
                        r={r + 6}
                        fill={typeColor[n.type]}
                        opacity={n.id === selectedId ? 0.28 : 0.1}
                      />
                      <circle
                        r={r}
                        fill={typeColor[n.type]}
                        stroke={n.id === selectedId ? "var(--primary)" : "var(--background)"}
                        strokeWidth={n.id === selectedId ? 3 : 1.5}
                        filter={n.riskScore > 80 ? "url(#node-glow)" : undefined}
                      />
                      <text
                        y={r + 15}
                        textAnchor="middle"
                        fontSize={11}
                        fill="var(--foreground)"
                        className="pointer-events-none"
                      >
                        {n.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>

            {isLoading && (
              <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                Loading the network graph…
              </div>
            )}

            <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 rounded-md border border-border bg-surface/90 p-2 text-[10px]">
              {(Object.keys(typeColor) as GraphNodeType[]).map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="size-2 rounded-full" style={{ background: typeColor[t] }} />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        <aside className="panel h-fit p-5">
          {selected ? (
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {selected.type}
                  </p>
                  <h2 className="text-lg font-bold text-foreground">{selected.label}</h2>
                </div>
                <button onClick={() => setSelectedId(null)} aria-label="Clear selection">
                  <X className="size-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <RiskBadge score={selected.riskScore} />
                <span
                  className="font-mono text-2xl font-bold"
                  style={{ color: riskColorVar(riskLevelFromScore(selected.riskScore)) }}
                >
                  {selected.riskScore}
                </span>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">{selected.detail}</p>

              <p className="mt-4 font-mono text-xs text-primary">
                Cases: {selected.cases.join(", ")}
              </p>

              <h3 className="mt-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Relationships ({selectedEdges.length})
              </h3>
              <ul className="mt-3 space-y-2">
                {selectedEdges.map((e, i) => {
                  const other = e.source === selected.id ? nodeById(e.target) : nodeById(e.source);
                  return (
                    <li key={i} className="rounded-md border border-border bg-surface-2/40 p-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="rounded px-1.5 py-0.5 font-mono text-[10px]"
                          style={{ background: "var(--surface-2)", color: relationColor[e.type] }}
                        >
                          {e.type}
                        </span>
                        <button
                          onClick={() => setSelectedId(other.id)}
                          className="text-sm text-foreground hover:text-primary"
                        >
                          {other.label}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{e.detail}</p>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              <p className="text-foreground">No node selected</p>
              <p className="mt-2">
                Click any node to inspect its profile, risk score and relationship edges. Connected
                nodes are highlighted automatically.
              </p>
              <div className="mt-6 space-y-2">
                <p className="text-xs uppercase tracking-[0.16em]">Relationship legend</p>
                {Object.entries(relationColor).map(([k, v]) => (
                  <p key={k} className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="h-0.5 w-6" style={{ background: v }} />
                    {k}
                  </p>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
