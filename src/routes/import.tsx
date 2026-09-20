import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Database,
  FileJson,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  ServerCrash,
  Upload,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  analyticsApi,
  importApi,
  type ImportKind,
  type ImportResult,
} from "@/services/api";

export const Route = createFileRoute("/import")({
  head: () => ({
    meta: [
      { title: "Data Import — CrimeNet AI Case & Entity Ingestion" },
      {
        name: "description",
        content:
          "Upload CSV or JSON files of cases, entities and relationships into the CrimeNet AI backend and refresh the investigation dashboard.",
      },
      { property: "og:title", content: "Data Import — CrimeNet AI" },
      {
        property: "og:description",
        content: "Ingest CSV or JSON cases, entities and relationships into CrimeNet AI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ImportPage,
});

const TEMPLATES: Record<ImportKind, string> = {
  cases:
    "id,title,crimeType,location,date,status,riskScore,description,entities,persons,locations\nCN-3101,Shell invoice ring,Financial Fraud,Pune MH,2026-09-01,Open,,Layered invoices through 6 vendors,AC-9911002233;Vertex Exim Pvt Ltd,Rakesh Menon,Kalyani Nagar Pune",
  entities:
    "id,name,type,riskScore,aliases,firstSeen,lastSeen,notes,suspiciousActivities,cases\n,Rakesh Menon,Person,,Raku,2026-02-11,2026-08-14,Suspected hawala broker,Structuring;Rapid pass-through,CN-3101",
  relationships:
    "sourceId,targetId,type,detail,caseId\nENT-rakesh-menon,ENT-vertex-exim-pvt-ltd,TRANSFERRED_MONEY_TO,3 transfers in 26 hours,CN-3101",
};

const KINDS: { value: ImportKind; label: string }[] = [
  { value: "cases", label: "Cases" },
  { value: "entities", label: "Entities" },
  { value: "relationships", label: "Relationships" },
];

function ResultPanel({ result }: { result: ImportResult }) {
  return (
    <div className="panel border-primary/40 p-5">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Import complete</p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        {[
          ["Cases", result.casesImported],
          ["Entities", result.entitiesImported],
          ["Relationships", result.relationshipsImported],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-md border border-border bg-surface-2/40 p-3">
            <p className="font-mono text-2xl text-primary">{value as number}</p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      {result.skipped.length > 0 && (
        <ul className="mt-4 space-y-1 text-xs text-risk-medium">
          {result.skipped.map((s, i) => (
            <li key={i}>• {s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ImportPage() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<ImportKind>("cases");
  const [replace, setReplace] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  const stats = useQuery({
    queryKey: ["stats"],
    queryFn: analyticsApi.stats,
    retry: false,
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["cases"] });
    queryClient.invalidateQueries({ queryKey: ["entities"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
  };

  const upload = useMutation({
    mutationFn: async () => {
      const file = fileRef.current?.files?.[0];
      if (file) return importApi.file(file, kind, replace);
      if (!pasted.trim()) throw new Error("Choose a CSV/JSON file or paste JSON records first.");
      const parsed = JSON.parse(pasted) as unknown;
      const rows = Array.isArray(parsed)
        ? { [kind]: parsed }
        : (parsed as Record<string, unknown>);
      return importApi.json({ ...rows, replace });
    },
    onSuccess: (data) => {
      setResult(data);
      refreshAll();
      toast.success("Data imported into the backend", {
        description: `${data.casesImported} cases, ${data.entitiesImported} entities, ${data.relationshipsImported} relationships.`,
      });
    },
    onError: (e: Error) => toast.error("Import failed", { description: e.message }),
  });

  return (
    <AppShell>
      <PageHeader
        title="Data Import"
        subtitle="Load CSV or JSON case, entity and relationship files into the CrimeNet AI backend, then refresh the dashboard."
        actions={
          <Button variant="secondary" className="gap-2" onClick={refreshAll}>
            <RefreshCw className="size-4" /> Refresh dashboard
          </Button>
        }
      />

      <div className="grid gap-6 p-6 lg:grid-cols-3 lg:p-8">
        <div className="space-y-6 lg:col-span-2">
          <div className="panel p-5">
            <div className="flex items-center gap-2 pb-4">
              <Upload className="size-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em]">Upload a file</h2>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {KINDS.map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => setKind(k.value)}
                    className={
                      "rounded-md border px-3 py-1.5 text-xs transition-colors " +
                      (kind === k.value
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground")
                    }
                  >
                    {k.label}
                  </button>
                ))}
              </div>

              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-surface-2/30 px-4 py-10 text-center transition-colors hover:border-primary/50">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <FileSpreadsheet className="size-5" />
                  <FileJson className="size-5" />
                </div>
                <p className="text-sm text-foreground">
                  {fileName ?? "Choose a .csv or .json file"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Multi-value columns are separated with ; or |
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.json,text/csv,application/json"
                  className="hidden"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                />
              </label>

              <div className="space-y-1.5">
                <Label htmlFor="paste">…or paste JSON records</Label>
                <Textarea
                  id="paste"
                  rows={6}
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  placeholder='[{"title":"Shell invoice ring","crimeType":"Financial Fraud","location":"Pune"}]'
                  className="font-mono text-xs"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={replace}
                  onChange={(e) => setReplace(e.target.checked)}
                  className="size-3.5 accent-[var(--color-primary)]"
                />
                Replace everything currently stored in the backend
              </label>

              <Button onClick={() => upload.mutate()} disabled={upload.isPending} className="gap-2">
                {upload.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Import {KINDS.find((k) => k.value === kind)?.label}
              </Button>
            </div>
          </div>

          {result && <ResultPanel result={result} />}

          <div className="panel p-5">
            <h2 className="pb-3 text-sm font-semibold uppercase tracking-[0.14em]">
              {KINDS.find((k) => k.value === kind)?.label} CSV template
            </h2>
            <pre className="overflow-x-auto rounded-md border border-border bg-surface-2/40 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
              {TEMPLATES[kind]}
            </pre>
          </div>

          <div className="panel p-5">
            <h2 className="pb-2 text-sm font-semibold uppercase tracking-[0.14em]">
              Real case dataset
            </h2>
            <p className="pb-3 text-sm text-muted-foreground">
              39 linked cases across six criminal networks (hawala, narcotics, smuggling, cyber
              mules, extortion, trafficking) with shared people, phones, accounts and shell
              companies — enough overlap for the graph, anomaly and risk models to find real
              patterns.
            </p>
            <a
              href="/datasets/crimenet-cases.csv"
              download
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-surface-2/60"
            >
              <Upload className="size-4 rotate-180" />
              Download crimenet-cases.csv
            </a>
          </div>

        </div>

        <div className="space-y-6">
          <div className="panel p-5">
            <div className="flex items-center gap-2 pb-4">
              <Database className="size-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em]">Backend contents</h2>
            </div>
            {stats.isLoading && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" /> Checking backend…
              </p>
            )}
            {stats.isError && (
              <div className="flex items-start gap-2 text-sm">
                <ServerCrash className="mt-0.5 size-4 text-risk-medium" />
                <p className="text-muted-foreground">
                  Backend unreachable. Start the FastAPI server, then refresh.
                </p>
              </div>
            )}
            {stats.data && (
              <ul className="space-y-2 text-sm">
                {[
                  ["Cases stored", stats.data.cases],
                  ["Open cases", stats.data.openCases],
                  ["High-risk cases", stats.data.highRiskCases],
                  ["Entities", stats.data.entities],
                  ["Relationships", stats.data.relationships],
                ].map(([label, value]) => (
                  <li key={label as string} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-mono text-foreground">{value as number}</span>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="secondary" className="mt-4 w-full">
              <Link to="/cases">Open case list</Link>
            </Button>
          </div>

          <div className="panel p-5 text-xs leading-relaxed text-muted-foreground">
            <p className="pb-2 text-sm font-semibold text-foreground">How importing works</p>
            <p>
              Case rows create entities automatically — names in the entities, persons and locations
              columns are extracted, classified and linked to the case. Risk scores left blank are
              computed by the backend.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
