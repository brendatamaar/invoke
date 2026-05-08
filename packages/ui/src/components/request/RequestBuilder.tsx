import { useState, useRef, useEffect, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  Unplug,
  Plug,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  StopCircle,
  Zap,
  X,
  Link2,
  FileUp,
} from "lucide-react";
import { Select } from "../shared/Select";
import { useStore } from "../../store";
import { URLBar } from "./URLBar";
import { KeyValueEditor } from "../shared/KeyValueEditor";
import { VariableAutocompleteInput } from "../shared/VariableAutocompleteInput";
import { CodeEditor } from "../editors/CodeEditor";
import { WebSocketClient } from "../protocol/WebSocketClient";
import { GRPCClient } from "../protocol/GRPCClient";
import {
  GRAPHQL_INTROSPECTION_QUERY,
  parseGraphQLIntrospection,
  publicGraphQLTypes,
  formatGraphQLTypeRef,
  resolveTemplate,
  variablesFromScopes,
} from "@invoke/core";
import {
  webSocketConnect,
  webSocketPoll,
  webSocketClose,
  grpcReflect,
  grpcExecute,
  grpcServerStream,
  oauth2AuthCodeStart,
  oauth2AuthCodeResult,
} from "../../lib/api";
import type { RequestTab } from "../../lib/types";
import type { KeyValue, RequestProtocol, VariableScope } from "@invoke/core";

const PROTOCOLS: { id: RequestProtocol; label: string }[] = [
  { id: "rest", label: "REST" },
  { id: "graphql", label: "GraphQL" },
  { id: "websocket", label: "WebSocket" },
  { id: "grpc", label: "gRPC" },
];

const REST_TABS: { id: RequestTab; label: string }[] = [
  { id: "params", label: "Params" },
  { id: "headers", label: "Headers" },
  { id: "auth", label: "Auth" },
  { id: "body", label: "Body" },
  { id: "scripts", label: "Scripts" },
  { id: "assertions", label: "Assertions" },
  { id: "extract", label: "Extract" },
  { id: "retry", label: "Retry" },
];

const GQL_TABS: { id: RequestTab; label: string }[] = [
  { id: "graphql", label: "Query" },
  { id: "graphqlVariables", label: "Variables" },
  { id: "headers", label: "Headers" },
  { id: "auth", label: "Auth" },
  { id: "assertions", label: "Assertions" },
];

