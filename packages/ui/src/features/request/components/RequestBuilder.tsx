import { useStore } from "../../../store";
import { Select } from "../../../components/shared/Select";
import { URLBar } from "./URLBar";
import { KeyValueEditor } from "../../../components/shared/KeyValueEditor";
import { WebSocketBar } from "../../websocket/components/WebSocketBar";
import { WebSocketClient } from "../../websocket/components/WebSocketClient";
import { GRPCBar } from "../../grpc/components/GRPCBar";
import { GRPCClient } from "../../grpc/components/GRPCClient";
import { BodyPanel } from "./BodyPanel";
import { AuthPanel } from "./auth/AuthPanel";
import { GraphQLQueryPanel } from "../../graphql/components/GraphQLQueryPanel";
import { GraphQLOptionsPanel } from "../../graphql/components/GraphQLOptionsPanel";
import { GraphQLVariablesPanel } from "../../graphql/components/GraphQLVariablesPanel";
import { ScriptsPanel } from "./ScriptsPanel";
import { AssertionsPanel } from "./AssertionsPanel";
import { ExtractPanel } from "./ExtractPanel";
import { OptionsPanel } from "./OptionsPanel";
import type { KeyValue, RequestProtocol } from "@invoke/core";

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function syncPathVarsToUrl(url: string, prevVars: KeyValue[], nextVars: KeyValue[]): string {
  const qsIdx = url.indexOf("?");
  const qs = qsIdx !== -1 ? url.slice(qsIdx) : "";
  let path = qsIdx !== -1 ? url.slice(0, qsIdx) : url;

  const prevKeys = prevVars.filter((v) => v.key).map((v) => v.key);
  const nextKeys = nextVars.filter((v) => v.key).map((v) => v.key);
  const maxLen = Math.max(prevKeys.length, nextKeys.length);

  for (let i = 0; i < maxLen; i++) {
    const prev = prevKeys[i] ?? "";
    const next = nextKeys[i] ?? "";
    if (prev === next) continue;
    if (prev && next) {
      path = path.replace(new RegExp(`:${escapeRe(prev)}(?=[/?#]|$)`, "g"), `:${next}`);
    } else if (prev) {
      path = path
        .replace(new RegExp(`/:${escapeRe(prev)}(?=[/?#]|$)`, "g"), "")
        .replace(new RegExp(`/:${escapeRe(prev)}$`, "g"), "");
    } else {
      path = path.replace(/\/$/, "") + `/:${next}`;
    }
  }

  return path + qs;
}
import type { RequestBuilderProps } from "../../../types";
import { ParamsPanel } from "./ParamsPanel";
import { COMMON_HEADERS, PROTOCOLS, REST_TABS, GQL_TABS } from "../constants";

export function RequestBuilder({ onSend }: RequestBuilderProps) {
  const { request, setRequest, setGraphqlRequest, requestTab, set, loading } = useStore();
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
            wrapperClassName="w-32"
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
              type="button"
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
              params={request.params ?? []}
              pathVariables={request.pathVariables ?? []}
              onParamsChange={(rows) => {
                const kv = rows as KeyValue[];
                const base = request.url.split("?")[0];
                const enabled = kv.filter((r) => r.enabled !== false && r.key);
                const qs = enabled
                  .map((r) => `${encodeURIComponent(r.key)}=${encodeURIComponent(r.value ?? "")}`)
                  .join("&");
                setRequest({ params: kv, url: qs ? `${base}?${qs}` : base });
              }}
              onPathVariablesChange={(rows) => {
                const kv = rows as KeyValue[];
                const url = syncPathVarsToUrl(request.url, request.pathVariables ?? [], kv);
                setRequest({ pathVariables: kv, url });
              }}
            />
          )}
          {requestTab === "headers" && (
            <KeyValueEditor
              rows={request.headers ?? []}
              onChange={(rows) => {
                const headers = rows as KeyValue[];
                setRequest({ headers });
                if (protocol === "graphql") setGraphqlRequest({ headers });
              }}
              keyPlaceholder="Header-Name"
              valuePlaceholder="value"
              keyDatalist={COMMON_HEADERS}
            />
          )}
          {requestTab === "auth" && <AuthPanel />}
          {requestTab === "body" && <BodyPanel />}
          {requestTab === "graphql" && <GraphQLQueryPanel />}
          {requestTab === "graphqlVariables" && <GraphQLVariablesPanel />}
          {requestTab === "graphqlOptions" && <GraphQLOptionsPanel />}
          {requestTab === "scripts" && <ScriptsPanel />}
          {requestTab === "assertions" && <AssertionsPanel />}
          {requestTab === "extract" && <ExtractPanel />}
          {requestTab === "options" && <OptionsPanel />}
        </div>
      )}
    </div>
  );
}
