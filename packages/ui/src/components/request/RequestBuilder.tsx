import { useState } from "react";
import { useStore } from "../../store";
import { URLBar } from "./URLBar";
import { KeyValueEditor } from "../shared/KeyValueEditor";
import { CodeEditor } from "../editors/CodeEditor";
import { WebSocketClient } from "../protocol/WebSocketClient";
import { GRPCClient } from "../protocol/GRPCClient";
import type { RequestTab } from "../../lib/types";
import type { KeyValue, RequestProtocol } from "@invoke/core";

const PROTOCOLS: { id: RequestProtocol; label: string }[] = [
  { id: "rest",      label: "REST" },
  { id: "graphql",   label: "GraphQL" },
  { id: "websocket", label: "WebSocket" },
  { id: "grpc",      label: "gRPC" }
];

const REST_TABS: { id: RequestTab; label: string }[] = [
  { id: "params",     label: "Params" },
  { id: "headers",    label: "Headers" },
  { id: "auth",       label: "Auth" },
  { id: "body",       label: "Body" },
  { id: "scripts",    label: "Scripts" },
  { id: "assertions", label: "Assertions" },
  { id: "extract",    label: "Extract" }
];

const GQL_TABS: { id: RequestTab; label: string }[] = [
  { id: "graphql",         label: "Query" },
  { id: "graphqlVariables",label: "Variables" },
  { id: "headers",         label: "Headers" },
  { id: "auth",            label: "Auth" },
  { id: "assertions",      label: "Assertions" }
];

interface Props { onSend: () => void }

