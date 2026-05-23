import { useMemo } from "react";
import MiniSearch from "minisearch";
import type { HistoryEntry } from "@invoke/core";
import { useHistory } from "../hooks/useDb";

export function useHistorySearch(query: string): HistoryEntry[] {
  const entries = useHistory(500);

  return useMemo(() => {
    if (!query.trim()) return entries;

    const ms = new MiniSearch<HistoryEntry & { _searchText: string }>({
      idField: "id",
      fields: ["_searchText"],
    });

    const docs = entries.map((e) => {
      const req = e.request as { method?: string; url?: string } | undefined;
      return {
        ...e,
        _searchText: `${req?.method ?? ""} ${req?.url ?? ""} ${e.response?.status ?? ""} ${e.label ?? ""}`,
      };
    });

    ms.addAll(docs);
    const results = ms.search(query, { prefix: true, fuzzy: 0.2 });
    const idSet = new Set(results.map((r) => r.id));
    return entries.filter((e) => idSet.has(e.id));
  }, [query, entries]);
}
