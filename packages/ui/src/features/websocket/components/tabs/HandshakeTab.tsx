import { useStore } from "../../../../store";

export function HandshakeTab() {
  const { wsSessions, activeWsSessionId } = useStore();
  const activeSession = wsSessions.find((s) => s.id === activeWsSessionId) ?? wsSessions[0];

  const handshakeEntry = activeSession?.log.find(
    (e) => e.direction === "system" && e.type === "handshake",
  );

  if (!handshakeEntry) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-2xs text-[var(--text-3)]">
          {activeSession?.state === "connected"
            ? "No handshake headers captured"
            : "Connect to see handshake headers"}
        </p>
      </div>
    );
  }

  let headers: Record<string, string> = {};
  try {
    headers = JSON.parse(handshakeEntry.body) as Record<string, string>;
  } catch {
    /* malformed body */
  }

  const entries = Object.entries(headers);

  return (
    <div className="flex-1 overflow-y-auto p-2">
      <table className="w-full text-2xs border-collapse">
        <thead>
          <tr className="text-[var(--text-3)] border-b border-[var(--border)]">
            <th className="text-left pb-1.5 pr-6 font-medium w-1/3">Header</th>
            <th className="text-left pb-1.5 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key} className="border-b border-[var(--border)] last:border-0">
              <td className="py-1 pr-6 font-mono text-[var(--text-2)] whitespace-nowrap">{key}</td>
              <td className="py-1 font-mono text-[var(--text-1)] break-all">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
