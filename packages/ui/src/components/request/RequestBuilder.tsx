import { useState, useRef, useEffect } from "react";
import { ChevronRight, ChevronDown, Unplug, Plug, RefreshCw } from "lucide-react";
import { useStore } from "../../store";
import { URLBar } from "./URLBar";
import { KeyValueEditor } from "../shared/KeyValueEditor";
import { CodeEditor } from "../editors/CodeEditor";
import { WebSocketClient } from "../protocol/WebSocketClient";
import { GRPCClient } from "../protocol/GRPCClient";
import {
  GRAPHQL_INTROSPECTION_QUERY,
  parseGraphQLIntrospection,
  publicGraphQLTypes,
  formatGraphQLTypeRef,
} from "@invoke/core";
import { webSocketConnect, webSocketPoll, webSocketClose, grpcReflect, grpcExecute } from "../../lib/api";
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
  const showTabs = protocol === "rest" || protocol === "graphql";

  return (
    <div className="flex flex-col h-full">
      {/* Header row: protocol pills + URL bar */}
      <div className="flex items-center border-b border-[var(--border)]">
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
        <div className="flex-1">
          {(protocol === "rest" || protocol === "graphql") && <URLBar onSend={onSend} loading={loading} />}
          {protocol === "websocket" && <WebSocketBar />}
          {protocol === "grpc" && <GRPCBar />}
        </div>
      </div>

      {/* Tabs (REST and GraphQL only) */}
      {showTabs && (
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
      )}

      {/* Content */}
      {protocol === "websocket" ? (
        <div className="flex-1 overflow-hidden"><WebSocketClient /></div>
      ) : protocol === "grpc" ? (
        <div className="flex-1 overflow-hidden"><GRPCClient /></div>
      ) : (
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
      )}
    </div>
  );
}

// ── WebSocket URL bar ─────────────────────────────────────────

function WebSocketBar() {
  const { websocketRequest, setWebsocketRequest, websocketState, websocketConnectionId, set, addToast } = useStore();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollMessages = async (id: string) => {
    try {
      const { messages, connected } = await webSocketPoll(id);
      if (!connected) { disconnect(); return; }
      if (messages.length) {
        set((s) => ({
          websocketLog: [
            ...s.websocketLog,
            ...messages.map((m) => ({ id: Math.random().toString(36).slice(2), direction: "received" as const, type: m.type, body: m.body, createdAt: Date.now() }))
          ]
        }));
      }
    } catch { /* connection might be gone */ }
  };

  const connect = async () => {
    set({ websocketState: "connecting", websocketLog: [] });
    try {
      const { connectionId, error } = await webSocketConnect(websocketRequest);
      if (error) throw new Error(error);
      set({ websocketState: "connected", websocketConnectionId: connectionId });
      pollRef.current = setInterval(() => pollMessages(connectionId), 1000);
    } catch (e) { set({ websocketState: "disconnected" }); addToast("error", String(e)); }
  };

  const disconnect = async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (websocketConnectionId) await webSocketClose(websocketConnectionId).catch(() => {});
    set({ websocketState: "disconnected", websocketConnectionId: "" });
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const stateColor = { disconnected: "bg-red-500", connecting: "bg-yellow-400 animate-pulse", connected: "bg-emerald-500" }[websocketState];

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <div className={`w-2 h-2 rounded-full shrink-0 ${stateColor}`} />
      <input
        value={websocketRequest.url}
        onChange={(e) => setWebsocketRequest({ url: e.target.value })}
        placeholder="wss://echo.websocket.org"
        disabled={websocketState === "connected"}
        className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded px-3 py-1.5 text-xs font-mono text-[var(--text-1)] placeholder-[var(--text-3)] outline-none focus:border-[var(--accent)] transition-colors"
      />
      {websocketState === "connected"
        ? <button onClick={disconnect} className="btn btn-danger text-xs gap-1"><Unplug size={12} /> Disconnect</button>
        : <button onClick={connect} disabled={websocketState === "connecting"} className="btn btn-primary text-xs gap-1"><Plug size={12} /> Connect</button>
      }
    </div>
  );
}

// ── gRPC URL bar ──────────────────────────────────────────────

