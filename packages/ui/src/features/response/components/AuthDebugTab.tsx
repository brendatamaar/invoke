import { useState } from "react";
import { KeyRound } from "lucide-react";
import { useStore } from "../../../store";
import { useCookies } from "../../../hooks/useDb";
import {
  AuthenticationSection,
  CookiesSection,
  RedirectsSection,
  TlsSection,
} from "./AuthDebugSections";

export function AuthDebugTab() {
  const { response, resolvedRequest } = useStore();
  const cookies = useCookies();
  const auth = resolvedRequest?.auth;
  const [showToken, setShowToken] = useState(false);

  const sentAuthHeader = findHeader(resolvedRequest?.headers, "authorization");
  const sentCookieHeader = findHeader(resolvedRequest?.headers, "cookie");
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
    return <AuthDebugEmptyState />;
  }

  return (
    <div className="flex flex-col gap-5 p-4 text-xs">
      <AuthenticationSection
        auth={auth}
        sentAuthHeader={sentAuthHeader}
        showToken={showToken}
        tokenExpired={tokenExpired}
        onToggleToken={() => setShowToken((value) => !value)}
      />
      <CookiesSection sentCookies={sentCookies} storedCount={cookies.length} />
      <RedirectsSection redirects={redirects} />
      <TlsSection tls={response?.tls} firstCertificate={firstCertificate} />
    </div>
  );
}

function findHeader(
  headers: { key: string; value: string }[] | undefined,
  key: string,
) {
  return headers?.find((h) => h.key.toLowerCase() === key)?.value ?? null;
}

function AuthDebugEmptyState() {
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
