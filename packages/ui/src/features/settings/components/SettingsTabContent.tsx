import type {
  RequestOptions,
  RequestProtocol,
  RetentionSettings,
  TlsClientConfig,
} from "@invoke/core";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { GeneralDraft, SettingsTab } from "../../../types";
import { BackupTab } from "./tabs/BackupTab";
import { GeneralTab } from "./tabs/GeneralTab";
import { NetworkTab } from "./tabs/NetworkTab";
import { ProxyTab } from "./tabs/ProxyTab";
import { StorageTab } from "./tabs/StorageTab";

type ProxyConfig = NonNullable<RequestOptions["proxy"]>;

export function SettingsTabContent({
  tab,
  general,
  setGeneral,
  editingProtocol,
  activeOptions,
  activeProxy,
  setEditingProtocol,
  patchActiveOptions,
  patchTlsClientConfig,
  resetActiveProtocolDefaults,
  ensureProxy,
  removeProxy,
  patchProxy,
  retentionDraft,
  setRetentionDraft,
  statItems,
  cookiesCount,
  confirmClearCookies,
  backupInputRef,
  onClearCookies,
  onCancelClearCookies,
  onOpenClearHistory,
  onExportWorkspace,
  onImportWorkspace,
}: {
  tab: SettingsTab;
  general: GeneralDraft;
  setGeneral: Dispatch<SetStateAction<GeneralDraft>>;
  editingProtocol: RequestProtocol;
  activeOptions: RequestOptions;
  activeProxy?: ProxyConfig;
  setEditingProtocol: (protocol: RequestProtocol) => void;
  patchActiveOptions: (patch: Partial<RequestOptions>) => void;
  patchTlsClientConfig: (patch: Partial<TlsClientConfig>) => void;
  resetActiveProtocolDefaults: () => void;
  ensureProxy: () => void;
  removeProxy: () => void;
  patchProxy: (patch: Partial<ProxyConfig>) => void;
  retentionDraft: RetentionSettings;
  setRetentionDraft: Dispatch<SetStateAction<RetentionSettings>>;
  statItems: Array<{ label: string; value: number }>;
  cookiesCount: number;
  confirmClearCookies: boolean;
  backupInputRef: RefObject<HTMLInputElement | null>;
  onClearCookies: () => void;
  onCancelClearCookies: () => void;
  onOpenClearHistory: () => void;
  onExportWorkspace: () => void;
  onImportWorkspace: (file?: File) => void;
}) {
  if (tab === "general") {
    return <GeneralTab general={general} setGeneral={setGeneral} />;
  }

  if (tab === "network") {
    return (
      <NetworkTab
        editingProtocol={editingProtocol}
        activeOptions={activeOptions}
        setEditingProtocol={setEditingProtocol}
        patchActiveOptions={patchActiveOptions}
        patchTlsClientConfig={patchTlsClientConfig}
        resetActiveProtocolDefaults={resetActiveProtocolDefaults}
      />
    );
  }

  if (tab === "proxy") {
    return (
      <ProxyTab
        editingProtocol={editingProtocol}
        activeProxy={activeProxy}
        setEditingProtocol={setEditingProtocol}
        ensureProxy={ensureProxy}
        removeProxy={removeProxy}
        patchProxy={patchProxy}
      />
    );
  }

  if (tab === "storage") {
    return (
      <StorageTab
        retentionDraft={retentionDraft}
        setRetentionDraft={setRetentionDraft}
        statItems={statItems}
        cookiesCount={cookiesCount}
        confirmClearCookies={confirmClearCookies}
        onClearCookies={onClearCookies}
        onCancelClearCookies={onCancelClearCookies}
        onOpenClearHistory={onOpenClearHistory}
      />
    );
  }

  return (
    <BackupTab
      backupInputRef={backupInputRef}
      onExportWorkspace={onExportWorkspace}
      onImportWorkspace={onImportWorkspace}
    />
  );
}
