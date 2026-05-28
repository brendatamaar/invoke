export type ThemeMode = "light" | "dark" | "system";
export type SettingsTab = "general" | "network" | "proxy" | "storage" | "backup";

export interface GeneralDraft {
  theme: ThemeMode;
  uiFontSize: number;
  editorWordWrap: boolean;
}
