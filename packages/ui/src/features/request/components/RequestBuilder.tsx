import { useStore } from "../../../store";
import { Select } from "../../../components/shared/Select";
import { URLBar } from "./URLBar";
import { KeyValueEditor } from "../../../components/shared/KeyValueEditor";
import { WebSocketBar, WebSocketClient } from "../../websocket";
import { GRPCBar, GRPCClient } from "../../grpc";
import { BodyPanel } from "./BodyPanel";
import { AuthPanel } from "./auth/AuthPanel";
import { GraphQLQueryPanel, GraphQLOptionsPanel, GraphQLVariablesPanel } from "../../graphql";
import { ScriptsPanel } from "./ScriptsPanel";
import { AssertionsPanel } from "./AssertionsPanel";
import { ExtractPanel } from "./ExtractPanel";
import { OptionsPanel } from "./OptionsPanel";
import type { KeyValue, RequestProtocol } from "@invoke/core";
import type { RequestBuilderProps } from "../../../types";
import { ParamsPanel } from "./ParamsPanel";
import { COMMON_HEADERS, PROTOCOLS, REST_TABS, GQL_TABS } from "../constants";

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
