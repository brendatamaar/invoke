import type { validateFlow } from "@invoke/core";

type ToastFn = (kind: "success" | "error" | "info" | "warn", message: string) => void;

export function showFlowValidation(
  validation: ReturnType<typeof validateFlow>,
  addToast: ToastFn,
): boolean {
  if (!validation.valid) {
    const [firstError] = validation.errors;
    const remaining = validation.errors.length - 1;
    addToast(
      "error",
      `${firstError.message}${remaining > 0 ? ` (+${remaining} more)` : ""}`,
    );
    return false;
  }
  if (validation.warnings.length > 0) {
    const [firstWarning] = validation.warnings;
    const remaining = validation.warnings.length - 1;
    addToast(
      "warn",
      `${firstWarning.message}${remaining > 0 ? ` (+${remaining} more)` : ""}`,
    );
  }
  return true;
}
