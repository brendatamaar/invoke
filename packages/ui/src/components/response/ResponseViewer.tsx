import { useStore } from "../../store";
import { CodeEditor } from "../editors/CodeEditor";
import { StatusBadge } from "../shared/StatusBadge";
import type { ResponseTab } from "../../lib/types";
import { Clock, HardDrive, Shield, Cookie, CheckCircle, Code2, List } from "lucide-react";

const TABS: { id: ResponseTab; label: string; icon?: React.ReactNode }[] = [
  { id: "body",       label: "Body" },
  { id: "headers",    label: "Headers",    icon: <List size={11} /> },
  { id: "timing",     label: "Timing",     icon: <Clock size={11} /> },
  { id: "tls",        label: "TLS",        icon: <Shield size={11} /> },
  { id: "assertions", label: "Assertions", icon: <CheckCircle size={11} /> },
  { id: "code",       label: "Code",       icon: <Code2 size={11} /> }
];

function fmt(n: number) { return n < 1000 ? `${n}ms` : `${(n / 1000).toFixed(2)}s`; }
function fmtSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function ResponseViewer() {
  const { response, responseTab, set, streaming, streamBytes, assertionResults } = useStore();

  if (!response && !streaming) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-8">
        <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center mb-2">
          <Code2 size={18} className="text-[var(--text-3)]" />
        </div>
        <p className="text-sm text-[var(--text-2)] font-medium">Send a request to see the response</p>
        <p className="text-xs text-[var(--text-3)]">Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)] font-mono text-2xs">Ctrl+Enter</kbd> to send</p>
      </div>
    );
  }

  const passedCount = assertionResults.filter((r) => r.passed).length;
  const totalCount = assertionResults.length;

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      {response && (
        <div className="flex items-center gap-3 px-3 py-2 border-b border-[var(--border)] bg-[var(--surface-2)]">
          <StatusBadge status={response.status} />
          <span className="text-xs text-[var(--text-2)] font-mono">{response.statusText}</span>
          <span className="ml-auto text-2xs text-[var(--text-3)] flex items-center gap-1">
            <Clock size={11} /> {fmt(response.timing?.totalMs ?? 0)}
          </span>
          <span className="text-2xs text-[var(--text-3)] flex items-center gap-1">
            <HardDrive size={11} /> {fmtSize(response.responseSize ?? 0)}
          </span>
          {totalCount > 0 && (
            <span className={`text-2xs flex items-center gap-1 ${passedCount === totalCount ? "text-emerald-600" : "text-red-600"}`}>
              <CheckCircle size={11} /> {passedCount}/{totalCount}
            </span>
          )}
        </div>
      )}

      {streaming && !response && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] bg-[var(--accent-subtle)]">
          <span className="text-xs text-[var(--accent)] animate-pulse">Streaming…</span>
          <span className="text-2xs text-[var(--text-3)]">{fmtSize(streamBytes)}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-[var(--border)]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => set({ responseTab: tab.id })}
            className={`tab-btn flex items-center gap-1 ${responseTab === tab.id ? "active" : ""}`}
          >
            {tab.icon} {tab.label}
            {tab.id === "assertions" && totalCount > 0 && (
              <span className={`ml-0.5 text-2xs px-1 rounded ${passedCount === totalCount ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                {passedCount}/{totalCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {responseTab === "body"    && <BodyTab />}
        {responseTab === "headers" && <HeadersTab />}
        {responseTab === "timing"  && <TimingTab />}
        {responseTab === "tls"     && <TLSTab />}
        {responseTab === "assertions" && <AssertionsTab />}
        {responseTab === "code"    && <CodeTab />}
      </div>
    </div>
  );
}

// ── Body tab ─────────────────────────────────────────────────

function BodyTab() {
  const { response, responsePretty, set } = useStore();
  if (!response) return null;

  const ct = (Array.isArray(response.headers) ? response.headers.find(h => h.key.toLowerCase() === "content-type")?.value : "") ?? "";
  const isJson = ct.includes("json") || (() => { try { JSON.parse(response.body); return true; } catch { return false; } })();
  const lang = isJson ? "json" : ct.includes("xml") || ct.includes("html") ? "xml" : "text";
  const displayBody = (isJson && responsePretty)
    ? (() => { try { return JSON.stringify(JSON.parse(response.body), null, 2); } catch { return response.body; } })()
    : response.body;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)]">
        <span className="text-2xs text-[var(--text-3)] font-mono">{ct || "text/plain"}</span>
        {isJson && (
          <button onClick={() => set({ responsePretty: !responsePretty })} className={`ml-auto tab-btn text-2xs ${responsePretty ? "active" : ""}`}>
            Pretty
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        <CodeEditor value={displayBody} lang={lang} readOnly />
      </div>
    </div>
  );
}

// ── Headers tab ──────────────────────────────────────────────

function HeadersTab() {
  const { response } = useStore();
  if (!response) return null;
  const headers = Array.isArray(response.headers) ? response.headers : [];
  return (
    <div className="divide-y divide-[var(--border)]">
      {headers.map((h, i) => (
        <div key={i} className="flex items-start gap-4 px-3 py-2 hover:bg-[var(--surface-2)]">
          <span className="text-xs font-mono font-medium text-[var(--text-1)] w-48 shrink-0 truncate">{h.key}</span>
          <span className="text-xs font-mono text-[var(--text-2)] break-all">{h.value}</span>
        </div>
      ))}
      {!headers.length && <p className="p-4 text-xs text-[var(--text-3)]">No headers</p>}
    </div>
  );
}

// ── Timing tab ───────────────────────────────────────────────

const PHASES = [
  { key: "dnsMs",      label: "DNS Lookup",         color: "bg-purple-400" },
  { key: "tcpMs",      label: "TCP Connection",     color: "bg-blue-400" },
  { key: "tlsMs",      label: "TLS Handshake",      color: "bg-yellow-400" },
  { key: "ttfbMs",     label: "Time to First Byte", color: "bg-orange-400" },
  { key: "transferMs", label: "Transfer",           color: "bg-emerald-400" }
] as const;

function TimingTab() {
  const { response } = useStore();
  if (!response?.timing) return <p className="p-4 text-xs text-[var(--text-3)]">No timing data</p>;
  const t = response.timing as unknown as Record<string, number>;
  const total = t.totalMs || 1;

  return (
    <div className="p-4 flex flex-col gap-3">
      <p className="text-xs text-[var(--text-2)] font-medium">Total: {fmt(response.timing.totalMs)}</p>
      {PHASES.map(({ key, label, color }) => {
        const val = t[key] ?? 0;
        const pct = (val / total) * 100;
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-2)] w-36 shrink-0">{label}</span>
            <div className="flex-1 h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(pct, 0.5)}%` }} />
            </div>
            <span className="text-xs font-mono text-[var(--text-3)] w-16 text-right">{fmt(val)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── TLS tab ──────────────────────────────────────────────────

function TLSTab() {
  const { response } = useStore();
  const tls = (response as unknown as { tls?: { version?: string; cipher?: string; certificates?: { subject: string; issuer: string; validFrom: string; validTo: string }[] } })?.tls;
  if (!tls) return <p className="p-4 text-xs text-[var(--text-3)]">No TLS data</p>;
  return (
    <div className="p-4 flex flex-col gap-3">
      <Row label="Protocol" value={tls.version ?? "—"} />
      <Row label="Cipher" value={tls.cipher ?? "—"} />
      {tls.certificates?.map((cert, i) => (
        <div key={i} className="border border-[var(--border)] rounded p-3 flex flex-col gap-1.5">
          <span className="text-2xs font-semibold text-[var(--text-3)] uppercase">Certificate {i + 1}</span>
          <Row label="Subject" value={cert.subject} />
          <Row label="Issuer" value={cert.issuer} />
          <Row label="Valid from" value={cert.validFrom} />
          <Row label="Valid to" value={cert.validTo} />
        </div>
      ))}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-xs text-[var(--text-3)] w-24 shrink-0">{label}</span>
      <span className="text-xs font-mono text-[var(--text-1)] break-all">{value}</span>
    </div>
  );
}

// ── Assertions tab ───────────────────────────────────────────

function AssertionsTab() {
  const { assertionResults, assertionRules } = useStore();
  if (!assertionResults.length) return <p className="p-4 text-xs text-[var(--text-3)]">No assertions configured</p>;
  return (
    <div className="divide-y divide-[var(--border)]">
      {assertionResults.map((result, i) => {
        const rule = assertionRules[i];
        return (
          <div key={i} className={`flex items-start gap-3 px-3 py-2.5 ${result.passed ? "" : "bg-red-50"}`}>
            <span className={`mt-0.5 text-sm ${result.passed ? "text-emerald-600" : "text-red-600"}`}>{result.passed ? "✓" : "✗"}</span>
            <div className="flex-1">
              <p className="text-xs text-[var(--text-1)]">{rule ? `${rule.type} ${rule.matcher} ${rule.expected}` : `Assertion ${i + 1}`}</p>
              {!result.passed && (
                <p className="text-2xs text-[var(--text-3)] font-mono mt-0.5">got: {String(result.actual)}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Code tab ─────────────────────────────────────────────────

const CODE_TARGETS = [
  "curl", "fetch", "node-fetch", "node-axios",
  "python-requests", "python-httpx",
  "go-net-http", "java-okhttp", "kotlin-okhttp",
  "ruby-net-http", "php-guzzle", "csharp-httpclient",
  "rust-reqwest", "powershell", "httpie"
] as const;

function CodeTab() {
  const { codeTarget, codeSnippet, codeLoading, set } = useStore();
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)]">
        <select
          value={codeTarget}
          onChange={(e) => set({ codeTarget: e.target.value as typeof codeTarget })}
          className="input text-2xs py-0.5 w-40"
        >
          {CODE_TARGETS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {codeLoading && <span className="text-2xs text-[var(--text-3)]">Generating…</span>}
      </div>
      <div className="flex-1 overflow-auto">
        <CodeEditor value={codeSnippet} lang={codeTarget === "curl" ? "text" : "text"} readOnly />
      </div>
    </div>
  );
}
