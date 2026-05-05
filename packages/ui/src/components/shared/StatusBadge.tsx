interface Props { status: number }

export function StatusBadge({ status }: Props) {
  let cls = "text-zinc-600 bg-zinc-100";
  if (status >= 200 && status < 300) cls = "text-emerald-700 bg-emerald-50";
  else if (status >= 300 && status < 400) cls = "text-blue-700 bg-blue-50";
  else if (status >= 400 && status < 500) cls = "text-amber-700 bg-amber-50";
  else if (status >= 500) cls = "text-red-700 bg-red-50";
  return (
    <span className={`inline-block rounded px-1.5 py-px text-2xs font-mono font-semibold ${cls}`}>
      {status}
    </span>
  );
}
