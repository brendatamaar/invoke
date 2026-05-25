export function CertificateExpiry({ notAfter }: { notAfter: string }) {
  const expiresAt = new Date(notAfter);
  const soon = expiresAt.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;
  return (
    <span className={soon ? "text-[var(--warn)]" : ""}>
      {expiresAt.toLocaleDateString()}
    </span>
  );
}
