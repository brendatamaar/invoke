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
}
