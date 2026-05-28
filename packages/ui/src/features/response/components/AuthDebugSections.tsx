import {
  ArrowRight,
  Cookie,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Route,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { CertificateExpiry } from "./auth-debug/CertificateExpiry";
import { Badge, EmptyState, Row, Section } from "./AuthDebugShared";

export function AuthenticationSection({
  auth,
  sentAuthHeader,
  showToken,
  tokenExpired,
  onToggleToken,
}: {
  auth: any;
  sentAuthHeader: string | null;
  showToken: boolean;
  tokenExpired: boolean;
  onToggleToken: () => void;
}) {
  return (
    <Section
      title="Authentication"
      icon={<KeyRound size={13} />}
      meta={
        sentAuthHeader ? (
          <Badge tone={tokenExpired ? "danger" : "ok"}>{tokenExpired ? "Expired" : "Sent"}</Badge>
        ) : (
          <Badge>No header</Badge>
        )
      }
    >
      <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-2)]">
        {sentAuthHeader ? (
          <Row
            label="Authorization"
            value={
              <span className="flex min-w-0 items-start gap-2">
                <span className={`min-w-0 flex-1 ${showToken ? "" : "select-none blur-[3px]"}`}>
                  {sentAuthHeader}
                </span>
                <button
                  type="button"
                  onClick={onToggleToken}
                  className="mt-[-2px] shrink-0 rounded p-1 text-[var(--text-3)] hover:bg-[var(--surface)] hover:text-[var(--text-1)]"
                >
                  {showToken ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              </span>
            }
          />
        ) : (
          <EmptyState icon={<ShieldOff size={14} />}>
            No Authorization header was sent with this request.
          </EmptyState>
        )}
        {auth?.type === "oauth2" && auth.flow === "authorization_code" && (
          <>
            <Row label="OAuth2 flow" value="authorization_code" />
            {auth.accessToken && (
              <Row
                label="Token expires"
                value={
                  auth.tokenExpiresAt ? (
                    auth.tokenExpiresAt < Date.now() ? (
                      <span className="text-[var(--danger)]">
                        Expired ({new Date(auth.tokenExpiresAt).toLocaleString()})
                      </span>
                    ) : (
                      new Date(auth.tokenExpiresAt).toLocaleString()
                    )
                  ) : (
                    "Unknown"
                  )
                }
                mono={false}
              />
            )}
          </>
        )}
      </div>
    </Section>
  );
}

export function CookiesSection({
  sentCookies,
  storedCount,
}: {
  sentCookies: string[];
  storedCount: number;
}) {
  return (
    <Section
      title="Cookies"
      icon={<Cookie size={13} />}
      meta={
        <div className="flex items-center gap-1.5">
          <Badge tone={sentCookies.length > 0 ? "accent" : "neutral"}>
            {sentCookies.length} sent
          </Badge>
          <Badge>{storedCount} stored</Badge>
        </div>
      }
    >
      <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-2)]">
        {sentCookies.length > 0 ? (
          sentCookies.map((pair, i) => {
            const [name, ...rest] = pair.split("=");
            return <Row key={i} label={name?.trim() ?? "?"} value={rest.join("=") ?? ""} />;
          })
        ) : (
          <EmptyState icon={<Cookie size={14} />}>
            No Cookie header was sent with this request.
          </EmptyState>
        )}
      </div>
    </Section>
  );
}

export function RedirectsSection({ redirects }: { redirects: any[] }) {
  if (redirects.length === 0) return null;
  return (
    <Section
      title="Redirects"
      icon={<Route size={13} />}
      meta={<Badge tone="accent">{redirects.length} hops</Badge>}
    >
      <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-2)]">
        {redirects.map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-[2.5rem_auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-[var(--border)] px-3 py-2.5 last:border-0"
          >
            <span className="font-mono text-2xs text-[var(--text-3)]">{r.status}</span>
            <ArrowRight size={12} className="text-[var(--text-3)]" />
            <span className="min-w-0 truncate font-mono text-xs text-[var(--text-1)]">{r.url}</span>
            {r.timing && (
              <span className="text-2xs text-[var(--text-3)]">{r.timing.totalMs}ms</span>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

export function TlsSection({ tls, firstCertificate }: { tls: any; firstCertificate: any }) {
  if (!tls) return null;
  return (
    <Section
      title="TLS"
      icon={<LockKeyhole size={13} />}
      meta={
        firstCertificate ? (
          <Badge tone="ok">
            <ShieldCheck size={10} />
            Certificate
          </Badge>
        ) : (
          <Badge>Session</Badge>
        )
      }
    >
      <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-2)]">
        <Row label="Version" value={tls.version} />
        <Row label="Cipher" value={tls.cipherSuite} />
        {firstCertificate && (
          <>
            <Row label="Subject" value={firstCertificate.subject} mono={false} />
            <Row label="Issuer" value={firstCertificate.issuer} mono={false} />
            <Row
              label="Expires"
              value={<CertificateExpiry notAfter={firstCertificate.notAfter} />}
              mono={false}
            />
          </>
        )}
      </div>
    </Section>
  );
}
