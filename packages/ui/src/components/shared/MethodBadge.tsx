interface Props {
  method: string;
  size?: "sm" | "md";
}

const METHOD_STYLES: Record<string, string> = {
  GET:     "text-emerald-700 bg-emerald-50",
  POST:    "text-blue-700    bg-blue-50",
  PUT:     "text-amber-700   bg-amber-50",
  PATCH:   "text-violet-700  bg-violet-50",
  DELETE:  "text-red-700     bg-red-50",
  HEAD:    "text-zinc-600    bg-zinc-100",
  OPTIONS: "text-zinc-600    bg-zinc-100"
};

export function MethodBadge({ method, size = "sm" }: Props) {
  const style = METHOD_STYLES[method] ?? "text-zinc-600 bg-zinc-100";
  const px = size === "md" ? "px-2 py-0.5 text-xs" : "px-1.5 py-px text-2xs";
  return (
    <span className={`inline-block rounded font-mono font-semibold tracking-tight leading-none ${px} ${style}`}>
      {method}
    </span>
  );
}
