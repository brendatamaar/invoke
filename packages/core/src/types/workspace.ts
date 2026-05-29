import type { Collection, Environment, Folder, SavedRequest } from "./collection";
import type { Flow } from "./flow";
import type { DefaultProtocolOptions } from "./settings";

export interface WorkspaceBackup {
  version: "1.0";
  exportedAt: number;
  collections: Collection[];
  folders: Folder[];
  requests: SavedRequest[];
  environments: Environment[];
  flows: Flow[];
  defaultProtocolOptions?: DefaultProtocolOptions;
}
