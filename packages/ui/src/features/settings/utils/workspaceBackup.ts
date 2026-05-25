import { parseWorkspaceBackup, serializeWorkspace } from "@invoke/core";
import { coreStore } from "../../../store";

type ToastFn = (type: "success" | "error" | "info", message: string) => void;

export async function exportWorkspaceBackup(addToast: ToastFn) {
  try {
    const data = await coreStore.exportWorkspace();
    const backup = serializeWorkspace(data);
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoke-workspace-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("success", "Workspace exported");
  } catch (e) {
    addToast("error", String(e));
  }
}

export async function importWorkspaceBackup(
  file: File | undefined,
  set: (patch: any) => void,
  addToast: ToastFn,
  onDone: () => void,
) {
  if (!file) return;
  try {
    const text = await file.text();
    const backup = parseWorkspaceBackup(text);
    await coreStore.importWorkspace(backup);
    const [envs, defaults, reqs] = await Promise.all([
      coreStore.listEnvironments(),
      coreStore.getDefaultProtocolOptions(),
      coreStore.listRequests(),
    ]);
    set({ environments: envs, requests: reqs, protocolDefaults: defaults });
    addToast(
      "success",
      `Workspace imported: ${backup.collections.length} collections, ${backup.environments.length} environments, ${backup.flows.length} flows`,
    );
  } catch (e) {
    addToast("error", String(e));
  } finally {
    onDone();
  }
}
