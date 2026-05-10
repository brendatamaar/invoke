import { useState } from "react";
import type { ReactNode } from "react";
import { useStore } from "../../../store";

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

  const Row = ({
    label,
    value,
    mono = true,
  }: {
    label: string;
    value: ReactNode;
    mono?: boolean;
  }) => (
    <div className="flex items-start gap-3 py-1.5 border-b border-[var(--border)] last:border-0">
      <span className="text-2xs text-[var(--text-3)] w-28 shrink-0 pt-0.5">
        {label}
      </span>
      <span
        className={`flex-1 text-xs break-all ${mono ? "font-mono" : ""} text-[var(--text-1)]`}
      >
        {value}
      </span>
    </div>
  );

  if (!resolvedRequest && !response) {
    return (
      <p className="p-4 text-xs text-[var(--text-3)]">
        Send a request to see auth debug info.
      </p>
    );
  }

  return (
    <div className="p-3 flex flex-col gap-4 text-xs">
      <section>
        <p className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">
          Authentication
        </p>
        <div className="rounded border border-[var(--border)]">
          {sentAuthHeader ? (
            <Row
              label="Authorization"
              value={
                <span className="flex items-center gap-1">
                  <span className={showToken ? "" : "blur-[3px] select-none"}>
                    {sentAuthHeader}
                  </span>
                  <button
                    onClick={() => setShowToken((v) => !v)}
                    className="shrink-0 text-[var(--text-3)] hover:text-[var(--text-1)] ml-1"
                  >
                    {showToken ? "hide" : "show"}
                  </button>
                </span>
              }
            />
          ) : (
            <div className="py-2 px-3 text-2xs text-[var(--text-3)]">
              No Authorization header sent
            </div>
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
                        <span className="text-red-500">
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
      </section>

      <section>
        <p className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">
          Cookies ({sentCookieHeader ? sentCookieHeader.split(";").length : 0}{" "}
          sent, {cookies.length} stored)
        </p>
        <div className="rounded border border-[var(--border)]">
          {sentCookieHeader ? (
            sentCookieHeader.split(";").map((pair, i) => {
              const [name, ...rest] = pair.trim().split("=");
              return (
                <Row
                  key={i}
                  label={name?.trim() ?? "?"}
                  value={rest.join("=") ?? ""}
                />
              );
            })
          ) : (
            <div className="py-2 px-3 text-2xs text-[var(--text-3)]">
              No cookies sent
            </div>
          )}
        </div>
      </section>

      {redirects.length > 0 && (
        <section>
          <p className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">
            Redirects ({redirects.length})
          </p>
          <div className="rounded border border-[var(--border)]">
            {redirects.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-1.5 px-3 border-b border-[var(--border)] last:border-0"
              >
                <span className="text-2xs font-mono text-[var(--text-3)] w-8">
                  {r.status}
                </span>
                <span className="flex-1 text-xs font-mono text-[var(--text-1)] truncate">
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
        </section>
      )}

      {response?.tls && (
        <section>
          <p className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">
            TLS
          </p>
          <div className="rounded border border-[var(--border)]">
            <Row label="Version" value={response.tls.version} />
            <Row label="Cipher" value={response.tls.cipherSuite} />
            {response.tls.certificates[0] && (
              <>
                <Row
                  label="Subject"
                  value={response.tls.certificates[0].subject}
                  mono={false}
                />
                <Row
                  label="Issuer"
                  value={response.tls.certificates[0].issuer}
                  mono={false}
                />
                <Row
                  label="Expires"
                  value={(() => {
                    const exp = new Date(
                      response.tls!.certificates[0].notAfter,
                    );
                    const soon =
                      exp.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;
                    return (
                      <span className={soon ? "text-amber-500" : ""}>
                        {exp.toLocaleDateString()}
                      </span>
                    );
                  })()}
                  mono={false}
                />
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
