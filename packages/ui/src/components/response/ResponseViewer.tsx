import { useState } from "react";
import { useStore, coreStore } from "../../store";
import { CodeEditor } from "../editors/CodeEditor";
import { StatusBadge } from "../shared/StatusBadge";
import { Select } from "../shared/Select";
import type { ResponseTab } from "../../lib/types";
import type {
  AssertionMatcher,
  AssertionType,
  ExtractionSource,
  TimingPhaseName,
  Timing,
  TimingAttempt,
} from "@invoke/core";
import {
  Clock,
  HardDrive,
  Shield,
  CheckCircle,
  Code2,
  List,
  PlusCircle,
  Wand2,
  BookmarkPlus,
  Cpu,
  KeyRound,
} from "lucide-react";

const TABS: { id: ResponseTab; label: string; icon?: React.ReactNode }[] = [
  { id: "body", label: "Body" },
  { id: "headers", label: "Headers", icon: <List size={11} /> },
  { id: "timing", label: "Timing", icon: <Clock size={11} /> },
  { id: "tls", label: "TLS", icon: <Shield size={11} /> },
  { id: "assertions", label: "Assertions", icon: <CheckCircle size={11} /> },
  { id: "auth", label: "Auth", icon: <KeyRound size={11} /> },
  { id: "code", label: "Code", icon: <Code2 size={11} /> },
];

function fmt(n: number) {
  return n < 1000 ? `${n}ms` : `${(n / 1000).toFixed(2)}s`;
}
function fmtSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

// Quick-create assertion overlay
interface AssertionDraft {
  type: AssertionType;
  expression: string;
  matcher: AssertionMatcher;
  expected: string;
}

