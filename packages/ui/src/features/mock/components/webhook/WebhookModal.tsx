import { useEffect, useReducer } from "react";
import { useStore } from "../../../../store";
import type { WebhookEndpoint, WebhookValidationConfig } from "../../../../types";
import { setWebhookConfig } from "../../../webhook/api";
import { useClearWebhookLogs, useWebhookLogs } from "../../../webhook/useWebhookLogs";
import { HistoryLog } from "./HistoryLog";
import { WebhookConfigTab } from "./WebhookConfigTab";
import { WebhookModalHeader } from "./WebhookModalHeader";
import { WebhookModalTabs } from "./WebhookModalTabs";
import { WebhookUrlStrip } from "./WebhookUrlStrip";
import type { WebhookModalTab } from "./types";

export function WebhookModal({
  endpoint,
  onClose,
  onUpdate,
}: {
  endpoint: WebhookEndpoint;
  onClose: () => void;
  onUpdate: (id: string, label: string, validation: WebhookValidationConfig) => void;
}) {
  const { addToast } = useStore();
  type ModalState = {
    tab: WebhookModalTab;
    label: string;
    validation: WebhookValidationConfig;
    saving: boolean;
    copied: boolean;
  };
  const [state, dispatch] = useReducer(
    (prev: ModalState, patch: Partial<ModalState>) => ({ ...prev, ...patch }),
    {
      tab: "config" as WebhookModalTab,
      label: endpoint.label,
      validation: endpoint.validation,
      saving: false,
      copied: false,
    },
  );
  const { tab, label, validation, saving, copied } = state;
  const setTab = (v: WebhookModalTab) => dispatch({ tab: v });
  const setLabel = (v: string) => dispatch({ label: v });
  const setValidation = (v: WebhookValidationConfig) => dispatch({ validation: v });
  const setSaving = (v: boolean) => dispatch({ saving: v });
  const setCopied = (v: boolean) => dispatch({ copied: v });

  useEffect(() => {
    setLabel(endpoint.label);
    setValidation(endpoint.validation);
  }, [endpoint.id, endpoint.label, endpoint.validation]);
  const {
    data: entries = [],
    isFetching,
    refetch,
  } = useWebhookLogs(endpoint.id, tab === "history");
  const clearLogsMutation = useClearWebhookLogs(endpoint.id);
  const url = `${window.location.protocol}//${window.location.hostname}:4000/webhook/${endpoint.id}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const applyConfig = async () => {
    setSaving(true);
    try {
      await setWebhookConfig(endpoint.id, validation);
      onUpdate(endpoint.id, label, validation);
      addToast("success", "Config saved");
    } catch (error) {
      addToast("error", String(error));
    } finally {
      setSaving(false);
    }
  };

  const clearLogs = () => {
    clearLogsMutation.mutate(undefined, {
      onError: (error) => addToast("error", String(error)),
    });
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)" }}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="flex flex-col"
        style={{
          width: 600,
          maxHeight: "100vh",
          background: "var(--bg-2)",
          border: "1px solid var(--line-2)",
          borderRadius: "var(--r-4)",
          boxShadow: "var(--shadow-pop)",
        }}
      >
        <WebhookModalHeader label={label} onClose={onClose} />
        <WebhookUrlStrip url={url} copied={copied} onCopy={copyUrl} />
        <WebhookModalTabs activeTab={tab} historyCount={entries.length} onSelect={setTab} />
        <div className={`flex-1 p-4 ${tab === "history" ? "overflow-auto" : "overflow-visible"}`}>
          {tab === "config" && (
            <WebhookConfigTab
              label={label}
              validation={validation}
              saving={saving}
              onLabelChange={setLabel}
              onValidationChange={setValidation}
              onSave={applyConfig}
            />
          )}
          {tab === "history" && (
            <HistoryLog
              entries={entries}
              hasValidation={validation.type !== "none"}
              onClear={clearLogs}
              onRefresh={() => refetch()}
              loadingLogs={isFetching}
            />
          )}
        </div>
      </div>
    </div>
  );
}
