import type { Collection, Folder, SavedRequest } from "@invoke/core";

export interface CollectionImportResult {
  collection: Collection;
  folders?: Folder[];
  requests: SavedRequest[];
  environments?: unknown[];
}