function QuickAssertionOverlay({
  draft,
  onConfirm,
  onClose,
}: {
  draft: AssertionDraft;
  onConfirm: (d: AssertionDraft) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState(draft);
  const needsExpr =
    d.type === "header" || d.type === "bodyJsonPath" || d.type === "regex";

  return (
    <div className="absolute z-20 right-3 top-12 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl p-3 flex flex-col gap-2 w-72">
      <span className="text-2xs font-semibold text-[var(--text-3)] uppercase">
        Quick assertion
      </span>
      <div className="flex gap-1.5">
        <Select
          size="2xs"
          value={d.type}
          onChange={(e) => setD((x) => ({ ...x, type: e.target.value as AssertionType }))}
        >
          {["status", "responseTime", "header", "bodyJsonPath", "bodySchema", "regex"].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
        <Select
          size="2xs"
          value={d.matcher}
          onChange={(e) => setD((x) => ({ ...x, matcher: e.target.value as AssertionMatcher }))}
        >
          {["equals", "notEquals", "contains", "exists", "gt", "lt", "matches"].map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </Select>
      </div>
      {needsExpr && (
        <input
          value={d.expression}
          onChange={(e) => setD((x) => ({ ...x, expression: e.target.value }))}
          placeholder={d.type === "header" ? "Header-Name" : "$.path"}
          className="input text-2xs py-0.5 font-mono"
        />
      )}
      <input
        value={d.expected}
        onChange={(e) => setD((x) => ({ ...x, expected: e.target.value }))}
        placeholder="expected"
        className="input text-2xs py-0.5 font-mono"
      />
      <div className="flex gap-1.5 justify-end">
        <button onClick={onClose} className="btn text-2xs py-0.5 px-2">
          Cancel
        </button>
        <button
          onClick={() => onConfirm(d)}
          className="btn btn-primary text-2xs py-0.5 px-2"
        >
          Add assertion
        </button>
      </div>
    </div>
  );
}

// Quick-create extraction overlay
interface ExtractionDraft {
  variableName: string;
  source: ExtractionSource;
  expression: string;
}

function QuickExtractionOverlay({
  draft,
  onConfirm,
  onClose,
}: {
  draft: ExtractionDraft;
  onConfirm: (d: ExtractionDraft) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState(draft);
  const needsExpr = d.source !== "status";

  return (
    <div className="absolute z-20 right-3 top-12 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl p-3 flex flex-col gap-2 w-72">
      <span className="text-2xs font-semibold text-[var(--text-3)] uppercase">
        Quick extraction
      </span>
      <input
        value={d.variableName}
        onChange={(e) => setD((x) => ({ ...x, variableName: e.target.value }))}
        placeholder="variableName"
        className="input text-2xs py-0.5 font-mono"
      />
      <div className="flex gap-1.5">
        <Select
          size="2xs"
          value={d.source}
          onChange={(e) => setD((x) => ({ ...x, source: e.target.value as ExtractionSource }))}
        >
          {["body", "header", "status"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
        {needsExpr && (
          <input
            value={d.expression}
            onChange={(e) => setD((x) => ({ ...x, expression: e.target.value }))}
            placeholder={d.source === "header" ? "Header-Name" : "$.path"}
            className="input text-2xs py-0.5 font-mono flex-1"
          />
        )}
      </div>
      <div className="flex gap-1.5 justify-end">
        <button onClick={onClose} className="btn text-2xs py-0.5 px-2">
          Cancel
        </button>
        <button
          onClick={() => onConfirm(d)}
          className="btn btn-primary text-2xs py-0.5 px-2"
        >
          Add rule
        </button>
      </div>
    </div>
  );
}

export function ResponseViewer() {
  const {
    response,
    responseTab,
    set,
    streaming,
    streamBytes,
    assertionResults,
    assertionRules,
    extractRules,
    request,
    responseExamples,
    mockRoutes,
    addToast,
  } = useStore();

  const [overlay, setOverlay] = useState<
    | { kind: "assertion"; draft: AssertionDraft }
    | { kind: "extraction"; draft: ExtractionDraft }
    | { kind: "saveExample" }
    | null
  >(null);
  const [exampleName, setExampleName] = useState("");

  if (!response && !streaming) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-8">
        <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center mb-2">
          <Code2 size={18} className="text-[var(--text-3)]" />
        </div>
        <p className="text-sm text-[var(--text-2)] font-medium">
          Send a request to see the response
        </p>
        <p className="text-xs text-[var(--text-3)]">
          Press{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)] font-mono text-2xs">
            Ctrl+Enter
          </kbd>{" "}
          to send
        </p>
      </div>
    );
  }

  if (response?.status === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-8">
        <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mb-2">
          <Code2 size={18} className="text-red-400" />
        </div>
        <p className="text-sm text-[var(--text-2)] font-medium">
          Request failed
        </p>
        {response.error && (
          <p className="text-xs text-red-500 font-mono max-w-md break-all">
            {response.error}
          </p>
        )}
      </div>
    );
  }

  const passedCount = assertionResults.filter((r) => r.passed).length;
  const totalCount = assertionResults.length;

  const addAssertion = (draft: AssertionDraft) => {
    set((s) => ({
      assertionRules: [
        ...s.assertionRules,
        {
          id: Math.random().toString(36).slice(2),
          ...draft,
          enabled: true,
        },
      ],
      requestTab: "assertions",
    }));
    setOverlay(null);
    addToast("success", "Assertion added");
  };

  const addExtraction = (draft: ExtractionDraft) => {
    set((s) => ({
      extractRules: [
        ...s.extractRules,
        { id: Math.random().toString(36).slice(2), ...draft, enabled: true },
      ],
      requestTab: "extract",
    }));
    setOverlay(null);
    addToast("success", "Extraction rule added");
  };

  const saveExample = async () => {
    if (!response) return;
    const name = exampleName.trim() || `Example ${responseExamples.length + 1}`;
    const req = request as { id?: string };
    const example = {
      id: Math.random().toString(36).slice(2),
      name,
      requestId: req?.id,
      status: response.status,
      headers: response.headers,
      body: response.body,
      createdAt: Date.now(),
    };
    try {
      await coreStore.saveResponseExample(example);
      set((s) => ({ responseExamples: [...s.responseExamples, example] }));
      addToast("success", `Saved as "${name}"`);
    } catch (e) {
      addToast("error", String(e));
    }
    setOverlay(null);
    setExampleName("");
  };

  const createMock = () => {
    if (!response) return;
    const req = request as { method?: string; url?: string };
    let path = "/";
    try {
      path = new URL(req?.url ?? "").pathname || "/";
    } catch {
      path = req?.url ?? "/";
    }
    const newRoute = {
      id: Math.random().toString(36).slice(2),
      enabled: true,
      method: (req?.method ?? "GET") as import("@invoke/core").HttpMethod,
      pathPattern: path,
      status: response.status,
      headers: response.headers.filter(
        (h) =>
          !["content-encoding", "transfer-encoding", "connection"].includes(
            h.key.toLowerCase(),
          ),
      ),
      body: response.body,
      latencyMs: 0,
    };
    set((s) => ({
      mockRoutes: [...s.mockRoutes, newRoute],
      sidebarSection: "mocks",
    }));
    addToast("success", "Mock route created");
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Status bar */}
      {response && (
        <div className="flex items-center gap-3 px-3 py-2 border-b border-[var(--border)] bg-[var(--surface-2)]">
          <StatusBadge status={response.status} />
          {/* Quick assertion from status */}
          <button
            onClick={() =>
              setOverlay({
                kind: "assertion",
                draft: {
                  type: "status",
                  expression: "",
                  matcher: "equals",
                  expected: String(response.status),
                },
              })
            }
            className="text-[var(--text-3)] hover:text-[var(--accent)] p-0.5"
            title="Create assertion from status"
          >
            <PlusCircle size={11} />
          </button>
          <span className="ml-auto text-2xs text-[var(--text-3)] flex items-center gap-1">
            <Clock size={11} /> {fmt(response.timing?.totalMs ?? 0)}
          </span>
          <span className="text-2xs text-[var(--text-3)] flex items-center gap-1">
            <HardDrive size={11} /> {fmtSize(response.responseSize ?? 0)}
          </span>
          {response.statusText && response.status !== 0 && (
            <span className="text-2xs text-[var(--text-3)] font-mono">
              {response.statusText}
            </span>
          )}
          {totalCount > 0 && (
            <span
              className={`text-2xs flex items-center gap-1 ${passedCount === totalCount ? "text-emerald-600" : "text-red-600"}`}
            >
              <CheckCircle size={11} /> {passedCount}/{totalCount}
            </span>
          )}
          {/* Save as example */}
          <button
            onClick={() => {
              setExampleName("");
              setOverlay({ kind: "saveExample" });
            }}
            className="text-[var(--text-3)] hover:text-[var(--accent)] p-0.5"
            title="Save as response example"
          >
            <BookmarkPlus size={11} />
          </button>
          {/* Create mock */}
          <button
            onClick={createMock}
            className="text-[var(--text-3)] hover:text-[var(--accent)] p-0.5"
            title="Create mock route from this response"
          >
            <Cpu size={11} />
          </button>
        </div>
      )}

      {streaming && !response && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] bg-[var(--accent-subtle)]">
          <span className="text-xs text-[var(--accent)] animate-pulse">
            Streaming…
          </span>
          <span className="text-2xs text-[var(--text-3)]">
            {fmtSize(streamBytes)}
          </span>
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
              <span
                className={`ml-0.5 text-2xs px-1 rounded ${passedCount === totalCount ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
              >
                {passedCount}/{totalCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {responseTab === "body" && (
          <BodyTab
            onQuickAssert={(draft) => setOverlay({ kind: "assertion", draft })}
            onQuickExtract={(draft) => setOverlay({ kind: "extraction", draft })}
          />
        )}
        {responseTab === "headers" && (
          <HeadersTab
            onQuickAssert={(draft) => setOverlay({ kind: "assertion", draft })}
            onQuickExtract={(draft) => setOverlay({ kind: "extraction", draft })}
          />
        )}
        {responseTab === "timing" && <TimingTab />}
        {responseTab === "tls" && <TLSTab />}
        {responseTab === "assertions" && (
          <AssertionsTab assertionRules={assertionRules} assertionResults={assertionResults} />
        )}
        {responseTab === "auth" && <AuthDebugTab />}
        {responseTab === "code" && <CodeTab />}
      </div>

      {/* Overlays */}
      {overlay?.kind === "assertion" && (
        <QuickAssertionOverlay
          draft={overlay.draft}
          onConfirm={addAssertion}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay?.kind === "extraction" && (
        <QuickExtractionOverlay
          draft={overlay.draft}
          onConfirm={addExtraction}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay?.kind === "saveExample" && (
        <div className="absolute z-20 right-3 top-12 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl p-3 flex flex-col gap-2 w-60">
          <span className="text-2xs font-semibold text-[var(--text-3)] uppercase">
            Save as example
          </span>
          <input
            autoFocus
            value={exampleName}
            onChange={(e) => setExampleName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveExample();
              if (e.key === "Escape") setOverlay(null);
            }}
            placeholder={`Example ${responseExamples.length + 1}`}
            className="input text-xs py-1"
          />
          <div className="flex gap-1.5 justify-end">
            <button
              onClick={() => setOverlay(null)}
              className="btn text-2xs py-0.5 px-2"
            >
              Cancel
            </button>
            <button
              onClick={saveExample}
              className="btn btn-primary text-2xs py-0.5 px-2"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Body tab
function BodyTab({
  onQuickAssert,
  onQuickExtract,
}: {
  onQuickAssert: (d: AssertionDraft) => void;
  onQuickExtract: (d: ExtractionDraft) => void;
}) {
  const { response, responsePretty, set } = useStore();
  const [jsonPathInput, setJsonPathInput] = useState("");
  if (!response) return null;

  const ct =
    (Array.isArray(response.headers)
      ? response.headers.find((h) => h.key.toLowerCase() === "content-type")
          ?.value
      : "") ?? "";
  const isJson =
    ct.includes("json") ||
    (() => {
      try {
        JSON.parse(response.body);
        return true;
      } catch {
        return false;
      }
    })();
  const lang = isJson
    ? "json"
    : ct.includes("xml") || ct.includes("html")
      ? "xml"
      : "text";
  const displayBody =
    isJson && responsePretty
      ? (() => {
          try {
            return JSON.stringify(JSON.parse(response.body), null, 2);
          } catch {
            return response.body;
          }
        })()
      : response.body;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)]">
        <span className="text-2xs text-[var(--text-3)] font-mono">
          {ct || "text/plain"}
        </span>
        {isJson && (
          <>
            <button
              onClick={() => set({ responsePretty: !responsePretty })}
              className={`ml-auto tab-btn text-2xs ${responsePretty ? "active" : ""}`}
            >
              Pretty
            </button>
            {/* Quick body assertion/extract */}
            <div className="flex items-center gap-1 border-l border-[var(--border)] pl-2 ml-1">
              <input
                value={jsonPathInput}
                onChange={(e) => setJsonPathInput(e.target.value)}
                placeholder="$.path"
                className="input text-2xs py-0 px-1 w-28 font-mono"
                title="JSONPath for quick assertion or extraction"
              />
              <button
                onClick={() =>
                  onQuickAssert({
                    type: "bodyJsonPath",
                    expression: jsonPathInput,
                    matcher: "equals",
                    expected: "",
                  })
                }
                className="text-[var(--text-3)] hover:text-[var(--accent)] p-0.5"
                title="Create assertion from JSONPath"
              >
                <PlusCircle size={11} />
              </button>
              <button
                onClick={() => {
                  const varName = jsonPathInput
                    .replace(/^\$\.?/, "")
                    .replace(/[^a-zA-Z0-9_]/g, "_")
                    .replace(/^_+|_+$/g, "");
                  onQuickExtract({
                    variableName: varName || "extracted",
                    source: "body",
                    expression: jsonPathInput,
                  });
                }}
                className="text-[var(--text-3)] hover:text-[var(--accent)] p-0.5"
                title="Create extraction from JSONPath"
              >
                <Wand2 size={11} />
              </button>
            </div>
          </>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        <CodeEditor value={displayBody} lang={lang} readOnly />
      </div>
    </div>
  );
}

// Headers tab
function HeadersTab({
  onQuickAssert,
  onQuickExtract,
}: {
  onQuickAssert: (d: AssertionDraft) => void;
  onQuickExtract: (d: ExtractionDraft) => void;
}) {
  const { response } = useStore();
  if (!response) return null;
  const headers = Array.isArray(response.headers) ? response.headers : [];
  return (
    <div className="divide-y divide-[var(--border)]">
      {headers.map((h, i) => (
        <div
          key={i}
          className="group flex items-start gap-2 px-3 py-2 hover:bg-[var(--surface-2)]"
        >
          <span className="text-xs font-mono font-medium text-[var(--text-1)] w-56 shrink-0 truncate">
            {h.key}
          </span>
          <span className="text-xs font-mono text-[var(--text-2)] break-all flex-1">
            {h.value}
          </span>
          <button
            onClick={() =>
              onQuickAssert({
                type: "header",
                expression: h.key,
                matcher: "equals",
                expected: h.value,
              })
            }
            className="opacity-0 group-hover:opacity-100 text-[var(--text-3)] hover:text-[var(--accent)] p-0.5 shrink-0"
            title="Create assertion from this header"
          >
            <PlusCircle size={11} />
          </button>
          <button
            onClick={() => {
              const varName = h.key.toLowerCase().replace(/[^a-z0-9]/g, "_");
              onQuickExtract({
                variableName: varName,
                source: "header",
                expression: h.key,
              });
            }}
            className="opacity-0 group-hover:opacity-100 text-[var(--text-3)] hover:text-[var(--accent)] p-0.5 shrink-0"
            title="Create extraction from this header"
          >
            <Wand2 size={11} />
          </button>
        </div>
      ))}
      {!headers.length && (
        <p className="p-4 text-xs text-[var(--text-3)]">No headers</p>
      )}
    </div>
  );
}

// Timing tab
const PHASE_DEFS: { name: TimingPhaseName; label: string; color: string }[] = [
  { name: "dns", label: "DNS", color: "#5bc0be" },
  { name: "tcp", label: "TCP", color: "#7bd88f" },
  { name: "tls", label: "TLS", color: "#ffd166" },
  { name: "ttfb", label: "TTFB", color: "#b388ff" },
  { name: "transfer", label: "Transfer", color: "#ff8f70" },
];

function syntheticPhases(timing: Timing) {
  const phases = new Map<
    TimingPhaseName,
    { startMs: number; durationMs: number }
  >();
  let cursor = 0;
  for (const { name } of PHASE_DEFS) {
    const key = `${name}Ms` as keyof Timing;
    const durationMs = Math.max(0, timing[key] ?? 0);
    phases.set(name, { startMs: cursor, durationMs });
    cursor += durationMs;
  }
  return phases;
}

interface PhaseBar {
  name: TimingPhaseName;
  label: string;
  color: string;
  startMs: number;
  durationMs: number;
  leftPct: number;
  widthPct: number;
}

function buildAttemptBars(attempt: TimingAttempt): PhaseBar[] {
  const byName = new Map((attempt.phases ?? []).map((p) => [p.name, p]));
  const synthetic = syntheticPhases(attempt.timing);
  const total = Math.max(attempt.timing?.totalMs ?? 0, 1);
  const clamp = (v: number) =>
    Math.min(100, Math.max(0, Number.isFinite(v) ? v : 0));

  let cursor = 0;
  return PHASE_DEFS.map(({ name, label, color }) => {
    const durationMs =
      byName.get(name)?.durationMs ?? synthetic.get(name)?.durationMs ?? 0;
    const startMs = cursor;
    cursor += durationMs;
    return {
      name,
      label,
      color,
      startMs,
      durationMs,
      leftPct: clamp((startMs / total) * 100),
      widthPct: clamp((durationMs / total) * 100),
    };
  });
}

function fmtMs(ms: number) {
  const safe = Math.max(0, ms);
  if (safe < 1 && safe > 0) return `${safe.toFixed(2)}ms`;
  if (safe < 100) return `${safe.toFixed(1)}ms`;
  return `${Math.round(safe)}ms`;
}

function TimingTab() {
  const { response } = useStore();
  if (!response?.timing)
    return <p className="p-4 text-xs text-[var(--text-3)]">No timing data</p>;

  const attempts: TimingAttempt[] = response.attempts?.length
    ? response.attempts
    : [
        {
          url: "",
          status: response.status,
          headers: response.headers,
          timing: response.timing,
          phases: [],
          redirect: false,
        },
      ];

  const timing = response.timing;
  const timingRows = [
    { key: "dns", label: "DNS", value: timing.dnsMs },
    { key: "tcp", label: "TCP", value: timing.tcpMs },
    { key: "tls", label: "TLS", value: timing.tlsMs },
    { key: "ttfb", label: "TTFB", value: timing.ttfbMs },
    { key: "transfer", label: "Transfer", value: timing.transferMs },
    { key: "total", label: "Total", value: timing.totalMs },
  ];

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--text-1)]">
          Timing waterfall
        </span>
        <span className="text-xs text-[var(--text-3)]">
          {attempts.length > 1 ? `${attempts.length} hops` : "Single request"}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {attempts.map((attempt, idx) => {
          const bars = buildAttemptBars(attempt);
          const total = Math.max(attempt.timing?.totalMs ?? 0, 1);
          const label = attempt.redirect
            ? `Redirect ${idx + 1}`
            : attempts.length > 1
              ? "Final"
              : "Request";
          return (
            <div
              key={idx}
              className="flex flex-col gap-2.5 p-3 rounded border border-[var(--border)] bg-[var(--surface-2)]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-semibold text-[var(--text-1)] shrink-0">
                  {label}
                </span>
                {attempt.status && <StatusBadge status={attempt.status} />}
                {attempt.url && (
                  <span className="text-2xs font-mono text-[var(--text-3)] truncate min-w-0">
                    {attempt.url}
                  </span>
                )}
              </div>

              <div
                className="relative h-13 bg-[var(--surface)] rounded border border-[var(--border)]"
                style={{ height: 52 }}
              >
                <span className="absolute left-2 top-1 text-2xs text-[var(--text-3)] z-10 leading-none">
                  0
                </span>
                <span className="absolute right-2 top-1 text-2xs text-[var(--text-3)] z-10 leading-none">
                  {fmtMs(total)}
                </span>
                {bars.map((bar) =>
                  bar.durationMs === 0 ? null : (
                    <div
                      key={bar.name}
                      className="absolute flex items-center overflow-hidden rounded-sm"
                      style={{
                        left: `${bar.leftPct}%`,
                        width: `${Math.max(bar.widthPct, 0.5)}%`,
                        top: 22,
                        bottom: 6,
                        backgroundColor: bar.color,
                      }}
                      title={`${bar.label}: ${fmtMs(bar.durationMs)} (starts ${fmtMs(bar.startMs)})`}
                    >
                      {bar.widthPct >= 10 && (
                        <span
                          className="text-2xs font-bold px-1.5 truncate"
                          style={{ color: "#061214" }}
                        >
                          {bar.label} {fmtMs(bar.durationMs)}
                        </span>
                      )}
                    </div>
                  ),
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {bars.map((bar) => (
                  <span
                    key={bar.name}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-[var(--border)] bg-[var(--surface)] text-2xs text-[var(--text-1)]"
                    title={`${bar.label}: ${fmtMs(bar.durationMs)} (starts ${fmtMs(bar.startMs)})`}
                  >
                    <span
                      className="w-2 h-2 rounded-sm shrink-0"
                      style={{ backgroundColor: bar.color }}
                    />
                    {bar.label}
                    <strong className="text-[var(--text-3)]">
                      {fmtMs(bar.durationMs)}
                    </strong>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}
      >
        {timingRows.map((row) => (
          <div
            key={row.key}
            className="flex flex-col gap-0.5 p-2.5 rounded border border-[var(--border)] bg-[var(--surface-2)]"
          >
            <span className="text-2xs text-[var(--text-3)]">{row.label}</span>
            <span className="text-xs text-[var(--text-1)]">
              {fmtMs(row.value ?? 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// TLS tab
function TLSTab() {
  const { response } = useStore();
  const tls = (
    response as unknown as {
      tls?: {
        version?: string;
        cipher?: string;
        certificates?: {
          subject: string;
          issuer: string;
          validFrom: string;
          validTo: string;
        }[];
      };
    }
  )?.tls;
  if (!tls)
    return <p className="p-4 text-xs text-[var(--text-3)]">No TLS data</p>;
  return (
    <div className="p-4 flex flex-col gap-3">
      <Row label="Protocol" value={tls.version ?? "—"} />
      <Row label="Cipher" value={tls.cipher ?? "—"} />
      {tls.certificates?.map((cert, i) => (
        <div
          key={i}
          className="border border-[var(--border)] rounded p-3 flex flex-col gap-1.5"
        >
          <span className="text-2xs font-semibold text-[var(--text-3)] uppercase">
            Certificate {i + 1}
          </span>
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
      <span className="text-xs text-[var(--text-3)] w-24 shrink-0">
        {label}
      </span>
      <span className="text-xs font-mono text-[var(--text-1)] break-all">
        {value}
      </span>
    </div>
  );
}

// Assertions tab
function AssertionsTab({
  assertionRules,
  assertionResults,
}: {
  assertionRules: import("@invoke/core").Assertion[];
  assertionResults: import("@invoke/core").AssertionResult[];
}) {
  if (!assertionResults.length)
    return (
      <p className="p-4 text-xs text-[var(--text-3)]">
        No assertions configured
      </p>
    );
  return (
    <div className="divide-y divide-[var(--border)]">
      {assertionResults.map((result, i) => {
        const rule = assertionRules[i];
        return (
          <div
            key={i}
            className={`flex items-start gap-3 px-3 py-2.5 ${result.passed ? "" : "bg-red-50"}`}
          >
            <span
              className={`mt-0.5 text-sm ${result.passed ? "text-emerald-600" : "text-red-600"}`}
            >
              {result.passed ? "✓" : "✗"}
            </span>
            <div className="flex-1">
              <p className="text-xs text-[var(--text-1)]">
                {rule
                  ? `${rule.type} ${rule.matcher} ${rule.expected}`
                  : `Assertion ${i + 1}`}
              </p>
              {!result.passed && (
                <p className="text-2xs text-[var(--text-3)] font-mono mt-0.5">
                  got: {String(result.actual)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Code tab
const CODE_TARGETS = [
  "curl",
  "fetch",
  "node-fetch",
  "node-axios",
  "python-requests",
  "python-httpx",
  "go-net-http",
  "java-okhttp",
  "kotlin-okhttp",
  "ruby-net-http",
  "php-guzzle",
  "csharp-httpclient",
  "rust-reqwest",
  "powershell",
  "httpie",
] as const;

function AuthDebugTab() {
  const { response, resolvedRequest, cookies } = useStore();
  const auth = resolvedRequest?.auth;
  const [showToken, setShowToken] = useState(false);

  const sentAuthHeader = (() => {
    if (!resolvedRequest) return null;
    const h = resolvedRequest.headers?.find((h) => h.key.toLowerCase() === "authorization");
    return h?.value ?? null;
  })();

  const sentCookieHeader = (() => {
    if (!resolvedRequest) return null;
    const h = resolvedRequest.headers?.find((h) => h.key.toLowerCase() === "cookie");
    return h?.value ?? null;
  })();

  const redirects = response?.redirects ?? [];

  const Row = ({ label, value, mono = true }: { label: string; value: React.ReactNode; mono?: boolean }) => (
    <div className="flex items-start gap-3 py-1.5 border-b border-[var(--border)] last:border-0">
      <span className="text-2xs text-[var(--text-3)] w-28 shrink-0 pt-0.5">{label}</span>
      <span className={`flex-1 text-xs break-all ${mono ? "font-mono" : ""} text-[var(--text-1)]`}>{value}</span>
    </div>
  );

  if (!resolvedRequest && !response) {
    return <p className="p-4 text-xs text-[var(--text-3)]">Send a request to see auth debug info.</p>;
  }

  return (
    <div className="p-3 flex flex-col gap-4 text-xs">
      {/* Auth header */}
      <section>
        <p className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">Authentication</p>
        <div className="rounded border border-[var(--border)]">
          {sentAuthHeader ? (
            <Row label="Authorization" value={
              <span className="flex items-center gap-1">
                <span className={showToken ? "" : "blur-[3px] select-none"}>{sentAuthHeader}</span>
                <button onClick={() => setShowToken((v) => !v)} className="shrink-0 text-[var(--text-3)] hover:text-[var(--text-1)] ml-1">
                  {showToken ? "hide" : "show"}
                </button>
              </span>
            } />
          ) : (
            <div className="py-2 px-3 text-2xs text-[var(--text-3)]">No Authorization header sent</div>
          )}
          {auth?.type === "oauth2" && auth.flow === "authorization_code" && (
            <>
              <Row label="OAuth2 flow" value="authorization_code" />
              {auth.accessToken && (
                <Row label="Token expires" value={
                  auth.tokenExpiresAt
                    ? (auth.tokenExpiresAt < Date.now()
                        ? <span className="text-red-500">Expired ({new Date(auth.tokenExpiresAt).toLocaleString()})</span>
                        : new Date(auth.tokenExpiresAt).toLocaleString())
                    : "Unknown"
                } mono={false} />
              )}
            </>
          )}
        </div>
      </section>

      {/* Cookies sent */}
      <section>
        <p className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">
          Cookies ({sentCookieHeader ? sentCookieHeader.split(";").length : 0} sent, {cookies.length} stored)
        </p>
        <div className="rounded border border-[var(--border)]">
          {sentCookieHeader ? (
            sentCookieHeader.split(";").map((pair, i) => {
              const [name, ...rest] = pair.trim().split("=");
              return <Row key={i} label={name?.trim() ?? "?"} value={rest.join("=") ?? ""} />;
            })
          ) : (
            <div className="py-2 px-3 text-2xs text-[var(--text-3)]">No cookies sent</div>
          )}
        </div>
      </section>

      {/* Redirects */}
      {redirects.length > 0 && (
        <section>
          <p className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">Redirects ({redirects.length})</p>
          <div className="rounded border border-[var(--border)]">
            {redirects.map((r, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5 px-3 border-b border-[var(--border)] last:border-0">
                <span className="text-2xs font-mono text-[var(--text-3)] w-8">{r.status}</span>
                <span className="flex-1 text-xs font-mono text-[var(--text-1)] truncate">{r.url}</span>
                {r.timing && <span className="text-2xs text-[var(--text-3)]">{r.timing.totalMs}ms</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TLS summary */}
      {response?.tls && (
        <section>
          <p className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">TLS</p>
          <div className="rounded border border-[var(--border)]">
            <Row label="Version" value={response.tls.version} />
            <Row label="Cipher" value={response.tls.cipherSuite} />
            {response.tls.certificates[0] && (
              <>
                <Row label="Subject" value={response.tls.certificates[0].subject} mono={false} />
                <Row label="Issuer" value={response.tls.certificates[0].issuer} mono={false} />
                <Row label="Expires" value={
                  (() => {
                    const exp = new Date(response.tls!.certificates[0].notAfter);
                    const soon = exp.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;
                    return <span className={soon ? "text-amber-500" : ""}>{exp.toLocaleDateString()}</span>;
                  })()
                } mono={false} />
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function CodeTab() {
  const { codeTarget, codeSnippet, codeLoading, set } = useStore();
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)]">
        <Select
          size="2xs"
          value={codeTarget}
          onChange={(e) =>
            set({ codeTarget: e.target.value as typeof codeTarget })
          }
          wrapperClassName="w-40"
        >
          {CODE_TARGETS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        {codeLoading && (
          <span className="text-2xs text-[var(--text-3)]">Generating…</span>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        <CodeEditor
          value={codeSnippet}
          lang={codeTarget === "curl" ? "text" : "text"}
          readOnly
        />
      </div>
    </div>
  );
}
