export function kindBadge(kind: string): { label: string; cls: string } {
  switch (kind) {
    case "OBJECT":
      return { label: "obj", cls: "text-[var(--info)] bg-[var(--info-bg)]" };
    case "INPUT_OBJECT":
      return {
        label: "inp",
        cls: "text-[var(--method-patch)] bg-[rgba(200,156,214,0.1)]",
      };
    case "ENUM":
      return { label: "enum", cls: "text-[var(--warn)] bg-[var(--warn-bg)]" };
    case "UNION":
      return { label: "union", cls: "text-[var(--ok)] bg-[var(--ok-bg)]" };
    case "INTERFACE":
      return { label: "iface", cls: "text-cyan-600 bg-cyan-500/10" };
    case "SCALAR":
      return { label: "scalar", cls: "text-[var(--fg-2)] bg-[var(--bg-3)]" };
    default:
      return {
        label: kind.toLowerCase(),
        cls: "text-[var(--fg-2)] bg-[var(--bg-3)]",
      };
  }
}

export function graphQLSchemaStatusClass(status: string) {
  if (status.startsWith("Failed")) return "text-[var(--danger)]";
  if (status.startsWith("Missing")) return "text-[var(--warn)]";
  return "text-[var(--text-3)]";
}

export function graphQLSchemaFailureStatus(error: unknown) {
  return `Failed: ${error instanceof Error ? error.message : String(error)}`;
}
