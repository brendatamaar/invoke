import { useState } from "react";
import { useStore } from "../../../store";
import { Select } from "../../../components/shared/Select";
import { URLBar } from "./URLBar";
import { KeyValueEditor } from "../../../components/shared/KeyValueEditor";
import { WebSocketClient } from "../../websocket/components/WebSocketClient";
import { GRPCClient } from "../../grpc/components/GRPCClient";
import { BodyPanel } from "./BodyPanel";
import { AuthPanel } from "./AuthPanel";
import { GraphQLQueryPanel } from "./GraphQLPanels";
import { GRPCBar, WebSocketBar } from "./ProtocolBars";
import { GraphQLVariablesPanel, ScriptsPanel } from "./ScriptPanels";
import { AssertionsPanel, ExtractPanel } from "./RulePanels";
import { OptionsPanel } from "./OptionsPanel";
import { extractPathVariableNames } from "@invoke/core";
import type { KeyValue, RequestProtocol } from "@invoke/core";
import type { RequestBuilderProps, RequestTab } from "../../../types";

const COMMON_HEADERS = [
  "Accept",
  "Accept-Charset",
  "Accept-Encoding",
  "Accept-Language",
  "Authorization",
  "Cache-Control",
  "Content-Disposition",
  "Content-Encoding",
  "Content-Language",
  "Content-Length",
  "Content-Type",
  "Cookie",
  "DNT",
  "Date",
  "ETag",
  "Expect",
  "From",
  "Host",
  "If-Match",
  "If-Modified-Since",
  "If-None-Match",
  "If-Unmodified-Since",
  "Keep-Alive",
  "Last-Modified",
  "Link",
  "Location",
  "Origin",
  "Pragma",
  "Range",
  "Referer",
  "Retry-After",
  "Set-Cookie",
  "TE",
  "Transfer-Encoding",
  "Upgrade",
  "User-Agent",
  "Vary",
  "Via",
  "Warning",
  "WWW-Authenticate",
  "X-Api-Key",
  "X-Auth-Token",
  "X-Content-Type-Options",
  "X-Forwarded-For",
  "X-Frame-Options",
  "X-Request-ID",
  "X-Requested-With",
  "X-XSS-Protection",
];

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
  { id: "options", label: "Options" },
];

const GQL_TABS: { id: RequestTab; label: string }[] = [
  { id: "graphql", label: "Query" },
  { id: "graphqlVariables", label: "Variables" },
  { id: "headers", label: "Headers" },
  { id: "auth", label: "Auth" },
  { id: "assertions", label: "Assertions" },
];

const SECTION_HEADER =
  "px-3 py-1.5 text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wide border-b border-[var(--border)] bg-[var(--surface-2)]";

function ParamsPanel({
  url,
  params,
  pathVariables,
  onParamsChange,
  onPathVariablesChange,
}: {
  url: string;
  params: KeyValue[];
  pathVariables: KeyValue[];
  onParamsChange: (rows: KeyValue[]) => void;
  onPathVariablesChange: (rows: KeyValue[]) => void;
}) {
  const pathVarNames = extractPathVariableNames(url);
  const valueMap = new Map(pathVariables.map((v) => [v.key, v.value]));

  return (
    <div className="flex flex-col">
      <div>
        {pathVarNames.length > 0 && (
          <div className={SECTION_HEADER}>Query Parameters</div>
        )}
        <KeyValueEditor
          rows={params}
          onChange={(rows) => onParamsChange(rows as KeyValue[])}
          keyPlaceholder="param"
          valuePlaceholder="value"
        />
      </div>
      {pathVarNames.length > 0 && (
        <div className="border-t border-[var(--border)]">
          <div className={SECTION_HEADER}>Path Variables</div>
          <div className="grid grid-cols-[1fr_1px_1fr] items-center text-2xs text-[var(--text-3)] py-1 border-b border-[var(--border)] px-3">
            <span>Key</span>
            <span />
            <span className="pl-2">Value</span>
          </div>
          {pathVarNames.map((name) => {
            const val = valueMap.get(name) ?? "";
            const filled = val.trim() !== "";
            return (
              <div
                key={name}
                className="grid grid-cols-[1fr_1px_1fr] items-center border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]"
              >
                <span className="px-3 py-1.5 text-xs font-mono text-[var(--text-2)]">
                  :{name}
                </span>
                <span className="h-4 bg-[var(--border)]" />
                <input
                  type="text"
                  value={val}
                  onChange={(e) => {
                    const next = pathVarNames.map((n) => ({
                      key: n,
                      value: n === name ? e.target.value : (valueMap.get(n) ?? ""),
                      enabled: true,
                    }));
                    onPathVariablesChange(next);
                  }}
                  placeholder="value"
                  className={`w-full bg-transparent border-0 outline-none py-1.5 px-2 text-xs font-mono placeholder-[var(--text-3)] min-w-0 ${
                    filled ? "text-[var(--success,#22c55e)]" : "text-[var(--warn)]"
                  }`}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function RequestBuilder({ onSend }: RequestBuilderProps) {
  const { request, setRequest, requestTab, set, loading } = useStore();
  const protocol = (request.protocol ?? "rest") as RequestProtocol;

  const tabs = protocol === "graphql" ? GQL_TABS : REST_TABS;
  const showTabs = protocol === "rest" || protocol === "graphql";

  return (
    <div className="flex flex-col h-full">
      {/* Header row: protocol dropdown + URL bar */}
      <div className="flex items-center border-b border-[var(--border)]">
        <div className="flex items-center px-2 py-1.5 border-r border-[var(--border)]">
          <Select
            value={protocol}
            onChange={(e) => {
              const p = e.target.value as RequestProtocol;
              setRequest({ protocol: p });
              set({ requestTab: p === "graphql" ? "graphql" : "params" });
            }}
            size="xs"
            wrapperClassName="w-28"
            className="font-semibold"
          >
            {PROTOCOLS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
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
            <ParamsPanel
              url={request.url}
              params={request.params ?? []}
              pathVariables={request.pathVariables ?? []}
              onParamsChange={(rows) => {
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
              onPathVariablesChange={(pathVariables) =>
                setRequest({ pathVariables })
              }
            />
          )}
          {requestTab === "headers" && (
            <KeyValueEditor
              rows={request.headers ?? []}
              onChange={(rows) => setRequest({ headers: rows as KeyValue[] })}
              keyPlaceholder="Header-Name"
              valuePlaceholder="value"
              keyDatalist={COMMON_HEADERS}
            />
          )}
          {requestTab === "auth" && <AuthPanel />}
          {requestTab === "body" && <BodyPanel />}
          {requestTab === "graphql" && <GraphQLQueryPanel />}
          {requestTab === "graphqlVariables" && <GraphQLVariablesPanel />}
          {requestTab === "scripts" && <ScriptsPanel />}
          {requestTab === "assertions" && <AssertionsPanel />}
          {requestTab === "extract" && <ExtractPanel />}
          {requestTab === "options" && <OptionsPanel />}
        </div>
      )}
    </div>
  );
}
