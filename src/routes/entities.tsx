import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search,
  User,
  Phone,
  CreditCard,
  MapPin,
  Car,
  Building2,
  LayoutGrid,
  Table2,
  X,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { RiskBadge, RiskMeter, riskColorVar } from "@/components/crime/RiskBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { riskLevelFromScore, type EntityRecord, type EntityType } from "@/lib/mock-data";
import { useEntities, sourceLabel } from "@/hooks/useNetworkData";

export const Route = createFileRoute("/entities")({
  head: () => ({
    meta: [
      { title: "Entity Explorer — CrimeNet AI Extracted Entities" },
      {
        name: "description",
        content:
          "Explore persons, phone numbers, bank accounts, locations, vehicles and organizations extracted from criminal cases with connection counts and risk scores.",
      },
      { property: "og:title", content: "Entity Explorer — CrimeNet AI Extracted Entities" },
      {
        property: "og:description",
        content: "Browse extracted case entities with connections, related cases and AI risk scores.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EntityExplorer,
});

const typeIcons: Record<EntityType, typeof User> = {
  Person: User,
  "Phone Number": Phone,
  "Bank Account": CreditCard,
  Location: MapPin,
  Vehicle: Car,
  Organization: Building2,
};

const types: (EntityType | "All")[] = [
  "All",
  "Person",
  "Phone Number",
  "Bank Account",
  "Location",
  "Vehicle",
  "Organization",
];

function EntityExplorer() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<EntityType | "All">("All");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [selected, setSelected] = useState<EntityRecord | null>(null);
  const { entities, isLive, isLoading } = useEntities();

  const filtered = entities.filter((e) => {
    const q = query.toLowerCase();
    return (
      (type === "All" || e.type === type) &&
      (!q || e.name.toLowerCase().includes(q) || e.cases.join(" ").toLowerCase().includes(q))
    );
  });

  return (
    <AppShell>
      <PageHeader
        title="Entity Explorer"
        subtitle="Entities extracted and resolved from case documents, call records, financial statements and field reports."
        actions={
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-border px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
              {sourceLabel(isLive)}
            </span>
          <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-1">
            <Button
              size="sm"
              variant={view === "cards" ? "default" : "ghost"}
              onClick={() => setView("cards")}
              className="gap-1.5"
            >
              <LayoutGrid className="size-3.5" /> Cards
            </Button>
            <Button
              size="sm"
              variant={view === "table" ? "default" : "ghost"}
              onClick={() => setView("table")}
              className="gap-1.5"
            >
              <Table2 className="size-3.5" /> Table
            </Button>
          </div>
          </div>
        }
      />

      <div className="space-y-5 p-6 lg:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-64 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search entity name, number or case…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  type === t
                    ? "border-primary/50 bg-primary/12 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {view === "cards" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((e) => {
              const Icon = typeIcons[e.type];
              return (
                <button
                  key={e.id}
                  onClick={() => setSelected(e)}
                  className="panel p-5 text-left transition-colors hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid size-9 place-items-center rounded-md bg-primary/10">
                        <Icon className="size-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{e.name}</p>
                        <p className="text-xs text-muted-foreground">{e.type}</p>
                      </div>
                    </div>
                    <span
                      className="font-mono text-xl font-bold"
                      style={{ color: riskColorVar(riskLevelFromScore(e.riskScore)) }}
                    >
                      {e.riskScore}
                    </span>
                  </div>
                  <RiskMeter score={e.riskScore} className="mt-4" />
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{e.connections} connections</span>
                    <span className="font-mono">{e.cases.join(", ")}</span>
                  </div>
                  <div className="mt-3">
                    <RiskBadge score={e.riskScore} />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="panel overflow-x-auto">
            <table className="w-full min-w-3xl text-left text-sm">
              <thead className="bg-surface-2/70 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Identifier</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Connections</th>
                  <th className="px-4 py-3">Cases</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => setSelected(e)}
                    className="cursor-pointer transition-colors hover:bg-surface-2/50"
                  >
                    <td className="px-4 py-3 text-foreground">{e.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.type}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{e.connections}</td>
                    <td className="px-4 py-3 font-mono text-xs text-primary">{e.cases.join(", ")}</td>
                    <td className="px-4 py-3 font-mono text-foreground">{e.riskScore}</td>
                    <td className="px-4 py-3">
                      <RiskBadge score={e.riskScore} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isLoading && (
          <div className="panel py-16 text-center text-sm text-muted-foreground">
            Loading entities from the CrimeNet AI server…
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="panel py-16 text-center text-sm text-muted-foreground">
            No entities match this search.
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-background/70 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => setSelected(null)}
            aria-hidden
          />
          <aside className="relative h-full w-full max-w-md overflow-y-auto border-l border-border bg-surface p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {selected.type}
                </p>
                <h2 className="text-xl font-bold text-foreground">{selected.name}</h2>
                {selected.aliases && (
                  <p className="text-xs text-muted-foreground">
                    Aliases: {selected.aliases.join(", ")}
                  </p>
                )}
              </div>
              <button onClick={() => setSelected(null)} aria-label="Close">
                <X className="size-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-md border border-border bg-surface-2/40 p-3">
                <p className="font-mono text-xl text-foreground">{selected.connections}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Links</p>
              </div>
              <div className="rounded-md border border-border bg-surface-2/40 p-3">
                <p className="font-mono text-xl text-foreground">{selected.cases.length}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cases</p>
              </div>
              <div className="rounded-md border border-border bg-surface-2/40 p-3">
                <p
                  className="font-mono text-xl"
                  style={{ color: riskColorVar(riskLevelFromScore(selected.riskScore)) }}
                >
                  {selected.riskScore}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Risk</p>
              </div>
            </div>

            <p className="mt-5 text-sm text-muted-foreground">{selected.notes}</p>
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
              First seen {selected.firstSeen} · Last seen {selected.lastSeen}
            </p>

            <h3 className="mt-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Relationships
            </h3>
            <ul className="mt-3 space-y-2">
              {selected.relationships.map((r) => (
                <li
                  key={r.target + r.type}
                  className="rounded-md border border-border bg-surface-2/40 p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-primary/12 px-2 py-0.5 font-mono text-[10px] text-primary">
                      {r.type}
                    </span>
                    <span className="text-sm text-foreground">{r.target}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{r.detail}</p>
                </li>
              ))}
            </ul>

            <h3 className="mt-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Suspicious Activities
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {selected.suspiciousActivities.map((s) => (
                <li key={s} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-risk-high" />
                  {s}
                </li>
              ))}
            </ul>

            <h3 className="mt-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Related Cases
            </h3>
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
          </aside>
        </div>
      )}
    </AppShell>
  );
}