function GRPCBar() {
  const { grpcRequest, setGrpcRequest, set, addToast } = useStore();

  const reflect = async () => {
    set({ grpcStatus: "Reflecting…" });
    try {
      const { methods, error } = await grpcReflect(grpcRequest);
      if (error) throw new Error(error);
      set({ grpcMethods: methods, grpcStatus: `${methods.length} methods found` });
    } catch (e) { set({ grpcStatus: "Error" }); addToast("error", String(e)); }
  };

  const execute = async () => {
    set({ grpcStatus: "Executing…" });
    try {
      const res = await grpcExecute(grpcRequest);
      set({
        grpcStatus: "Done",
        response: { status: 200, statusText: "OK", headers: [], body: res.bodyJson ?? "", timing: { dnsMs: 0, tcpMs: 0, tlsMs: 0, ttfbMs: 0, transferMs: 0, totalMs: res.durationMs ?? 0 }, requestSize: 0, responseSize: 0 }
      });
    } catch (e) { set({ grpcStatus: "Error" }); addToast("error", String(e)); }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <input
        value={grpcRequest.address}
        onChange={(e) => setGrpcRequest({ address: e.target.value })}
        placeholder="localhost:50051"
        className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded px-3 py-1.5 text-xs font-mono text-[var(--text-1)] placeholder-[var(--text-3)] outline-none focus:border-[var(--accent)] transition-colors"
      />
      <label className="flex items-center gap-1 text-xs text-[var(--text-2)] shrink-0 cursor-pointer">
        <input type="checkbox" checked={grpcRequest.tls ?? false} onChange={(e) => setGrpcRequest({ tls: e.target.checked })} className="accent-[var(--accent)]" />
        TLS
      </label>
      <button onClick={reflect} className="btn text-xs gap-1"><RefreshCw size={12} /> Reflect</button>
      <button onClick={execute} className="btn btn-primary text-xs">Invoke</button>
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
          <Field label="Key"><input className="input text-xs py-1" value={auth.apiKeyName ?? ""} onChange={(e) => setRequest({ auth: { ...auth, apiKeyName: e.target.value } })} /></Field>
          <Field label="Value"><input className="input text-xs py-1 font-mono" value={auth.apiKeyValue ?? ""} onChange={(e) => setRequest({ auth: { ...auth, apiKeyValue: e.target.value } })} /></Field>
          <Field label="Add to">
            <select className="input text-xs py-1" value={auth.apiKeyIn ?? "header"} onChange={(e) => setRequest({ auth: { ...auth, apiKeyIn: e.target.value as "header" | "query" } })}>
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
          <Field label="Access Key"><input className="input text-xs py-1 font-mono" value={auth.awsAccessKeyId ?? ""} onChange={(e) => setRequest({ auth: { ...auth, awsAccessKeyId: e.target.value } })} /></Field>
          <Field label="Secret Key"><input className="input text-xs py-1 font-mono" type="password" value={auth.awsSecretAccessKey ?? ""} onChange={(e) => setRequest({ auth: { ...auth, awsSecretAccessKey: e.target.value } })} /></Field>
          <Field label="Region"><input className="input text-xs py-1" value={auth.awsRegion ?? ""} onChange={(e) => setRequest({ auth: { ...auth, awsRegion: e.target.value } })} /></Field>
          <Field label="Service"><input className="input text-xs py-1" value={auth.awsService ?? ""} onChange={(e) => setRequest({ auth: { ...auth, awsService: e.target.value } })} /></Field>
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
          <KeyValueEditor
            rows={(() => { try { return JSON.parse(request.body || "[]") as KeyValue[]; } catch { return []; } })()}
            onChange={(rows) => setRequest({ body: JSON.stringify(rows) })}
            keyPlaceholder="key" valuePlaceholder="value"
          />
        )}
      </div>
    </div>
  );
}

// ── GraphQL panels ────────────────────────────────────────────

