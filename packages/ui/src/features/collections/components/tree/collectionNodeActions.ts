import type { Collection, SavedRequest } from "@invoke/core";
import { coreStore } from "../../../../store";
import type { AppState } from "../../../../types";

export function emptyRequest() {
  return {
    method: "GET" as const,
    url: "",
    params: [],
    headers: [],
    bodyMode: "none" as const,
    body: "",
    auth: { type: "none" as const },
    timeoutMs: 30000,
  };
}

export function openModal(
  setMenuOpen: (value: boolean) => void,
  setOpen: (value: boolean) => void,
) {
  setMenuOpen(false);
  setOpen(true);
}

export function openVariables(
  collection: Collection,
  setMenuOpen: (value: boolean) => void,
  set: AppState["set"],
) {
  setMenuOpen(false);
  set({
    variableEditor: {
      open: true,
      kind: "collection",
      id: collection.id,
      name: collection.name,
      variables: collection.variables ?? [],
    },
  });
}

export function runCollection(
  collection: Collection,
  setMenuOpen: (value: boolean) => void,
  set: AppState["set"],
) {
  setMenuOpen(false);
  set({
    showCollectionRunner: true,
    collectionRunnerTarget: {
      type: "collection",
      id: collection.id,
      name: collection.name,
    },
  });
}

export function handleCollectionDragOver(
  event: React.DragEvent,
  collectionId: string,
  setIsDragOver: (value: boolean) => void,
) {
  if (!event.dataTransfer.types.includes(`collection/${collectionId}`)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  setIsDragOver(true);
}

export async function handleCollectionDrop(
  event: React.DragEvent,
  collectionId: string,
  requests: Pick<SavedRequest, "id" | "folderId">[],
  setIsDragOver: (value: boolean) => void,
  addToast: AppState["addToast"],
) {
  event.preventDefault();
  setIsDragOver(false);
  const requestId = event.dataTransfer.getData("requestId");
  const sourceCollectionId = event.dataTransfer.getData("collectionId");
  if (!requestId || sourceCollectionId !== collectionId) return;
  const request = requests.find((item) => item.id === requestId);
  if (!request?.folderId) return;
  try {
    await coreStore.moveRequest(requestId, null);
  } catch (error) {
    addToast("error", String(error));
  }
}
