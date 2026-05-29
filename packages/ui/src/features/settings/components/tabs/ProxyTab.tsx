import type { RequestOptions, RequestProtocol } from "@invoke/core";
import { Select } from "../../../../components/shared/Select";
import { PROTOCOL_LABELS } from "../../constants";
import { FieldRow } from "../shared/FieldRow";
import { ProtocolPills } from "../shared/ProtocolPills";
import { SectionTitle } from "../shared/SectionTitle";

type ProxyConfig = NonNullable<RequestOptions["proxy"]>;

export function ProxyTab({
  editingProtocol,
  activeProxy,
  setEditingProtocol,
  ensureProxy,
  removeProxy,
  patchProxy,
}: {
  editingProtocol: RequestProtocol;
  activeProxy?: ProxyConfig;
  setEditingProtocol: (protocol: RequestProtocol) => void;
  ensureProxy: () => void;
  removeProxy: () => void;
  patchProxy: (patch: Partial<ProxyConfig>) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <SectionTitle
          title={`${PROTOCOL_LABELS[editingProtocol]} proxy`}
          description="Proxy policy for all requests in this protocol."
        />
        <button type="button" onClick={activeProxy ? removeProxy : ensureProxy} className="btn text-xs">
          {activeProxy ? "Remove" : "Configure"}
        </button>
      </div>

      <ProtocolPills editingProtocol={editingProtocol} onChange={setEditingProtocol} />

      {activeProxy ? (
        <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-4">
          <FieldRow label="Type">
            <Select
              value={activeProxy.type}
              onChange={(e) => patchProxy({ type: e.target.value as "http" | "socks5" })}
              size="xs"
              wrapperClassName="w-32"
            >
              <option value="http">HTTP</option>
              <option value="socks5">SOCKS5</option>
            </Select>
          </FieldRow>
          <FieldRow label="URL">
            <input
              type="text"
              value={activeProxy.url}
              onChange={(e) => patchProxy({ url: e.currentTarget.value })}
              placeholder="http://127.0.0.1:8080"
              aria-label="Proxy URL"
              className="input min-w-0 flex-1 text-xs"
            />
          </FieldRow>
          <FieldRow label="Username">
            <input
              type="text"
              value={activeProxy.username ?? ""}
              onChange={(e) => patchProxy({ username: e.currentTarget.value })}
              aria-label="Proxy username"
              className="input min-w-0 flex-1 text-xs"
            />
          </FieldRow>
          <FieldRow label="Password">
            <input
              type="password"
              value={activeProxy.password ?? ""}
              onChange={(e) => patchProxy({ password: e.currentTarget.value })}
              aria-label="Proxy password"
              className="input min-w-0 flex-1 text-xs"
            />
          </FieldRow>
        </div>
      ) : (
        <div className="border border-dashed border-[var(--border)] bg-[var(--bg-2)] px-4 py-5 text-center text-xs text-[var(--text-3)]">
          No proxy configured for {PROTOCOL_LABELS[editingProtocol]}.
        </div>
      )}
    </div>
  );
}