function GraphQLQueryPanel() {
  const { graphqlRequest, setGraphqlRequest, set, graphqlSchema, graphqlSchemaStatus, expandedGraphQLTypeNames } = useStore();

  const introspect = async () => {
    if (!graphqlRequest.url) return;
    set({ graphqlSchemaStatus: "Fetching schema…" });
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      graphqlRequest.headers?.forEach((h) => { if (h.enabled !== false && h.key) headers[h.key] = h.value; });
      const res = await fetch(graphqlRequest.url, {
        method: "POST",
        headers,
        body: JSON.stringify({ query: GRAPHQL_INTROSPECTION_QUERY })
      });
      const data = await res.json() as { data?: unknown };
      if (data.data) {
        const schema = parseGraphQLIntrospection(JSON.stringify(data.data));
        set({ graphqlSchema: schema, graphqlSchemaStatus: "Schema loaded" });
      } else {
        set({ graphqlSchemaStatus: "Schema unavailable" });
      }
    } catch (e) {
      set({ graphqlSchemaStatus: `Failed: ${String(e).slice(0, 40)}` });
    }
  };

  const toggleType = (name: string) => {
    set((s) => ({
      expandedGraphQLTypeNames: s.expandedGraphQLTypeNames.includes(name)
        ? s.expandedGraphQLTypeNames.filter((n) => n !== name)
        : [...s.expandedGraphQLTypeNames, name]
    }));
  };

  const insertField = (fieldName: string) => {
    const current = graphqlRequest.query ?? "";
    const suffix = current && !current.endsWith("\n") ? "\n" : "";
    setGraphqlRequest({ query: current + suffix + `  ${fieldName}\n` });
  };

  const schemaTypes = graphqlSchema ? publicGraphQLTypes(graphqlSchema) : [];

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
        {graphqlSchemaStatus && (
          <span className={`text-2xs ${graphqlSchemaStatus.startsWith("Failed") ? "text-[var(--danger)]" : "text-[var(--text-3)]"}`}>
            {graphqlSchemaStatus}
          </span>
        )}
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto">
          <CodeEditor
            value={graphqlRequest.query ?? ""}
            onChange={(v) => setGraphqlRequest({ query: v })}
            lang="javascript"
            minHeight="200px"
          />
        </div>
        {graphqlSchema && (
          <div className="w-52 border-l border-[var(--border)] flex flex-col overflow-hidden bg-[var(--surface-2)]">
            <div className="px-2 py-1.5 border-b border-[var(--border)] shrink-0">
              <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider">Schema</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {schemaTypes.map((type) => {
                const expanded = expandedGraphQLTypeNames.includes(type.name);
                return (
                  <div key={type.name}>
                    <button
                      onClick={() => toggleType(type.name)}
                      className="w-full flex items-center gap-1 px-2 py-1 hover:bg-[var(--border)] text-left"
                    >
                      {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                      <span className="text-2xs font-mono text-[var(--accent)] truncate">{type.name}</span>
                    </button>
                    {expanded && type.fields?.map((field) => (
                      <button
                        key={field.name}
                        onClick={() => insertField(field.name)}
                        className="w-full flex items-center gap-1 pl-5 pr-2 py-0.5 hover:bg-[var(--border)] text-left"
                        title={`${field.name}: ${formatGraphQLTypeRef(field.type)}`}
                      >
                        <span className="text-2xs font-mono text-[var(--text-1)] truncate flex-1">{field.name}</span>
                        <span className="text-2xs text-[var(--text-3)] truncate ml-1">{formatGraphQLTypeRef(field.type)}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
          value={activeScript === "pre" ? (request.scripts?.preRequest ?? "") : (request.scripts?.postResponse ?? "")}
          onChange={(v) => setRequest({ scripts: { ...(request.scripts ?? {}), ...(activeScript === "pre" ? { preRequest: v } : { postResponse: v }) } })}
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
  const add = () => set({ assertionRules: [...assertionRules, { id: Math.random().toString(36).slice(2), type: "status" as const, expression: "", matcher: "equals" as const, expected: "200", enabled: true }] });
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
  const add = () => set({ extractRules: [...extractRules, { variableName: "", source: "body" as const, expression: "" }] });
  const remove = (i: number) => set({ extractRules: extractRules.filter((_, idx) => idx !== i) });
  const update = (i: number, patch: object) => set({ extractRules: extractRules.map((r, idx) => idx === i ? { ...r, ...patch } : r) });

  return (
    <div className="p-3 flex flex-col gap-2">
      {extractRules.map((rule, i) => (
        <div key={i} className="flex items-center gap-2 border border-[var(--border)] rounded p-2">
          <input value={rule.variableName ?? ""} onChange={(e) => update(i, { variableName: e.target.value })} placeholder="variableName" className="input py-0.5 text-2xs w-32 font-mono" />
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
