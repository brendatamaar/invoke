import type { SavedRequest } from "@invoke/core";
import { coreStore } from "../../../../store";
import type { AppState } from "../../../../types";

export function handleFolderDragOver(
  event: React.DragEvent,
  collectionId: string,
  setIsDragOver: (value: boolean) => void,
) {
  if (!event.dataTransfer.types.includes(`collection/${collectionId}`)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  setIsDragOver(true);
}

export async function handleFolderDrop(
  event: React.DragEvent,
  collectionId: string,
  setIsDragOver: (value: boolean) => void,
  moveToFolder: (requestId: string) => Promise<void>,
  addToast: AppState["addToast"],
) {
  event.preventDefault();
  setIsDragOver(false);
  const requestId = event.dataTransfer.getData("requestId");
  if (!requestId || event.dataTransfer.getData("collectionId") !== collectionId) return;
  try {
    await moveToFolder(requestId);
  } catch (error) {
    addToast("error", String(error));
  }
}

export function handleFolderItemDragOver(
  event: React.DragEvent<HTMLDivElement>,
  index: number,
  collectionId: string,
  setDragOverIndex: (index: number | null) => void,
) {
  if (!event.dataTransfer.types.includes(`collection/${collectionId}`)) return;
  event.preventDefault();
  event.stopPropagation();
  event.dataTransfer.dropEffect = "move";
  const rect = event.currentTarget.getBoundingClientRect();
  setDragOverIndex(event.clientY < rect.top + rect.height / 2 ? index : index + 1);
}

export async function handleFolderListDrop(
  event: React.DragEvent,
  collectionId: string,
  folderId: string,
  dropIndex: number | null,
  sortedRequests: Pick<SavedRequest, "id">[],
  setDragOverIndex: (index: number | null) => void,
  setIsDragOver: (value: boolean) => void,
  addToast: AppState["addToast"],
) {
  event.preventDefault();
  event.stopPropagation();
  setDragOverIndex(null);
  setIsDragOver(false);
  const requestId = event.dataTransfer.getData("requestId");
  if (!requestId || event.dataTransfer.getData("collectionId") !== collectionId) return;
  try {
    await reorderOrMoveRequest(requestId, folderId, dropIndex, sortedRequests);
  } catch (error) {
    addToast("error", String(error));
  }
}

async function reorderOrMoveRequest(
  requestId: string,
  folderId: string,
  dropIndex: number | null,
  sortedRequests: Pick<SavedRequest, "id">[],
) {
  const currentIndex = sortedRequests.findIndex((request) => request.id === requestId);
  if (currentIndex === -1) {
    await coreStore.moveRequest(requestId, folderId);
    return;
  }
  if (dropIndex === null) return;
  const targetIndex = dropIndex > currentIndex ? dropIndex - 1 : dropIndex;
  if (targetIndex === currentIndex) return;
  const newOrder = [...sortedRequests];
  const [moved] = newOrder.splice(currentIndex, 1);
  newOrder.splice(targetIndex, 0, moved);
  await coreStore.reorderRequests(newOrder.map((request) => request.id));
}
