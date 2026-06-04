import { useEffect, useRef } from "react";
import { TopBar } from "./components/layout/TopBar";
import { Sidebar } from "./components/layout/Sidebar";
import { RequestBuilder } from "./features/request";
import { ResponseViewer } from "./features/response";
import { CommandPalette } from "./components/palette/CommandPalette";
import { Toasts } from "./components/shared/Toast";
import { DiffModal } from "./features/diff";
import { VariableEditorModal } from "./features/variables";
import { HelpModal } from "./features/help";
import { ClearHistoryModal } from "./features/history";
import { SettingsPanel } from "./features/settings";
import {
  BatchRunnerModal,
  CollectionRunnerModal,
  SaveActionModal,
  SaveRequestModal,
} from "./features/collections";
import { CookieManagerModal } from "./features/cookies";
import { useAppBootstrap } from "./features/bootstrap/useAppBootstrap";
import { OnboardingTour } from "./features/onboarding";
import { useActiveEnvironmentPersistence } from "./features/environments/useActiveEnvironmentPersistence";
import { useRequestExecution } from "./features/execution/useRequestExecution";
import { useResizablePane } from "./hooks/useResizablePane";
import { useStore } from "./store";

const COMPARE_FIELDS = [
  "method",
  "url",
  "params",
  "headers",
  "bodyMode",
  "body",
  "auth",
  "timeoutMs",
  "variables",
  "assertions",
  "extractionRules",
  "options",
  "scripts",
  "retryPolicy",
] as const;

function pickComparableFields(obj: unknown) {
  const o = obj as Record<string, unknown>;
  return Object.fromEntries(COMPARE_FIELDS.map((k) => [k, o[k]]));
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { size: requestHeight, onMouseDown: onResizeMouseDown } = useResizablePane(
    380,
    "vertical",
    containerRef,
    300,
  );
  const { handleSend } = useRequestExecution();
  const { set, request, requests, saveDialog } = useStore();

  useAppBootstrap();
  useActiveEnvironmentPersistence();

  const handleSaveRef = useRef<() => void>(() => {});
  handleSaveRef.current = () => {
    if (!request.id) {
      set({
        saveDialog: {
          ...saveDialog,
          open: true,
          name: request.name || request.url || "",
          collectionId: "",
          folderId: "",
        },
      });
      return;
    }
    const saved = requests.find((r) => r.id === request.id);
    if (!saved) return;
    const isDirty =
      JSON.stringify(pickComparableFields(request)) !==
      JSON.stringify(pickComparableFields(saved.request));
    if (isDirty) {
      set({ showSaveActionModal: true });
    }
  };

  const handleSendRef = useRef(handleSend);
  handleSendRef.current = handleSend;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSaveRef.current();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        const protocol = useStore.getState().request.protocol ?? "rest";
        if (protocol === "websocket" || protocol === "grpc") return;
        e.preventDefault();
        handleSendRef.current();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden">
          <div
            className="overflow-hidden shrink-0"
            style={{ height: requestHeight, minHeight: 300 }}
          >
            <RequestBuilder onSend={handleSend} />
          </div>

          <button
            type="button"
            aria-label="Resize panel"
            className="resize-handle-v"
            onMouseDown={onResizeMouseDown}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
            }}
          />

          <div
            className="flex-1 overflow-hidden"
            style={{ minHeight: 300 }}
            data-tour="response-area"
          >
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
      <CollectionRunnerModal />
      <BatchRunnerModal />
      <SaveRequestModal />
      <SaveActionModal />
      <CookieManagerModal />
      <OnboardingTour />
    </div>
  );
}
