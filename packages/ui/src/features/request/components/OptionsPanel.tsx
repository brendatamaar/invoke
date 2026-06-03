import { useStore } from "../../../store";
import type { HttpVersion, RequestDraft, RetryPolicy } from "@invoke/core";
import { Select } from "../../../components/shared/Select";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <label className="w-36 shrink-0 text-xs text-[var(--text-2)]">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="pt-1 text-2xs font-semibold uppercase tracking-wide text-[var(--text-3)]">
      {children}
    </p>
  );
}

export function OptionsPanel() {
  const { request, setRequest, set } = useStore();
  const browserMode = useStore((s) => s.browserMode);
  const policy: RetryPolicy = (request as RequestDraft).retryPolicy ?? {
    maxRetries: 0,
    retryOnTimeout: true,
    retryOn5xx: true,
    backoffMs: 500,
  };

  const updateRetry = (patch: Partial<RetryPolicy>) =>
    setRequest({
      retryPolicy: { ...policy, ...patch },
    } as Partial<RequestDraft>);

  const retryEnabled = policy.maxRetries > 0;
  const timeoutMs = request.timeoutMs ?? 30000;
  const httpVersion: HttpVersion = request.options?.httpVersion ?? "auto";

  return (
    <div className="flex flex-col gap-3 p-3">
      <button
        type="button"
        onClick={() => set({ showSettings: true, settingsTab: "network" })}
        className="text-left text-2xs text-[var(--text-3)] hover:text-[var(--text-1)]"
      >
        Network policy (TLS, redirects, proxy) is in Settings &gt; Network.
      </button>

      <SectionTitle>HTTP Version</SectionTitle>
      <Field label="Version">
        <Select
          value={httpVersion}
          onChange={(e) => {
            if (browserMode) return;
            setRequest({
              options: { ...request.options, httpVersion: e.target.value as HttpVersion },
            } as Partial<RequestDraft>);
          }}
          size="xs"
          disabled={browserMode}
        >
          <option value="auto">Auto (prefer HTTP/2)</option>
          <option value="http1">HTTP/1.1 only</option>
          <option value="h2c">HTTP/2 cleartext (h2c)</option>
        </Select>
      </Field>

      <SectionTitle>Timeout</SectionTitle>
      <Field label="Timeout (ms)">
        <input
          type="number"
          min={0}
          step={1000}
          value={timeoutMs}
          onChange={(e) => setRequest({ timeoutMs: Math.max(0, Number(e.target.value)) })}
          aria-label="Timeout milliseconds"
          className="input w-28 py-1 text-xs"
        />
      </Field>

      <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-3">
        <SectionTitle>Retry</SectionTitle>
        <Field label="Enable retry">
          <input
            type="checkbox"
            checked={retryEnabled}
            onChange={(e) => updateRetry({ maxRetries: e.target.checked ? 3 : 0 })}
            aria-label="Enable retry"
          />
        </Field>
        {retryEnabled && (
          <>
            <Field label="Max retries">
              <input
                type="number"
                min={1}
                max={10}
                value={policy.maxRetries}
                onChange={(e) =>
                  updateRetry({
                    maxRetries: Math.max(1, Number(e.target.value)),
                  })
                }
                aria-label="Max retries"
                className="input w-20 py-1 text-xs"
              />
            </Field>
            <Field label="Backoff (ms)">
              <input
                type="number"
                min={0}
                step={100}
                value={policy.backoffMs}
                onChange={(e) =>
                  updateRetry({
                    backoffMs: Math.max(0, Number(e.target.value)),
                  })
                }
                aria-label="Backoff milliseconds"
                className="input w-24 py-1 text-xs"
              />
            </Field>
            <Field label="Retry on">
              <div className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--text-2)]">
                  <input
                    type="checkbox"
                    checked={policy.retryOn5xx}
                    onChange={(e) => updateRetry({ retryOn5xx: e.target.checked })}
                  />
                  5xx errors
                </label>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--text-2)]">
                  <input
                    type="checkbox"
                    checked={policy.retryOnTimeout}
                    onChange={(e) => updateRetry({ retryOnTimeout: e.target.checked })}
                  />
                  Timeout
                </label>
              </div>
            </Field>
            <p className="text-2xs text-[var(--text-3)]">
              Backoff doubles each retry. Max wait about{" "}
              {Array.from(
                { length: policy.maxRetries },
                (_, i) => policy.backoffMs * Math.pow(2, i),
              ).reduce((a, b) => a + b, 0)}
              ms.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