interface Props {
  onSend: () => void;
}

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
              onClick={() => {
              setRequest({ protocol: p.id });
              set({
                requestTab:
                  p.id === "graphql" ? "graphql" : "params",
              });
            }}
              className={`tab-btn text-2xs ${protocol === p.id ? "active" : ""}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex-1">
          {(protocol === "rest" || protocol === "graphql") && (
            <URLBar onSend={onSend} loading={loading} />
          )}
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
        <div className="flex-1 overflow-hidden">
          <WebSocketClient />
        </div>
      ) : protocol === "grpc" ? (
        <div className="flex-1 overflow-hidden">
          <GRPCClient />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {requestTab === "params" && (
            <KeyValueEditor
              rows={request.params ?? []}
              onChange={(rows) => {
                const kv = rows as KeyValue[];
                const base = request.url.split("?")[0];
                const enabled = kv.filter((r) => r.enabled !== false && r.key);
                const qs = enabled
                  .map(
                    (r) =>
                      `${encodeURIComponent(r.key)}=${encodeURIComponent(r.value ?? "")}`,
                  )
                  .join("&");
                setRequest({ params: kv, url: qs ? `${base}?${qs}` : base });
              }}
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
          {requestTab === "auth" && <AuthPanel />}
          {requestTab === "body" && <BodyPanel />}
          {requestTab === "graphql" && <GraphQLQueryPanel />}
          {requestTab === "graphqlVariables" && <GraphQLVariablesPanel />}
          {requestTab === "scripts" && <ScriptsPanel />}
          {requestTab === "assertions" && <AssertionsPanel />}
          {requestTab === "extract" && <ExtractPanel />}
          {requestTab === "retry" && <RetryPanel />}
        </div>
      )}
    </div>
  );
}

// WebSocket URL bar
function WebSocketBar() {
  const {
    websocketRequest,
    setWebsocketRequest,
    websocketState,
    websocketConnectionId,
    set,
    addToast,
  } = useStore();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollMessages = async (id: string) => {
    try {
      const { messages, connected } = await webSocketPoll(id);
      if (!connected) {
        disconnect();
        return;
      }
      if (messages.length) {
        set((s) => ({
          websocketLog: [
            ...s.websocketLog,
            ...messages.map((m) => ({
              id: Math.random().toString(36).slice(2),
              direction: "received" as const,
              type: m.type,
              body: m.body,
              createdAt: Date.now(),
            })),
          ],
        }));
      }
    } catch {
      /* connection might be gone */
    }
  };

  const connect = async () => {
    set({ websocketState: "connecting", websocketLog: [] });
    try {
      const { connectionId, error } = await webSocketConnect(websocketRequest);
      if (error) throw new Error(error);
      set({ websocketState: "connected", websocketConnectionId: connectionId });
      pollRef.current = setInterval(() => pollMessages(connectionId), 1000);
    } catch (e) {
      set({ websocketState: "disconnected" });
      addToast("error", String(e));
    }
  };

  const disconnect = async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (websocketConnectionId)
      await webSocketClose(websocketConnectionId).catch(() => {});
    set({ websocketState: "disconnected", websocketConnectionId: "" });
  };

  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current);
    },
    [],
  );

  const stateColor = {
    disconnected: "bg-red-500",
    connecting: "bg-yellow-400 animate-pulse",
    connected: "bg-emerald-500",
  }[websocketState];

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
      {websocketState === "connected" ? (
        <button onClick={disconnect} className="btn btn-danger text-xs gap-1">
          <Unplug size={12} /> Disconnect
        </button>
      ) : (
        <button
          onClick={connect}
          disabled={websocketState === "connecting"}
          className="btn btn-primary text-xs gap-1"
        >
          <Plug size={12} /> Connect
        </button>
      )}
    </div>
  );
}

// gRPC URL bar
function GRPCBar() {
  const { grpcRequest, setGrpcRequest, grpcMethods, grpcStreaming, set, addToast } = useStore();

  const selectedMethod = grpcMethods.find(
    (m) => m.service === grpcRequest.service && m.method === grpcRequest.method,
  );
  const isServerStreaming = selectedMethod?.serverStreaming ?? false;

  const reflect = async () => {
    set({ grpcStatus: "Reflecting…" });
    try {
      const { methods, error } = await grpcReflect(grpcRequest);
      if (error) throw new Error(error);
      set({ grpcMethods: methods, grpcStatus: `${methods.length} methods found` });
    } catch (e) {
      set({ grpcStatus: "Error" });
      addToast("error", String(e));
    }
  };

  const execute = async () => {
    if (isServerStreaming) {
      const controller = new AbortController();
      set({ grpcStreaming: true, grpcStreamMessages: [], grpcStreamController: controller, grpcStatus: "Streaming…" });
      try {
        await grpcServerStream(grpcRequest, {
          onMessage: (msg) => {
            set((s) => ({ grpcStreamMessages: [...s.grpcStreamMessages, msg] }));
          },
          onDone: (msg) => {
            set((s) => ({
              grpcStreamMessages: [...s.grpcStreamMessages, msg],
              grpcStreaming: false,
              grpcStreamController: undefined,
              grpcStatus: msg.error ? `Error: ${msg.statusMessage}` : `Done — ${s.grpcStreamMessages.length + 1} messages`,
            }));
          },
          signal: controller.signal,
        });
      } catch (e: unknown) {
        if ((e as Error).name !== "AbortError") addToast("error", String(e));
        set({ grpcStreaming: false, grpcStreamController: undefined, grpcStatus: "Cancelled" });
      }
      return;
    }

    set({ grpcStatus: "Executing…" });
    try {
      const res = await grpcExecute(grpcRequest);
      set({
        grpcStatus: res.error ? `Error: ${res.statusMessage}` : "Done",
        response: {
          status: res.error ? 500 : 200,
          statusText: res.statusMessage ?? "OK",
          headers: res.metadata ?? [],
          body: res.bodyJson ?? "",
          timing: { dnsMs: 0, tcpMs: 0, tlsMs: 0, ttfbMs: 0, transferMs: 0, totalMs: res.durationMs ?? 0 },
          requestSize: 0,
          responseSize: 0,
        },
      });
    } catch (e) {
      set({ grpcStatus: "Error" });
      addToast("error", String(e));
    }
  };

  const cancelStream = () => {
    const { grpcStreamController } = useStore.getState();
    grpcStreamController?.abort();
    set({ grpcStreaming: false, grpcStreamController: undefined, grpcStatus: "Cancelled" });
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
        <input
          type="checkbox"
          checked={grpcRequest.tls ?? false}
          onChange={(e) => setGrpcRequest({ tls: e.target.checked })}
          className="accent-[var(--accent)]"
        />
        TLS
      </label>
      <button onClick={reflect} className="btn text-xs gap-1">
        <RefreshCw size={12} /> Reflect
      </button>
      {grpcStreaming ? (
        <button onClick={cancelStream} className="btn btn-danger text-xs flex items-center gap-1">
          <StopCircle size={12} /> Cancel
        </button>
      ) : (
        <button onClick={execute} className="btn btn-primary text-xs flex items-center gap-1">
          {isServerStreaming && <Zap size={12} />}
          Invoke
        </button>
      )}
    </div>
  );
}

// Auth panel
function AuthPanel() {
  const { request, setRequest, addToast } = useStore();
  const auth = request.auth ?? { type: "none" };
  const [authorizing, setAuthorizing] = useState(false);

  return (
    <div className="p-3 flex flex-col gap-3">
      <Field label="Type">
        <Select
          value={auth.type}
          onChange={(e) =>
            setRequest({ auth: { type: e.target.value as typeof auth.type } })
          }
        >
          {[
            "none",
            "bearer",
            "basic",
            "api-key",
            "oauth2",
            "digest",
            "aws-sigv4",
          ].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </Field>

      {auth.type === "bearer" && (
        <Field label="Token">
          <AuthTextInput
            value={auth.token ?? ""}
            onChange={(value) => setRequest({ auth: { ...auth, token: value } })}
            placeholder="{{token}}"
          />
        </Field>
      )}

      {auth.type === "basic" && (
        <>
          <Field label="Username">
            <AuthTextInput
              value={auth.username ?? ""}
              onChange={(value) =>
                setRequest({ auth: { ...auth, username: value } })
              }
            />
          </Field>
          <Field label="Password">
            <AuthTextInput
              type="password"
              value={auth.password ?? ""}
              onChange={(value) =>
                setRequest({ auth: { ...auth, password: value } })
              }
            />
          </Field>
        </>
      )}

      {auth.type === "api-key" && (
        <>
          <Field label="Key">
            <AuthTextInput
              value={auth.apiKeyName ?? ""}
              onChange={(value) =>
                setRequest({ auth: { ...auth, apiKeyName: value } })
              }
            />
          </Field>
          <Field label="Value">
            <AuthTextInput
              value={auth.apiKeyValue ?? ""}
              onChange={(value) =>
                setRequest({ auth: { ...auth, apiKeyValue: value } })
              }
            />
          </Field>
          <Field label="Add to">
            <Select
              value={auth.apiKeyIn ?? "header"}
              onChange={(e) =>
                setRequest({
                  auth: {
                    ...auth,
                    apiKeyIn: e.target.value as "header" | "query",
                  },
                })
              }
            >
              <option value="header">Header</option>
              <option value="query">Query param</option>
            </Select>
          </Field>
        </>
      )}

      {auth.type === "oauth2" && (
        <>
          <Field label="Flow">
            <Select
              value={auth.flow ?? "client_credentials"}
              onChange={(e) => setRequest({ auth: { ...auth, flow: e.target.value as "client_credentials" | "authorization_code" } })}
              className="bg-[var(--surface-2)] text-xs"
            >
              <option value="client_credentials">Client Credentials</option>
              <option value="authorization_code">Authorization Code</option>
            </Select>
          </Field>
          {(auth.flow ?? "client_credentials") === "authorization_code" && (
            <Field label="Authorization URL">
              <AuthTextInput
                value={auth.authUrl ?? ""}
                onChange={(value) => setRequest({ auth: { ...auth, authUrl: value } })}
                placeholder="https://provider.com/oauth/authorize"
              />
            </Field>
          )}
          <Field label="Token URL">
            <AuthTextInput
              value={auth.tokenUrl ?? ""}
              onChange={(value) =>
                setRequest({ auth: { ...auth, tokenUrl: value } })
              }
            />
          </Field>
          <Field label="Client ID">
            <AuthTextInput
              value={auth.clientId ?? ""}
              onChange={(value) =>
                setRequest({ auth: { ...auth, clientId: value } })
              }
            />
          </Field>
          <Field label="Client Secret">
            <AuthTextInput
              type="password"
              value={auth.clientSecret ?? ""}
              onChange={(value) =>
                setRequest({ auth: { ...auth, clientSecret: value } })
              }
            />
          </Field>
          <Field label="Scope">
            <AuthTextInput
              value={auth.scope ?? ""}
              onChange={(value) =>
                setRequest({ auth: { ...auth, scope: value } })
              }
            />
          </Field>
          {(auth.flow ?? "client_credentials") === "authorization_code" && (
            <>
              <Field label="Redirect URI">
                <AuthTextInput
                  value={auth.redirectUri ?? "http://localhost:4000/api/oauth2/callback"}
                  onChange={(value) => setRequest({ auth: { ...auth, redirectUri: value } })}
                />
              </Field>
              <div className="flex items-center gap-2 mt-1">
                {auth.accessToken && (
                  <span className="flex items-center gap-1 text-2xs text-emerald-600">
                    <CheckCircle2 size={11} />
                    Token stored
                    {auth.tokenExpiresAt && (
                      <span className="text-[var(--text-3)]">
                        — expires {new Date(auth.tokenExpiresAt).toLocaleString()}
                      </span>
                    )}
                  </span>
                )}
                <button
                  disabled={authorizing || !auth.authUrl || !auth.tokenUrl || !auth.clientId}
                  onClick={async () => {
                    if (!auth.authUrl || !auth.tokenUrl || !auth.clientId) return;
                    setAuthorizing(true);
                    try {
                      const redirectUri = auth.redirectUri ?? "http://localhost:4000/api/oauth2/callback";
                      const { authUrl: url, state } = await oauth2AuthCodeStart({
                        authUrl: auth.authUrl,
                        tokenUrl: auth.tokenUrl,
                        clientId: auth.clientId,
                        clientSecret: auth.clientSecret ?? "",
                        scope: auth.scope ?? "",
                        redirectUri,
                        pkce: auth.pkce ?? false,
                        codeChallenge: "",
                        codeChallengeMethod: "",
                      });
                      window.open(url, "_blank");
                      // Poll for token
                      const poll = async () => {
                        const result = await oauth2AuthCodeResult(state);
                        if (result.status === "pending") {
                          setTimeout(poll, 1500);
                          return;
                        }
                        setAuthorizing(false);
                        if (result.status === "done" && result.accessToken) {
                          const expiresAt = result.expiresIn ? Date.now() + result.expiresIn * 1000 : undefined;
                          setRequest({
                            auth: {
                              ...auth,
                              accessToken: result.accessToken,
                              refreshToken: result.refreshToken,
                              tokenExpiresAt: expiresAt,
                            },
                          });
                          addToast("success", "OAuth2 token obtained");
                        } else {
                          addToast("error", `OAuth2 failed: ${result.error ?? "unknown"}`);
                        }
                      };
                      setTimeout(poll, 1500);
                    } catch (e) {
                      setAuthorizing(false);
                      addToast("error", String(e));
                    }
                  }}
                  className="ml-auto btn btn-primary text-2xs py-0.5 px-2 flex items-center gap-1"
                >
                  {authorizing ? (
                    <><RefreshCw size={11} className="animate-spin" /> Waiting…</>
                  ) : (
                    <><ExternalLink size={11} /> Authorize</>
                  )}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {auth.type === "digest" && (
        <>
          <Field label="Username">
            <AuthTextInput
              value={auth.username ?? ""}
              onChange={(value) =>
                setRequest({ auth: { ...auth, username: value } })
              }
            />
          </Field>
          <Field label="Password">
            <AuthTextInput
              type="password"
              value={auth.password ?? ""}
              onChange={(value) =>
                setRequest({ auth: { ...auth, password: value } })
              }
            />
          </Field>
        </>
      )}

      {auth.type === "aws-sigv4" && (
        <>
          <Field label="Access Key">
            <AuthTextInput
              value={auth.awsAccessKeyId ?? ""}
              onChange={(value) =>
                setRequest({
                  auth: { ...auth, awsAccessKeyId: value },
                })
              }
            />
          </Field>
          <Field label="Secret Key">
            <AuthTextInput
              type="password"
              value={auth.awsSecretAccessKey ?? ""}
              onChange={(value) =>
                setRequest({
                  auth: { ...auth, awsSecretAccessKey: value },
                })
              }
            />
          </Field>
          <Field label="Region">
            <AuthTextInput
              value={auth.awsRegion ?? ""}
              onChange={(value) =>
                setRequest({ auth: { ...auth, awsRegion: value } })
              }
            />
          </Field>
          <Field label="Service">
            <AuthTextInput
              value={auth.awsService ?? ""}
              onChange={(value) =>
                setRequest({ auth: { ...auth, awsService: value } })
              }
            />
          </Field>
        </>
      )}
    </div>
  );
}

function AuthTextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "password";
}) {
  return (
    <VariableAutocompleteInput
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="input text-xs py-1 font-mono"
    />
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-[var(--text-2)] w-24 shrink-0">
        {label}
      </label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// Body panel
type BodyMode = "none" | "json" | "form-data" | "urlencoded" | "raw";

function BodyPanel() {
  const { request, setRequest } = useStore();
  const mode = (request.bodyMode ?? "none") as BodyMode;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[var(--border)]">
        {(["none", "json", "form-data", "urlencoded", "raw"] as BodyMode[]).map(
          (m) => (
            <button
              key={m}
              onClick={() => setRequest({ bodyMode: m })}
              className={`tab-btn text-2xs ${mode === m ? "active" : ""}`}
            >
              {m}
            </button>
          ),
        )}
      </div>
      <div className="flex-1 overflow-auto">
        {mode === "none" && (
          <div className="flex items-center justify-center h-full text-xs text-[var(--text-3)]">
            No body
          </div>
        )}
        {(mode === "json" || mode === "raw") && (
          <CodeEditor
            value={request.body ?? ""}
            onChange={(v) => setRequest({ body: v })}
            lang={mode === "json" ? "json" : "text"}
          />
        )}
        {(mode === "form-data" || mode === "urlencoded") && (
          <KeyValueEditor
            rows={(() => {
              try {
                return JSON.parse(request.body || "[]") as KeyValue[];
              } catch {
                return [];
              }
            })()}
            onChange={(rows) => setRequest({ body: JSON.stringify(rows) })}
            keyPlaceholder="key"
            valuePlaceholder="value"
          />
        )}
      </div>
    </div>
  );
}

// GraphQL panels
function GraphQLQueryPanel() {
  const {
    graphqlRequest,
    setGraphqlRequest,
    graphqlSchema,
    expandedGraphQLTypeNames,
    set,
  } = useStore();
  const [schemaModalOpen, setSchemaModalOpen] = useState(false);

  const toggleType = (name: string) => {
    set((s) => ({
      expandedGraphQLTypeNames: s.expandedGraphQLTypeNames.includes(name)
        ? s.expandedGraphQLTypeNames.filter((n) => n !== name)
        : [...s.expandedGraphQLTypeNames, name],
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
        <button
          onClick={() => setSchemaModalOpen(true)}
          className="btn text-2xs py-0.5 px-2 gap-1"
        >
          <FileUp size={12} />
          Import Schema
        </button>
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
              <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
                Schema
              </span>
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
                      {expanded ? (
                        <ChevronDown size={11} />
                      ) : (
                        <ChevronRight size={11} />
                      )}
                      <span className="text-2xs font-mono text-[var(--accent)] truncate">
                        {type.name}
                      </span>
                    </button>
                    {expanded &&
                      type.fields?.map((field) => (
                        <button
                          key={field.name}
                          onClick={() => insertField(field.name)}
                          className="w-full flex items-center gap-1 pl-5 pr-2 py-0.5 hover:bg-[var(--border)] text-left"
                          title={`${field.name}: ${formatGraphQLTypeRef(field.type)}`}
                        >
                          <span className="text-2xs font-mono text-[var(--text-1)] truncate flex-1">
                            {field.name}
                          </span>
                          <span className="text-2xs text-[var(--text-3)] truncate ml-1">
                            {formatGraphQLTypeRef(field.type)}
                          </span>
                        </button>
                      ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <GraphQLSchemaImportModal
        open={schemaModalOpen}
        onClose={() => setSchemaModalOpen(false)}
      />
    </div>
  );
}

type GraphQLSchemaImportSource = "url" | "file";

function graphQLSchemaStatusClass(status: string) {
  if (status.startsWith("Failed")) return "text-[var(--danger)]";
  if (status.startsWith("Missing")) return "text-[var(--warn)]";
  return "text-[var(--text-3)]";
}

function graphQLSchemaFailureStatus(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return `Failed: ${message}`;
}

function GraphQLSchemaImportModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    request,
    set,
    graphqlSchemaStatus,
    environments,
    activeEnvironmentId,
    sessionVariables,
  } = useStore();
  const [source, setSource] = useState<GraphQLSchemaImportSource>("url");
  const [schemaUrl, setSchemaUrl] = useState("");
  const [working, setWorking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setSource("url");
    setWorking(false);
  }, [open]);

  if (!open) return null;

  const close = () => {
    if (!working) onClose();
  };

  const resolveSchemaUrlAndHeaders = () => {
    const env = environments.find((e) => e.id === activeEnvironmentId);
    const scopes: VariableScope[] = [
      { name: "environment", variables: env?.variables ?? [] },
      { name: "session", variables: sessionVariables },
    ];
    const variables = variablesFromScopes(scopes);
    const unresolved = new Set<string>();
    const resolve = (value: string) => {
      const resolved = resolveTemplate(value, variables);
      resolved.unresolved.forEach((name) => unresolved.add(name));
      return resolved.value;
    };
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    request.headers?.forEach((h) => {
      if (h.enabled !== false && h.key)
        headers[resolve(h.key)] = resolve(h.value);
    });
    return {
      url: resolve(schemaUrl.trim()),
      headers,
      unresolved: [...unresolved],
    };
  };

  const loadSchema = (body: string) => {
    const schema = parseGraphQLIntrospection(body);
    set({ graphqlSchema: schema, graphqlSchemaStatus: "Schema loaded" });
    onClose();
  };

  const fetchSchema = async () => {
    if (!schemaUrl.trim() || working) return;
    const { url, headers, unresolved } = resolveSchemaUrlAndHeaders();
    if (unresolved.length > 0) {
      set({
        graphqlSchemaStatus: `Missing variables: ${unresolved.slice(0, 5).join(", ")}`,
      });
      return;
    }

    setWorking(true);
    set({ graphqlSchemaStatus: "Fetching schema…" });
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ query: GRAPHQL_INTROSPECTION_QUERY }),
      });
      const body = await res.text();
      if (!res.ok) {
        set({
          graphqlSchemaStatus: `Failed: HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""}`,
        });
        return;
      }
      loadSchema(body);
    } catch (e) {
      set({ graphqlSchemaStatus: graphQLSchemaFailureStatus(e) });
    } finally {
      setWorking(false);
    }
  };

  const importSchemaFile = async (file: File | undefined) => {
    if (!file || working) return;
    setWorking(true);
    set({ graphqlSchemaStatus: "Importing schema…" });
    try {
      loadSchema(await file.text());
    } catch (e) {
      set({ graphqlSchemaStatus: graphQLSchemaFailureStatus(e) });
    } finally {
      setWorking(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={close}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl flex flex-col"
        style={{ width: 520, maxWidth: "calc(100vw - 32px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
          <FileUp size={14} className="text-[var(--accent)]" />
          <span className="text-sm font-semibold">Import Schema</span>
          <button
            onClick={close}
            disabled={working}
            className="ml-auto p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-3)] disabled:opacity-50"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <div className="flex items-center gap-1">
            {(["url", "file"] as GraphQLSchemaImportSource[]).map((option) => (
              <button
                key={option}
                onClick={() => setSource(option)}
                className={`tab-btn text-2xs ${source === option ? "active" : ""}`}
              >
                {option === "url" ? "URL" : "Local JSON"}
              </button>
            ))}
          </div>

          {source === "url" ? (
            <div className="flex flex-col gap-2">
              <label className="text-2xs text-[var(--text-3)]">
                GraphQL endpoint
              </label>
              <VariableAutocompleteInput
                value={schemaUrl}
                onChange={setSchemaUrl}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                    fetchSchema();
                }}
                placeholder="https://api.example.com/graphql"
                className="input text-xs py-1.5 font-mono"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => importSchemaFile(e.target.files?.[0])}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={working}
                className="btn text-xs gap-1.5"
              >
                <FileUp size={13} />
                Choose JSON
              </button>
            </div>
          )}

          {graphqlSchemaStatus && (
            <p
              className={`px-1 text-2xs whitespace-pre-wrap break-words ${graphQLSchemaStatusClass(graphqlSchemaStatus)}`}
            >
              {graphqlSchemaStatus}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--border)]">
          <button onClick={close} disabled={working} className="btn text-xs">
            Cancel
          </button>
          {source === "url" && (
            <button
              onClick={fetchSchema}
              disabled={working || !schemaUrl.trim()}
              className="btn btn-primary text-xs gap-1.5"
            >
              <Link2 size={13} />
              {working ? "Fetching…" : "Fetch Schema"}
            </button>
          )}
        </div>
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

// Scripts panel
function ScriptsPanel() {
  const { request, setRequest, scriptLogs } = useStore();
  const [activeScript, setActiveScript] = useState<"pre" | "post">("pre");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[var(--border)]">
        <button
          onClick={() => setActiveScript("pre")}
          className={`tab-btn text-2xs ${activeScript === "pre" ? "active" : ""}`}
        >
          Pre-request
        </button>
        <button
          onClick={() => setActiveScript("post")}
          className={`tab-btn text-2xs ${activeScript === "post" ? "active" : ""}`}
        >
          Post-response
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <CodeEditor
          value={
            activeScript === "pre"
              ? (request.scripts?.preRequest ?? "")
              : (request.scripts?.postResponse ?? "")
          }
          onChange={(v) =>
            setRequest({
              scripts: {
                ...(request.scripts ?? {}),
                ...(activeScript === "pre"
                  ? { preRequest: v }
                  : { postResponse: v }),
              },
            })
          }
          lang="javascript"
          minHeight="200px"
        />
      </div>
      {scriptLogs.length > 0 && (
        <div className="border-t border-[var(--border)] p-2 max-h-28 overflow-auto">
          {scriptLogs.map((log, i) => (
            <div key={i} className="text-2xs font-mono text-[var(--text-2)]">
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Assertions panel
const EXPR_PLACEHOLDER: Partial<Record<string, string>> = {
  header: "Header-Name",
  bodyJsonPath: "$.path.to.value",
  regex: "regex pattern",
};

function AssertionsPanel() {
  const { assertionRules, assertionResults, set } = useStore();
  const add = () =>
    set((s) => ({
      assertionRules: [
        ...s.assertionRules,
        {
          id: Math.random().toString(36).slice(2),
          type: "status" as const,
          expression: "",
          matcher: "equals" as const,
          expected: "200",
          enabled: true,
        },
      ],
    }));
  const remove = (i: number) =>
    set((s) => ({
      assertionRules: s.assertionRules.filter((_, idx) => idx !== i),
    }));
  const update = (i: number, patch: object) =>
    set((s) => ({
      assertionRules: s.assertionRules.map((r, idx) =>
        idx === i ? { ...r, ...patch } : r,
      ),
    }));

  const needsExpr = (type: string) =>
    type === "header" || type === "bodyJsonPath" || type === "regex";

  return (
    <div className="p-3 flex flex-col gap-2">
      {assertionRules.length > 0 && (
        <div className="flex items-center gap-2 px-2">
          <span className="w-28 shrink-0 text-2xs text-[var(--text-3)]">
            Type
          </span>
          <span className="w-48 shrink-0 text-2xs text-[var(--text-3)]">
            Path / Key
          </span>
          <span className="w-28 shrink-0 text-2xs text-[var(--text-3)]">
            Matcher
          </span>
          <span className="flex-1 text-2xs text-[var(--text-3)]">Expected</span>
        </div>
      )}
      {assertionRules.map((rule, i) => {
        const result = assertionResults[i];
        const exprNeeded = needsExpr(rule.type);
        return (
          <div
            key={i}
            className={`flex items-center gap-2 p-2 rounded border ${result ? (result.passed ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50") : "border-[var(--border)]"}`}
          >
            <div className="w-28 shrink-0">
              <Select
                size="2xs"
                value={rule.type}
                onChange={(e) => update(i, { type: e.target.value })}
              >
                {[
                  "status",
                  "responseTime",
                  "header",
                  "bodyJsonPath",
                  "bodySchema",
                  "regex",
                ].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-48 shrink-0">
              {exprNeeded ? (
                <input
                  value={(rule as { expression?: string }).expression ?? ""}
                  onChange={(e) => update(i, { expression: e.target.value })}
                  placeholder={EXPR_PLACEHOLDER[rule.type] ?? "value"}
                  className="input py-0.5 text-2xs font-mono"
                />
              ) : (
                <span className="text-2xs text-[var(--text-3)] px-1">
                  —
                </span>
              )}
            </div>
            <div className="w-28 shrink-0">
              <Select
                size="2xs"
                value={rule.matcher}
                onChange={(e) => update(i, { matcher: e.target.value })}
              >
                {[
                  "equals",
                  "notEquals",
                  "contains",
                  "exists",
                  "gt",
                  "lt",
                  "matches",
                ].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex-1 min-w-0">
              <input
                value={String(rule.expected ?? "")}
                onChange={(e) => update(i, { expected: e.target.value })}
                placeholder="expected value"
                className="input py-0.5 text-2xs font-mono"
              />
            </div>
            <button
              onClick={() => remove(i)}
              className="shrink-0 text-[var(--text-3)] hover:text-[var(--danger)]"
            >
              ×
            </button>
          </div>
        );
      })}
      <button onClick={add} className="btn text-xs self-start">
        + Add assertion
      </button>
    </div>
  );
}

