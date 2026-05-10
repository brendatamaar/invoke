import type { StateCreator } from "zustand";
import type { AppState } from "../../types";

export type UiSlice = Pick<
  AppState,
  | "sidebarCollapsed"
  | "sidebarSection"
  | "sidebarWidth"
  | "contextMenu"
  | "saveDialog"
  | "showSettings"
  | "showHelp"
  | "showClearHistoryModal"
  | "uiFontSize"
  | "commandPaletteOpen"
  | "commandQuery"
  | "toasts"
  | "addToast"
  | "removeToast"
>;

type StoreSet = Parameters<StateCreator<AppState>>[0];
type StoreGet = Parameters<StateCreator<AppState>>[1];

export function createUiSlice(set: StoreSet, get: StoreGet): UiSlice {
  return {
  sidebarCollapsed: false,
  sidebarSection: "collections",
  sidebarWidth: 260,
  contextMenu: { open: false, x: 0, y: 0 },
  saveDialog: { open: false, name: "", collectionId: "", folderId: "" },
  showSettings: false,
  showHelp: false,
  showClearHistoryModal: false,
  uiFontSize: Number(localStorage.getItem("uiFontSize") ?? 13),
  commandPaletteOpen: false,
  commandQuery: "",
  toasts: [],

  addToast: (kind, message) => {
    const id = Math.random().toString(36).slice(2);
    set((state) => ({ toasts: [...state.toasts, { id, kind, message }] }));
    setTimeout(() => get().removeToast(id), 4000);
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  };
}
