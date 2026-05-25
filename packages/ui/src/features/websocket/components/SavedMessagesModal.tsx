import { ChevronDown, Plus, X } from "lucide-react";
import type { WsSavedMessage } from "@invoke/core";
import type { MsgTemplate, SavedMessageDraft } from "../types";
import { SavedMessageCard } from "./SavedMessageCard";
import { TemplateMenu } from "./TemplateMenu";

export function SavedMessagesModal({
  savedMessages,
  selectedSaved,
  expandedSaved,
  editDraft,
  showTemplates,
  onClose,
  onAdd,
  onAddTemplate,
  onSelectSaved,
  onExpandedSaved,
  onEditDraft,
  onUpdateSaved,
  onRemoveSaved,
  onLoad,
  onShowTemplates,
}: {
  savedMessages: WsSavedMessage[];
  selectedSaved: string | null;
  expandedSaved: string | null;
  editDraft: SavedMessageDraft | null;
  showTemplates: boolean;
  onClose: () => void;
  onAdd: () => void;
  onAddTemplate: (template: MsgTemplate) => void;
  onSelectSaved: (id: string | null) => void;
  onExpandedSaved: (id: string | null) => void;
  onEditDraft: (draft: SavedMessageDraft | null) => void;
  onUpdateSaved: (id: string, draft: SavedMessageDraft) => void;
  onRemoveSaved: (id: string) => void;
  onLoad: (message: WsSavedMessage) => void;
  onShowTemplates: (show: boolean) => void;
}) {
  const close = () => {
    onClose();
    onShowTemplates(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="flex flex-col max-h-[70vh] w-[480px]"
        style={{
          background: "var(--bg-2)",
          border: "1px solid var(--line-2)",
          borderRadius: "var(--r-3)",
          boxShadow: "var(--shadow-pop)",
        }}
      >
        <SavedMessagesHeader
          showTemplates={showTemplates}
          onAdd={onAdd}
          onClose={close}
          onAddTemplate={onAddTemplate}
          onShowTemplates={onShowTemplates}
        />

        <div
          className="flex-1 overflow-y-auto flex flex-col gap-2"
          style={{ padding: "12px 14px" }}
        >
          {savedMessages.map((msg) => (
            <SavedMessageCard
              key={msg.id}
              msg={msg}
              selected={selectedSaved === msg.id}
              expanded={expandedSaved === msg.id}
              editDraft={editDraft}
              onSelect={() =>
                onSelectSaved(selectedSaved === msg.id ? null : msg.id)
              }
              onExpand={() => {
                if (expandedSaved === msg.id) {
                  onExpandedSaved(null);
                  onEditDraft(null);
                } else {
                  onExpandedSaved(msg.id);
                  onEditDraft({
                    label: msg.label,
                    body: msg.body,
                    type: msg.type,
                    autoSend: msg.autoSend,
                  });
                }
              }}
              onDelete={() => {
                if (selectedSaved === msg.id) onSelectSaved(null);
                onRemoveSaved(msg.id);
              }}
              onEditDraft={onEditDraft}
              onDiscard={() => {
                onExpandedSaved(null);
                onEditDraft(null);
              }}
              onSave={() => {
                if (editDraft) onUpdateSaved(msg.id, editDraft);
                onExpandedSaved(null);
                onEditDraft(null);
              }}
            />
          ))}

          {savedMessages.length === 0 && (
            <p className="text-2xs text-[var(--text-3)] text-center mt-6">
              No saved messages yet
            </p>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-2 shrink-0"
          style={{
            padding: "10px 14px",
            borderTop: "1px solid var(--line-1)",
            background: "var(--bg-1)",
          }}
        >
          <button className="btn" onClick={close}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={!selectedSaved}
            onClick={() => {
              const msg = savedMessages.find((m) => m.id === selectedSaved);
              if (msg) onLoad(msg);
            }}
          >
            Load
          </button>
        </div>
      </div>
    </div>
  );
}

function SavedMessagesHeader({
  showTemplates,
  onAdd,
  onClose,
  onAddTemplate,
  onShowTemplates,
}: {
  showTemplates: boolean;
  onAdd: () => void;
  onClose: () => void;
  onAddTemplate: (template: MsgTemplate) => void;
  onShowTemplates: (show: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between shrink-0"
      style={{ padding: "10px 14px", borderBottom: "1px solid var(--line-1)" }}
    >
      <span
        style={{
          fontSize: "var(--t-base)",
          fontWeight: 600,
          color: "var(--fg-0)",
        }}
      >
        Saved Messages
      </span>
      <div className="flex items-center gap-1">
        <button onClick={onAdd} className="btn text-2xs px-2 gap-1">
          <Plus size={11} /> Add
        </button>
        <div className="relative">
          <button
            onClick={() => onShowTemplates(!showTemplates)}
            className="btn text-2xs px-2 gap-1"
          >
            From template <ChevronDown size={10} />
          </button>
          {showTemplates && <TemplateMenu onSelect={onAddTemplate} />}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded ml-1 text-[var(--fg-3)] hover:text-[var(--fg-0)]"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
