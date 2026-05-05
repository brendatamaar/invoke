import { useState, useRef } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, MoreHorizontal, Trash2, Edit3, Download, Copy, Upload, Variable } from "lucide-react";
import {
  exportCollectionZip,
  importInvokeZip,
  importPostmanCollection,
  importInsomniaExport,
  importHoppscotchCollection,
  importOpenApiSpec,
  importYamlFiles,
  parseCurl,
} from "@invoke/core";
import { useStore, coreStore } from "../../store";
import { MethodBadge } from "../shared/MethodBadge";
import { PromptModal } from "../shared/PromptModal";
import { ConfirmModal } from "../shared/ConfirmModal";
import type { Collection, SavedRequest, Folder as FolderType } from "@invoke/core";

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--surface-2)] ${danger ? "text-[var(--danger)]" : "text-[var(--text-1)]"}`}>
      {icon} {label}
    </button>
  );
}

function RequestNode({ request, collectionId }: { request: SavedRequest; collectionId: string }) {
  const { set, setRequest, addToast } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const open = () => {
    const draft = request.request as Parameters<typeof setRequest>[0];
    setRequest({ ...draft, id: request.id, name: request.name });
  };

  const del = async () => {
    setConfirmDelete(false);
    try {
      await coreStore.deleteRequest(request.id);
      const reqs = await coreStore.listRequests(collectionId);
      set({ requests: reqs });
      addToast("success", "Request deleted");
    } catch (e) { addToast("error", String(e)); }
  };

  return (
    <>
      <div className="group relative flex items-center gap-1.5 px-3 py-1 hover:bg-[var(--surface-2)] cursor-pointer rounded mx-1" onClick={open}>
        <MethodBadge method={(request.request as { method?: string })?.method ?? "GET"} />
        <span className="flex-1 text-xs text-[var(--text-1)] truncate">{request.name || (request.request as { url?: string })?.url || "Untitled"}</span>
        <div className="opacity-0 group-hover:opacity-100 relative" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setMenuOpen((v) => !v)} className="p-0.5 rounded hover:bg-[var(--border)] text-[var(--text-3)]">
            <MoreHorizontal size={13} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg py-1 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
              <MenuItem icon={<Copy size={12} />} label="Duplicate" onClick={() => setMenuOpen(false)} />
              <MenuItem icon={<Trash2 size={12} />} label="Delete" onClick={() => { setMenuOpen(false); setConfirmDelete(true); }} danger />
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmDelete}
        title="Delete Request"
        message={`Delete "${request.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={del}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}

function FolderNode({ folder, collectionId }: { folder: FolderType; collectionId: string }) {
  const { expandedFolderIds, toggleFolder, requests, set } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const expanded = expandedFolderIds.includes(folder.id);
  const folderRequests = requests.filter((r) => r.folderId === folder.id);

  const openVariableEditor = () => {
    setMenuOpen(false);
    set({ variableEditor: { open: true, kind: "folder", id: folder.id, name: folder.name, variables: folder.variables ?? [] } });
  };

  return (
    <div>
      <div className="group flex items-center gap-1.5 px-3 py-1 hover:bg-[var(--surface-2)] cursor-pointer rounded mx-1 text-[var(--text-2)]" onClick={() => toggleFolder(folder.id)}>
        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        {expanded ? <FolderOpen size={13} /> : <Folder size={13} />}
        <span className="flex-1 text-xs truncate">{folder.name}</span>
        <div className="opacity-0 group-hover:opacity-100 relative" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setMenuOpen((v) => !v)} className="p-0.5 rounded hover:bg-[var(--border)] text-[var(--text-3)]">
            <MoreHorizontal size={13} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg py-1 min-w-[140px]">
              <MenuItem icon={<Variable size={12} />} label="Variables" onClick={openVariableEditor} />
            </div>
          )}
        </div>
      </div>
      {expanded && (
        <div className="ml-3">
          {folderRequests.map((r) => <RequestNode key={r.id} request={r} collectionId={collectionId} />)}
        </div>
      )}
    </div>
  );
}

