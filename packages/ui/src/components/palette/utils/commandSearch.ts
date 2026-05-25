import MiniSearch from "minisearch";
import type { PaletteItem } from "../../../types";

export function searchPaletteItems(items: PaletteItem[], queryText: string) {
  const query = queryText.trim();
  if (!query) return items.slice(0, 10);

  const search = new MiniSearch<PaletteItem>({
    fields: ["title", "keywords", "subtitle"],
    idField: "id",
  });
  search.addAll(items);
  return search
    .search(query, { prefix: true, fuzzy: 0.2 })
    .map((result) => items.find((item) => item.id === result.id))
    .filter((item): item is PaletteItem => Boolean(item));
}
