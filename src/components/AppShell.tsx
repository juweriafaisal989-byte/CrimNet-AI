import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FolderSearch,
  Boxes,
  Share2,
  BrainCircuit,
  ShieldAlert,
  Radar,
  FileText,
  Menu,
  Upload,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/cases", label: "Cases", icon: FolderSearch },
  { to: "/entities", label: "Entity Explorer", icon: Boxes },
  { to: "/graph", label: "Network Graph", icon: Share2 },
  { to: "/analytics", label: "Analytics", icon: BrainCircuit },
  { to: "/risk", label: "Risk Assessment", icon: ShieldAlert },
  { to: "/evidence", label: "Evidence", icon: FileText },
  { to: "/import", label: "Data Import", icon: Upload },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen lg:flex">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle navigation"
        className="fixed left-4 top-4 z-50 rounded-md border border-border bg-surface p-2 text-foreground lg:hidden"
      >
        {open ? <X className="size-4" /> : <Menu className="size-4" />}
      </button>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
          <div className="grid size-10 place-items-center rounded-md bg-primary/12 glow-ring">
            <Radar className="size-5 text-primary" />
          </div>
          <div>
            <p className="font-mono text-sm font-bold tracking-[0.18em] text-foreground text-glow">
              CRIMENET AI
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Network Intelligence
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-primary shadow-[inset_2px_0_0_0_var(--primary)]"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-md border border-border bg-surface/60 p-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              System status
            </p>
            <p className="mt-1 flex items-center gap-2 font-mono text-xs text-risk-low">
              <span className="size-2 animate-pulse rounded-full bg-risk-low" />
              GRAPH ENGINE ONLINE
            </p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              Neo4j · 2,481 nodes · 7,930 edges
            </p>
          </div>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-background/70 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <header className="relative overflow-hidden border-b border-border bg-surface/50 px-6 py-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 scan-grid" />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {actions}
      </div>
    </header>
  );
}
