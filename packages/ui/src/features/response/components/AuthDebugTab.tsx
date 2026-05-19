import { useState } from "react";
import type { ReactNode } from "react";
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
import { useStore } from "../../../store";

function Section({
  title,
  icon,
  meta,
  children,
}: {
  title: string;
  icon: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-2)]">
          {icon}
        </span>
        <span className="text-xs font-semibold text-[var(--text-1)]">
          {title}
        </span>
        {meta && <div className="ml-auto">{meta}</div>}
      </div>
      {children}
    </section>
  );
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "danger" | "accent";
}) {
  const tones = {
    neutral: "border-[var(--border)] bg-[var(--surface)] text-[var(--text-3)]",
    ok: "border-[var(--ok)] bg-[var(--ok-bg)] text-[var(--ok)]",
    warn: "border-[var(--warn)] bg-[var(--warn-bg)] text-[var(--warn)]",
    danger: "border-[var(--danger)] bg-[var(--danger-bg)] text-[var(--danger)]",
    accent:
      "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-2xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function EmptyState({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 rounded border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-xs text-[var(--text-3)]">
      <span className="text-[var(--text-3)]">{icon}</span>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(7rem,10rem)_minmax(0,1fr)] gap-3 border-b border-[var(--border)] px-3 py-2.5 last:border-0">
      <span className="text-2xs font-medium text-[var(--text-3)]">{label}</span>
      <span
        className={`min-w-0 break-all text-xs text-[var(--text-1)] ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

export function AuthDebugTab() {
  const { response, resolvedRequest, cookies } = useStore();
  const auth = resolvedRequest?.auth;
  const [showToken, setShowToken] = useState(false);

  const sentAuthHeader = (() => {
    if (!resolvedRequest) return null;
    const h = resolvedRequest.headers?.find(
      (h) => h.key.toLowerCase() === "authorization",
    );
    return h?.value ?? null;
  })();

  const sentCookieHeader = (() => {
    if (!resolvedRequest) return null;
    const h = resolvedRequest.headers?.find(
      (h) => h.key.toLowerCase() === "cookie",
    );
    return h?.value ?? null;
  })();

  const redirects = response?.redirects ?? [];
  const sentCookies = sentCookieHeader
    ? sentCookieHeader
        .split(";")
        .map((pair) => pair.trim())
        .filter(Boolean)
    : [];
  const firstCertificate = response?.tls?.certificates[0];
  const tokenExpiresAt =
    auth?.type === "oauth2" && auth.flow === "authorization_code"
      ? auth.tokenExpiresAt
      : undefined;
  const tokenExpired =
    typeof tokenExpiresAt === "number" ? tokenExpiresAt < Date.now() : false;

  if (!resolvedRequest && !response) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-8 py-12 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded border border-[var(--border)] bg-[var(--surface-2)]">
          <KeyRound size={18} className="text-[var(--text-3)]" />
        </div>
        <p className="text-sm font-medium text-[var(--text-2)]">
          Send a request to inspect auth
        </p>
        <p className="max-w-sm text-xs text-[var(--text-3)]">
          Authorization headers, cookies, redirects, and TLS details appear here
          after execution.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-4 text-xs">
      <Section
        title="Authentication"
        icon={<KeyRound size={13} />}
        meta={
          sentAuthHeader ? (
            <Badge tone={tokenExpired ? "danger" : "ok"}>
              {tokenExpired ? "Expired" : "Sent"}
            </Badge>
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
                  <span
                    className={`min-w-0 flex-1 ${showToken ? "" : "select-none blur-[3px]"}`}
                  >
                    {sentAuthHeader}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowToken((v) => !v)}
                    className="mt-[-2px] shrink-0 rounded p-1 text-[var(--text-3)] hover:bg-[var(--surface)] hover:text-[var(--text-1)]"
                    title={showToken ? "Hide token" : "Reveal token"}
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
                          Expired (
                          {new Date(auth.tokenExpiresAt).toLocaleString()})
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

      <Section
        title="Cookies"
        icon={<Cookie size={13} />}
        meta={
          <div className="flex items-center gap-1.5">
            <Badge tone={sentCookies.length > 0 ? "accent" : "neutral"}>
              {sentCookies.length} sent
            </Badge>
            <Badge>{cookies.length} stored</Badge>
          </div>
        }
      >
        <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-2)]">
          {sentCookies.length > 0 ? (
            sentCookies.map((pair, i) => {
              const [name, ...rest] = pair.split("=");
              return (
                <Row
                  key={i}
                  label={name?.trim() ?? "?"}
                  value={rest.join("=") ?? ""}
                />
              );
            })
          ) : (
            <EmptyState icon={<Cookie size={14} />}>
              No Cookie header was sent with this request.
            </EmptyState>
          )}
        </div>
      </Section>

      {redirects.length > 0 && (
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
                <span className="font-mono text-2xs text-[var(--text-3)]">
                  {r.status}
                </span>
                <ArrowRight size={12} className="text-[var(--text-3)]" />
                <span className="min-w-0 truncate font-mono text-xs text-[var(--text-1)]">
                  {r.url}
                </span>
                {r.timing && (
                  <span className="text-2xs text-[var(--text-3)]">
                    {r.timing.totalMs}ms
                  </span>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {response?.tls && (
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
            <Row label="Version" value={response.tls.version} />
            <Row label="Cipher" value={response.tls.cipherSuite} />
            {firstCertificate && (
              <>
                <Row
                  label="Subject"
                  value={firstCertificate.subject}
                  mono={false}
                />
                <Row
                  label="Issuer"
                  value={firstCertificate.issuer}
                  mono={false}
                />
                <Row
                  label="Expires"
                  value={(() => {
                    const exp = new Date(firstCertificate.notAfter);
                    const soon =
                      exp.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;
                    return (
                      <span className={soon ? "text-[var(--warn)]" : ""}>
                        {exp.toLocaleDateString()}
                      </span>
                    );
                  })()}
                  mono={false}
                />
              </>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}
