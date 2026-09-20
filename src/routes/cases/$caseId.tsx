import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  Brain,
  Loader2,
  MapPin,
  ServerCrash,
  ShieldAlert,
  Users,
  Boxes,
  Download,
  Paperclip,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { RiskBadge, RiskMeter, riskColorVar } from "@/components/crime/RiskBadge";
import { Button } from "@/components/ui/button";
import { cases as mockCases, riskLevelFromScore, type CaseRecord } from "@/lib/mock-data";
import { casesApi, evidenceApi } from "@/services/api";

export const Route = createFileRoute("/cases/$caseId")({
  head: ({ params }) => ({
    meta: [
      { title: `Case ${params.caseId} — CrimeNet AI Case File` },
      {
        name: "description",
        content: `Full investigative file for case ${params.caseId}: entities, related persons, locations, transactions and AI-generated insights.`,
      },
      { property: "og:title", content: `Case ${params.caseId} — CrimeNet AI Case File` },
      {
        property: "og:description",
        content: "Entities, transactions and AI insights for this criminal investigation.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CaseDetail,
});

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Users;
  children: React.ReactNode;
}) {
  return (
    <div className="panel">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
        <Icon className="size-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function CaseDetail() {
  const { caseId } = Route.useParams();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["case", caseId],
    queryFn: () => casesApi.get(caseId),
    retry: false,
  });

  const evidenceQuery = useQuery({
    queryKey: ["case-evidence", caseId],
    queryFn: () => evidenceApi.listForCase(caseId),
    retry: false,
  });
  const evidence = evidenceQuery.data ?? [];

  const fallback = mockCases.find((c) => c.id === caseId);
  const record: CaseRecord | undefined = data ?? fallback;

  if (isLoading && !fallback) {
    return (
      <AppShell>
        <div className="flex min-h-screen items-center justify-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" /> Loading case file…
        </div>
      </AppShell>
    );
  }

  if (!record) {
    return (
      <AppShell>
        <div className="flex min-h-screen flex-col items-center justify-center gap-3">
          <ShieldAlert className="size-8 text-risk-high" />
          <p className="text-foreground">Case {caseId} not found</p>
          <Button asChild variant="secondary">
            <Link to="/cases">Back to cases</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const level = riskLevelFromScore(record.riskScore);

  return (
    <AppShell>
      <PageHeader
        title={record.title}
        subtitle={`${record.id} · ${record.crimeType} · ${record.location} · Registered ${record.date}`}
        actions={
          <Button asChild variant="secondary" className="gap-2">
            <Link to="/cases">
              <ArrowLeft className="size-4" /> All cases
            </Link>
          </Button>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">
        {isError && (
          <div className="panel flex items-start gap-3 border-risk-medium/40 px-5 py-4 text-sm">
            <ServerCrash className="mt-0.5 size-4 text-risk-medium" />
            <div>
              <p className="text-foreground">Backend unavailable — showing offline demo data.</p>
              <p className="text-xs text-muted-foreground">{(error as Error)?.message}</p>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Section title="Case Description" icon={Boxes}>
              <p className="text-sm leading-relaxed text-muted-foreground">{record.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                  Status: {record.status}
                </span>
                <RiskBadge score={record.riskScore} />
              </div>
            </Section>

            <Section title="Entities Identified" icon={Boxes}>
              <div className="flex flex-wrap gap-2">
                {record.entities.map((e) => (
                  <span
                    key={e}
                    className="rounded-md border border-primary/25 bg-primary/8 px-2.5 py-1 font-mono text-xs text-primary"
                  >
                    {e}
                  </span>
                ))}
              </div>
            </Section>

            <div className="grid gap-6 md:grid-cols-2">
              <Section title="Related Persons" icon={Users}>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {record.persons.map((p) => (
                    <li key={p} className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-primary" /> {p}
                    </li>
                  ))}
                </ul>
              </Section>
              <Section title="Related Locations" icon={MapPin}>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {record.locations.map((l) => (
                    <li key={l} className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-chart-2" /> {l}
                    </li>
                  ))}
                </ul>
              </Section>
            </div>

            <Section title="Related Transactions" icon={Banknote}>
              {record.transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No financial transactions linked to this case yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-2xl text-left text-sm">
                    <thead className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      <tr>
                        <th className="py-2">TXN</th>
                        <th className="py-2">From</th>
                        <th className="py-2">To</th>
                        <th className="py-2">Amount</th>
                        <th className="py-2">Date</th>
                        <th className="py-2">Flag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {record.transactions.map((t) => (
                        <tr key={t.id}>
                          <td className="py-2.5 font-mono text-xs text-primary">{t.id}</td>
                          <td className="py-2.5 text-muted-foreground">{t.from}</td>
                          <td className="py-2.5 text-muted-foreground">{t.to}</td>
                          <td className="py-2.5 font-mono text-foreground">{t.amount}</td>
                          <td className="py-2.5 font-mono text-xs text-muted-foreground">{t.date}</td>
                          <td className="py-2.5 text-xs text-risk-high">{t.flag}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
            <Section title="Evidence Files" icon={Paperclip}>
              {evidence.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No evidence attached yet.{" "}
                  <Link to="/evidence" className="text-primary underline-offset-2 hover:underline">
                    Upload a document
                  </Link>{" "}
                  for this case.
                </p>
              ) : (
                <ul className="space-y-2">
                  {evidence.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-md border border-border bg-surface-2/40 p-3"
                    >
                      <Paperclip className="size-4 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">{item.filename}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.kind} · {(item.size / 1024).toFixed(1)} KB · {item.uploadedBy}
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
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <div className="space-y-6">
            <div className="panel p-5 text-center">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                AI Case Risk Score
              </p>
              <p
                className="mt-2 font-mono text-6xl font-bold"
                style={{ color: riskColorVar(level) }}
              >
                {record.riskScore}
              </p>
              <RiskMeter score={record.riskScore} className="mt-4" />
              <div className="mt-4 flex justify-center">
                <RiskBadge level={level} />
              </div>
            </div>

            <Section title="AI-Generated Insights" icon={Brain}>
              <ul className="space-y-4">
                {record.insights.map((i) => (
                  <li key={i.title} className="rounded-md border border-border bg-surface-2/40 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{i.title}</p>
                      <RiskBadge level={i.risk} />
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {i.description}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-primary" style={{ width: `${i.confidence}%` }} />
                      </div>
                      <span className="font-mono text-[11px] text-primary">{i.confidence}%</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
