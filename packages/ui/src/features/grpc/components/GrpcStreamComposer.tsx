import { useState } from "react";
import { useStore } from "../../../store";
import { grpcStreamSend } from "../api";
import { GrpcStreamMessageEditor } from "./GrpcStreamMessageEditor";

export function GrpcStreamComposer({ streamId }: { streamId: string }) {
  const { set, grpcRequest, setGrpcRequest } = useStore();
  const [sending, setSending] = useState(false);

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

  return (
    <GrpcStreamMessageEditor
      body={grpcRequest.body ?? "{}"}
      sending={sending}
      streamId={streamId}
      onBodyChange={(body) => setGrpcRequest({ body })}
      onSend={send}
    />
  );
}
