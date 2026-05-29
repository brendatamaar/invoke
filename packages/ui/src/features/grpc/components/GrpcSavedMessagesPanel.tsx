import { useState } from "react";
import { BookmarkPlus, Trash2 } from "lucide-react";
import type { GrpcSavedMessage } from "@invoke/core";
import { useStore } from "../../../store";

export function GrpcSavedMessagesPanel() {
  const { grpcRequest, setGrpcRequest, addToast } = useStore();
  const saved = grpcRequest.savedMessages ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const saveCurrentBody = () => {
    const name = `Message ${saved.length + 1}`;
    const newMsg: GrpcSavedMessage = {
      id: crypto.randomUUID(),
      name,
      body: grpcRequest.body ?? "{}",
    };
    setGrpcRequest({ savedMessages: [...saved, newMsg] });
  };

  const remove = (id: string) =>
    setGrpcRequest({ savedMessages: saved.filter((m) => m.id !== id) });

  const load = (name: string, body: string) => {
    setGrpcRequest({ body });
    addToast("success", `"${name}" loaded to message`);
  };

  const rename = (id: string, name: string) => {
    setGrpcRequest({
      savedMessages: saved.map((m) => (m.id === id ? { ...m, name } : m)),
    });
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-3 py-1.5 border-b border-[var(--border)] flex items-center justify-between">
        <span className="text-2xs text-[var(--text-3)]">
          {saved.length} saved message{saved.length !== 1 ? "s" : ""}
        </span>
        <button
          type="button"
          onClick={saveCurrentBody}
          className="flex items-center gap-1 text-2xs text-[var(--accent)] hover:underline"
        >
          <BookmarkPlus size={11} /> Save current
        </button>
      </div>
      {saved.length === 0 && (
        <p className="p-3 text-2xs text-[var(--text-3)]">
          No saved messages. Compose a body and click "Save current" to create one.
        </p>
      )}
      {saved.map((msg) => (
        <div
          key={msg.id}
          className="border-b border-[var(--border)] px-3 py-2 flex flex-col gap-1 last:border-0"
        >
          <div className="flex items-center gap-1">
            {editingId === msg.id ? (
              <input
                aria-label="Rename saved message"
                className="input text-2xs py-0.5 flex-1"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => rename(msg.id, editName || msg.name)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") rename(msg.id, editName || msg.name);
                  if (e.key === "Escape") setEditingId(null);
                }}
              />
            ) : (
              <span
                className="text-2xs font-medium text-[var(--text-1)] flex-1 cursor-pointer hover:underline truncate"
                onDoubleClick={() => {
                  setEditingId(msg.id);
                  setEditName(msg.name);
                }}
                title="Double-click to rename"
              >
                {msg.name}
              </span>
            )}
            <button
              type="button"
              onClick={() => load(msg.name, msg.body)}
              className="text-2xs text-[var(--accent)] hover:underline shrink-0"
            >
              Use
            </button>
            <button
              type="button"
              onClick={() => remove(msg.id)}
              className="p-0.5 text-[var(--text-3)] hover:text-[var(--danger)] shrink-0"
            >
              <Trash2 size={10} />
            </button>
          </div>
          <pre className="text-2xs font-mono text-[var(--text-3)] truncate">
            {msg.body.slice(0, 80)}
            {msg.body.length > 80 ? "\u2026" : ""}
          </pre>
        </div>
      ))}
    </div>
  );
}
