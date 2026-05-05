import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Plus,
  MoreHorizontal,
  Trash2,
  Edit3,
  Download,
  Copy
} from "lucide-react";
import { useStore, coreStore } from "../../store";
import { MethodBadge } from "../shared/MethodBadge";
import type { Collection, SavedRequest, Folder as FolderType } from "@invoke/core";

function RequestNode({ request, collectionId }: { request: SavedRequest; collectionId: string }) {
  const { set, addToast } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const open = () => {
    const { request: req } = useStore.getState();
    set({
      request: {
        ...req,
        id: request.id,
        name: request.name,
        method: request.method as typeof req.method,
        url: request.url,
        headers: request.headers ?? [],
        params: request.params ?? [],
        body: request.body ?? "",
        bodyMode: request.bodyMode as typeof req.bodyMode ?? "none",
        auth: request.auth ?? req.auth
      }
    });
  };

  const del = async () => {
    if (!confirm(`Delete "${request.name}"?`)) return;
    try {
      await coreStore.requests.delete(request.id);
      const reqs = await coreStore.requests.list(collectionId);
      set({ requests: reqs });
      addToast("success", "Request deleted");
    } catch (e) { addToast("error", String(e)); }
    setMenuOpen(false);
  };

  return (
    <div className="group relative flex items-center gap-1.5 px-3 py-1 hover:bg-[var(--surface-2)] cursor-pointer rounded mx-1" onClick={open}>
      <MethodBadge method={request.method} />
      <span className="flex-1 text-xs text-[var(--text-1)] truncate">{request.name || request.url || "Untitled"}</span>
      <div className="opacity-0 group-hover:opacity-100 relative">
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
          className="p-0.5 rounded hover:bg-[var(--border)] text-[var(--text-3)]"
        >
          <MoreHorizontal size={13} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-[var(--border)] rounded-lg shadow-lg py-1 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
            <MenuItem icon={<Copy size={12} />} label="Duplicate" onClick={() => setMenuOpen(false)} />
            <MenuItem icon={<Trash2 size={12} />} label="Delete" onClick={del} danger />
          </div>
        )}
      </div>
    </div>
  );
}

function FolderNode({ folder, collectionId }: { folder: FolderType; collectionId: string }) {
  const { expandedFolderIds, toggleFolder, requests } = useStore();
  const expanded = expandedFolderIds.includes(folder.id);
  const folderRequests = requests.filter((r) => r.folderId === folder.id);

  return (
    <div>
      <div
        className="flex items-center gap-1.5 px-3 py-1 hover:bg-[var(--surface-2)] cursor-pointer rounded mx-1 text-[var(--text-2)]"
        onClick={() => toggleFolder(folder.id)}
      >
        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        {expanded ? <FolderOpen size={13} /> : <Folder size={13} />}
        <span className="flex-1 text-xs truncate">{folder.name}</span>
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
  const expanded = expandedFolderIds.includes(collection.id);
  const colFolders = folders.filter((f) => f.collectionId === collection.id && !f.parentId);
  const colRequests = requests.filter((r) => r.collectionId === collection.id && !r.folderId);

  const del = async () => {
    if (!confirm(`Delete collection "${collection.name}"?`)) return;
    try {
      await coreStore.collections.delete(collection.id);
      const cols = await coreStore.collections.list();
      set({ collections: cols });
      addToast("success", "Collection deleted");
    } catch (e) { addToast("error", String(e)); }
    setMenuOpen(false);
  };

  const addRequest = async () => {
    try {
      const req = await coreStore.requests.create({ collectionId: collection.id, name: "New Request", method: "GET", url: "" });
      const reqs = await coreStore.requests.list(collection.id);
      set({ requests: reqs });
      expandedFolderIds.includes(collection.id) || toggleFolder(collection.id);
      useStore.getState().set({ request: { ...useStore.getState().request, id: req.id, name: req.name, method: "GET", url: "" } });
    } catch (e) { addToast("error", String(e)); }
    setMenuOpen(false);
  };

  return (
    <div className="mb-1">
      <div className="group flex items-center gap-1.5 px-3 py-1.5 hover:bg-[var(--surface-2)] cursor-pointer rounded mx-1" onClick={() => toggleFolder(collection.id)}>
        {expanded ? <ChevronDown size={13} className="text-[var(--text-3)]" /> : <ChevronRight size={13} className="text-[var(--text-3)]" />}
        <span className="flex-1 text-xs font-semibold text-[var(--text-1)] truncate">{collection.name}</span>
        <span className="text-2xs text-[var(--text-3)]">{colRequests.length + (folders.filter((f) => f.collectionId === collection.id).length > 0 ? 1 : 0)}</span>
        <div className="opacity-0 group-hover:opacity-100 relative ml-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setMenuOpen((v) => !v)} className="p-0.5 rounded hover:bg-[var(--border)] text-[var(--text-3)]">
            <MoreHorizontal size={13} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-[var(--border)] rounded-lg shadow-lg py-1 min-w-[160px]">
              <MenuItem icon={<Plus size={12} />} label="New Request" onClick={addRequest} />
              <MenuItem icon={<Edit3 size={12} />} label="Rename" onClick={() => setMenuOpen(false)} />
              <MenuItem icon={<Download size={12} />} label="Export" onClick={() => setMenuOpen(false)} />
              <div className="h-px bg-[var(--border)] my-1" />
              <MenuItem icon={<Trash2 size={12} />} label="Delete" onClick={del} danger />
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
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--surface-2)] ${danger ? "text-[var(--danger)]" : "text-[var(--text-1)]"}`}
    >
      {icon} {label}
    </button>
  );
}

export function CollectionTree() {
  const { collections, addToast, set } = useStore();

  const newCollection = async () => {
    const name = prompt("Collection name:");
    if (!name?.trim()) return;
    try {
      await coreStore.collections.create({ name: name.trim() });
      const cols = await coreStore.collections.list();
      set({ collections: cols });
    } catch (e) { addToast("error", String(e)); }
  };

  if (!collections.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-4 text-center">
        <p className="text-xs text-[var(--text-3)]">No collections yet</p>
        <button onClick={newCollection} className="btn text-xs">
          <Plus size={13} /> New Collection
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider">Collections</span>
        <button onClick={newCollection} className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5 rounded hover:bg-[var(--surface-2)]">
          <Plus size={13} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {collections.map((c) => <CollectionNode key={c.id} collection={c} />)}
      </div>
    </div>
  );
}
