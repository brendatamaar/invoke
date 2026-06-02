import {
  X,
  Globe,
  Lock,
  List,
  FileText,
  RefreshCw,
  Zap,
  Settings,
  Database,
  Wifi,
  ChevronRight,
} from "lucide-react";
import { useEffect } from "react";
import type {
  AuthConfig,
  GrpcRequestConfig,
  GraphQLRequestConfig,
  KeyValue,
  RequestConfig,
  SavedRequest,
  WebSocketRequestConfig,
} from "@invoke/core";
import { METHOD_COLOR, protocolMethod } from "../../../../components/shared/methodUtils";

const PROTOCOL_LABEL: Record<string, string> = {
  rest: "REST",
  graphql: "GraphQL",
  websocket: "WebSocket",
  grpc: "gRPC",
};

const AUTH_LABEL: Record<string, string> = {
  basic: "Basic",
  bearer: "Bearer",
  "api-key": "API Key",
  oauth2: "OAuth 2.0",
  digest: "Digest",
  "aws-sigv4": "AWS Signature v4",
  ntlm: "NTLM",
};

const BODY_MODE_LABEL: Record<string, string> = {
  none: "None",
  json: "JSON",
  "form-data": "Form Data",
  urlencoded: "URL Encoded",
  raw: "Raw",
  file: "File",
  "graphql-multipart": "GraphQL Multipart",
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
function formatMs(ms: number) {
  return ms >= 1000 ? `${ms / 1000}s` : `${ms}ms`;
}
function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[var(--text-3)] flex items-center">{icon}</span>
        <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-[0.07em] whitespace-nowrap">
          {title}
        </span>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>
      {children}
    </div>
  );
}

function KVRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid py-0.5 gap-3" style={{ gridTemplateColumns: "130px 1fr" }}>
      <span className="text-xs text-[var(--text-3)] truncate" title={k}>
        {k}
      </span>
      <span className="text-xs text-[var(--text-2)] truncate" title={v}>
        {v}
      </span>
    </div>
  );
}

