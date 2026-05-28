import { Select } from "../../../../components/shared/Select";
import type { HmacAlgorithm, WebhookValidationConfig } from "../../../../types";

export function ValidationConfigForm({
  config,
  onChange,
  onSave,
  saving,
}: {
  config: WebhookValidationConfig;
  onChange: (config: WebhookValidationConfig) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const patch = (partial: Partial<WebhookValidationConfig>) => onChange({ ...config, ...partial });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <label className="text-2xs text-[var(--text-3)] w-20 shrink-0">Type</label>
        <Select
          value={config.type}
          onChange={(event) =>
            patch({ type: event.target.value as WebhookValidationConfig["type"] })
          }
          size="xs"
          wrapperClassName="flex-1"
        >
          <option value="none">None</option>
          <option value="hmac">HMAC Signature</option>
          <option value="header">Header Token</option>
        </Select>
      </div>
      {config.type === "hmac" && <HmacFields config={config} onPatch={patch} />}
      {config.type === "header" && <HeaderFields config={config} onPatch={patch} />}
      <div className="flex justify-end">
        <button onClick={onSave} disabled={saving} className="btn text-2xs py-0.5 px-3">
          {saving ? "Saving..." : "Apply"}
        </button>
      </div>
    </div>
  );
}

function HmacFields({
  config,
  onPatch,
}: {
  config: WebhookValidationConfig;
  onPatch: (partial: Partial<WebhookValidationConfig>) => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2">
        <label className="text-2xs text-[var(--text-3)] w-20 shrink-0">Algorithm</label>
        <Select
          value={config.algorithm ?? "sha256"}
          onChange={(event) => onPatch({ algorithm: event.target.value as HmacAlgorithm })}
          size="xs"
          wrapperClassName="flex-1"
        >
          <option value="sha256">SHA-256</option>
          <option value="sha1">SHA-1</option>
          <option value="sha512">SHA-512</option>
        </Select>
      </div>
      <ValidationInput
        label="Secret"
        type="password"
        value={config.secret ?? ""}
        onChange={(secret) => onPatch({ secret })}
        placeholder="your-webhook-secret"
      />
      <ValidationInput
        label="Sig. header"
        value={config.signatureHeader ?? ""}
        onChange={(signatureHeader) => onPatch({ signatureHeader })}
        placeholder="X-Hub-Signature-256"
      />
      <ValidationInput
        label="Prefix"
        value={config.signaturePrefix ?? ""}
        onChange={(signaturePrefix) => onPatch({ signaturePrefix })}
        placeholder="sha256= (optional)"
      />
    </>
  );
}

function HeaderFields({
  config,
  onPatch,
}: {
  config: WebhookValidationConfig;
  onPatch: (partial: Partial<WebhookValidationConfig>) => void;
}) {
  return (
    <>
      <ValidationInput
        label="Header"
        value={config.headerName ?? ""}
        onChange={(headerName) => onPatch({ headerName })}
        placeholder="X-Webhook-Token"
      />
      <ValidationInput
        label="Expected"
        type="password"
        value={config.headerValue ?? ""}
        onChange={(headerValue) => onPatch({ headerValue })}
        placeholder="secret-token"
      />
    </>
  );
}

function ValidationInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "text" | "password";
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-2xs text-[var(--text-3)] w-20 shrink-0">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="input text-xs py-0.5 flex-1 font-mono"
      />
    </div>
  );
}
