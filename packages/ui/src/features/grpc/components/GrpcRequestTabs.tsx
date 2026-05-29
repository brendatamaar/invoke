import type { KeyValue } from "@invoke/core";
import { CodeEditor } from "../../../components/editors/CodeEditor";
import { KeyValueEditor } from "../../../components/shared/KeyValueEditor";
import { useStore } from "../../../store";
import type { GrpcTab } from "../types";
import { GrpcAuthPanel } from "./GrpcAuthPanel";
import { GrpcOptionsPanel } from "./GrpcOptionsPanel";
import { GrpcSavedMessagesPanel } from "./GrpcSavedMessagesPanel";
import { GrpcScriptsPanel } from "./GrpcScriptsPanel";
import { GrpcStreamComposer } from "./GrpcStreamComposer";
import { GrpcStressPanel } from "./GrpcStressPanel";
import { GrpcTabBar } from "./GrpcTabBar";

export function GrpcRequestTabs({
  activeTab,
  isClientStream,
  grpcStreamId,
  onSelectTab,
}: {
  activeTab: GrpcTab;
  isClientStream: boolean;
  grpcStreamId?: string | null;
  onSelectTab: (tab: GrpcTab) => void;
}) {
  const { grpcRequest, setGrpcRequest } = useStore();

  return (
    <>
      <GrpcTabBar activeTab={activeTab} includeMessage={true} onSelect={onSelectTab} />
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {activeTab === "message" && grpcStreamId && <GrpcStreamComposer streamId={grpcStreamId} />}
        {activeTab === "message" && !grpcStreamId && (
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
            onChange={(rows) => setGrpcRequest({ metadata: rows as KeyValue[] })}
            keyPlaceholder="key"
            valuePlaceholder="value"
          />
        )}
        {activeTab === "auth" && <GrpcAuthPanel />}
        {activeTab === "scripts" && <GrpcScriptsPanel />}
        {activeTab === "options" && <GrpcOptionsPanel />}
        {activeTab === "saved" && <GrpcSavedMessagesPanel />}
        {activeTab === "stress" && (
          <GrpcStressContent isClientStream={isClientStream} grpcStreamId={grpcStreamId} />
        )}
      </div>
    </>
  );
}

function GrpcStressContent({
  isClientStream,
  grpcStreamId,
}: {
  isClientStream: boolean;
  grpcStreamId?: string | null;
}) {
  if (!isClientStream) {
    return (
      <div className="p-3 text-2xs text-[var(--text-3)]">
        Open a client/bidi stream first to use stress mode.
      </div>
    );
  }

  if (!grpcStreamId) {
    return <div className="p-3 text-2xs text-[var(--text-3)]">Open the stream first.</div>;
  }

  return <GrpcStressPanel streamId={grpcStreamId} />;
}
