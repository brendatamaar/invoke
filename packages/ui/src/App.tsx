import { useEffect, useRef } from "react";
import { TopBar } from "./components/layout/TopBar";
import { Sidebar } from "./components/layout/Sidebar";
import { RequestBuilder } from "./features/request/components/RequestBuilder";
import { ResponseViewer } from "./features/response/components/ResponseViewer";
import { CommandPalette } from "./components/palette/CommandPalette";
import { Toasts } from "./components/shared/Toast";
import { DiffModal } from "./features/diff/components/DiffModal";
import { VariableEditorModal } from "./features/variables/components/VariableEditorModal";
import { HelpModal } from "./features/help/components/HelpModal";
import { ClearHistoryModal } from "./features/history/components/ClearHistoryModal";
import { SettingsPanel } from "./features/settings/components/SettingsPanel";
import { PassphraseModal } from "./features/settings/components/PassphraseModal";
import { CollectionRunnerModal } from "./features/collections/components/CollectionRunnerModal";
import { BatchRunnerModal } from "./features/collections/components/BatchRunnerModal";
import { CookieManagerModal } from "./features/cookies/components/CookieManagerModal";
import { useAppBootstrap } from "./features/bootstrap/useAppBootstrap";
import { useCodeSnippetGeneration } from "./features/codegen/useCodeSnippetGeneration";
import { useActiveEnvironmentPersistence } from "./features/environments/useActiveEnvironmentPersistence";
import { useRequestExecution } from "./features/execution/useRequestExecution";
import { useResizablePane } from "./hooks/useResizablePane";
import { checkAndUnlockOnStartup } from "./features/settings/useCrypto";
import { useStore } from "./store";

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { size: requestHeight, onMouseDown: onResizeMouseDown } =
    useResizablePane(380, "vertical", containerRef, 300);
  const { handleSend } = useRequestExecution();
  const set = useStore((s) => s.set);

  useAppBootstrap();
  useActiveEnvironmentPersistence();
  useCodeSnippetGeneration();

  useEffect(() => {
    checkAndUnlockOnStartup(set).catch(() => {});
  }, [set]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSend();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleSend]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden">
          <div
            className="overflow-hidden flex-shrink-0"
            style={{ height: requestHeight, minHeight: 200 }}
          >
            <RequestBuilder onSend={handleSend} />
          </div>

          <div className="resize-handle-v" onMouseDown={onResizeMouseDown} />

          <div className="flex-1 overflow-hidden" style={{ minHeight: 300 }}>
            <ResponseViewer />
          </div>
        </div>
      </div>

      <CommandPalette />
      <Toasts />
      <DiffModal />
      <VariableEditorModal />
      <HelpModal />
      <ClearHistoryModal />
      <SettingsPanel />
      <PassphraseModal />
      <CollectionRunnerModal />
      <BatchRunnerModal />
      <CookieManagerModal />
    </div>
  );
}
