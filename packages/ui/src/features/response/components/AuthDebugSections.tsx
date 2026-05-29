import { memo, useMemo } from "react";
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

const AUTH_ICON = <KeyRound size={13} />;
const COOKIE_ICON = <Cookie size={13} />;
const ROUTE_ICON = <Route size={13} />;
const LOCK_ICON = <LockKeyhole size={13} />;

function TokenExpiryRow({ tokenExpiresAt }: { tokenExpiresAt?: number }) {
  if (!tokenExpiresAt) return <Row label="Token expires" value="Unknown" mono={false} />;
  const now = Date.now();
  const expired = tokenExpiresAt < now;
  const value = expired
    ? <span className="text-[var(--danger)]">Expired ({new Date(tokenExpiresAt).toLocaleString()})</span>
    : new Date(tokenExpiresAt).toLocaleString();
  return <Row label="Token expires" value={value} mono={false} />;
}

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
  const authMeta = useMemo(() => sentAuthHeader ? (
    <Badge tone={tokenExpired ? "danger" : "ok"}>{tokenExpired ? "Expired" : "Sent"}</Badge>
  ) : (
    <Badge>No header</Badge>
  ), [sentAuthHeader, tokenExpired]);
  return (
    <Section
      title="Authentication"
      icon={AUTH_ICON}
      meta={authMeta}
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
              <TokenExpiryRow tokenExpiresAt={auth.tokenExpiresAt} />
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
  const cookiesMeta = useMemo(() => (
    <div className="flex items-center gap-1.5">
      <Badge tone={sentCookies.length > 0 ? "accent" : "neutral"}>{sentCookies.length} sent</Badge>
      <Badge>{storedCount} stored</Badge>
    </div>
  ), [sentCookies.length, storedCount]);
  return (
    <Section
      title="Cookies"
      icon={COOKIE_ICON}
      meta={cookiesMeta}
    >
      <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-2)]">
        {sentCookies.length > 0 ? (
          sentCookies.map((pair) => {
            const [name, ...rest] = pair.split("=");
            return <Row key={pair} label={name?.trim() ?? "?"} value={rest.join("=") ?? ""} />;
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

const RedirectsMeta = memo(function RedirectsMeta({ count }: { count: number }) {
  return <Badge tone="accent">{count} hops</Badge>;
});

export function RedirectsSection({ redirects }: { redirects: any[] }) {
  const redirectsMeta = useMemo(() => <RedirectsMeta count={redirects.length} />, [redirects.length]);
  return redirects.length === 0 ? null : (
    <Section
      title="Redirects"
      icon={ROUTE_ICON}
      meta={redirectsMeta}
    >
      <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-2)]">
        {redirects.map((r) => (
          <div
            key={`${r.status}-${r.url}`}
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
  const tlsMeta = useMemo(() => firstCertificate ? (
    <Badge tone="ok"><ShieldCheck size={10} />Certificate</Badge>
  ) : (
    <Badge>Session</Badge>
  ), [firstCertificate]);
  if (!tls) return null;
  return (
    <Section
      title="TLS"
      icon={LOCK_ICON}
      meta={tlsMeta}
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
