import type {
  Collection,
  DefaultProtocolOptions,
  Environment,
  Flow,
  Folder,
  SavedRequest,
} from "../types";
import type { InvokeDB } from "./db";
import { getDefaultProtocolOptions, setDefaultProtocolOptions } from "./meta";
import { stripNetworkOptionsFromFlow, stripNetworkOptionsFromSavedRequest } from "./migrations";

export async function getStorageStats(db: InvokeDB): Promise<Record<string, number>> {
  const [collections, folders, requests, environments, history, flows] = await Promise.all([
    db.collections.count(),
    db.folders.count(),
    db.requests.count(),
    db.environments.count(),
    db.history.count(),
    db.flows.count(),
  ]);
  return { collections, folders, requests, environments, history, flows };
}

export async function exportWorkspace(db: InvokeDB) {
  const [collections, folders, requests, environments, flows, defaultProtocolOptions] =
    await Promise.all([
      db.collections.toArray(),
      db.folders.toArray(),
      db.requests.toArray(),
      db.environments.toArray(),
      db.flows.toArray(),
      getDefaultProtocolOptions(db),
    ]);
  return {
    collections,
    folders,
    requests,
    environments,
    flows,
    defaultProtocolOptions,
  };
}

export async function importWorkspace(
  db: InvokeDB,
  data: {
    collections: Collection[];
    folders: Folder[];
    requests: SavedRequest[];
    environments: Environment[];
    flows: Flow[];
    defaultProtocolOptions?: DefaultProtocolOptions;
  },
): Promise<void> {
  const writes: Array<Promise<unknown>> = [
    db.collections.bulkPut(data.collections),
    db.folders.bulkPut(data.folders),
    db.requests.bulkPut(data.requests.map(stripNetworkOptionsFromSavedRequest)),
    db.environments.bulkPut(data.environments),
    db.flows.bulkPut(data.flows.map(stripNetworkOptionsFromFlow)),
  ];

  if (data.defaultProtocolOptions) {
    writes.push(setDefaultProtocolOptions(db, data.defaultProtocolOptions));
  }

  await Promise.all(writes);
}
