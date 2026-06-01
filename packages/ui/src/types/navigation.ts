import type { Collection, Folder, SavedRequest } from "@invoke/core";

export type ContextTarget =
  | { type: "collection"; collection: Collection }
  | { type: "folder"; folder: Folder }
  | { type: "request"; request: SavedRequest };

export type PaletteKind =
  | "command"
  | "collection"
  | "folder"
  | "request"
  | "environment"
  | "history"
  | "flow"
  | "mock";

export type SidebarSection = "collections" | "history" | "environments" | "flows" | "mocks";

export interface PaletteItem {
  id: string;
  kind: PaletteKind;
  title: string;
  subtitle: string;
  keywords: string;
  method?: string;
  protocol?: string;
  run: () => void | Promise<void>;
}
