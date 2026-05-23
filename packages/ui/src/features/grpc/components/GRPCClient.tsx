import { useState, useRef, useEffect, useCallback } from "react";
import {
  BookmarkPlus,
  CheckCircle2,
  Send,
  Trash2,
  XCircle,
  ArrowLeftRight,
  Gauge,
} from "lucide-react";
import { compareResponses } from "@invoke/core";
import { useStore } from "../../../store";
import { CodeEditor } from "../../../components/editors/CodeEditor";
import { KeyValueEditor } from "../../../components/shared/KeyValueEditor";
import { Select } from "../../../components/shared/Select";
import { grpcStreamSend } from "../api";
import type {
  AuthConfig,
  GrpcExecuteResponse,
  GrpcMethodInfo,
  GrpcSavedMessage,
  KeyValue,
} from "@invoke/core";

type GrpcTab =
  | "message"
  | "metadata"
  | "auth"
  | "scripts"
  | "saved"
  | "stress"
  | "options";

function formatGrpcTimeout(ms: number): string {
  if (ms <= 0) return "0m";
  if (ms < 1000) return `${ms}m`;
  const secs = ms / 1000;
  if (secs < 60) return `${secs % 1 === 0 ? secs : secs.toFixed(1)}S`;
  const mins = secs / 60;
  if (mins < 60) return `${mins % 1 === 0 ? mins : mins.toFixed(1)}M`;
  return `${(mins / 60).toFixed(1)}H`;
}

const TABS: { id: GrpcTab; label: string }[] = [
  { id: "message", label: "Message" },
  { id: "metadata", label: "Metadata" },
  { id: "auth", label: "Auth" },
  { id: "scripts", label: "Scripts" },
  { id: "saved", label: "Saved" },
  { id: "stress", label: "Stress" },
  { id: "options", label: "Options" },
];

function streamBadge(method: {
  serverStreaming?: boolean;
  clientStreaming?: boolean;
}) {
  if (method.serverStreaming && method.clientStreaming)
    return (
      <span className="text-2xs px-1 rounded bg-[rgba(200,156,214,0.1)] text-[var(--method-patch)]">
        bidi
      </span>
    );
  if (method.serverStreaming)
    return (
      <span className="text-2xs px-1 rounded bg-[var(--info-bg)] text-[var(--info)]">
        server-stream
      </span>
    );
  if (method.clientStreaming)
    return (
      <span className="text-2xs px-1 rounded bg-[var(--warn-bg)] text-[var(--warn)]">
        client-stream
      </span>
    );
  return null;
}

