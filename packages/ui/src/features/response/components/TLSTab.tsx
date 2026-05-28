import { useStore } from "../../../store";
import type { TlsInfo } from "@invoke/core";

export function TLSTab() {
  const { response } = useStore();
  const tls = (response as any)?.tls as TlsInfo | undefined;
  const httpVersion = response?.headers?.find(
    (h) => h.key?.toLowerCase() === "x-invoke-http-version",
  )?.value;

  if (!tls && !httpVersion) return <p className="p-4 text-xs text-[var(--text-3)]">No TLS data</p>;

  return (
    <div className="p-4 flex flex-col gap-3">
      {httpVersion && <Row label="HTTP version" value={httpVersion} />}
      {tls && (
        <>
          <Row label="Protocol" value={tls.version ?? "-"} />
          <Row label="Cipher suite" value={tls.cipherSuite ?? "-"} />
          {tls.certificates?.map((cert, i) => (
            <div
              key={i}
              className="border border-[var(--border)] rounded p-3 flex flex-col gap-1.5"
            >
              <span className="text-2xs font-semibold text-[var(--text-3)] uppercase">
                Certificate {i + 1}
              </span>
              <Row label="Subject" value={cert.subject} />
              <Row label="Issuer" value={cert.issuer} />
              <Row label="Valid from" value={cert.notBefore} />
              <Row label="Valid to" value={cert.notAfter} />
              {cert.dnsNames?.length > 0 && (
                <Row label="DNS names" value={cert.dnsNames.join(", ")} />
              )}
              <Row label="Serial" value={cert.serialNumber} />
              {cert.sha256Fingerprint && <Row label="SHA-256" value={cert.sha256Fingerprint} />}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-xs text-[var(--text-3)] w-28 shrink-0">{label}</span>
      <span className="text-xs font-mono text-[var(--text-1)] break-all">{value}</span>
    </div>
  );
}
