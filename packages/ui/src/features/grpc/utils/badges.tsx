export function streamBadge(method: {
  serverStreaming?: boolean;
  clientStreaming?: boolean;
}) {
  if (method.serverStreaming && method.clientStreaming) {
    return (
      <span className="text-2xs px-1 rounded bg-[rgba(200,156,214,0.1)] text-[var(--method-patch)]">
        bidi
      </span>
    );
  }

  if (method.serverStreaming) {
    return (
      <span className="text-2xs px-1 rounded bg-[var(--info-bg)] text-[var(--info)]">
        server-stream
      </span>
    );
  }

  if (method.clientStreaming) {
    return (
      <span className="text-2xs px-1 rounded bg-[var(--warn-bg)] text-[var(--warn)]">
        client-stream
      </span>
    );
  }

  return null;
}
