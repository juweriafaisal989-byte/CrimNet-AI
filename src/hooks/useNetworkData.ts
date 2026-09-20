/**
 * Shared hooks that pull entities, relationships and the network graph from the
 * FastAPI backend, falling back to bundled demo data when the server is offline.
 */
import { useQuery } from "@tanstack/react-query";
import { entitiesApi, graphApi } from "@/services/api";
import {
  entities as demoEntities,
  graphEdges as demoEdges,
  graphNodes as demoNodes,
  type EntityRecord,
  type EntityType,
  type GraphEdge,
  type GraphNode,
  type GraphNodeType,
  type RelationType,
} from "@/lib/mock-data";

const entityTypes: EntityType[] = [
  "Person",
  "Phone Number",
  "Bank Account",
  "Location",
  "Vehicle",
  "Organization",
];

const relationTypes: RelationType[] = [
  "KNOWS",
  "CALLED",
  "TRANSFERRED_MONEY_TO",
  "ASSOCIATED_WITH",
  "LOCATED_AT",
  "INVOLVED_IN",
];

function asEntityType(value: unknown): EntityType {
  return entityTypes.includes(value as EntityType) ? (value as EntityType) : "Person";
}

function asRelationType(value: unknown): RelationType {
  return relationTypes.includes(value as RelationType)
    ? (value as RelationType)
    : "ASSOCIATED_WITH";
}

interface BackendEntity {
  id: string;
  name: string;
  type: string;
  riskScore: number;
  aliases?: string[];
  firstSeen?: string | null;
  lastSeen?: string | null;
  notes?: string;
  suspiciousActivities?: string[];
  riskFactors?: { factor: string; weight: number; detail: string }[];
  cases?: string[];
  connections?: number;
  relationships?: { target: string; type: string; detail: string }[];
}

function toEntityRecord(raw: BackendEntity): EntityRecord {
  return {
    id: raw.id,
    name: raw.name,
    type: asEntityType(raw.type),
    connections: raw.connections ?? 0,
    cases: raw.cases ?? [],
    riskScore: raw.riskScore ?? 0,
    ...(raw.aliases?.length ? { aliases: raw.aliases } : {}),
    firstSeen: raw.firstSeen ?? "—",
    lastSeen: raw.lastSeen ?? "—",
    notes: raw.notes ?? "",
    suspiciousActivities: raw.suspiciousActivities ?? [],
    riskFactors: raw.riskFactors ?? [],
    relationships: (raw.relationships ?? []).map((r) => ({
      target: r.target,
      type: asRelationType(r.type),
      detail: r.detail,
    })),
  };
}

/** Entities resolved by the backend, or the demo set when the API is unreachable. */
export function useEntities() {
  const query = useQuery({
    queryKey: ["entities"],
    queryFn: () => entitiesApi.list() as Promise<BackendEntity[]>,
    retry: false,
    staleTime: 15_000,
  });

  const live = Array.isArray(query.data) && query.data.length > 0;
  return {
    entities: live ? query.data!.map(toEntityRecord) : demoEntities,
    isLive: live,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

interface BackendGraph {
  nodes: { id: string; label: string; type: string; riskScore: number; cases?: string[]; detail?: string }[];
  edges: { source: string; target: string; type: string; detail?: string }[];
}

function nodeTypeFor(type: string, riskScore: number): GraphNodeType {
  if (type === "Organization") return "Organization";
  if (type === "Phone Number") return "Phone Number";
  if (type === "Bank Account") return "Bank Account";
  if (type === "Location" || type === "Vehicle") return "Location";
  return riskScore >= 50 ? "Suspect" : "Victim";
}

/**
 * Deterministic radial layout: high-risk hubs sit near the centre, the rest are
 * placed on concentric rings so the SVG graph stays readable without a physics engine.
 */
function layout(nodes: BackendGraph["nodes"], edges: BackendGraph["edges"]) {
  const degree = new Map<string, number>();
  edges.forEach((e) => {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  });
  const ordered = [...nodes].sort(
    (a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) || b.riskScore - a.riskScore,
  );
  const centre = { x: 620, y: 360 };
  const positions = new Map<string, { x: number; y: number }>();
  let index = 0;
  let ring = 0;
  while (index < ordered.length) {
    const capacity = ring === 0 ? 1 : Math.min(6 + ring * 4, ordered.length - index);
    const radius = ring * 190;
    for (let i = 0; i < capacity && index < ordered.length; i++, index++) {
      const angle = (i / capacity) * Math.PI * 2 + ring * 0.6;
      positions.set(ordered[index]!.id, {
        x: centre.x + Math.cos(angle) * radius,
        y: centre.y + Math.sin(angle) * radius * 0.78,
      });
    }
    ring++;
  }
  return positions;
}

/** Network graph nodes and edges from the backend, or demo data when offline. */
export function useGraph() {
  const query = useQuery({
    queryKey: ["graph"],
    queryFn: () => graphApi.get() as Promise<BackendGraph>,
    retry: false,
    staleTime: 15_000,
  });

  const data = query.data;
  const live = !!data && Array.isArray(data.nodes) && data.nodes.length > 0;

  if (!live) {
    return {
      nodes: demoNodes,
      edges: demoEdges,
      isLive: false,
      isLoading: query.isLoading,
      error: query.error as Error | null,
      refetch: query.refetch,
    };
  }

  const positions = layout(data!.nodes, data!.edges ?? []);
  const nodes: GraphNode[] = data!.nodes.map((n) => {
    const pos = positions.get(n.id) ?? { x: 620, y: 360 };
    return {
      id: n.id,
      label: n.label,
      type: nodeTypeFor(n.type, n.riskScore),
      riskScore: n.riskScore,
      cases: n.cases ?? [],
      x: Math.round(pos.x),
      y: Math.round(pos.y),
      detail: n.detail ?? `${n.type} resolved from case data.`,
    };
  });
  const ids = new Set(nodes.map((n) => n.id));
  const edges: GraphEdge[] = (data!.edges ?? [])
    .filter((e) => ids.has(e.source) && ids.has(e.target))
    .map((e) => ({
      source: e.source,
      target: e.target,
      type: asRelationType(e.type),
      detail: e.detail ?? "",
    }));

  return {
    nodes,
    edges,
    isLive: true,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

/** Small badge text used across pages to show where the data came from. */
export function sourceLabel(isLive: boolean) {
  return isLive ? "SOURCE · LIVE BACKEND" : "SOURCE · OFFLINE DEMO DATA";
}
