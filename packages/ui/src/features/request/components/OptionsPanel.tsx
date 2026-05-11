import { useStore } from "../../../store";
import type { RequestDraft, RequestOptions, RetryPolicy } from "@invoke/core";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-[var(--text-2)] w-36 shrink-0">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-2xs font-semibold uppercase tracking-wide text-[var(--text-3)] pt-1">{children}</p>
  );
}

export function OptionsPanel() {
  const { request, setRequest } = useStore();
  const options: RequestOptions = request.options ?? {};
  const policy: RetryPolicy = (request as RequestDraft).retryPolicy ?? {
    maxRetries: 0,
    retryOnTimeout: true,
    retryOn5xx: true,
    backoffMs: 500,
  };

  const setOption = (patch: Partial<RequestOptions>) =>
    setRequest({ options: { ...options, ...patch } } as any);

  const updateRetry = (patch: Partial<RetryPolicy>) =>
    setRequest({ retryPolicy: { ...policy, ...patch } } as Partial<RequestDraft>);

  const retryEnabled = policy.maxRetries > 0;

  return (
    <div className="p-3 flex flex-col gap-3">
      <SectionTitle>Timeouts</SectionTitle>
      <Field label="Timeout (ms)">
        <input
          type="number"
          min={0}
          step={1000}
          value={request.timeoutMs ?? 30000}
          onChange={(e) => setRequest({ timeoutMs: Math.max(0, Number(e.target.value)) })}
          className="input text-xs py-1 w-28"
        />
      </Field>
      <Field label="Connect timeout (ms)">
        <input
          type="number"
          min={0}
          step={1000}
          value={options.connectTimeoutMs ?? ""}
          onChange={(e) =>
            setOption({ connectTimeoutMs: e.target.value ? Math.max(0, Number(e.target.value)) : undefined })
          }
          placeholder="none"
          className="input text-xs py-1 w-28"
        />
      </Field>
      <Field label="Read timeout (ms)">
        <input
          type="number"
          min={0}
          step={1000}
          value={options.readTimeoutMs ?? ""}
          onChange={(e) =>
            setOption({ readTimeoutMs: e.target.value ? Math.max(0, Number(e.target.value)) : undefined })
          }
          placeholder="none"
          className="input text-xs py-1 w-28"
        />
      </Field>

      <div className="border-t border-[var(--border)] pt-3 flex flex-col gap-3">
        <SectionTitle>Redirects &amp; SSL</SectionTitle>
        <Field label="Follow redirects">
          <input
            type="checkbox"
            checked={options.followRedirects ?? true}
            onChange={(e) => setOption({ followRedirects: e.target.checked })}
            className="accent-[var(--accent)]"
          />
        </Field>
        <Field label="Max redirects">
          <input
            type="number"
            min={0}
            max={30}
            value={options.maxRedirects ?? 10}
            onChange={(e) => setOption({ maxRedirects: Math.max(0, Number(e.target.value)) })}
            className="input text-xs py-1 w-16"
            disabled={!(options.followRedirects ?? true)}
          />
        </Field>
        <Field label="Verify SSL">
          <input
            type="checkbox"
            checked={options.verifySsl ?? true}
            onChange={(e) => setOption({ verifySsl: e.target.checked })}
            className="accent-[var(--accent)]"
          />
        </Field>
      </div>

      <div className="border-t border-[var(--border)] pt-3 flex flex-col gap-3">
        <SectionTitle>Retry</SectionTitle>
        <Field label="Enable retry">
          <input
            type="checkbox"
            checked={retryEnabled}
            onChange={(e) => updateRetry({ maxRetries: e.target.checked ? 3 : 0 })}
            className="accent-[var(--accent)]"
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
                onChange={(e) => updateRetry({ maxRetries: Math.max(1, Number(e.target.value)) })}
                className="input text-xs py-1 w-20"
              />
            </Field>
            <Field label="Backoff (ms)">
              <input
                type="number"
                min={0}
                step={100}
                value={policy.backoffMs}
                onChange={(e) => updateRetry({ backoffMs: Math.max(0, Number(e.target.value)) })}
                className="input text-xs py-1 w-24"
              />
            </Field>
            <Field label="Retry on">
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 text-xs text-[var(--text-2)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policy.retryOn5xx}
                    onChange={(e) => updateRetry({ retryOn5xx: e.target.checked })}
                    className="accent-[var(--accent)]"
                  />
                  5xx errors
                </label>
                <label className="flex items-center gap-1.5 text-xs text-[var(--text-2)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policy.retryOnTimeout}
                    onChange={(e) => updateRetry({ retryOnTimeout: e.target.checked })}
                    className="accent-[var(--accent)]"
                  />
                  Timeout
                </label>
              </div>
            </Field>
            <p className="text-2xs text-[var(--text-3)]">
              Backoff doubles each retry. Max wait ≈{" "}
              {Array.from({ length: policy.maxRetries }, (_, i) => policy.backoffMs * Math.pow(2, i)).reduce((a, b) => a + b, 0)}ms.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