function Flags({ flags }: { flags: { label: string; active: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {flags.map(({ label, active }) => (
        <div key={label} className="flex items-center gap-1.5">
          <div
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? "bg-[var(--ok)]" : "bg-[var(--border)]"}`}
          />
          <span className={`text-xs ${active ? "text-[var(--text-2)]" : "text-[var(--text-3)]"}`}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

function Preview({ text }: { text: string }) {
  return (
    <div className="px-3 py-2 rounded bg-[var(--surface-2)] border border-[var(--border)] mt-0.5">
      <span className="text-xs text-[var(--text-3)] whitespace-pre-wrap break-all leading-relaxed">
        {text}
      </span>
    </div>
  );
}

function AuthDetail({ auth }: { auth: AuthConfig }) {
  const rows: { k: string; v: string }[] = [];

  if (auth.type === "basic" || auth.type === "digest") {
    if (auth.username) rows.push({ k: "Username", v: auth.username });
  }
  if (auth.type === "ntlm") {
    if (auth.ntlmUsername) rows.push({ k: "Username", v: auth.ntlmUsername });
    if (auth.ntlmDomain) rows.push({ k: "Domain", v: auth.ntlmDomain });
  }
  if (auth.type === "bearer") {
    rows.push({ k: "Token", v: auth.token ? "••••••••" : "—" });
  }
  if (auth.type === "api-key") {
    if (auth.apiKeyName) rows.push({ k: "Key name", v: auth.apiKeyName });
    if (auth.apiKeyIn) rows.push({ k: "Sent in", v: auth.apiKeyIn });
    rows.push({ k: "Value", v: auth.apiKeyValue ? "••••••••" : "—" });
  }
  if (auth.type === "oauth2") {
    if (auth.flow) rows.push({ k: "Flow", v: auth.flow.replace(/_/g, " ") });
    if (auth.tokenUrl) rows.push({ k: "Token URL", v: auth.tokenUrl });
    if (auth.clientId) rows.push({ k: "Client ID", v: auth.clientId });
    if (auth.scope) rows.push({ k: "Scope", v: auth.scope });
    if (auth.pkce) rows.push({ k: "PKCE", v: "Enabled" });
  }
  if (auth.type === "aws-sigv4") {
    if (auth.awsRegion) rows.push({ k: "Region", v: auth.awsRegion });
    if (auth.awsService) rows.push({ k: "Service", v: auth.awsService });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="self-start text-xs font-medium px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-2)]">
        {AUTH_LABEL[auth.type] ?? auth.type}
      </span>
      {rows.map((r) => (
        <KVRow key={r.k} k={r.k} v={r.v} />
      ))}
    </div>
  );
}

function RestSections({ req }: { req: RequestConfig }) {
  const params = (req.params ?? []).filter((p) => p.key);
  const bodyMode = req.bodyMode ?? "none";
  const hasBody = bodyMode !== "none";
  const timeout = req.timeoutMs;
  const assertions = req.assertions ?? [];
  const extractRules = req.extractionRules ?? [];
  const hasPreScript = !!req.scripts?.preRequest?.trim();
  const hasPostScript = !!req.scripts?.postResponse?.trim();
  const retry = req.retryPolicy;
  const bodyPreview =
    hasBody && req.body ? req.body.slice(0, 200) + (req.body.length > 200 ? "…" : "") : null;

  return (
    <>
      {hasBody && (
        <Section icon={<FileText size={11} />} title="Body">
          <KVRow k="Mode" v={BODY_MODE_LABEL[bodyMode] ?? bodyMode} />
          {bodyPreview && <Preview text={bodyPreview} />}
        </Section>
      )}

      {params.length > 0 && (
        <Section icon={<List size={11} />} title={`Params (${params.length})`}>
          {params.map((p, i) => (
            <KVRow key={i} k={p.key} v={p.value ?? ""} />
          ))}
        </Section>
      )}

      {(timeout || retry) && (
        <Section icon={<Settings size={11} />} title="Options">
          <div className="flex flex-col gap-2">
            {timeout ? <KVRow k="Timeout" v={formatMs(timeout)} /> : null}
            {retry && (
              <>
                <KVRow k="Max retries" v={String(retry.maxRetries)} />
                {retry.backoffMs > 0 && <KVRow k="Backoff" v={formatMs(retry.backoffMs)} />}
                <Flags
                  flags={[
                    { label: "Retry on 5xx", active: retry.retryOn5xx },
                    { label: "Retry on timeout", active: retry.retryOnTimeout },
                  ]}
                />
              </>
            )}
          </div>
        </Section>
      )}

      {(hasPreScript || hasPostScript || assertions.length > 0 || extractRules.length > 0) && (
        <Section icon={<Zap size={11} />} title="Automation">
          <div className="flex flex-col gap-2">
            {(hasPreScript || hasPostScript) && (
              <Flags
                flags={[
                  { label: "Pre-request script", active: hasPreScript },
                  { label: "Post-response script", active: hasPostScript },
                ]}
              />
            )}
            {assertions.length > 0 && <KVRow k="Assertions" v={String(assertions.length)} />}
            {extractRules.length > 0 && <KVRow k="Extractions" v={String(extractRules.length)} />}
          </div>
        </Section>
      )}
    </>
  );
}

function GraphQLSections({ req }: { req: GraphQLRequestConfig }) {
  const queryPreview = req.query?.trim()
    ? req.query.trim().slice(0, 200) + (req.query.trim().length > 200 ? "…" : "")
    : null;
  const hasVariables = !!req.variables?.trim();

  return (
    <>
      {queryPreview && (
        <Section icon={<FileText size={11} />} title="Query">
          {req.operationName && <KVRow k="Operation" v={req.operationName} />}
          <Preview text={queryPreview} />
        </Section>
      )}

      <Section icon={<Settings size={11} />} title="Options">
        <div className="flex flex-col gap-2">
          {req.httpMethod && <KVRow k="HTTP method" v={req.httpMethod} />}
          {req.timeoutMs ? <KVRow k="Timeout" v={formatMs(req.timeoutMs)} /> : null}
          <Flags
            flags={[
              { label: "Has variables", active: hasVariables },
              { label: "APQ", active: !!req.apq },
              { label: "Batch mode", active: !!req.batchMode },
            ]}
          />
        </div>
      </Section>
    </>
  );
}

function WebSocketSections({ req }: { req: WebSocketRequestConfig }) {
  const savedMessages = req.savedMessages ?? [];

  return (
    <>
      <Section icon={<Wifi size={11} />} title="Connection">
        <div className="flex flex-col gap-2">
          {req.protocols && <KVRow k="Sub-protocols" v={req.protocols} />}
          {req.preset && req.preset !== "none" && <KVRow k="Preset" v={req.preset} />}
          {req.messageMode && <KVRow k="Message mode" v={req.messageMode} />}
          {savedMessages.length > 0 && (
            <KVRow k="Saved messages" v={String(savedMessages.length)} />
          )}
          <Flags
            flags={[
              { label: "Auto reconnect", active: !!req.autoReconnect },
              { label: "NDJSON mode", active: !!req.ndjsonMode },
            ]}
          />
        </div>
      </Section>

      {req.autoReconnect && (
        <Section icon={<RefreshCw size={11} />} title="Reconnect">
          {req.reconnectDelay != null && <KVRow k="Delay" v={formatMs(req.reconnectDelay)} />}
          {req.reconnectMaxRetries != null && (
            <KVRow k="Max retries" v={String(req.reconnectMaxRetries)} />
          )}
        </Section>
      )}
    </>
  );
}

function GrpcSections({ req }: { req: GrpcRequestConfig }) {
  const metadata = (req.metadata ?? []).filter((m) => m.key);
  const savedMessages = req.savedMessages ?? [];
  const DEFAULT_MSG_SIZE = 16 * 1024 * 1024;

  return (
    <>
      <Section icon={<Settings size={11} />} title="Options">
        <div className="flex flex-col gap-2">
          {req.timeoutMs ? <KVRow k="Timeout" v={formatMs(req.timeoutMs)} /> : null}
          {req.compression && req.compression !== "none" && (
            <KVRow k="Compression" v={req.compression} />
          )}
          {req.maxRecvMsgSize != null && req.maxRecvMsgSize !== DEFAULT_MSG_SIZE && (
            <KVRow k="Max recv size" v={formatBytes(req.maxRecvMsgSize)} />
          )}
          {req.maxSendMsgSize != null && req.maxSendMsgSize !== DEFAULT_MSG_SIZE && (
            <KVRow k="Max send size" v={formatBytes(req.maxSendMsgSize)} />
          )}
          {savedMessages.length > 0 && (
            <KVRow k="Saved messages" v={String(savedMessages.length)} />
          )}
          <Flags flags={[{ label: "TLS", active: !!req.tls }]} />
        </div>
      </Section>

      {metadata.length > 0 && (
        <Section icon={<Database size={11} />} title={`Metadata (${metadata.length})`}>
          {metadata.map((m, i) => (
            <KVRow key={i} k={m.key} v={m.value ?? ""} />
          ))}
        </Section>
      )}
    </>
  );
}

export function RequestDetailModal({
  open,
  request,
  onClose,
}: {
  open: boolean;
  request: SavedRequest;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const protocol = request.protocol ?? "rest";
  const req = request.request;
  const methodKey = protocolMethod(protocol, (req as RequestConfig).method);
  const accentColor = METHOD_COLOR[methodKey] ?? "var(--fg-2)";

  const url =
    protocol === "grpc"
      ? ((req as GrpcRequestConfig).address ?? "")
      : ((req as RequestConfig | GraphQLRequestConfig | WebSocketRequestConfig).url ?? "");

  const headers = ((req as { headers?: KeyValue[] }).headers ?? []).filter((h) => h.key);
  const auth = (req as { auth?: AuthConfig }).auth;
  const hasAuth = auth && auth.type && auth.type !== "none";
  const grpcService = protocol === "grpc" ? (req as GrpcRequestConfig).service : null;
  const grpcMethod = protocol === "grpc" ? (req as GrpcRequestConfig).method : null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-[1px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-pop)] flex flex-col overflow-hidden"
        style={{ width: 500, maxHeight: "82vh" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--border)] shrink-0">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-wide" style={{ color: accentColor }}>
                {methodKey}
              </span>
              <ChevronRight size={10} className="text-[var(--text-3)] shrink-0" />
              <span className="text-2xs font-medium text-[var(--text-3)] uppercase tracking-widest">
                {PROTOCOL_LABEL[protocol] ?? protocol}
              </span>
            </div>
            <span className="text-sm font-semibold text-[var(--text-1)] truncate">
              {request.name || "Untitled"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-3)] hover:text-[var(--text-1)] p-1 rounded hover:bg-[var(--surface-2)] shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {url && (
            <Section icon={<Globe size={11} />} title={protocol === "grpc" ? "Address" : "URL"}>
              <span className="text-xs text-[var(--text-2)] break-all leading-relaxed pl-0.5">
                {url}
              </span>
            </Section>
          )}

          {(grpcService || grpcMethod) && (
            <Section icon={<Database size={11} />} title="gRPC">
              {grpcService && <KVRow k="Service" v={grpcService} />}
              {grpcMethod && <KVRow k="Method" v={grpcMethod} />}
            </Section>
          )}

          {hasAuth && (
            <Section icon={<Lock size={11} />} title="Auth">
              <AuthDetail auth={auth} />
            </Section>
          )}

          {headers.length > 0 && (
            <Section icon={<List size={11} />} title={`Headers (${headers.length})`}>
              {headers.map((h, i) => (
                <KVRow key={i} k={h.key} v={h.value ?? ""} />
              ))}
            </Section>
          )}

          {protocol === "rest" && <RestSections req={req as RequestConfig} />}
          {protocol === "graphql" && <GraphQLSections req={req as GraphQLRequestConfig} />}
          {protocol === "websocket" && <WebSocketSections req={req as WebSocketRequestConfig} />}
          {protocol === "grpc" && <GrpcSections req={req as GrpcRequestConfig} />}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-5 px-5 py-3 border-t border-[var(--border)] bg-[var(--surface-2)] shrink-0">
          {[
            { label: "Created", value: formatDate(request.createdAt) },
            { label: "Updated", value: formatDate(request.updatedAt) },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="text-2xs font-medium text-[var(--text-3)]">{label}</span>
              <span className="text-2xs text-[var(--text-2)]">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
