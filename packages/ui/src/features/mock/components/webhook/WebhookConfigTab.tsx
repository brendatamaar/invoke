import type { WebhookValidationConfig } from "../../../../types";
import { ValidationConfigForm } from "./ValidationConfigForm";

export function WebhookConfigTab({
  label,
  validation,
  saving,
  onLabelChange,
  onValidationChange,
  onSave,
}: {
  label: string;
  validation: WebhookValidationConfig;
  saving: boolean;
  onLabelChange: (label: string) => void;
  onValidationChange: (validation: WebhookValidationConfig) => void;
  onSave: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <label htmlFor="webhook-label" className="text-2xs text-[var(--text-3)] w-20 shrink-0">
          Label
        </label>
        <input
          id="webhook-label"
          value={label}
          onChange={(event) => onLabelChange(event.target.value)}
          className="input text-xs py-0.5 flex-1"
          placeholder="Endpoint label"
        />
      </div>
      <ValidationConfigForm
        config={validation}
        onChange={onValidationChange}
        onSave={onSave}
        saving={saving}
      />
    </div>
  );
}
