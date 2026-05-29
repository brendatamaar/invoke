import type { RequestOptions, RequestProtocol, TlsClientConfig } from "@invoke/core";
import { PROTOCOL_LABELS } from "../../constants";
import { numericInputValue } from "../../utils/numbers";
import { hasAdvancedTimeouts, isRedirectProtocol } from "../../utils/protocol";
import { CheckboxControl } from "../shared/CheckboxControl";
import { FieldRow } from "../shared/FieldRow";
import { ProtocolPills } from "../shared/ProtocolPills";
import { SectionTitle } from "../shared/SectionTitle";
import { TlsClientFields } from "./TlsClientFields";

export function NetworkTab({
  editingProtocol,
  activeOptions,
  setEditingProtocol,
  patchActiveOptions,
  patchTlsClientConfig,
  resetActiveProtocolDefaults,
}: {
  editingProtocol: RequestProtocol;
  activeOptions: RequestOptions;
  setEditingProtocol: (protocol: RequestProtocol) => void;
  patchActiveOptions: (patch: Partial<RequestOptions>) => void;
  patchTlsClientConfig: (patch: Partial<TlsClientConfig>) => void;
  resetActiveProtocolDefaults: () => void;
}) {
  const showRedirects = isRedirectProtocol(editingProtocol);
  const showAdvancedTimeouts = hasAdvancedTimeouts(editingProtocol);
  const followsRedirects = activeOptions.followRedirects ?? true;
  const tls = activeOptions.tlsClientConfig ?? {};

  return (
    <div className="flex flex-col gap-5">
      <SectionTitle
        title="Network policy"
        description="These settings apply to all requests of this protocol. Per-request timeout and retry policy are in each request's Options tab."
      />
      <ProtocolPills editingProtocol={editingProtocol} onChange={setEditingProtocol} />

      <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-4">
        {showAdvancedTimeouts && (
          <TimeoutFields activeOptions={activeOptions} patchActiveOptions={patchActiveOptions} />
        )}

        {showRedirects && (
          <RedirectFields
            activeOptions={activeOptions}
            followsRedirects={followsRedirects}
            patchActiveOptions={patchActiveOptions}
          />
        )}

        <FieldRow label="Verify TLS">
          <CheckboxControl
            checked={activeOptions.verifySsl ?? true}
            onChange={(checked) => patchActiveOptions({ verifySsl: checked })}
          />
        </FieldRow>

        <FieldRow label="Allow private IPs">
          <CheckboxControl
            checked={activeOptions.allowPrivateAddresses ?? true}
            onChange={(checked) => patchActiveOptions({ allowPrivateAddresses: checked })}
          />
        </FieldRow>

        <TlsClientFields tls={tls} patchTlsClientConfig={patchTlsClientConfig} />

        <div className="pt-1">
          <button
            type="button"
            onClick={resetActiveProtocolDefaults}
            className="text-2xs text-[var(--text-3)] underline hover:text-[var(--text-1)]"
          >
            Reset {PROTOCOL_LABELS[editingProtocol]} defaults to factory values
          </button>
        </div>
      </div>
    </div>
  );
}

function TimeoutFields({
  activeOptions,
  patchActiveOptions,
}: {
  activeOptions: RequestOptions;
  patchActiveOptions: (patch: Partial<RequestOptions>) => void;
}) {
  return (
    <>
      <FieldRow label="Connect timeout (ms)" hint="Blank uses the executor default.">
        <input
          type="number"
          min={0}
          step={500}
          value={activeOptions.connectTimeoutMs ?? ""}
          onChange={(e) =>
            patchActiveOptions({
              connectTimeoutMs: e.currentTarget.value
                ? numericInputValue(e.currentTarget.value, 0, 0)
                : undefined,
            })
          }
          placeholder="default"
          aria-label="Connect timeout in milliseconds"
          className="input w-32 text-xs"
        />
      </FieldRow>

      <FieldRow label="Read timeout (ms)" hint="Blank uses the executor default.">
        <input
          type="number"
          min={0}
          step={500}
          value={activeOptions.readTimeoutMs ?? ""}
          onChange={(e) =>
            patchActiveOptions({
              readTimeoutMs: e.currentTarget.value
                ? numericInputValue(e.currentTarget.value, 0, 0)
                : undefined,
            })
          }
          placeholder="default"
          aria-label="Read timeout in milliseconds"
          className="input w-32 text-xs"
        />
      </FieldRow>
    </>
  );
}

function RedirectFields({
  activeOptions,
  followsRedirects,
  patchActiveOptions,
}: {
  activeOptions: RequestOptions;
  followsRedirects: boolean;
  patchActiveOptions: (patch: Partial<RequestOptions>) => void;
}) {
  return (
    <>
      <FieldRow label="Follow redirects">
        <CheckboxControl
          checked={followsRedirects}
          onChange={(checked) => patchActiveOptions({ followRedirects: checked })}
        />
      </FieldRow>

      {followsRedirects && (
        <FieldRow label="Max redirects">
          <input
            type="number"
            min={0}
            max={30}
            value={activeOptions.maxRedirects ?? 10}
            onChange={(e) =>
              patchActiveOptions({
                maxRedirects: numericInputValue(e.currentTarget.value, 10, 0, 30),
              })
            }
            aria-label="Max redirects"
            className="input w-20 text-xs"
          />
        </FieldRow>
      )}
    </>
  );
}
