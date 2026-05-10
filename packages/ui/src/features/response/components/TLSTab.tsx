import { useStore } from "../../../store";

export function TLSTab() {
  const { response } = useStore();
  const tls = (
    response as unknown as {
      tls?: {
        version?: string;
        cipher?: string;
        certificates?: {
          subject: string;
          issuer: string;
          validFrom: string;
          validTo: string;
        }[];
      };
    }
  )?.tls;
  if (!tls)
    return <p className="p-4 text-xs text-[var(--text-3)]">No TLS data</p>;
  return (
    <div className="p-4 flex flex-col gap-3">
      <Row label="Protocol" value={tls.version ?? "-"} />
      <Row label="Cipher" value={tls.cipher ?? "-"} />
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
          <Row label="Valid from" value={cert.validFrom} />
          <Row label="Valid to" value={cert.validTo} />
        </div>
      ))}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-xs text-[var(--text-3)] w-24 shrink-0">
        {label}
      </span>
      <span className="text-xs font-mono text-[var(--text-1)] break-all">
        {value}
      </span>
    </div>
  );
}
