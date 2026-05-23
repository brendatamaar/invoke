import type { RefObject } from "react";
import { useState } from "react";
import {
  importHarFile,
  importHoppscotchCollection,
  importInsomniaExport,
  importInvokeZip,
  importOpenApiSpec,
  importPostmanCollection,
  importYamlFiles,
  parseCurl,
} from "@invoke/core";
import { useStore, coreStore } from "../../store";
import type { CollectionImportResult } from "../../types";

export type CollectionImportType =
  | "zip"
  | "postman"
  | "insomnia"
  | "hoppscotch"
  | "openapi"
  | "yaml"
  | "curl"
  | "har";

export const COLLECTION_IMPORT_OPTIONS: {
  type: CollectionImportType;
  label: string;
  accept: string;
}[] = [
  { type: "zip", label: "Invoke ZIP", accept: ".zip" },
  { type: "postman", label: "Postman Collection", accept: ".json" },
  { type: "insomnia", label: "Insomnia Export", accept: ".json" },
  { type: "hoppscotch", label: "Hoppscotch", accept: ".json" },
  { type: "openapi", label: "OpenAPI / Swagger", accept: ".json,.yaml,.yml" },
  { type: "yaml", label: "Invoke YAML", accept: ".yaml,.yml" },
  { type: "har", label: "HAR (Browser DevTools)", accept: ".har,.json" },
  { type: "curl", label: "cURL command", accept: "" },
];

export function useCollectionImport(fileInputRef: RefObject<HTMLInputElement | null>) {
  const { addToast, setRequest } = useStore();
  const [importType, setImportType] = useState<CollectionImportType>("zip");
  const [curlModal, setCurlModal] = useState(false);

  const triggerImport = (type: CollectionImportType) => {
    setImportType(type);
    if (type === "curl") {
      setCurlModal(true);
      return;
    }
    fileInputRef.current?.click();
  };

  const importCurl = (cmd: string) => {
    setCurlModal(false);
    try {
      const req = parseCurl(cmd);
      setRequest(req as Parameters<typeof setRequest>[0]);
      addToast("success", "cURL imported into request");
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const persistImported = async (imported: CollectionImportResult) => {
    const col = await coreStore.createCollection(
      imported.collection.name,
      imported.collection,
    );
    const folderIds = new Map<string, string>();
    for (const folder of imported.folders ?? []) {
      const parentId = folder.parentFolderId
        ? (folderIds.get(folder.parentFolderId) ?? null)
        : null;
      const saved = await coreStore.createFolder(
        col.id,
        folder.name,
        parentId,
        folder,
      );
      folderIds.set(folder.id, saved.id);
    }
    for (const item of imported.requests) {
      await coreStore.saveRequest(
        item.request as Parameters<typeof coreStore.saveRequest>[0],
        item.name,
        col.id,
        {
          protocol: item.protocol,
          folderId: item.folderId
            ? (folderIds.get(item.folderId) ?? null)
            : null,
        },
      );
    }
    return imported.requests.length;
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = "";
    try {
      let imported: CollectionImportResult | undefined;
      if (importType === "zip") {
        imported = (await importInvokeZip(
          files[0],
        )) as unknown as CollectionImportResult;
      } else if (importType === "postman") {
        imported = importPostmanCollection(
          JSON.parse(await files[0].text()),
        ) as unknown as CollectionImportResult;
      } else if (importType === "insomnia") {
        imported = importInsomniaExport(
          JSON.parse(await files[0].text()),
        ) as unknown as CollectionImportResult;
      } else if (importType === "hoppscotch") {
        imported = importHoppscotchCollection(
          JSON.parse(await files[0].text()),
        ) as unknown as CollectionImportResult;
      } else if (importType === "openapi") {
        imported = (await importOpenApiSpec(
          await files[0].text(),
        )) as unknown as CollectionImportResult;
      } else if (importType === "yaml") {
        imported = (await importYamlFiles(
          files,
        )) as unknown as CollectionImportResult;
      }
      if (importType === "har") {
        imported = importHarFile(
          JSON.parse(await files[0].text()),
        ) as unknown as CollectionImportResult;
      }
      if (imported) {
        const count = await persistImported(imported);
        addToast("success", `Imported ${count} requests`);
      }
    } catch (err) {
      addToast("error", `Import failed: ${String(err)}`);
    }
  };

  const accept =
    COLLECTION_IMPORT_OPTIONS.find((o) => o.type === importType)?.accept ?? "*";

  return {
    accept,
    curlModal,
    importCurl,
    importType,
    handleFileImport,
    setCurlModal,
    triggerImport,
  };
}
