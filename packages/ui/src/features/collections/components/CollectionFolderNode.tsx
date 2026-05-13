import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Play,
  Variable,
} from "lucide-react";
import type { Folder as FolderType } from "@invoke/core";
import { useStore, coreStore } from "../../../store";
import { PromptModal } from "../../../components/shared/PromptModal";
import { CollectionMenuItem } from "./CollectionMenuItem";
import { CollectionRequestNode } from "./CollectionRequestNode";

export function CollectionFolderNode({
  folder,
  collectionId,
}: {
  folder: FolderType;
  collectionId: string;
}) {
  const { expandedFolderIds, toggleFolder, requests, set, addToast } =
    useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [descModal, setDescModal] = useState(false);
  const expanded = expandedFolderIds.includes(folder.id);
  const folderRequests = requests.filter((r) => r.folderId === folder.id);

  const openVariableEditor = () => {
    setMenuOpen(false);
    set({
      variableEditor: {
        open: true,
        kind: "folder",
        id: folder.id,
        name: folder.name,
        variables: folder.variables ?? [],
      },
    });
  };

  const saveDescription = async (description: string) => {
    setDescModal(false);
    try {
      await coreStore.updateFolder({ ...folder, description });
      const folds = await coreStore.listFolders();
      set({ folders: folds });
    } catch (e) {
      addToast("error", String(e));
    }
  };

  return (
    <>
      <div>
        <div
          className="group flex items-center gap-1.5 px-3 py-1 hover:bg-[var(--surface-2)] cursor-pointer rounded mx-1 text-[var(--text-2)]"
          onClick={() => toggleFolder(folder.id)}
        >
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          {expanded ? <FolderOpen size={13} /> : <Folder size={13} />}
          <span
            className="flex-1 text-xs truncate"
            title={folder.description || undefined}
          >
            {folder.name}
          </span>
          {folder.description && (
            <span title={folder.description} className="shrink-0">
              <FileText size={11} className="text-[var(--text-3)]" />
            </span>
          )}
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
              <div className="absolute right-0 top-full mt-1 z-20 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-2)] py-1 min-w-[140px]">
                <CollectionMenuItem
                  icon={<Play size={12} />}
                  label="Run"
                  onClick={() => {
                    setMenuOpen(false);
                    set({
                      showCollectionRunner: true,
                      collectionRunnerTarget: {
                        type: "folder",
                        id: folder.id,
                        name: folder.name,
                      },
                    });
                  }}
                />
                <CollectionMenuItem
                  icon={<Variable size={12} />}
                  label="Variables"
                  onClick={openVariableEditor}
                />
                <CollectionMenuItem
                  icon={<FileText size={12} />}
                  label="Description"
                  onClick={() => {
                    setMenuOpen(false);
                    setDescModal(true);
                  }}
                />
              </div>
            )}
          </div>
        </div>
        {expanded && (
          <div className="ml-3">
            {folderRequests.map((r) => (
              <CollectionRequestNode
                key={r.id}
                request={r}
                collectionId={collectionId}
              />
            ))}
          </div>
        )}
      </div>

      <PromptModal
        open={descModal}
        title={`Description - ${folder.name}`}
        label="Description"
        defaultValue={folder.description ?? ""}
        placeholder="Describe this folder..."
        multiline
        confirmLabel="Save"
        allowEmpty
        onConfirm={saveDescription}
        onClose={() => setDescModal(false)}
      />
    </>
  );
}
