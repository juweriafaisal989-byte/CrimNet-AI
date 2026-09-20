/**
 * Centralized API service layer for the CrimeNet AI FastAPI backend.
 * Base URL comes from VITE_API_BASE_URL (see .env).
 */
import type { CaseRecord } from "@/lib/mock-data";

export const API_BASE_URL =
  (import.meta.env['VITE_API_BASE_URL'] as string | undefined) ?? "http://127.0.0.1:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      ...init,
    });
  } catch {
    throw new ApiError(
      `Cannot reach the CrimeNet AI backend at ${API_BASE_URL}. Is the FastAPI server running?`,
      0,
    );
  }

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body?.detail) detail = body.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(detail || `Request failed (${response.status})`, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export interface CreateCasePayload {
  id?: string;
  title: string;
  crimeType: string;
  location: string;
  date?: string;
  status?: CaseRecord["status"];
  description: string;
  entities?: string[];
  persons?: string[];
  locations?: string[];
}

export interface ImportResult {
  casesImported: number;
  entitiesImported: number;
  relationshipsImported: number;
  skipped: string[];
}

export interface BackendStats {
  cases: number;
  entities: number;
  relationships: number;
  highRiskCases: number;
  openCases: number;
}

export const casesApi = {
  list: () => request<CaseRecord[]>("/cases"),
  get: (caseId: string) => request<CaseRecord>(`/cases/${encodeURIComponent(caseId)}`),
  create: (payload: CreateCasePayload) =>
    request<CaseRecord>("/cases", { method: "POST", body: JSON.stringify(payload) }),
  remove: (caseId: string) =>
    request<void>(`/cases/${encodeURIComponent(caseId)}`, { method: "DELETE" }),
};

export const entitiesApi = {
  list: () => request<unknown[]>("/entities"),
  get: (id: string) => request<unknown>(`/entities/${encodeURIComponent(id)}`),
};

export const graphApi = {
  get: () => request<unknown>("/graph"),
};

export interface AnalyticsInsight {
  title: string;
  description: string;
  confidence: number;
  risk: "Low" | "Medium" | "High" | "Critical";
}

export interface CentralityRow {
  id: string;
  name: string;
  type: string;
  degree: number;
  betweenness: number;
  pagerank: number;
  riskScore: number;
}

export interface AnalyticsOverview {
  centrality: CentralityRow[];
  anomalies: AnalyticsInsight[];
  hiddenConnections: AnalyticsInsight[];
  suspiciousActivity: AnalyticsInsight[];
  crimePatterns: AnalyticsInsight[];
  monthlyActivity: { month: string; cases: number; alerts: number }[];
  anomalyTimeline: { day: string; score: number; baseline: number; cases: number }[];
  summary: {
    insights: number;
    anomalies: number;
    criticalAnomalies: number;
    hiddenLinks: number;
    avgConfidence: number;
    modelsActive: number;
  };
}

export const analyticsApi = {
  stats: () => request<BackendStats>("/stats"),
  overview: () => request<AnalyticsOverview>("/analytics/overview"),
  anomalies: () => request<AnalyticsInsight[]>("/analytics/anomalies"),
  centrality: () => request<CentralityRow[]>("/analytics/centrality"),
  riskScores: () => request<unknown[]>("/analytics/risk-scores"),
  recompute: () => request<{ entitiesRescored: number }>("/analytics/recompute", { method: "POST" }),
};

export interface EvidenceRecord {
  id: number;
  caseId: string;
  filename: string;
  contentType: string;
  size: number;
  kind: string;
  description: string;
  uploadedBy: string;
  uploadedAt: string;
  downloadUrl: string;
}

export const evidenceApi = {
  listAll: () => request<EvidenceRecord[]>("/evidence"),
  listForCase: (caseId: string) =>
    request<EvidenceRecord[]>(`/cases/${encodeURIComponent(caseId)}/evidence`),
  remove: (id: number) => request<void>(`/evidence/${id}`, { method: "DELETE" }),
  downloadUrl: (item: EvidenceRecord) => `${API_BASE_URL}${item.downloadUrl}`,
  upload: async (
    caseId: string,
    file: File,
    meta: { description?: string; kind?: string; uploadedBy?: string } = {},
  ) => {
    const form = new FormData();
    form.append("file", file);
    form.append("description", meta.description ?? "");
    form.append("kind", meta.kind ?? "Document");
    form.append("uploaded_by", meta.uploadedBy ?? "Investigator");
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/cases/${encodeURIComponent(caseId)}/evidence`, {
        method: "POST",
        body: form,
      });
    } catch {
      throw new ApiError(
        `Cannot reach the CrimeNet AI backend at ${API_BASE_URL}. Is the FastAPI server running?`,
        0,
      );
    }
    if (!response.ok) {
      let detail = response.statusText;
      try {
        const body = (await response.json()) as { detail?: string };
        if (body?.detail) detail = body.detail;
      } catch {
        /* non-JSON error body */
      }
      throw new ApiError(detail || `Upload failed (${response.status})`, response.status);
    }
    return (await response.json()) as EvidenceRecord;
  },
};

export type ImportKind = "cases" | "entities" | "relationships";

export const importApi = {
  /** Bulk import already-parsed JSON records. */
  json: (payload: {
    cases?: unknown[];
    entities?: unknown[];
    relationships?: unknown[];
    replace?: boolean;
  }) => request<ImportResult>("/import", { method: "POST", body: JSON.stringify(payload) }),

  /** Upload a raw CSV or JSON file. */
  file: async (file: File, kind: ImportKind, replace: boolean) => {
    const form = new FormData();
    form.append("file", file);
    const url = `${API_BASE_URL}/import/file?kind=${kind}&replace=${replace}`;
    let response: Response;
    try {
      response = await fetch(url, { method: "POST", body: form });
    } catch {
      throw new ApiError(
        `Cannot reach the CrimeNet AI backend at ${API_BASE_URL}. Is the FastAPI server running?`,
        0,
      );
    }
    if (!response.ok) {
      let detail = response.statusText;
      try {
        const body = (await response.json()) as { detail?: string };
        if (body?.detail) detail = body.detail;
      } catch {
        /* non-JSON error body */
      }
      throw new ApiError(detail || `Import failed (${response.status})`, response.status);
    }
    return (await response.json()) as ImportResult;
  },
};

