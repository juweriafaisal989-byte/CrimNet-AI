import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Paperclip,
  ServerCrash,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { StatCard } from "@/components/crime/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { casesApi, evidenceApi, type EvidenceRecord } from "@/services/api";
import type { CaseRecord } from "@/lib/mock-data";

export const Route = createFileRoute("/evidence")({
  head: () => ({
    meta: [
      { title: "Evidence Upload — CrimeNet AI Case Files" },
      {
        name: "description",
        content:
          "Upload statements, forensic reports, images and financial documents against any CrimeNet AI case and keep the full evidence chain in one place.",
      },
      { property: "og:title", content: "Evidence Upload — CrimeNet AI Case Files" },
      {
        property: "og:description",
        content: "Attach real documents and files to investigations and review them per case.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EvidencePage,
});

const kinds = ["Document", "Statement", "Forensic Report", "Financial Record", "Image", "Other"];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function EvidencePage() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [caseId, setCaseId] = useState("");
  const [kind, setKind] = useState(kinds[0]!);
  const [description, setDescription] = useState("");
  const [uploadedBy, setUploadedBy] = useState("Investigator");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpload, setLastUpload] = useState<EvidenceRecord | null>(null);

  const casesQuery = useQuery({
    queryKey: ["cases"],
    queryFn: () => casesApi.list() as Promise<CaseRecord[]>,
    retry: false,
  });

  const evidenceQuery = useQuery({
    queryKey: ["evidence"],
    queryFn: () => evidenceApi.listAll(),
    retry: false,
  });

  const cases = casesQuery.data ?? [];
  const items = evidenceQuery.data ?? [];

  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Choose a file to upload first.");
      if (!caseId) throw new Error("Select the case this evidence belongs to.");
      return evidenceApi.upload(caseId, file, { description, kind, uploadedBy });
    },
    onSuccess: (record) => {
      setLastUpload(record);
      setError(null);
      setFile(null);
      setDescription("");
      if (fileRef.current) fileRef.current.value = "";
      void queryClient.invalidateQueries({ queryKey: ["evidence"] });
      void queryClient.invalidateQueries({ queryKey: ["case", record.caseId] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: number) => evidenceApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["evidence"] }),
  });

  const grouped = useMemo(() => {
    const map = new Map<string, EvidenceRecord[]>();
    items.forEach((item) => {
      const list = map.get(item.caseId) ?? [];
      list.push(item);
      map.set(item.caseId, list);
    });
    return [...map.entries()];
  }, [items]);

  const totalSize = items.reduce((sum, i) => sum + i.size, 0);
  const offline = casesQuery.isError || evidenceQuery.isError;

  return (
    <AppShell>
      <PageHeader
        title="Evidence Upload"
        subtitle="Attach statements, forensic reports, images and financial documents to a case. Uploaded files are stored by the backend and shown on the case file."
        actions={
          <span className="rounded-full border border-border px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
            {offline ? "SOURCE · BACKEND OFFLINE" : "SOURCE · LIVE BACKEND"}
          </span>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        {offline && (
          <div className="panel flex items-start gap-3 border-risk-medium/40 px-5 py-4 text-sm">
            <ServerCrash className="mt-0.5 size-4 text-risk-medium" />
            <div>
              <p className="text-foreground">Backend unavailable — evidence cannot be uploaded right now.</p>
              <p className="text-xs text-muted-foreground">
                Start the FastAPI server, then reload this page.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Evidence Files" value={items.length} icon={Paperclip} />
          <StatCard label="Cases With Evidence" value={grouped.length} icon={FileText} tone="low" />
          <StatCard label="Total Stored" value={formatBytes(totalSize)} icon={UploadCloud} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[24rem_1fr]">
          <section className="panel">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground">
                Upload Evidence
              </h2>
            </div>
            <form
              className="space-y-4 p-5"
              onSubmit={(e) => {
                e.preventDefault();
                upload.mutate();
              }}
            >
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Case
                </label>
                <select
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground"
                >
                  <option value="">Select a case…</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} — {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Evidence Type
                </label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground"
                >
                  {kinds.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  File
                </label>
                <Input
                  ref={fileRef}
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="h-auto py-2 text-xs"
                />
                {file && (
                  <p className="font-mono text-[11px] text-primary">
                    {file.name} · {formatBytes(file.size)}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Uploaded By
                </label>
                <Input value={uploadedBy} onChange={(e) => setUploadedBy(e.target.value)} className="h-9" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Description
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this document show?"
                  rows={3}
                />
              </div>

              {error && <p className="text-xs text-risk-high">{error}</p>}

              <Button type="submit" className="w-full gap-2" disabled={upload.isPending}>
                {upload.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <UploadCloud className="size-4" />
                )}
                Upload to case
              </Button>

              {lastUpload && (
                <div className="flex items-start gap-2 rounded-md border border-risk-low/40 bg-risk-low/8 p-3 text-xs">
                  <CheckCircle2 className="mt-0.5 size-4 text-risk-low" />
                  <p className="text-muted-foreground">
                    Saved <span className="text-foreground">{lastUpload.filename}</span> to{" "}
                    <Link
                      to="/cases/$caseId"
                      params={{ caseId: lastUpload.caseId }}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {lastUpload.caseId}
                    </Link>
                    .
                  </p>
                </div>
              )}
            </form>
          </section>

          <section className="panel">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground">
                Evidence Locker
              </h2>
              <span className="font-mono text-[11px] text-muted-foreground">
                {items.length} FILE{items.length === 1 ? "" : "S"}
              </span>
            </div>

            {evidenceQuery.isLoading ? (
              <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" /> Loading evidence…
              </div>
            ) : grouped.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No evidence uploaded yet. Attach the first document using the form.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {grouped.map(([id, list]) => (
                  <div key={id} className="p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <Link
                        to="/cases/$caseId"
                        params={{ caseId: id }}
                        className="font-mono text-xs text-primary underline-offset-2 hover:underline"
                      >
                        {id}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {cases.find((c) => c.id === id)?.title ?? "Case"}
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {list.map((item) => (
                        <li
                          key={item.id}
                          className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface-2/40 p-3"
                        >
                          <FileText className="size-4 shrink-0 text-primary" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-foreground">{item.filename}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {item.kind} · {formatBytes(item.size)} · {item.uploadedBy} ·{" "}
                              {new Date(item.uploadedAt).toLocaleString()}
                            </p>
                            {item.description && (
                              <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                            )}
                          </div>
                          <a
                            href={evidenceApi.downloadUrl(item)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md border border-border p-2 text-muted-foreground hover:text-primary"
                            aria-label={`Download ${item.filename}`}
                          >
                            <Download className="size-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => remove.mutate(item.id)}
                            className="rounded-md border border-border p-2 text-muted-foreground hover:text-risk-high"
                            aria-label={`Delete ${item.filename}`}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
