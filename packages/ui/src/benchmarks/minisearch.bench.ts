import { bench, describe } from "vitest";
import MiniSearch from "minisearch";
import type { PaletteItem } from "../types";

function makeHistory(n: number): PaletteItem[] {
  const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
  return Array.from({ length: n }, (_, i) => ({
    id: `hist-${i}`,
    kind: "history" as const,
    title: `https://api.example.com/v${i % 5}/resource/${i}`,
    subtitle: `${methods[i % 5]} · ${200 + (i % 4) * 100}`,
    keywords: `history ${methods[i % 5]} https://api.example.com/v${i % 5}/resource/${i}`,
    method: methods[i % 5],
    run: () => {},
  }));
}

describe("MiniSearch command palette", () => {
  bench("index 10,000 history entries", () => {
    const ms = new MiniSearch<PaletteItem>({
      fields: ["title", "keywords", "subtitle"],
      idField: "id",
    });
    ms.addAll(makeHistory(10_000));
  });

  const items = makeHistory(10_000);
  const ms = new MiniSearch<PaletteItem>({
    fields: ["title", "keywords", "subtitle"],
    idField: "id",
  });
  ms.addAll(items);

  bench("search 'post resource' (prefix + fuzzy 0.2) over 10,000 entries", () => {
    ms.search("post resource", { prefix: true, fuzzy: 0.2 });
  });

  bench("search 'delete v3' over 10,000 entries", () => {
    ms.search("delete v3", { prefix: true, fuzzy: 0.2 });
  });
});
