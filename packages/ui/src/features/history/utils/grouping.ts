import type { HistoryEntry } from "@invoke/core";

export function matchesHistoryQuery(entry: HistoryEntry, query: string) {
  const request = entry.request as { method?: string; url?: string } | undefined;
  return `${request?.method ?? ""} ${request?.url ?? ""} ${entry.response?.status ?? ""} ${entry.label ?? ""}`
    .toLowerCase()
    .includes(query.toLowerCase());
}

export function groupHistoryByDate(entries: HistoryEntry[]) {
  return entries.reduce<{ label: string; entries: HistoryEntry[] }[]>(
    (groups, entry) => {
      const label = dateLabel(entry.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.entries.push(entry);
      else groups.push({ label, entries: [entry] });
      return groups;
    },
    [],
  );
}

function dateLabel(timestamp: number) {
  const now = new Date();
  const date = new Date(timestamp);
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfYesterday = startOfToday - 86400000;
  if (date.getTime() >= startOfToday) return "Today";
  if (date.getTime() >= startOfYesterday) return "Yesterday";
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
