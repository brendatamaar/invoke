import { Send } from "lucide-react";
import { CodeEditor } from "../../../components/editors/CodeEditor";

export function GrpcStreamMessageEditor({
  body,
  sending,
  streamId,
  onBodyChange,
  onSend,
}: {
  body: string;
  sending: boolean;
  streamId: string;
  onBodyChange: (body: string) => void;
  onSend: () => void;
}) {
  return (
    <div className="border-t border-[var(--border)] flex items-center gap-2 px-2 py-1.5">
      <div
        className="flex-1 min-h-[56px]"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            if (!sending && streamId) onSend();
          }
        }}
      >
        <CodeEditor value={body} onChange={onBodyChange} lang="json" minHeight="56px" />
      </div>
      <button
        className="btn-primary text-2xs flex items-center gap-1 px-2 py-1.5 shrink-0"
        onClick={onSend}
        disabled={sending || !streamId}
        title="Send (Enter)"
      >
        <Send size={11} />
        Send
      </button>
    </div>
  );
}
