import type { DefaultProtocolOptions, RetentionSettings } from "@invoke/core";
import type { GeneralDraft } from "../../../types";
import { coreStore } from "../../../store";
import { cloneProtocolDefaults } from "./draft";
import { applyUiFontSize, resolveTheme } from "./theme";

type ToastFn = (type: "success" | "error" | "info", message: string) => void;

export async function saveSettings({
  general,
  drafts,
  retentionDraft,
  set,
  addToast,
}: {
  general: GeneralDraft;
  drafts: DefaultProtocolOptions;
  retentionDraft: RetentionSettings;
  set: (patch: any) => void;
  addToast: ToastFn;
}) {
  const effectiveTheme = resolveTheme(general.theme);
  document.documentElement.setAttribute("data-theme", effectiveTheme);
  localStorage.setItem("theme", general.theme);
  applyUiFontSize(general.uiFontSize);
  localStorage.setItem("uiFontSize", String(general.uiFontSize));
  localStorage.setItem("editorWordWrap", String(general.editorWordWrap));

  try {
    await coreStore.setDefaultProtocolOptions(drafts);
    await coreStore.setRetentionSettings(retentionDraft);
    set({
      editorWordWrap: general.editorWordWrap,
      uiFontSize: general.uiFontSize,
      protocolDefaults: cloneProtocolDefaults(drafts),
      showSettings: false,
      settingsTab: undefined,
    });
  } catch (e) {
    addToast("error", String(e));
    set({
      editorWordWrap: general.editorWordWrap,
      uiFontSize: general.uiFontSize,
      showSettings: false,
      settingsTab: undefined,
    });
  }
}
