import type { TlsClientConfig } from "@invoke/core";
import { FieldRow } from "../shared/FieldRow";
import { SectionTitle } from "../shared/SectionTitle";

export function TlsClientFields({
  tls,
  patchTlsClientConfig,
}: {
  tls: TlsClientConfig;
  patchTlsClientConfig: (patch: Partial<TlsClientConfig>) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-4">
      <SectionTitle
        title="TLS client certificate"
        description="Optional client certificate settings for this protocol."
      />
      <FieldRow label="CA certificate">
        <textarea
          rows={3}
          value={tls.caCertPem ?? ""}
          onChange={(e) =>
            patchTlsClientConfig({ caCertPem: e.currentTarget.value })
          }
          placeholder="-----BEGIN CERTIFICATE-----"
          className="input min-w-0 flex-1 resize-y font-mono text-2xs"
        />
      </FieldRow>
      <FieldRow label="Client certificate">
        <textarea
          rows={3}
          value={tls.clientCertPem ?? ""}
          onChange={(e) =>
            patchTlsClientConfig({ clientCertPem: e.currentTarget.value })
          }
          placeholder="-----BEGIN CERTIFICATE-----"
          className="input min-w-0 flex-1 resize-y font-mono text-2xs"
        />
      </FieldRow>
      <FieldRow label="Client key">
        <textarea
          rows={3}
          value={tls.clientKeyPem ?? ""}
          onChange={(e) =>
            patchTlsClientConfig({ clientKeyPem: e.currentTarget.value })
          }
          placeholder="-----BEGIN PRIVATE KEY-----"
          className="input min-w-0 flex-1 resize-y font-mono text-2xs"
        />
      </FieldRow>
      <FieldRow label="Server name">
        <input
          type="text"
          value={tls.serverName ?? ""}
          onChange={(e) =>
            patchTlsClientConfig({ serverName: e.currentTarget.value })
          }
          placeholder="override.example.com"
          className="input min-w-0 flex-1 text-xs"
        />
      </FieldRow>
    </div>
  );
}