function CollectionNode({ collection }: { collection: Collection }) {
  const { expandedFolderIds, toggleFolder, folders, requests, set, addToast } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [addReqModal, setAddReqModal] = useState(false);
  const [renameModal, setRenameModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const expanded = expandedFolderIds.includes(collection.id);
  const colFolders = folders.filter((f) => f.collectionId === collection.id && !f.parentFolderId);
  const colRequests = requests.filter((r) => r.collectionId === collection.id && !r.folderId);

  const del = async () => {
    setDeleteModal(false);
    try {
      await coreStore.deleteCollection(collection.id);
      const cols = await coreStore.listCollections();
      set({ collections: cols, requests: requests.filter((r) => r.collectionId !== collection.id), folders: folders.filter((f) => f.collectionId !== collection.id) });
      addToast("success", "Collection deleted");
    } catch (e) { addToast("error", String(e)); }
  };

  const addRequest = async (name: string) => {
    setAddReqModal(false);
    try {
      await coreStore.saveRequest({ method: "GET", url: "", params: [], headers: [], bodyMode: "none", body: "", auth: { type: "none" }, timeoutMs: 30000 }, name, collection.id);
      const reqs = await coreStore.listRequests();
      set({ requests: reqs });
      if (!expandedFolderIds.includes(collection.id)) toggleFolder(collection.id);
    } catch (e) { addToast("error", String(e)); }
  };

  const rename = async (name: string) => {
    setRenameModal(false);
    if (name === collection.name) return;
    try {
      await coreStore.updateCollection({ ...collection, name });
      const cols = await coreStore.listCollections();
      set({ collections: cols });
    } catch (e) { addToast("error", String(e)); }
  };

  const exportZip = async () => {
    setMenuOpen(false);
    try {
      const colRequests = requests.filter((r) => r.collectionId === collection.id);
      const colFolders = folders.filter((f) => f.collectionId === collection.id);
      const blob = await exportCollectionZip(collection, colRequests, colFolders);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${collection.name.replace(/\s+/g, "-")}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      addToast("success", "Collection exported");
    } catch (e) { addToast("error", String(e)); }
  };

  const openVariableEditor = () => {
    setMenuOpen(false);
    set({ variableEditor: { open: true, kind: "collection", id: collection.id, name: collection.name, variables: collection.variables ?? [] } });
  };

  return (
    <>
      <div className="mb-0.5">
        <div className="group flex items-center gap-1.5 px-3 py-1.5 hover:bg-[var(--surface-2)] cursor-pointer rounded mx-1" onClick={() => toggleFolder(collection.id)}>
          {expanded ? <ChevronDown size={13} className="text-[var(--text-3)]" /> : <ChevronRight size={13} className="text-[var(--text-3)]" />}
          <span className="flex-1 text-xs font-semibold text-[var(--text-1)] truncate">{collection.name}</span>
          <span className="text-2xs text-[var(--text-3)]">{colRequests.length}</span>
          <div className="opacity-0 group-hover:opacity-100 relative ml-1" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setMenuOpen((v) => !v)} className="p-0.5 rounded hover:bg-[var(--border)] text-[var(--text-3)]">
              <MoreHorizontal size={13} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg py-1 min-w-[160px]">
                <MenuItem icon={<Plus size={12} />} label="New Request" onClick={() => { setMenuOpen(false); setAddReqModal(true); }} />
                <MenuItem icon={<Edit3 size={12} />} label="Rename" onClick={() => { setMenuOpen(false); setRenameModal(true); }} />
                <MenuItem icon={<Variable size={12} />} label="Variables" onClick={openVariableEditor} />
                <MenuItem icon={<Download size={12} />} label="Export ZIP" onClick={exportZip} />
                <div className="h-px bg-[var(--border)] my-1" />
                <MenuItem icon={<Trash2 size={12} />} label="Delete" onClick={() => { setMenuOpen(false); setDeleteModal(true); }} danger />
              </div>
            )}
          </div>
        </div>

        {expanded && (
          <div>
            {colFolders.map((f) => <FolderNode key={f.id} folder={f} collectionId={collection.id} />)}
            {colRequests.map((r) => <RequestNode key={r.id} request={r} collectionId={collection.id} />)}
          </div>
        )}
      </div>

      <PromptModal
        open={addReqModal}
        title="New Request"
        label="Name"
        defaultValue="New Request"
        onConfirm={addRequest}
        onClose={() => setAddReqModal(false)}
      />
      <PromptModal
        open={renameModal}
        title="Rename Collection"
        label="Name"
        defaultValue={collection.name}
        onConfirm={rename}
        onClose={() => setRenameModal(false)}
      />
      <ConfirmModal
        open={deleteModal}
        title="Delete Collection"
        message={`Delete "${collection.name}" and all its requests? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={del}
        onClose={() => setDeleteModal(false)}
      />
    </>
  );
}

export function CollectionTree() {
  const { collections, addToast, set, setRequest } = useStore();
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<"zip" | "postman" | "insomnia" | "hoppscotch" | "openapi" | "yaml" | "curl">("zip");
  const [newColModal, setNewColModal] = useState(false);
  const [curlModal, setCurlModal] = useState(false);

  const newCollection = async (name: string) => {
    setNewColModal(false);
    try {
      await coreStore.createCollection(name);
      const cols = await coreStore.listCollections();
      set({ collections: cols });
    } catch (e) { addToast("error", String(e)); }
  };

  const refreshCollections = async () => {
    const [cols, reqs, folds] = await Promise.all([
      coreStore.listCollections(),
      coreStore.listRequests(),
      coreStore.listFolders(),
    ]);
    set({ collections: cols, requests: reqs, folders: folds });
  };

  const triggerImport = (type: typeof importType) => {
    setImportType(type);
    setImportMenuOpen(false);
    if (type === "curl") { setCurlModal(true); return; }
    fileInputRef.current?.click();
  };

  const importCurl = (cmd: string) => {
    setCurlModal(false);
    try {
      const req = parseCurl(cmd);
      setRequest(req as Parameters<typeof setRequest>[0]);
      addToast("success", "cURL imported into request");
    } catch (e) { addToast("error", String(e)); }
  };

  const persistImported = async (imported: { collection: Collection; folders?: FolderType[]; requests: SavedRequest[]; environments?: unknown[] }) => {
    const col = await coreStore.createCollection(imported.collection.name, imported.collection);
    const folderIds = new Map<string, string>();
    for (const folder of imported.folders ?? []) {
      const parentId = folder.parentFolderId ? folderIds.get(folder.parentFolderId) ?? null : null;
      const saved = await coreStore.createFolder(col.id, folder.name, parentId, folder);
      folderIds.set(folder.id, saved.id);
    }
    for (const item of imported.requests) {
      await coreStore.saveRequest(
        item.request as Parameters<typeof coreStore.saveRequest>[0],
        item.name,
        col.id,
        { protocol: item.protocol, folderId: item.folderId ? folderIds.get(item.folderId) ?? null : null }
      );
    }
    return imported.requests.length;
  };

  type ImportResult = { collection: Collection; folders?: FolderType[]; requests: SavedRequest[]; environments?: unknown[] };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = "";
    try {
      let imported: ImportResult | undefined;
      if (importType === "zip") {
        imported = await importInvokeZip(files[0]) as unknown as ImportResult;
      } else if (importType === "postman") {
        imported = importPostmanCollection(JSON.parse(await files[0].text())) as unknown as ImportResult;
      } else if (importType === "insomnia") {
        imported = importInsomniaExport(JSON.parse(await files[0].text())) as unknown as ImportResult;
      } else if (importType === "hoppscotch") {
        imported = importHoppscotchCollection(JSON.parse(await files[0].text())) as unknown as ImportResult;
      } else if (importType === "openapi") {
        imported = await importOpenApiSpec(await files[0].text()) as unknown as ImportResult;
      } else if (importType === "yaml") {
        imported = await importYamlFiles(files) as unknown as ImportResult;
      }
      if (imported) {
        const count = await persistImported(imported);
        await refreshCollections();
        addToast("success", `Imported ${count} requests`);
      }
    } catch (err) { addToast("error", `Import failed: ${String(err)}`); }
  };

  const importOptions: { type: typeof importType; label: string; accept: string }[] = [
    { type: "zip",        label: "Invoke ZIP",         accept: ".zip" },
    { type: "postman",    label: "Postman Collection", accept: ".json" },
    { type: "insomnia",   label: "Insomnia Export",    accept: ".json" },
    { type: "hoppscotch", label: "Hoppscotch",         accept: ".json" },
    { type: "openapi",    label: "OpenAPI / Swagger",  accept: ".json,.yaml,.yml" },
    { type: "yaml",       label: "Invoke YAML",        accept: ".yaml,.yml" },
    { type: "curl",       label: "cURL command",       accept: "" },
  ];

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
          <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider">Collections</span>
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                onClick={() => setImportMenuOpen((v) => !v)}
                className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5 rounded hover:bg-[var(--surface-2)]"
                title="Import"
              >
                <Upload size={13} />
              </button>
              {importMenuOpen && (
                <div className="absolute right-0 top-full mt-1 z-20 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg py-1 min-w-[180px]">
                  {importOptions.map((opt) => (
                    <button
                      key={opt.type}
                      onClick={() => triggerImport(opt.type)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--surface-2)] text-[var(--text-1)] text-left"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setNewColModal(true)} className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5 rounded hover:bg-[var(--surface-2)]" title="New collection">
              <Plus size={13} />
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={importOptions.find((o) => o.type === importType)?.accept ?? "*"}
          multiple={importType === "yaml"}
          onChange={handleFileImport}
        />

        {!collections.length ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 px-4 text-center">
            <p className="text-xs text-[var(--text-3)]">No collections yet</p>
            <button onClick={() => setNewColModal(true)} className="btn text-xs flex items-center gap-1"><Plus size={13} /> New Collection</button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto py-1">
            {collections.map((c) => <CollectionNode key={c.id} collection={c} />)}
          </div>
        )}
      </div>

      <PromptModal
        open={newColModal}
        title="New Collection"
        label="Name"
        placeholder="My API"
        onConfirm={newCollection}
        onClose={() => setNewColModal(false)}
      />
      <PromptModal
        open={curlModal}
        title="Import cURL"
        label="cURL command"
        placeholder="curl https://api.example.com/..."
        multiline
        confirmLabel="Import"
        onConfirm={importCurl}
        onClose={() => setCurlModal(false)}
      />
    </>
  );
}
