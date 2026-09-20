import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Search, ServerCrash, FileSearch, Eye } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { RiskBadge } from "@/components/crime/RiskBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cases as mockCases, riskLevelFromScore, type CaseRecord } from "@/lib/mock-data";
import { casesApi } from "@/services/api";

export const Route = createFileRoute("/cases/")({
  head: () => ({
    meta: [
      { title: "Cases — CrimeNet AI Investigation Management" },
      {
        name: "description",
        content:
          "Search, filter and manage criminal investigation cases by crime type, location, status and AI risk level in CrimeNet AI.",
      },
      { property: "og:title", content: "Cases — CrimeNet AI Investigation Management" },
      {
        property: "og:description",
        content: "Search and filter criminal investigation cases by crime type, status and AI risk level.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CasesPage,
});

function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-sm text-foreground outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-surface text-foreground">
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function CasesPage() {
  const [query, setQuery] = useState("");
  const [crimeType, setCrimeType] = useState("All");
  const [risk, setRisk] = useState("All");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", crimeType: "", location: "", description: "" });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["cases"],
    queryFn: casesApi.list,
    retry: false,
  });

  const usingMock = isError || !data || data.length === 0;
  const list: CaseRecord[] = usingMock ? mockCases : data;

  const createCase = useMutation({
    mutationFn: () =>
      casesApi.create({
        title: form.title.trim(),
        crimeType: form.crimeType.trim() || "Unclassified",
        location: form.location.trim(),
        description: form.description.trim(),
      }),
    onSuccess: (created) => {
      setOpen(false);
      setForm({ title: "", crimeType: "", location: "", description: "" });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success(`Case ${created.id} created`, {
        description: `Risk scored at ${created.riskScore} by the backend.`,
      });
      void navigate({ to: "/cases/$caseId", params: { caseId: created.id } });
    },
    onError: (e: Error) => toast.error("Could not save the case", { description: e.message }),
  });

  const crimeTypes = useMemo(
    () => ["All", ...Array.from(new Set(list.map((c) => c.crimeType)))],
    [list],
  );

  const filtered = list.filter((c) => {
    const q = query.toLowerCase();
    const matches =
      !q ||
      c.title.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q);
    const matchesType = crimeType === "All" || c.crimeType === crimeType;
    const matchesRisk = risk === "All" || riskLevelFromScore(c.riskScore) === risk;
    return matches && matchesType && matchesRisk;
  });

  return (
    <AppShell>
      <PageHeader
        title="Case Management"
        subtitle="All registered investigations with AI risk scoring, crime classification and jurisdiction details."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="size-4" /> New Case
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register New Case</DialogTitle>
                <DialogDescription>
                  The case is submitted to the CrimeNet AI backend for entity extraction and scoring.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="title">Case title</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Cross-border fund routing"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="type">Crime type</Label>
                    <Input
                      id="type"
                      value={form.crimeType}
                      onChange={(e) => setForm({ ...form, crimeType: e.target.value })}
                      placeholder="Financial Fraud"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="loc">Location</Label>
                    <Input
                      id="loc"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="Mumbai, MH"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea
                    id="desc"
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Summary of the reported incident..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={!form.title.trim() || createCase.isPending}
                  onClick={() => createCase.mutate()}
                  className="gap-2"
                >
                  {createCase.isPending && <Loader2 className="size-4 animate-spin" />}
                  Create case
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />


      <div className="space-y-5 p-6 lg:p-8">
        {isLoading && (
          <div className="panel flex items-center gap-3 px-5 py-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" /> Contacting CrimeNet AI backend…
          </div>
        )}
        {isError && (
          <div className="panel flex items-start gap-3 border-risk-medium/40 px-5 py-4 text-sm">
            <ServerCrash className="mt-0.5 size-4 text-risk-medium" />
            <div>
              <p className="text-foreground">Backend unavailable — showing offline demo data.</p>
              <p className="text-xs text-muted-foreground">{(error as Error)?.message}</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-64 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search case ID, title or location…"
              className="pl-9"
            />
          </div>
          <Select label="Crime" value={crimeType} onChange={setCrimeType} options={crimeTypes} />
          <Select
            label="Risk"
            value={risk}
            onChange={setRisk}
            options={["All", "Low", "Medium", "High", "Critical"]}
          />
        </div>

        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-4xl text-left text-sm">
              <thead className="bg-surface-2/70 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Case ID</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Crime Type</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-surface-2/50">
                    <td className="px-4 py-3 font-mono text-xs text-primary">{c.id}</td>
                    <td className="max-w-80 truncate px-4 py-3 text-foreground">{c.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.crimeType}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.location}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.date}</td>
                    <td className="px-4 py-3">
                      <span className="rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <RiskBadge score={c.riskScore} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild size="sm" variant="secondary" className="gap-1.5">
                        <Link to="/cases/$caseId" params={{ caseId: c.id }}>
                          <Eye className="size-3.5" /> View
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && !isLoading && (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <FileSearch className="size-8 text-muted-foreground" />
              <p className="text-sm text-foreground">No cases match your filters</p>
              <p className="text-xs text-muted-foreground">
                Adjust the search term, crime type or risk level.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
