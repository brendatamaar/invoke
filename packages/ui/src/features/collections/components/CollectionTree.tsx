import { useRef, useState } from "react";
import { Plus, Upload } from "lucide-react";
import { useStore, coreStore } from "../../../store";
import { useCollections } from "../../../hooks/useDb";
import { PromptModal } from "../../../components/shared/PromptModal";
import { CollectionNode } from "./CollectionNode";
import { COLLECTION_IMPORT_OPTIONS, useCollectionImport } from "../useCollectionImport";

export function CollectionTree() {
  const { addToast } = useStore();
  const collections = useCollections();
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newColModal, setNewColModal] = useState(false);
  const { accept, curlModal, handleFileImport, importCurl, setCurlModal, triggerImport } =
    useCollectionImport(fileInputRef);

  const newCollection = async (name: string) => {
    setNewColModal(false);
    try {
      await coreStore.createCollection(name);
    } catch (e) {
      addToast("error", String(e));
    }
  };

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
          <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
            Collections
          </span>
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                type="button"
                onClick={() => setImportMenuOpen((v) => !v)}
                className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5 rounded hover:bg-[var(--surface-2)]"
                title="Import"
              >
                <Upload size={13} />
              </button>
              {importMenuOpen && (
                <div className="absolute right-0 top-full mt-1 z-20 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-2)] py-1 min-w-[180px]">
                  {COLLECTION_IMPORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => {
                        setImportMenuOpen(false);
                        triggerImport(opt.type);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--surface-2)] text-[var(--text-1)] text-left"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setNewColModal(true)}
              className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5 rounded hover:bg-[var(--surface-2)]"
              title="New collection"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={accept === ".yaml,.yml"}
          onChange={handleFileImport}
          aria-label="Import collection file"
        />

        {!collections.length ? (
          <div className="flex flex-col items-center flex-1 gap-3 p-4 text-center">
            <p className="text-xs text-[var(--text-3)]">No collections yet</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto py-1">
            {collections.map((c) => (
              <CollectionNode key={c.id} collection={c} />
            ))}
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
