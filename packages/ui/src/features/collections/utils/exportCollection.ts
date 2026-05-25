import {
  exportCollectionAsOpenApi,
  exportCollectionZip,
  type Collection,
  type Folder,
  type SavedRequest,
} from "@invoke/core";

export async function exportCollectionToZip(
  collection: Collection,
  requests: SavedRequest[],
  folders: Folder[],
) {
  const blob = await exportCollectionZip(collection, requests, folders);
  downloadBlob(blob, `${collection.name.replace(/\s+/g, "-")}.zip`);
}

export function exportCollectionToOpenApi(
  collection: Collection,
  requests: SavedRequest[],
  folders: Folder[],
) {
  const yaml = exportCollectionAsOpenApi(collection, requests, folders);
  downloadBlob(
    new Blob([yaml], { type: "text/yaml" }),
    `${collection.name.replace(/\s+/g, "-")}-openapi.yaml`,
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
