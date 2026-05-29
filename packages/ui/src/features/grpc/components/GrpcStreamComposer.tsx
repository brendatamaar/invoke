import { useState } from "react";
import { BookmarkPlus, BookOpen, Send, X } from "lucide-react";
import type { GrpcSavedMessage } from "@invoke/core";
import { useStore } from "../../../store";
import { grpcStreamSend } from "../api";
import { CodeEditor } from "../../../components/editors/CodeEditor";

export function GrpcStreamComposer({ streamId }: { streamId: string }) {
  const { set, grpcRequest, setGrpcRequest, addToast } = useStore();
  const [sending, setSending] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const saved = grpcRequest.savedMessages ?? [];

  const send = async () => {
    const body = grpcRequest.body ?? "{}";
    setSending(true);
    try {
      const res = await grpcStreamSend(streamId, body);
      if (res.error) {
        set({ grpcStatus: `Send error: ${res.error}` });
      } else {
        set((state) => ({
          grpcStreamSentMessages: [...state.grpcStreamSentMessages, body],
        }));
      }
    } finally {
      setSending(false);
    }
  };

  const saveCurrentBody = () => {
    const body = grpcRequest.body ?? "{}";
    const name = `Message ${saved.length + 1}`;
    const newMsg: GrpcSavedMessage = {
      id: crypto.randomUUID(),
      name,
      body,
    };
    setGrpcRequest({ savedMessages: [...saved, newMsg] });
    addToast("success", `Saved as "${name}"`);
  };

  const loadSaved = (msg: GrpcSavedMessage) => {
    setGrpcRequest({ body: msg.body });
    setShowSaved(false);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 relative">
      {showSaved && (
        <div className="absolute top-full left-0 right-0 z-10 border-x border-b border-[var(--border)] bg-[var(--surface-1)] shadow-lg max-h-48 overflow-y-auto">
          <div className="px-3 py-1.5 border-b border-[var(--border)] flex items-center justify-between sticky top-0 bg-[var(--surface-2)]">
            <span className="text-2xs font-medium text-[var(--text-2)]">Saved messages</span>
            <button
              type="button"
              onClick={() => setShowSaved(false)}
              className="p-0.5 text-[var(--text-3)] hover:text-[var(--text-1)]"
            >
              <X size={11} />
            </button>
          </div>
          {saved.length === 0 ? (
            <p className="p-3 text-2xs text-[var(--text-3)]">No saved messages yet.</p>
          ) : (
            saved.map((msg) => (
              <button
                key={msg.id}
                type="button"
                onClick={() => loadSaved(msg)}
                className="w-full text-left px-3 py-2 border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] flex flex-col gap-0.5"
              >
                <span className="text-2xs font-medium text-[var(--text-1)]">{msg.name}</span>
                <span className="text-2xs font-mono text-[var(--text-3)] truncate">
                  {msg.body.slice(0, 60)}
                  {msg.body.length > 60 ? "…" : ""}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[var(--border)] bg-[var(--surface-2)]">
        <button
          type="button"
          onClick={saveCurrentBody}
          className="p-0.5 text-[var(--text-3)] hover:text-[var(--accent)]"
          title="Save current body"
        >
          <BookmarkPlus size={12} />
        </button>
        <button
          type="button"
          onClick={() => setShowSaved((v) => !v)}
          className={`flex items-center gap-0.5 p-0.5 ${showSaved ? "text-[var(--accent)]" : "text-[var(--text-3)] hover:text-[var(--accent)]"}`}
          title="Load saved message"
        >
          <BookOpen size={12} />
          {saved.length > 0 && <span className="text-2xs">{saved.length}</span>}
        </button>

        <span className="ml-auto text-2xs text-[var(--text-3)] select-none mr-1">Ctrl+Enter</span>
        <button
          type="button"
          className="btn btn-primary text-2xs flex items-center gap-1 px-2 py-1 shrink-0"
          onClick={() => void send()}
          disabled={sending || !streamId}
          title="Send (Ctrl+Enter)"
        >
          <Send size={11} />
          {sending ? "Sending…" : "Send"}
        </button>
      </div>

      <div
        className="flex-1 min-h-0"
        role="application"
        aria-label="Stream message composer"
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            if (!sending && streamId) void send();
          }
        }}
      >
        <CodeEditor
          value={grpcRequest.body ?? "{}"}
          onChange={(body) => setGrpcRequest({ body })}
          lang="json"
          minHeight="0px"
        />
      </div>
    </div>
  );
}