function GrpcMethodPicker({
  methods,
  selectedService,
  selectedMethod,
  onSelect,
}: {
  methods: GrpcMethodInfo[];
  selectedService: string;
  selectedMethod: string;
  onSelect: (service: string, method: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState(0);

  const filtered = query.trim()
    ? methods.filter(
        (m) =>
          m.method.toLowerCase().includes(query.toLowerCase()) ||
          m.service.toLowerCase().includes(query.toLowerCase()),
      )
    : methods;

  const selectedLabel =
    selectedService && selectedMethod
      ? `${selectedService} / ${selectedMethod}`
      : "Select method…";

  const choose = (m: GrpcMethodInfo) => {
    onSelect(m.service, m.method);
    setOpen(false);
    setQuery("");
    setCursor(0);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      if (filtered[cursor]) choose(filtered[cursor]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <div className="px-3 py-1.5 border-b border-[var(--border)] flex items-center gap-2 relative">
      <div className="flex-1 relative">
        {open ? (
          <input
            ref={inputRef}
            autoFocus
            className="w-full bg-[var(--surface-2)] border border-[var(--accent)] rounded px-2 py-1 text-xs outline-none"
            placeholder="Filter methods…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={onKey}
            onBlur={(e) => {
              if (!listRef.current?.contains(e.relatedTarget as Node)) {
                setOpen(false);
                setQuery("");
              }
            }}
          />
        ) : (
          <button
            className="w-full text-left bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--text-1)] hover:border-[var(--accent)] truncate"
            onClick={() => setOpen(true)}
          >
            {selectedLabel}
          </button>
        )}
        {open && filtered.length > 0 && (
          <div
            ref={listRef}
            className="absolute top-full left-0 right-0 z-50 mt-0.5 bg-[var(--surface-1)] border border-[var(--border)] rounded shadow-[var(--shadow-2)] max-h-56 overflow-y-auto"
          >
            {filtered.map((m, i) => (
              <button
                key={`${m.service}/${m.method}`}
                tabIndex={-1}
                className={`w-full text-left px-3 py-1.5 text-2xs hover:bg-[var(--surface-2)] flex items-center justify-between gap-2 ${i === cursor ? "bg-[var(--surface-2)]" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(m);
                }}
                onMouseEnter={() => setCursor(i)}
              >
                <span className="truncate">
                  <span className="text-[var(--text-3)]">{m.service} / </span>
                  <span className="font-medium text-[var(--text-1)]">
                    {m.method}
                  </span>
                </span>
                {streamBadge(m)}
              </button>
            ))}
          </div>
        )}
      </div>
      {selectedService &&
        selectedMethod &&
        (() => {
          const m = methods.find(
            (x) => x.service === selectedService && x.method === selectedMethod,
          );
          return m ? streamBadge(m) : null;
        })()}
    </div>
  );
}

function GrpcAuthPanel() {
  const { grpcRequest, setGrpcRequest } = useStore();
  const auth: AuthConfig = grpcRequest.auth ?? { type: "none" };
  const set = (patch: Partial<AuthConfig>) =>
    setGrpcRequest({ auth: { ...auth, ...patch } });
  const inputCls = "input text-xs py-1 flex-1";
  return (
    <div className="p-3 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <label className="text-xs text-[var(--text-2)] w-20 shrink-0">
          Type
        </label>
        <Select
          value={auth.type}
          onChange={(e) =>
            setGrpcRequest({
              auth: { type: e.target.value as AuthConfig["type"] },
            })
          }
        >
          {["none", "bearer", "basic", "api-key", "oauth2"].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </div>
      {auth.type === "bearer" && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--text-2)] w-20 shrink-0">
            Token
          </label>
          <input
            className={inputCls}
            value={auth.token ?? ""}
            onChange={(e) => set({ token: e.target.value })}
            placeholder="{{token}}"
          />
        </div>
      )}
      {auth.type === "basic" && (
        <>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--text-2)] w-20 shrink-0">
              Username
            </label>
            <input
              className={inputCls}
              value={auth.username ?? ""}
              onChange={(e) => set({ username: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--text-2)] w-20 shrink-0">
              Password
            </label>
            <input
              className={inputCls}
              type="password"
              value={auth.password ?? ""}
              onChange={(e) => set({ password: e.target.value })}
            />
          </div>
        </>
      )}
      {auth.type === "api-key" && (
        <>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--text-2)] w-20 shrink-0">
              Key name
            </label>
            <input
              className={inputCls}
              value={auth.apiKeyName ?? ""}
              onChange={(e) => set({ apiKeyName: e.target.value })}
              placeholder="x-api-key"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--text-2)] w-20 shrink-0">
              Key value
            </label>
            <input
              className={inputCls}
              value={auth.apiKeyValue ?? ""}
              onChange={(e) => set({ apiKeyValue: e.target.value })}
              placeholder="{{api_key}}"
            />
          </div>
        </>
      )}
      {auth.type === "oauth2" && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--text-2)] w-20 shrink-0">
            Access token
          </label>
          <input
            className={inputCls}
            value={auth.accessToken ?? auth.token ?? ""}
            onChange={(e) =>
              set({ accessToken: e.target.value, token: e.target.value })
            }
            placeholder="{{access_token}}"
          />
        </div>
      )}
      {auth.type !== "none" && (
        <p className="text-2xs text-[var(--text-3)]">
          Auth is injected as an <code>authorization</code> metadata header on
          each call.
        </p>
      )}
    </div>
  );
}

function GrpcScriptsPanel() {
  const { grpcRequest, setGrpcRequest, consoleLogs } = useStore();
  const [active, setActive] = useState<"pre" | "post">("pre");
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[var(--border)]">
        <button
          onClick={() => setActive("pre")}
          className={`tab-btn text-2xs flex items-center gap-1 ${active === "pre" ? "active" : ""}`}
        >
          Pre-request
          {consoleLogs.preRequestRan && (
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${consoleLogs.preRequestError ? "bg-[var(--danger)]" : "bg-[var(--ok)]"}`} />
          )}
        </button>
        <button
          onClick={() => setActive("post")}
          className={`tab-btn text-2xs flex items-center gap-1 ${active === "post" ? "active" : ""}`}
        >
          Post-response
          {consoleLogs.postResponseRan && (
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${consoleLogs.postResponseError ? "bg-[var(--danger)]" : "bg-[var(--ok)]"}`} />
          )}
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <CodeEditor
          value={
            active === "pre"
              ? (grpcRequest.scripts?.preRequest ?? "")
              : (grpcRequest.scripts?.postResponse ?? "")
          }
          onChange={(v) =>
            setGrpcRequest({
              scripts: {
                ...(grpcRequest.scripts ?? {}),
                ...(active === "pre" ? { preRequest: v } : { postResponse: v }),
              },
            })
          }
          lang="javascript"
          minHeight="200px"
        />
      </div>
    </div>
  );
}

function GrpcOptionsPanel() {
  const { grpcRequest, setGrpcRequest, set } = useStore();
  const grpcTimeout = formatGrpcTimeout(grpcRequest.timeoutMs ?? 30000);

  const handleProtosetFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ab = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(ab);
      let b64 = "";
      for (let i = 0; i < bytes.length; i++)
        b64 += String.fromCharCode(bytes[i]);
      setGrpcRequest({ protosetBase64: btoa(b64) });
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  return (
    <div className="p-3 flex flex-col gap-3 overflow-auto">
      <div className="flex items-center gap-2">
        <label className="text-xs text-[var(--text-2)] w-36 shrink-0">
          Timeout (ms)
        </label>
        <input
          type="number"
          min={0}
          step={1000}
          className="input text-xs py-1 w-28"
          value={grpcRequest.timeoutMs ?? 30000}
          onChange={(e) =>
            setGrpcRequest({ timeoutMs: Math.max(0, Number(e.target.value)) })
          }
        />
        <span
          className="text-2xs text-[var(--text-3)] font-mono"
          title={`grpc-timeout: ${grpcTimeout}`}
          aria-label={`grpc-timeout: ${grpcTimeout}`}
        >
          {grpcTimeout}
        </span>
      </div>
      <button
        type="button"
        onClick={() => set({ showSettings: true, settingsTab: "network" })}
        className="text-left text-2xs text-[var(--text-3)] hover:text-[var(--text-1)]"
      >
        TLS and certificate policy is in Settings &gt; Network.
      </button>
      <div className="flex items-center gap-2">
        <label className="text-xs text-[var(--text-2)] w-36 shrink-0">
          Compression
        </label>
        <Select
          value={grpcRequest.compression ?? "none"}
          onChange={(e) =>
            setGrpcRequest({ compression: e.target.value as "none" | "gzip" })
          }
        >
          <option value="none">None</option>
          <option value="gzip">gzip</option>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-[var(--text-2)] w-36 shrink-0">
          Max recv msg (MB)
        </label>
        <input
          type="number"
          min={1}
          max={256}
          step={1}
          className="input text-xs py-1 w-28"
          value={Math.round(
            (grpcRequest.maxRecvMsgSize ?? 16 * 1024 * 1024) / (1024 * 1024),
          )}
          onChange={(e) =>
            setGrpcRequest({
              maxRecvMsgSize: Math.max(1, Number(e.target.value)) * 1024 * 1024,
            })
          }
        />
        {(grpcRequest.maxRecvMsgSize ?? 0) >= 256 * 1024 * 1024 && (
          <span className="text-2xs text-[var(--warn)]">
            ⚠ Large messages may exhaust memory
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-[var(--text-2)] w-36 shrink-0">
          Max send msg (MB)
        </label>
        <input
          type="number"
          min={1}
          max={256}
          step={1}
          className="input text-xs py-1 w-28"
          value={Math.round(
            (grpcRequest.maxSendMsgSize ?? 16 * 1024 * 1024) / (1024 * 1024),
          )}
          onChange={(e) =>
            setGrpcRequest({
              maxSendMsgSize: Math.max(1, Number(e.target.value)) * 1024 * 1024,
            })
          }
        />
      </div>
      <p className="text-2xs font-semibold uppercase tracking-wide text-[var(--text-3)] pt-1">
        Protoset (FileDescriptorSet)
      </p>
      <div className="flex flex-col gap-1">
        <p className="text-2xs text-[var(--text-3)]">
          Upload a pre-compiled <code>.pb</code> file (
          <code>buf build -o desc.pb</code>) to use without server reflection.
        </p>
        <div className="flex items-center gap-2">
          <label className="btn text-2xs cursor-pointer">
            {grpcRequest.protosetBase64 ? "Replace .pb" : "Upload .pb"}
            <input
              type="file"
              accept=".pb,.bin"
              className="hidden"
              onChange={handleProtosetFile}
            />
          </label>
          {grpcRequest.protosetBase64 && (
            <button
              className="text-2xs text-[var(--danger)] hover:underline"
              onClick={() => setGrpcRequest({ protosetBase64: undefined })}
            >
              Remove
            </button>
          )}
          {grpcRequest.protosetBase64 && (
            <span className="text-2xs text-[var(--ok)]">
              ✓ Protoset loaded (
              {Math.round((grpcRequest.protosetBase64.length * 0.75) / 1024)}KB)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function GrpcSavedMessagesPanel() {
  const { grpcRequest, setGrpcRequest } = useStore();
  const saved = grpcRequest.savedMessages ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const saveCurrentBody = () => {
    const name = `Message ${saved.length + 1}`;
    const newMsg: GrpcSavedMessage = {
      id: crypto.randomUUID(),
      name,
      body: grpcRequest.body ?? "{}",
    };
    setGrpcRequest({ savedMessages: [...saved, newMsg] });
  };

  const remove = (id: string) =>
    setGrpcRequest({ savedMessages: saved.filter((m) => m.id !== id) });

  const load = (body: string) => setGrpcRequest({ body });

  const rename = (id: string, name: string) => {
    setGrpcRequest({
      savedMessages: saved.map((m) => (m.id === id ? { ...m, name } : m)),
    });
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-3 py-1.5 border-b border-[var(--border)] flex items-center justify-between">
        <span className="text-2xs text-[var(--text-3)]">
          {saved.length} saved message{saved.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={saveCurrentBody}
          className="flex items-center gap-1 text-2xs text-[var(--accent)] hover:underline"
        >
          <BookmarkPlus size={11} /> Save current
        </button>
      </div>
      {saved.length === 0 && (
        <p className="p-3 text-2xs text-[var(--text-3)]">
          No saved messages. Compose a body and click "Save current" to create
          one.
        </p>
      )}
      {saved.map((msg) => (
        <div
          key={msg.id}
          className="border-b border-[var(--border)] px-3 py-2 flex flex-col gap-1 last:border-0"
        >
          <div className="flex items-center gap-1">
            {editingId === msg.id ? (
              <input
                autoFocus
                className="input text-2xs py-0.5 flex-1"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => rename(msg.id, editName || msg.name)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") rename(msg.id, editName || msg.name);
                  if (e.key === "Escape") setEditingId(null);
                }}
              />
            ) : (
              <span
                className="text-2xs font-medium text-[var(--text-1)] flex-1 cursor-pointer hover:underline truncate"
                onDoubleClick={() => {
                  setEditingId(msg.id);
                  setEditName(msg.name);
                }}
                title="Double-click to rename"
              >
                {msg.name}
              </span>
            )}
            <button
              onClick={() => load(msg.body)}
              className="text-2xs text-[var(--accent)] hover:underline shrink-0"
            >
              Use
            </button>
            <button
              onClick={() => remove(msg.id)}
              className="p-0.5 text-[var(--text-3)] hover:text-[var(--danger)] shrink-0"
            >
              <Trash2 size={10} />
            </button>
          </div>
          <pre className="text-2xs font-mono text-[var(--text-3)] truncate">
            {msg.body.slice(0, 80)}
            {msg.body.length > 80 ? "…" : ""}
          </pre>
        </div>
      ))}
    </div>
  );
}

function GrpcResponsePanel({ res }: { res: GrpcExecuteResponse }) {
  const { grpcAssertionResults } = useStore();
  const statusName =
    res.statusCode === 0 ? "OK" : (res.statusMessage ?? String(res.statusCode));
  const isOk = !res.error && res.statusCode === 0;
  return (
    <div
      className="border-t border-[var(--border)] flex flex-col"
      style={{ maxHeight: 320 }}
    >
      <div className="px-3 py-1 text-2xs border-b border-[var(--border)] bg-[var(--surface-2)] flex items-center gap-2">
        <span
          className={`font-semibold ${isOk ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}
        >
          {res.statusCode} {statusName}
        </span>
        {res.durationMs != null && (
          <span className="text-[var(--text-3)]">
            {res.durationMs.toFixed(0)}ms
          </span>
        )}
        {grpcAssertionResults.length > 0 && (
          <span
            className={`ml-auto text-2xs font-semibold ${grpcAssertionResults.every((r) => r.passed) ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}
          >
            {grpcAssertionResults.filter((r) => r.passed).length}/
            {grpcAssertionResults.length} assertions
          </span>
        )}
      </div>
      <div className="overflow-y-auto flex-1">
        {res.bodyJson && (
          <pre className="p-2 text-2xs font-mono text-[var(--text-1)] whitespace-pre-wrap break-all">
            {res.bodyJson}
          </pre>
        )}
        {res.error && !res.bodyJson && (
          <p className="p-2 text-2xs text-[var(--danger)]">{res.error}</p>
        )}
        {(res as any).statusDetailsJson && (
          <div className="border-t border-[var(--border)] px-3 py-1.5">
            <p className="text-2xs font-semibold text-[var(--text-2)] mb-1">
              Error details
            </p>
            <pre className="text-2xs font-mono text-[var(--danger)] whitespace-pre-wrap break-all">
              {(res as any).statusDetailsJson}
            </pre>
          </div>
        )}
        {(res.metadata?.length > 0 || res.trailers?.length > 0) && (
          <div className="border-t border-[var(--border)] px-3 py-1 text-2xs text-[var(--text-3)]">
            {res.metadata?.map((h, i) => (
              <div key={`md-${i}`}>
                <span className="font-mono">{h.key}:</span> {h.value}
              </div>
            ))}
            {res.trailers?.map((h, i) => (
              <div key={`tr-${i}`}>
                <span className="font-mono text-[var(--text-2)]">
                  {h.key} (trailer):
                </span>{" "}
                {h.value}
              </div>
            ))}
          </div>
        )}
        {grpcAssertionResults.length > 0 && (
          <div className="border-t border-[var(--border)] px-3 py-1 flex flex-col gap-1">
            {grpcAssertionResults.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-2xs">
                {r.passed ? (
                  <CheckCircle2
                    size={11}
                    className="text-[var(--ok)] shrink-0"
                  />
                ) : (
                  <XCircle
                    size={11}
                    className="text-[var(--danger)] shrink-0"
                  />
                )}
                <span
                  className={
                    r.passed ? "text-[var(--ok)]" : "text-[var(--danger)]"
                  }
                >
                  {r.message ?? (r.passed ? "passed" : "failed")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Countdown to deadline — shown in stream header when timeoutMs is set */
function GrpcDeadlineCountdown() {
  const { grpcDeadlineEnd } = useStore();
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!grpcDeadlineEnd) {
      setRemaining(null);
      return;
    }
    const tick = () => {
      const ms = grpcDeadlineEnd - Date.now();
      setRemaining(ms > 0 ? ms : 0);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [grpcDeadlineEnd]);

  if (remaining === null) return null;
  const secs = (remaining / 1000).toFixed(1);
  const urgent = remaining < 5000;
  return (
    <span
      className={`font-mono text-2xs shrink-0 ${urgent ? "text-[var(--danger)] animate-pulse" : "text-[var(--text-3)]"}`}
    >
      ⏱ {secs}s
    </span>
  );
}

/** Inline diff between two stream message bodies */
function GrpcMessageDiffModal({
  left,
  right,
  onClose,
}: {
  left: string;
  right: string;
  onClose: () => void;
}) {
  const fakeResponse = (body: string) => ({
    status: 200,
    statusText: "OK",
    headers: [],
    body,
    timing: {
      dnsMs: 0,
      tcpMs: 0,
      tlsMs: 0,
      ttfbMs: 0,
      transferMs: 0,
      totalMs: 0,
    },
    requestSize: 0,
    responseSize: 0,
  });
  const diff = compareResponses(fakeResponse(left), fakeResponse(right));
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-pop)] flex flex-col"
        style={{ width: "80vw", maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border)]">
          <ArrowLeftRight size={13} className="text-[var(--accent)]" />
          <span className="text-xs font-semibold">Diff Messages</span>
          <span className="ml-auto flex items-center gap-2 text-2xs">
            <span className="text-[var(--ok)]">+{diff.summary.additions}</span>
            <span className="text-[var(--danger)]">
              −{diff.summary.deletions}
            </span>
            {diff.summary.changes > 0 && (
              <span className="text-yellow-600">~{diff.summary.changes}</span>
            )}
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-3)] ml-2"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 border-r border-[var(--border)] overflow-auto">
            <div className="px-3 py-1 text-2xs text-[var(--text-3)] border-b border-[var(--border)]">
              Left (baseline)
            </div>
            <pre className="p-2 text-2xs font-mono whitespace-pre-wrap break-all text-[var(--text-1)]">
              {diff.leftText}
            </pre>
          </div>
          <div className="flex-1 overflow-auto">
            <div className="px-3 py-1 text-2xs text-[var(--text-3)] border-b border-[var(--border)]">
              Right (comparison)
            </div>
            <pre className="p-2 text-2xs font-mono whitespace-pre-wrap break-all text-[var(--text-1)]">
              {diff.rightText}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StressStats {
  sent: number;
  received: number;
  lost: number;
  rtts: number[];
  running: boolean;
}

function percentile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

/** Stress mode: send N msgs/sec for X seconds, report stats */
function GrpcStressPanel({ streamId }: { streamId: string }) {
  const { grpcRequest } = useStore();
  const [rate, setRate] = useState(5);
  const [duration, setDuration] = useState(10);
  const [stats, setStats] = useState<StressStats | null>(null);
  const stopRef = useRef(false);

  const run = useCallback(async () => {
    if (!streamId) return;
    stopRef.current = false;
    const body = grpcRequest.body ?? "{}";
    const intervalMs = 1000 / rate;
    const endAt = Date.now() + duration * 1000;
    let sent = 0;
    let received = 0;
    const rtts: number[] = [];
    setStats({ sent: 0, received: 0, lost: 0, rtts: [], running: true });

    while (Date.now() < endAt && !stopRef.current) {
      const t0 = Date.now();
      const res = await grpcStreamSend(streamId, body).catch(() => ({
        error: "send failed",
      }));
      if (!res.error) {
        sent++;
        // Optimistically count received from store delta
        const nowReceived = useStore
          .getState()
          .grpcStreamReceivedMessages.filter((m) => !m.done).length;
        if (nowReceived > received) {
          rtts.push(Date.now() - t0);
          received = nowReceived;
        }
      }
      setStats({
        sent,
        received,
        lost: sent - received,
        rtts: [...rtts],
        running: true,
      });
      const elapsed = Date.now() - t0;
      if (elapsed < intervalMs)
        await new Promise((r) => setTimeout(r, intervalMs - elapsed));
    }

    const sorted = [...rtts].sort((a, b) => a - b);
    setStats({
      sent,
      received,
      lost: sent - received,
      rtts: sorted,
      running: false,
    });
  }, [streamId, rate, duration, grpcRequest.body]);

  const stop = () => {
    stopRef.current = true;
  };

  return (
    <div className="p-3 flex flex-col gap-3">
      <p className="text-2xs text-[var(--text-3)]">
        Send messages at a fixed rate on the open stream and measure throughput.
      </p>
      <div className="flex items-center gap-3">
        <label className="text-xs text-[var(--text-2)] w-24 shrink-0">
          Rate (msg/s)
        </label>
        <input
          type="number"
          min={1}
          max={100}
          className="input text-xs py-1 w-20"
          value={rate}
          onChange={(e) => setRate(Math.max(1, Number(e.target.value)))}
        />
      </div>
      <div className="flex items-center gap-3">
        <label className="text-xs text-[var(--text-2)] w-24 shrink-0">
          Duration (s)
        </label>
        <input
          type="number"
          min={1}
          max={300}
          className="input text-xs py-1 w-20"
          value={duration}
          onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))}
        />
      </div>
      <div className="flex gap-2">
        <button
          className="btn btn-primary text-xs flex items-center gap-1"
          onClick={run}
          disabled={!streamId || (stats?.running ?? false)}
        >
          <Gauge size={12} /> Start
        </button>
        {stats?.running && (
          <button className="btn btn-danger text-xs" onClick={stop}>
            Stop
          </button>
        )}
      </div>
      {stats && (
        <div className="bg-[var(--surface-2)] rounded p-2 flex flex-col gap-1 text-2xs font-mono">
          <div className="flex gap-4">
            <span>
              Sent: <b>{stats.sent}</b>
            </span>
            <span>
              Received: <b>{stats.received}</b>
            </span>
            <span className={stats.lost > 0 ? "text-[var(--danger)]" : ""}>
              Lost: <b>{stats.lost}</b>
            </span>
          </div>
          {stats.rtts.length > 0 && (
            <div className="flex gap-4 text-[var(--text-2)]">
              <span>p50: {percentile(stats.rtts, 50)}ms</span>
              <span>p95: {percentile(stats.rtts, 95)}ms</span>
              <span>p99: {percentile(stats.rtts, 99)}ms</span>
            </div>
          )}
          {stats.running && (
            <span className="text-[var(--accent)] animate-pulse">
              ● running…
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function GrpcStreamComposer({ streamId }: { streamId: string }) {
  const {
    set,
    grpcRequest,
    setGrpcRequest,
    grpcStreaming,
    grpcStreamReceivedMessages,
    grpcStreamSentMessages,
  } = useStore();
  const [sending, setSending] = useState(false);
  const [diffLeft, setDiffLeft] = useState<string | null>(null);
  const [diffRight, setDiffRight] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    logRef.current?.scrollTo({
      top: logRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [grpcStreamSentMessages.length, grpcStreamReceivedMessages.length]);

  const send = async () => {
    const body = grpcRequest.body ?? "{}";
    setSending(true);
    try {
      const res = await grpcStreamSend(streamId, body);
      if (res.error) {
        set({ grpcStatus: `Send error: ${res.error}` });
      } else {
        set({ grpcStreamSentMessages: [...grpcStreamSentMessages, body] });
      }
    } finally {
      setSending(false);
    }
  };

  // Ctrl+L: clear log
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "l") {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "SELECT") return;
        e.preventDefault();
        set({ grpcStreamSentMessages: [], grpcStreamReceivedMessages: [] });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const receivedBodies = grpcStreamReceivedMessages.filter(
    (m) => !m.done && m.bodyJson,
  );

  const selectForDiff = (body: string) => {
    if (!diffLeft) {
      setDiffLeft(body);
      return;
    }
    if (!diffRight) {
      setDiffRight(body);
      setShowDiff(true);
      return;
    }
    setDiffLeft(body);
    setDiffRight(null);
  };

  return (
    <>
      {showDiff && diffLeft && diffRight && (
        <GrpcMessageDiffModal
          left={diffLeft}
          right={diffRight}
          onClose={() => {
            setShowDiff(false);
            setDiffLeft(null);
            setDiffRight(null);
          }}
        />
      )}
      <div
        className="border-t border-[var(--border)] flex flex-col"
        style={{ maxHeight: 300 }}
      >
        <div className="px-3 py-1 text-2xs text-[var(--text-3)] border-b border-[var(--border)] flex items-center gap-2">
          <span>Stream transcript</span>
          {grpcStreaming && (
            <span className="text-[var(--accent)] animate-pulse">● live</span>
          )}
          <GrpcDeadlineCountdown />
          <span className="ml-auto text-2xs">
            {grpcStreamSentMessages.length} sent ·{" "}
            {grpcStreamReceivedMessages.filter((m) => !m.done).length} received
          </span>
          {receivedBodies.length >= 2 && (
            <button
              className="flex items-center gap-1 text-2xs text-[var(--accent)] hover:underline shrink-0"
              title="Select two received messages to diff (click first, then second)"
              onClick={() => {
                setDiffLeft(null);
                setDiffRight(null);
              }}
            >
              <ArrowLeftRight size={10} />
              {diffLeft ? "pick 2nd" : "Diff msgs"}
            </button>
          )}
          <button
            className="text-2xs text-[var(--text-3)] hover:text-[var(--text-1)] shrink-0"
            title="Clear log (Ctrl+L)"
            onClick={() =>
              set({
                grpcStreamSentMessages: [],
                grpcStreamReceivedMessages: [],
              })
            }
          >
            Clear
          </button>
        </div>
        <div ref={logRef} className="overflow-y-auto flex-1">
          {grpcStreamSentMessages.length === 0 &&
            grpcStreamReceivedMessages.length === 0 && (
              <p className="p-3 text-2xs text-[var(--text-3)]">
                Compose a message below and press Enter or click Send.
              </p>
            )}
          {grpcStreamSentMessages.map((body, i) => (
            <div
              key={`s${i}`}
              className="px-3 py-1.5 border-b border-[var(--border)] last:border-0 flex items-start gap-2"
            >
              <span className="text-2xs font-semibold text-[var(--accent)] shrink-0">
                →
              </span>
              <pre className="text-2xs font-mono text-[var(--text-1)] whitespace-pre-wrap break-all flex-1">
                {body}
              </pre>
            </div>
          ))}
          {grpcStreamReceivedMessages.map((msg, i) => (
            <div
              key={`r${i}`}
              className={`px-3 py-1.5 border-b border-[var(--border)] last:border-0 flex items-start gap-2 ${msg.done ? "bg-[var(--surface-2)]" : ""}`}
            >
              {msg.done ? (
                <span
                  className={`text-2xs font-semibold ${msg.error ? "text-[var(--danger)]" : "text-[var(--ok)]"}`}
                >
                  {msg.error
                    ? `Error: ${msg.statusMessage || msg.error}`
                    : `Done${msg.durationMs != null ? ` — ${msg.durationMs.toFixed(0)}ms` : ""}`}
                </span>
              ) : (
                <>
                  <span className="text-2xs font-semibold text-[var(--ok)] shrink-0">
                    ←
                  </span>
                  <pre
                    className={`text-2xs font-mono text-[var(--text-1)] whitespace-pre-wrap break-all flex-1 cursor-pointer ${diffLeft === msg.bodyJson ? "bg-yellow-100 dark:bg-yellow-900/20 rounded" : ""}`}
                    title={
                      diffLeft
                        ? "Click to select as right side of diff"
                        : "Click to select as left side of diff"
                    }
                    onClick={() => msg.bodyJson && selectForDiff(msg.bodyJson)}
                  >
                    {msg.bodyJson}
                  </pre>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--border)] flex items-center gap-2 px-2 py-1.5">
          <div
            className="flex-1 min-h-[56px]"
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.ctrlKey &&
                !e.metaKey
              ) {
                e.preventDefault();
                if (!sending && streamId) send();
              }
            }}
          >
            <CodeEditor
              value={grpcRequest.body ?? "{}"}
              onChange={(v) => setGrpcRequest({ body: v })}
              lang="json"
              minHeight="56px"
            />
          </div>
          <button
            className="btn-primary text-2xs flex items-center gap-1 px-2 py-1.5 shrink-0"
            onClick={send}
            disabled={sending || !streamId}
            title="Send (Enter)"
          >
            <Send size={11} />
            Send
          </button>
        </div>
      </div>
    </>
  );
}

export function GRPCClient() {
  const {
    grpcRequest,
    setGrpcRequest,
    grpcMethods,
    grpcStatus,
    grpcStreaming,
    grpcStreamMessages,
    grpcResponse,
    grpcStreamId,
  } = useStore();
  const [activeTab, setActiveTab] = useState<GrpcTab>("message");
  const [diffLeft, setDiffLeft] = useState<string | null>(null);
  const [diffRight, setDiffRight] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  const selectedMethod = grpcMethods.find(
    (m) => m.service === grpcRequest.service && m.method === grpcRequest.method,
  );
  const isServerStreaming =
    (selectedMethod?.serverStreaming ?? false) &&
    !selectedMethod?.clientStreaming;
  const isClientStream = selectedMethod?.clientStreaming ?? false;

  const receivedStreamBodies = grpcStreamMessages.filter(
    (m) => !m.done && m.bodyJson,
  );

  const selectForDiff = (body: string) => {
    if (!diffLeft) {
      setDiffLeft(body);
      return;
    }
    if (!diffRight) {
      setDiffRight(body);
      setShowDiff(true);
      return;
    }
    setDiffLeft(body);
    setDiffRight(null);
  };

  return (
    <div className="flex flex-col h-full gap-0">
      {showDiff && diffLeft && diffRight && (
        <GrpcMessageDiffModal
          left={diffLeft}
          right={diffRight}
          onClose={() => {
            setShowDiff(false);
            setDiffLeft(null);
            setDiffRight(null);
          }}
        />
      )}

      {grpcStatus && (
        <div className="px-3 py-1 text-2xs text-[var(--text-3)] border-b border-[var(--border)] bg-[var(--surface-2)]">
          {grpcStatus}
        </div>
      )}

      {/* Method picker */}
      {grpcMethods.length > 0 && (
        <GrpcMethodPicker
          methods={grpcMethods}
          selectedService={grpcRequest.service ?? ""}
          selectedMethod={grpcRequest.method ?? ""}
          onSelect={(service, method) => setGrpcRequest({ service, method })}
        />
      )}

      {/* Tab bar — hide when streaming composer is active */}
      {!isClientStream && (
        <>
          <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-[var(--border)]">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`tab-btn text-2xs ${activeTab === t.id ? "active" : ""}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {activeTab === "message" && (
              <div className="flex-1 overflow-auto">
                <CodeEditor
                  value={grpcRequest.body ?? "{}"}
                  onChange={(v) => setGrpcRequest({ body: v })}
                  lang="json"
                />
              </div>
            )}
            {activeTab === "metadata" && (
              <KeyValueEditor
                rows={(grpcRequest.metadata as KeyValue[] | undefined) ?? []}
                onChange={(rows) =>
                  setGrpcRequest({ metadata: rows as KeyValue[] })
                }
                keyPlaceholder="key"
                valuePlaceholder="value"
              />
            )}
            {activeTab === "auth" && <GrpcAuthPanel />}
            {activeTab === "scripts" && <GrpcScriptsPanel />}
            {activeTab === "saved" && <GrpcSavedMessagesPanel />}
            {activeTab === "stress" && (
              <div className="p-3 text-2xs text-[var(--text-3)]">
                Open a client/bidi stream first to use stress mode.
              </div>
            )}
            {activeTab === "options" && <GrpcOptionsPanel />}
          </div>
        </>
      )}

      {/* Client/bidi streaming: config tabs + composer */}
      {isClientStream && (
        <>
          <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-[var(--border)]">
            {TABS.filter((t) => t.id !== "message").map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`tab-btn text-2xs ${activeTab === t.id ? "active" : ""}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab !== "message" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {activeTab === "metadata" && (
                <KeyValueEditor
                  rows={(grpcRequest.metadata as KeyValue[] | undefined) ?? []}
                  onChange={(rows) =>
                    setGrpcRequest({ metadata: rows as KeyValue[] })
                  }
                  keyPlaceholder="key"
                  valuePlaceholder="value"
                />
              )}
              {activeTab === "auth" && <GrpcAuthPanel />}
              {activeTab === "scripts" && <GrpcScriptsPanel />}
              {activeTab === "options" && <GrpcOptionsPanel />}
              {activeTab === "saved" && <GrpcSavedMessagesPanel />}
              {activeTab === "stress" &&
                (grpcStreamId ? (
                  <GrpcStressPanel streamId={grpcStreamId} />
                ) : (
                  <div className="p-3 text-2xs text-[var(--text-3)]">
                    Open the stream first.
                  </div>
                ))}
            </div>
          )}

          {grpcStreamId && <GrpcStreamComposer streamId={grpcStreamId} />}

          {!grpcStreamId && !grpcStreaming && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-2xs text-[var(--text-3)]">
                Click Invoke to open the stream.
              </p>
            </div>
          )}
        </>
      )}

      {/* Server-stream messages */}
      {isServerStreaming && (
        <div
          className="border-t border-[var(--border)] flex flex-col"
          style={{ maxHeight: 200 }}
        >
          <div className="px-3 py-1 text-2xs text-[var(--text-3)] border-b border-[var(--border)] flex items-center gap-2">
            <span>Stream messages</span>
            {grpcStreaming && (
              <span className="text-[var(--accent)] animate-pulse">● live</span>
            )}
            <GrpcDeadlineCountdown />
            {grpcStreamMessages.length > 0 && (
              <span className="ml-auto">
                {grpcStreamMessages.filter((m) => !m.done).length} received
              </span>
            )}
            {receivedStreamBodies.length >= 2 && (
              <button
                className="flex items-center gap-1 text-2xs text-[var(--accent)] hover:underline shrink-0"
                title="Click two messages to diff them"
                onClick={() => {
                  setDiffLeft(null);
                  setDiffRight(null);
                }}
              >
                <ArrowLeftRight size={10} />
                {diffLeft ? "pick 2nd" : "Diff msgs"}
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {grpcStreamMessages.length === 0 && !grpcStreaming && (
              <p className="p-3 text-2xs text-[var(--text-3)]">
                No messages yet. Click Invoke to start streaming.
              </p>
            )}
            {grpcStreamMessages.map((msg, i) => (
              <div
                key={i}
                className={`px-3 py-1.5 border-b border-[var(--border)] last:border-0 ${msg.done ? "bg-[var(--surface-2)]" : ""}`}
              >
                {msg.done ? (
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-2xs font-semibold ${msg.error ? "text-[var(--danger)]" : "text-[var(--ok)]"}`}
                    >
                      {msg.error
                        ? `Error: ${msg.statusMessage || msg.error}`
                        : `Completed — ${msg.durationMs?.toFixed(0)}ms`}
                    </span>
                    {msg.trailers && msg.trailers.length > 0 && (
                      <span className="text-2xs text-[var(--text-3)]">
                        {msg.trailers
                          .map((t) => `${t.key}: ${t.value}`)
                          .join(", ")}
                      </span>
                    )}
                  </div>
                ) : (
                  <pre
                    className={`text-2xs font-mono text-[var(--text-1)] whitespace-pre-wrap break-all cursor-pointer ${diffLeft === msg.bodyJson ? "bg-yellow-100 dark:bg-yellow-900/20 rounded" : ""}`}
                    title={
                      diffLeft
                        ? "Click to select as right side of diff"
                        : "Click to select as left side of diff"
                    }
                    onClick={() => msg.bodyJson && selectForDiff(msg.bodyJson)}
                  >
                    {msg.bodyJson}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unary response */}
      {grpcResponse && !isServerStreaming && !isClientStream && (
        <GrpcResponsePanel res={grpcResponse} />
      )}
    </div>
  );
}