export function RequestBuilder({ onSend }: Props) {
  const { request, setRequest, requestTab, set, loading } = useStore();
  const protocol = (request.protocol ?? "rest") as RequestProtocol;

  const tabs = protocol === "graphql" ? GQL_TABS : REST_TABS;

  // WebSocket and gRPC have their own full-pane UIs
  if (protocol === "websocket") {
    return (
      <div className="flex flex-col h-full">
        <ProtocolBar protocol={protocol} onSend={onSend} loading={loading} />
        <div className="flex-1 overflow-hidden"><WebSocketClient /></div>
      </div>
    );
  }

  if (protocol === "grpc") {
    return (
      <div className="flex flex-col h-full">
        <ProtocolBar protocol={protocol} onSend={onSend} loading={loading} />
        <div className="flex-1 overflow-hidden"><GRPCClient /></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center border-b border-[var(--border)]">
        {/* Protocol pills */}
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-r border-[var(--border)]">
          {PROTOCOLS.map((p) => (
            <button
              key={p.id}
              onClick={() => setRequest({ protocol: p.id })}
              className={`tab-btn text-2xs ${protocol === p.id ? "active" : ""}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {/* URL bar fills remaining space */}
        <div className="flex-1">
          <URLBar onSend={onSend} loading={loading} />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-[var(--border)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => set({ requestTab: tab.id })}
            className={`tab-btn ${requestTab === tab.id ? "active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {requestTab === "params" && (
          <KeyValueEditor
            rows={request.params ?? []}
            onChange={(rows) => setRequest({ params: rows as KeyValue[] })}
            keyPlaceholder="param"
            valuePlaceholder="value"
          />
        )}
        {requestTab === "headers" && (
          <KeyValueEditor
            rows={request.headers ?? []}
            onChange={(rows) => setRequest({ headers: rows as KeyValue[] })}
            keyPlaceholder="Header-Name"
            valuePlaceholder="value"
          />
        )}
        {requestTab === "auth"            && <AuthPanel />}
        {requestTab === "body"            && <BodyPanel />}
        {requestTab === "graphql"         && <GraphQLQueryPanel />}
        {requestTab === "graphqlVariables"&& <GraphQLVariablesPanel />}
        {requestTab === "scripts"         && <ScriptsPanel />}
        {requestTab === "assertions"      && <AssertionsPanel />}
        {requestTab === "extract"         && <ExtractPanel />}
      </div>
    </div>
  );
}

// ── Protocol bar (for WS / gRPC — replaces URL bar) ──────────

function ProtocolBar({ protocol, onSend, loading }: { protocol: RequestProtocol; onSend: () => void; loading: boolean }) {
  const { setRequest, request } = useStore();
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)]">
      <div className="flex items-center gap-0.5 border-r border-[var(--border)] pr-2 mr-1">
        {PROTOCOLS.map((p) => (
          <button
            key={p.id}
            onClick={() => setRequest({ protocol: p.id })}
            className={`tab-btn text-2xs ${protocol === p.id ? "active" : ""}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {protocol === "grpc" && (
        <input
          value={(request as { address?: string }).address ?? ""}
          onChange={(e) => setRequest({ address: e.target.value } as Parameters<typeof setRequest>[0])}
          placeholder="localhost:50051"
          className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded px-3 py-1.5 text-xs font-mono outline-none focus:border-[var(--accent)]"
        />
      )}
    </div>
  );
}

// ── Auth panel ───────────────────────────────────────────────

function AuthPanel() {
  const { request, setRequest } = useStore();
  const auth = request.auth ?? { type: "none" };

  return (
    <div className="p-3 flex flex-col gap-3">
      <Field label="Type">
        <select
          value={auth.type}
          onChange={(e) => setRequest({ auth: { type: e.target.value as typeof auth.type } })}
          className="input text-xs py-1"
        >
          {["none","bearer","basic","api-key","oauth2","digest","aws-sigv4"].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </Field>

      {auth.type === "bearer" && (
        <Field label="Token">
          <input className="input text-xs py-1 font-mono" value={auth.token ?? ""} onChange={(e) => setRequest({ auth: { ...auth, token: e.target.value } })} placeholder="{{token}}" />
        </Field>
      )}

      {auth.type === "basic" && (
        <>
          <Field label="Username"><input className="input text-xs py-1" value={auth.username ?? ""} onChange={(e) => setRequest({ auth: { ...auth, username: e.target.value } })} /></Field>
          <Field label="Password"><input className="input text-xs py-1" type="password" value={auth.password ?? ""} onChange={(e) => setRequest({ auth: { ...auth, password: e.target.value } })} /></Field>
        </>
      )}

      {auth.type === "api-key" && (
        <>
          <Field label="Key"><input className="input text-xs py-1" value={auth.key ?? ""} onChange={(e) => setRequest({ auth: { ...auth, key: e.target.value } })} /></Field>
          <Field label="Value"><input className="input text-xs py-1 font-mono" value={auth.value ?? ""} onChange={(e) => setRequest({ auth: { ...auth, value: e.target.value } })} /></Field>
          <Field label="Add to">
            <select className="input text-xs py-1" value={auth.in ?? "header"} onChange={(e) => setRequest({ auth: { ...auth, in: e.target.value as "header" | "query" } })}>
              <option value="header">Header</option>
              <option value="query">Query param</option>
            </select>
          </Field>
        </>
      )}

      {auth.type === "oauth2" && (
        <>
          <Field label="Token URL"><input className="input text-xs py-1 font-mono" value={auth.tokenUrl ?? ""} onChange={(e) => setRequest({ auth: { ...auth, tokenUrl: e.target.value } })} /></Field>
          <Field label="Client ID"><input className="input text-xs py-1" value={auth.clientId ?? ""} onChange={(e) => setRequest({ auth: { ...auth, clientId: e.target.value } })} /></Field>
          <Field label="Client Secret"><input className="input text-xs py-1 font-mono" type="password" value={auth.clientSecret ?? ""} onChange={(e) => setRequest({ auth: { ...auth, clientSecret: e.target.value } })} /></Field>
          <Field label="Scope"><input className="input text-xs py-1" value={auth.scope ?? ""} onChange={(e) => setRequest({ auth: { ...auth, scope: e.target.value } })} /></Field>
        </>
      )}

      {auth.type === "digest" && (
        <>
          <Field label="Username"><input className="input text-xs py-1" value={auth.username ?? ""} onChange={(e) => setRequest({ auth: { ...auth, username: e.target.value } })} /></Field>
          <Field label="Password"><input className="input text-xs py-1" type="password" value={auth.password ?? ""} onChange={(e) => setRequest({ auth: { ...auth, password: e.target.value } })} /></Field>
        </>
      )}

      {auth.type === "aws-sigv4" && (
        <>
          <Field label="Access Key"><input className="input text-xs py-1 font-mono" value={auth.accessKeyId ?? ""} onChange={(e) => setRequest({ auth: { ...auth, accessKeyId: e.target.value } })} /></Field>
          <Field label="Secret Key"><input className="input text-xs py-1 font-mono" type="password" value={auth.secretAccessKey ?? ""} onChange={(e) => setRequest({ auth: { ...auth, secretAccessKey: e.target.value } })} /></Field>
          <Field label="Region"><input className="input text-xs py-1" value={auth.region ?? ""} onChange={(e) => setRequest({ auth: { ...auth, region: e.target.value } })} /></Field>
          <Field label="Service"><input className="input text-xs py-1" value={auth.service ?? ""} onChange={(e) => setRequest({ auth: { ...auth, service: e.target.value } })} /></Field>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-[var(--text-2)] w-24 shrink-0">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ── Body panel ───────────────────────────────────────────────

type BodyMode = "none" | "json" | "form-data" | "urlencoded" | "raw";

function BodyPanel() {
  const { request, setRequest } = useStore();
  const mode = (request.bodyMode ?? "none") as BodyMode;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[var(--border)]">
        {(["none","json","form-data","urlencoded","raw"] as BodyMode[]).map((m) => (
          <button key={m} onClick={() => setRequest({ bodyMode: m })} className={`tab-btn text-2xs ${mode === m ? "active" : ""}`}>{m}</button>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        {mode === "none" && <div className="flex items-center justify-center h-full text-xs text-[var(--text-3)]">No body</div>}
        {(mode === "json" || mode === "raw") && (
          <CodeEditor value={request.body ?? ""} onChange={(v) => setRequest({ body: v })} lang={mode === "json" ? "json" : "text"} />
        )}
        {(mode === "form-data" || mode === "urlencoded") && (
          <KeyValueEditor rows={request.formData ?? []} onChange={(rows) => setRequest({ formData: rows as KeyValue[] })} keyPlaceholder="key" valuePlaceholder="value" />
        )}
      </div>
    </div>
  );
}

// ── GraphQL panels ────────────────────────────────────────────

function GraphQLQueryPanel() {
  const { graphqlRequest, setGraphqlRequest, set, graphqlSchemaStatus } = useStore();

  const introspect = async () => {
    if (!graphqlRequest.url) return;
    set({ graphqlSchemaStatus: "Fetching schema…" });
    try {
      const res = await fetch(graphqlRequest.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(graphqlRequest.headers?.reduce((acc: Record<string, string>, h) => { if (h.enabled !== false) acc[h.key] = h.value; return acc; }, {})) },
        body: JSON.stringify({ query: "{ __schema { types { name } } }" })
      });
      const data = await res.json() as { data?: { __schema?: unknown } };
      if (data.data?.__schema) set({ graphqlSchemaStatus: "Schema loaded" });
      else set({ graphqlSchemaStatus: "Schema unavailable" });
    } catch { set({ graphqlSchemaStatus: "Failed to fetch schema" }); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)]">
        <input
          value={graphqlRequest.url ?? ""}
          onChange={(e) => setGraphqlRequest({ url: e.target.value })}
          placeholder="https://api.example.com/graphql"
          className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1 text-xs font-mono outline-none focus:border-[var(--accent)]"
        />
        <button onClick={introspect} className="btn text-2xs py-0.5 px-2">Fetch Schema</button>
        {graphqlSchemaStatus && <span className="text-2xs text-[var(--text-3)]">{graphqlSchemaStatus}</span>}
      </div>
      <div className="flex-1 overflow-auto">
        <CodeEditor
          value={graphqlRequest.query ?? ""}
          onChange={(v) => setGraphqlRequest({ query: v })}
          lang="javascript"
          minHeight="200px"
        />
      </div>
    </div>
  );
}

function GraphQLVariablesPanel() {
  const { graphqlRequest, setGraphqlRequest } = useStore();
  return (
    <div className="h-full overflow-auto">
      <CodeEditor
        value={graphqlRequest.variables ?? "{}"}
        onChange={(v) => setGraphqlRequest({ variables: v })}
        lang="json"
      />
    </div>
  );
}

// ── Scripts panel ────────────────────────────────────────────

function ScriptsPanel() {
  const { request, setRequest, scriptLogs } = useStore();
  const [activeScript, setActiveScript] = useState<"pre" | "post">("pre");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[var(--border)]">
        <button onClick={() => setActiveScript("pre")} className={`tab-btn text-2xs ${activeScript === "pre" ? "active" : ""}`}>Pre-request</button>
        <button onClick={() => setActiveScript("post")} className={`tab-btn text-2xs ${activeScript === "post" ? "active" : ""}`}>Post-response</button>
      </div>
      <div className="flex-1 overflow-hidden">
        <CodeEditor
          value={activeScript === "pre" ? (request.preRequestScript ?? "") : (request.postResponseScript ?? "")}
          onChange={(v) => setRequest(activeScript === "pre" ? { preRequestScript: v } : { postResponseScript: v })}
          lang="javascript"
          minHeight="200px"
        />
      </div>
      {scriptLogs.length > 0 && (
        <div className="border-t border-[var(--border)] p-2 max-h-28 overflow-auto">
          {scriptLogs.map((log, i) => (
            <div key={i} className="text-2xs font-mono text-[var(--text-2)]">{log}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Assertions panel ─────────────────────────────────────────

function AssertionsPanel() {
  const { assertionRules, assertionResults, set } = useStore();
  const add = () => set({ assertionRules: [...assertionRules, { type: "status", matcher: "equals", expected: "200" } as Parameters<typeof set>[0]["assertionRules"][0]] });
  const remove = (i: number) => set({ assertionRules: assertionRules.filter((_, idx) => idx !== i) });
  const update = (i: number, patch: object) => set({ assertionRules: assertionRules.map((r, idx) => idx === i ? { ...r, ...patch } : r) });

  return (
    <div className="p-3 flex flex-col gap-2">
      {assertionRules.map((rule, i) => {
        const result = assertionResults[i];
        return (
          <div key={i} className={`flex items-center gap-2 p-2 rounded border text-xs ${result ? (result.passed ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50") : "border-[var(--border)]"}`}>
            <select value={rule.type} onChange={(e) => update(i, { type: e.target.value })} className="input py-0.5 text-2xs w-28">
              {["status","responseTime","header","bodyJsonPath","bodySchema","regex"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {(rule.type === "header" || rule.type === "bodyJsonPath") && (
              <input value={(rule as { expression?: string }).expression ?? ""} onChange={(e) => update(i, { expression: e.target.value })} placeholder="path" className="input py-0.5 text-2xs w-28 font-mono" />
            )}
            <select value={rule.matcher} onChange={(e) => update(i, { matcher: e.target.value })} className="input py-0.5 text-2xs w-28">
              {["equals","notEquals","contains","exists","gt","lt","matches"].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <input value={String(rule.expected ?? "")} onChange={(e) => update(i, { expected: e.target.value })} placeholder="expected" className="input py-0.5 text-2xs flex-1 font-mono" />
            <button onClick={() => remove(i)} className="text-[var(--text-3)] hover:text-[var(--danger)]">×</button>
          </div>
        );
      })}
      <button onClick={add} className="btn text-xs self-start">+ Add assertion</button>
    </div>
  );
}

// ── Extract panel ────────────────────────────────────────────

function ExtractPanel() {
  const { extractRules, set } = useStore();
  const add = () => set({ extractRules: [...extractRules, { variable: "", source: "body", expression: "" }] });
  const remove = (i: number) => set({ extractRules: extractRules.filter((_, idx) => idx !== i) });
  const update = (i: number, patch: object) => set({ extractRules: extractRules.map((r, idx) => idx === i ? { ...r, ...patch } : r) });

  return (
    <div className="p-3 flex flex-col gap-2">
      {extractRules.map((rule, i) => (
        <div key={i} className="flex items-center gap-2 border border-[var(--border)] rounded p-2">
          <input value={rule.variable ?? ""} onChange={(e) => update(i, { variable: e.target.value })} placeholder="variableName" className="input py-0.5 text-2xs w-32 font-mono" />
          <select value={rule.source ?? "body"} onChange={(e) => update(i, { source: e.target.value })} className="input py-0.5 text-2xs w-24">
            {["body","header","status"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input value={rule.expression ?? ""} onChange={(e) => update(i, { expression: e.target.value })} placeholder="$.path or header-name" className="input py-0.5 text-2xs flex-1 font-mono" />
          <button onClick={() => remove(i)} className="text-[var(--text-3)] hover:text-[var(--danger)]">×</button>
        </div>
      ))}
      <button onClick={add} className="btn text-xs self-start">+ Add rule</button>
    </div>
  );
}
