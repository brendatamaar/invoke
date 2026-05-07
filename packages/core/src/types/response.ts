import type { AssertionResult } from "./assertion";
import type { KeyValue, RequestProtocol } from "./common";
import type { ProtocolRequestConfig } from "./protocols";

export interface Timing {
  dnsMs: number;
  tcpMs: number;
  tlsMs: number;
  ttfbMs: number;
  transferMs: number;
  totalMs: number;
}

export type TimingPhaseName = "dns" | "tcp" | "tls" | "ttfb" | "transfer";

export interface TimingPhase {
  name: TimingPhaseName;
  startMs: number;
  durationMs: number;
}

export interface TimingAttempt {
  url: string;
  status?: number;
  headers: KeyValue[];
  timing: Timing;
  phases: TimingPhase[];
  redirect: boolean;
}

export interface CertificateInfo {
  subject: string;
  issuer: string;
  notBefore: string;
  notAfter: string;
  dnsNames: string[];
  serialNumber: string;
  sha256Fingerprint: string;
}

export interface TlsInfo {
  version: string;
  cipherSuite: string;
  certificates: CertificateInfo[];
}

export interface ExecuteResponse {
  status: number;
  statusText: string;
  headers: KeyValue[];
  body: string;
  bodyEncoding?: "utf8" | "base64";
  timing: Timing;
  attempts?: TimingAttempt[];
  tls?: TlsInfo;
  redirects?: Array<{
    url: string;
    status: number;
    headers: KeyValue[];
    timing?: Timing;
    phases?: TimingPhase[];
  }>;
  requestSize: number;
  responseSize: number;
  error?: string;
}

export interface HistoryEntry {
  id: string;
  request: ProtocolRequestConfig;
  response?: ExecuteResponse;
  assertions?: AssertionResult[];
  environmentId?: string;
  requestId?: string;
  collectionId?: string;
  protocol?: RequestProtocol;
  createdAt: number;
  pinned?: boolean;
  label?: string;
}

export interface RetentionSettings {
  maxEntries: number;
  retentionDays: number;
}

export interface ResponseExample {
  id: string;
  name: string;
  requestId?: string;
  status: number;
  headers: KeyValue[];
  body: string;
  createdAt: number;
}

export interface RequestRunResult {
  requestId: string;
  name: string;
  method: string;
  url: string;
  status: "passed" | "failed" | "error" | "skipped";
  response?: ExecuteResponse;
  assertions?: AssertionResult[];
  durationMs: number;
  error?: string;
}

export interface CollectionRunResult {
  id: string;
  collectionId?: string;
  folderId?: string;
  name: string;
  startedAt: number;
  completedAt: number;
  status: "passed" | "failed" | "cancelled";
  results: RequestRunResult[];
  passedCount: number;
  failedCount: number;
}

export interface BatchRunConfig {
  iterations: number;
  concurrency: number;
  delayMs: number;
  stopOnFailure: boolean;
}

export interface BatchRunStats {
  total: number;
  passed: number;
  failed: number;
  statusCounts: Record<number, number>;
  minMs: number;
  maxMs: number;
  meanMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  errors: string[];
}
