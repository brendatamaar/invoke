import { useState } from "react";
import { Copy, MoreHorizontal, Trash2 } from "lucide-react";
import type { SavedRequest } from "@invoke/core";
import { useStore, coreStore } from "../../../store";
import { MethodBadge } from "../../../components/shared/MethodBadge";
import { ConfirmModal } from "../../../components/shared/ConfirmModal";
import { CollectionMenuItem } from "./CollectionMenuItem";

export function CollectionRequestNode({
  request,
  collectionId,
}: {
  request: SavedRequest;
  collectionId: string;
}) {
  const { set, setRequest, addToast } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const open = () => {
    const draft = request.request as Parameters<typeof setRequest>[0];
    setRequest({
      ...draft,
      id: request.id,
      name: request.name,
      collectionId: request.collectionId,
      folderId: request.folderId,
    });
  };

  const del = async () => {
    setConfirmDelete(false);
    try {
      await coreStore.deleteRequest(request.id);
      const reqs = await coreStore.listRequests(collectionId);
      set({ requests: reqs });
      addToast("success", "Request deleted");
    } catch (e) {
      addToast("error", String(e));
    }
  };

  return (
    <>
      <div
        className="group relative flex items-center gap-1.5 px-3 py-1 hover:bg-[var(--surface-2)] cursor-pointer rounded mx-1"
        onClick={open}
      >
        <MethodBadge
          method={(request.request as { method?: string })?.method ?? "GET"}
        />
        <span className="flex-1 text-xs text-[var(--text-1)] truncate">
          {request.name ||
            (request.request as { url?: string })?.url ||
            "Untitled"}
        </span>
        <div
          className="opacity-0 group-hover:opacity-100 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-0.5 rounded hover:bg-[var(--border)] text-[var(--text-3)]"
          >
            <MoreHorizontal size={13} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 z-20 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-2)] py-1 min-w-[140px]"
              onClick={(e) => e.stopPropagation()}
            >
              <CollectionMenuItem
                icon={<Copy size={12} />}
                label="Duplicate"
                onClick={() => setMenuOpen(false)}
              />
              <CollectionMenuItem
                icon={<Trash2 size={12} />}
                label="Delete"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmDelete(true);
                }}
                danger
              />
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
