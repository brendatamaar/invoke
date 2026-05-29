import { useEffect, useMemo, useReducer, useRef } from "react";
import { useEscapeKey } from "../hooks/useEscapeKey";
import type { RequestProtocol, RetentionSettings } from "@invoke/core";
import { coreStore, useStore } from "../../../store";
import {
  useCollections,
  useCookies,
  useFlows,
  useFolders,
  useHistory,
  useRetentionSettings,
} from "../../../hooks/useDb";
import type { GeneralDraft, SettingsTab } from "../../../types";
import { DEFAULT_RETENTION, PROTOCOLS } from "../constants";
import { SettingsFrame } from "./SettingsFrame";
import { SettingsTabContent } from "./SettingsTabContent";
import { buildGeneralDraft, buildStatItems, cloneProtocolDefaults } from "../utils/draft";
import { useProtocolDefaultDrafts } from "../hooks/useProtocolDefaultDrafts";
import { sameValue } from "../utils/numbers";
import { saveSettings } from "../utils/saveSettings";
import { exportWorkspaceBackup, importWorkspaceBackup } from "../utils/workspaceBackup";

export function SettingsPanel() {
  const {
    showSettings,
    set,
    request,
    protocolDefaults,
    requests,
    environments,
    uiFontSize,
    editorWordWrap,
    settingsTab,
    addToast,
  } = useStore();
  const collections = useCollections();
  const folders = useFolders();
  const flows = useFlows();
  const history = useHistory();
  const cookies = useCookies();
  const retentionSettings = useRetentionSettings();
  const activeProtocol = (request.protocol ?? "rest") as RequestProtocol;

  type PanelState = { tab: SettingsTab; general: GeneralDraft; retentionDraft: RetentionSettings; storageStats: Record<string, number>; confirmClearCookies: boolean };
  const [panelState, panelDispatch] = useReducer(
    (prev: PanelState, patch: Partial<PanelState>) => ({ ...prev, ...patch }),
    {
      tab: "general" as SettingsTab,
      general: buildGeneralDraft(uiFontSize, editorWordWrap),
      retentionDraft: retentionSettings ?? DEFAULT_RETENTION,
      storageStats: {} as Record<string, number>,
      confirmClearCookies: false,
    },
  );
  const { tab, general, retentionDraft, storageStats, confirmClearCookies } = panelState;
  const setTab = (v: SettingsTab) => panelDispatch({ tab: v });
  const setGeneral = (v: GeneralDraft | ((prev: GeneralDraft) => GeneralDraft)) =>
    panelDispatch({ general: typeof v === "function" ? v(panelState.general) : v });
  const setRetentionDraft = (v: RetentionSettings) => panelDispatch({ retentionDraft: v });
  const setStorageStats = (v: Record<string, number>) => panelDispatch({ storageStats: v });
  const setConfirmClearCookies = (v: boolean) => panelDispatch({ confirmClearCookies: v });
  const backupInputRef = useRef<HTMLInputElement>(null);
  const prevShowRef = useRef(showSettings);
  const protocolDrafts = useProtocolDefaultDrafts({
    showSettings,
    protocolDefaults,
    activeProtocol,
  });

  if (showSettings && !prevShowRef.current) {
    setTab(settingsTab ?? "general");
    setGeneral(buildGeneralDraft(uiFontSize, editorWordWrap));
    setRetentionDraft(retentionSettings ?? DEFAULT_RETENTION);
    setConfirmClearCookies(false);
  }
  prevShowRef.current = showSettings;

  const persistedGeneral = useMemo(
    () => buildGeneralDraft(uiFontSize, editorWordWrap),
    [editorWordWrap, uiFontSize],
  );
  const persistedDrafts = useMemo(
    () => cloneProtocolDefaults(protocolDefaults),
    [protocolDefaults],
  );
  const normalizedRetention = retentionSettings ?? DEFAULT_RETENTION;
  const dirty = useMemo(
    () =>
      !sameValue(general, persistedGeneral) ||
      !sameValue(retentionDraft, normalizedRetention) ||
      PROTOCOLS.some(
        (protocol) => !sameValue(protocolDrafts.drafts[protocol], persistedDrafts[protocol]),
      ),
    [
      general,
      normalizedRetention,
      persistedDrafts,
      persistedGeneral,
      protocolDrafts.drafts,
      retentionDraft,
    ],
  );

  useEffect(() => {
    if (!showSettings) return;
    coreStore
      .getStorageStats()
      .then(setStorageStats)
      .catch(() => {});
  }, [showSettings]);

  useEscapeKey(showSettings, () => set({ showSettings: false, settingsTab: undefined }));

  if (!showSettings) return null;

  function closePanel() {
    set({ showSettings: false, settingsTab: undefined });
  }

  async function handleClearCookies() {
    if (!confirmClearCookies) {
      setConfirmClearCookies(true);
      return;
    }
    try {
      await coreStore.clearCookies();
      setConfirmClearCookies(false);
      addToast("info", "Cookies cleared");
    } catch (e) {
      addToast("error", String(e));
    }
  }

  async function handleSave() {
    await saveSettings({
      general,
      drafts: protocolDrafts.drafts,
      retentionDraft,
      set,
      addToast,
    });
  }

  const statItems = buildStatItems({
    storageStats,
    collectionsCount: collections.length,
    requestsCount: requests.length,
    historyCount: history.length,
    environmentsCount: environments.length,
    flowsCount: flows.length,
    foldersCount: folders.length,
  });

  return (
    <SettingsFrame
      tab={tab}
      dirty={dirty}
      onTabChange={setTab}
      onCancel={closePanel}
      onSave={handleSave}
    >
      <SettingsTabContent
        tab={tab}
        general={general}
        setGeneral={setGeneral}
        editingProtocol={protocolDrafts.editingProtocol}
        activeOptions={protocolDrafts.activeOptions}
        activeProxy={protocolDrafts.activeProxy}
        setEditingProtocol={protocolDrafts.setEditingProtocol}
        patchActiveOptions={protocolDrafts.patchActiveOptions}
        patchTlsClientConfig={protocolDrafts.patchTlsClientConfig}
        resetActiveProtocolDefaults={protocolDrafts.resetActiveProtocolDefaults}
        ensureProxy={protocolDrafts.ensureProxy}
        removeProxy={protocolDrafts.removeProxy}
        patchProxy={protocolDrafts.patchProxy}
        retentionDraft={retentionDraft}
        setRetentionDraft={setRetentionDraft}
        statItems={statItems}
        cookiesCount={cookies.length}
        confirmClearCookies={confirmClearCookies}
        backupInputRef={backupInputRef}
        onClearCookies={handleClearCookies}
        onCancelClearCookies={() => setConfirmClearCookies(false)}
        onOpenClearHistory={() =>
          set({
            showSettings: false,
            settingsTab: undefined,
            showClearHistoryModal: true,
          })
        }
        onExportWorkspace={() => exportWorkspaceBackup(addToast)}
        onImportWorkspace={(file) =>
          importWorkspaceBackup(file, set, addToast, () => {
            if (backupInputRef.current) backupInputRef.current.value = "";
          })
        }
      />
    </SettingsFrame>
  );
}
