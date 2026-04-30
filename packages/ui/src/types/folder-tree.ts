import type { Folder, SavedRequest } from "@invoke/core";

export interface FolderTreeNodeView {
  folder: Folder;
  folders: FolderTreeNodeView[];
  requests: SavedRequest[];
  depth: number;
}

export type TreeDragPayload = { type: "folder" | "request"; id: string };
