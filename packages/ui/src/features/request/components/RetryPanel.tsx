import type { RequestDraft, RetryPolicy } from "@invoke/core";
import { useStore } from "../../../store";
import { Field } from "./rule-panels/Field";

export function RetryPanel() {
  const { request, setRequest } = useStore();
  const policy = (request as { retryPolicy?: RetryPolicy }).retryPolicy ?? {
    maxRetries: 0,
    retryOnTimeout: true,
    retryOn5xx: true,
    backoffMs: 500,
  };

  const update = (patch: Partial<RetryPolicy>) =>
    setRequest({
      retryPolicy: { ...policy, ...patch },
    } as Partial<RequestDraft>);

  const enabled = policy.maxRetries > 0;

  return (
    <div className="p-3 flex flex-col gap-3">
      <label className="flex items-center gap-2 text-xs text-[var(--text-2)] cursor-pointer">
        <input
          type="checkbox"
          id="retry-enable"
          checked={enabled}
          onChange={(e) => update({ maxRetries: e.target.checked ? 3 : 0 })}
        />
        Enable retry
      </label>
      {enabled && (
        <>
          <Field label="Max retries">
            <input
              type="number"
              min={1}
              max={10}
              value={policy.maxRetries}
              onChange={(e) => update({ maxRetries: Math.max(1, Number(e.target.value)) })}
              className="input text-xs py-1 w-20"
            />
          </Field>
          <Field label="Backoff (ms)">
            <input
              type="number"
              min={0}
              step={100}
              value={policy.backoffMs}
              onChange={(e) => update({ backoffMs: Math.max(0, Number(e.target.value)) })}
              className="input text-xs py-1 w-24"
            />
          </Field>
          <Field label="Retry on">
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-xs text-[var(--text-2)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.retryOn5xx}
                  onChange={(e) => update({ retryOn5xx: e.target.checked })}
                />
                5xx errors
              </label>
              <label className="flex items-center gap-1.5 text-xs text-[var(--text-2)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.retryOnTimeout}
                  onChange={(e) => update({ retryOnTimeout: e.target.checked })}
                />
                Timeout
              </label>
            </div>
          </Field>
          <p className="text-2xs text-[var(--text-3)]">
            Backoff doubles each retry. Total wait approx {retryWait(policy)}ms max.
          </p>
        </>
      )}
    </div>
  );
}

function retryWait(policy: RetryPolicy) {
  return Array.from(
    { length: policy.maxRetries },
    (_, index) => policy.backoffMs * Math.pow(2, index),
  ).reduce((a, b) => a + b, 0);
}