// Extract panel
function ExtractPanel() {
  const { extractRules, set } = useStore();
  const add = () =>
    set((s) => ({
      extractRules: [
        ...s.extractRules,
        { variableName: "", source: "body" as const, expression: "" },
      ],
    }));
  const remove = (i: number) =>
    set((s) => ({
      extractRules: s.extractRules.filter((_, idx) => idx !== i),
    }));
  const update = (i: number, patch: object) =>
    set((s) => ({
      extractRules: s.extractRules.map((r, idx) =>
        idx === i ? { ...r, ...patch } : r,
      ),
    }));

  return (
    <div className="p-3 flex flex-col gap-2">
      {extractRules.length > 0 && (
        <div className="flex items-center gap-2 px-2">
          <span className="w-32 shrink-0 text-2xs text-[var(--text-3)]">
            Variable
          </span>
          <span className="w-24 shrink-0 text-2xs text-[var(--text-3)]">
            Source
          </span>
          <span className="flex-1 text-2xs text-[var(--text-3)]">
            Expression
          </span>
        </div>
      )}
      {extractRules.map((rule, i) => {
        const source = rule.source ?? "body";
        const exprPlaceholder =
          source === "header" ? "Header-Name" : "$.path.to.value";
        return (
          <div
            key={i}
            className="flex items-center gap-2 border border-[var(--border)] rounded p-2"
          >
            <div className="w-32 shrink-0">
              <input
                value={rule.variableName ?? ""}
                onChange={(e) => update(i, { variableName: e.target.value })}
                placeholder="variableName"
                className="input py-0.5 text-2xs font-mono"
              />
            </div>
            <div className="w-24 shrink-0">
              <Select
                size="2xs"
                value={source}
                onChange={(e) => update(i, { source: e.target.value })}
              >
                {["body", "header", "status"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex-1 min-w-0">
              {source !== "status" ? (
                <input
                  value={rule.expression ?? ""}
                  onChange={(e) => update(i, { expression: e.target.value })}
                  placeholder={exprPlaceholder}
                  className="input py-0.5 text-2xs font-mono"
                />
              ) : (
                <span className="text-2xs text-[var(--text-3)] px-2">
                  no expression needed
                </span>
              )}
            </div>
            <button
              onClick={() => remove(i)}
              className="shrink-0 text-[var(--text-3)] hover:text-[var(--danger)]"
            >
              ×
            </button>
          </div>
        );
      })}
      <button onClick={add} className="btn text-xs self-start">
        + Add rule
      </button>
    </div>
  );
}

// Retry panel
function RetryPanel() {
  const { request, setRequest } = useStore();
  const policy = (request as { retryPolicy?: import("@invoke/core").RetryPolicy }).retryPolicy ?? {
    maxRetries: 0,
    retryOnTimeout: true,
    retryOn5xx: true,
    backoffMs: 500,
  };

  const update = (patch: Partial<import("@invoke/core").RetryPolicy>) =>
    setRequest({ retryPolicy: { ...policy, ...patch } } as Partial<import("@invoke/core").RequestDraft>);

  const enabled = policy.maxRetries > 0;

  return (
    <div className="p-3 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="retry-enable"
          checked={enabled}
          onChange={(e) => update({ maxRetries: e.target.checked ? 3 : 0 })}
          className="accent-[var(--accent)]"
        />
        <label htmlFor="retry-enable" className="text-xs text-[var(--text-2)] cursor-pointer">
          Enable retry
        </label>
      </div>
      {enabled && (
        <>
          <Field label="Max retries">
            <input
              type="number"
              min={1}
              max={10}
              value={policy.maxRetries}
              onChange={(e) => update({ maxRetries: Math.max(1, Number(e.target.value)) })}
              className="input text-xs py-1 w-20"
            />
          </Field>
          <Field label="Backoff (ms)">
            <input
              type="number"
              min={0}
              step={100}
              value={policy.backoffMs}
              onChange={(e) => update({ backoffMs: Math.max(0, Number(e.target.value)) })}
              className="input text-xs py-1 w-24"
            />
          </Field>
          <Field label="Retry on">
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-xs text-[var(--text-2)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.retryOn5xx}
                  onChange={(e) => update({ retryOn5xx: e.target.checked })}
                  className="accent-[var(--accent)]"
                />
                5xx errors
              </label>
              <label className="flex items-center gap-1.5 text-xs text-[var(--text-2)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.retryOnTimeout}
                  onChange={(e) => update({ retryOnTimeout: e.target.checked })}
                  className="accent-[var(--accent)]"
                />
                Timeout
              </label>
            </div>
          </Field>
          <p className="text-2xs text-[var(--text-3)]">
            Backoff doubles each retry. Total wait ≈{" "}
            {Array.from({ length: policy.maxRetries }, (_, i) =>
              policy.backoffMs * Math.pow(2, i),
            ).reduce((a, b) => a + b, 0)}
            ms max.
          </p>
        </>
      )}
    </div>
  );
}
