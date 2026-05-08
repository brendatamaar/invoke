import type {
  Collection,
  Environment,
  Folder,
  SavedRequest,
} from "./collection";
import type { Flow } from "./flow";

export interface WorkspaceBackup {
  version: "1.0";
  exportedAt: number;
  collections: Collection[];
  folders: Folder[];
  requests: SavedRequest[];
  environments: Environment[];
  flows: Flow[];
}
