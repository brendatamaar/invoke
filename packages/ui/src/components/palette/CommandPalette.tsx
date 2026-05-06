import { useEffect, useRef, useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import Fuse from "fuse.js";
import { useStore } from "../../store";
import { MethodBadge } from "../shared/MethodBadge";
import type { PaletteItem } from "../../lib/types";
import {
  emptyGraphQLRequest,
  emptyWebSocketRequest,
  emptyGrpcRequest,
} from "@invoke/core";

export function CommandPalette() {
  const {
    commandPaletteOpen,
    commandQuery,
    set,
    collections,
    requests,
    environments,
    flows,
    sidebarCollapsed,
    setRequest,
    resetRequest,
  } = useStore();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (commandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [commandPaletteOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        set({ commandPaletteOpen: !commandPaletteOpen, commandQuery: "" });
      }
      if (!commandPaletteOpen) return;
      if (e.key === "Escape") {
        set({ commandPaletteOpen: false });
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        items[selectedIndex]?.run();
        set({ commandPaletteOpen: false });
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [commandPaletteOpen, selectedIndex]); // eslint-disable-line

  const allItems: PaletteItem[] = [
    // Saved requests
    ...requests.map((r) => {
      const req = r.request as { method?: string; url?: string } | undefined;
      return {
        id: r.id,
        kind: "request" as const,
        title: r.name || req?.url || "Untitled",
        subtitle: req?.url || "",
        keywords: `${req?.method ?? ""} ${req?.url ?? ""} ${r.name}`,
        method: req?.method,
        run: () =>
          setRequest({
            method: (req?.method ?? "GET") as Parameters<
              typeof setRequest
            >[0]["method"],
            url: req?.url ?? "",
            name: r.name,
          }),
      };
    }),
    // Environments
    ...environments.map((e) => ({
      id: e.id,
      kind: "environment" as const,
      title: e.name,
      subtitle: `${e.variables?.length ?? 0} variables`,
      keywords: e.name,
      run: () => set({ activeEnvironmentId: e.id }),
    })),
    // Flows
    ...flows.map((f) => ({
      id: `flow-${f.id}`,
      kind: "flow" as const,
      title: f.name,
      subtitle: `${f.steps?.length ?? 0} steps`,
      keywords: `flow ${f.name}`,
      run: () => set({ sidebarSection: "flows", flowDraft: f }),
    })),
    // Collections
    ...collections.map((c) => ({
      id: `col-${c.id}`,
      kind: "collection" as const,
      title: c.name,
      subtitle: "Collection",
      keywords: `collection ${c.name}`,
      run: () => set({ sidebarSection: "collections" }),
    })),
    // New request commands
    {
      id: "new-request",
      kind: "command" as const,
      title: "New Request",
      subtitle: "Start a blank HTTP request",
      keywords: "new request create http",
      run: () => resetRequest(),
    },
    {
      id: "new-graphql",
      kind: "command" as const,
      title: "New GraphQL Request",
      subtitle: "Start a blank GraphQL request",
      keywords: "new graphql request create",
      run: () => {
        resetRequest();
        set({ requestTab: "graphql", graphqlRequest: emptyGraphQLRequest() });
      },
    },
    {
      id: "new-websocket",
      kind: "command" as const,
      title: "New WebSocket Request",
      subtitle: "Start a blank WebSocket connection",
      keywords: "new websocket ws request create",
      run: () => {
        resetRequest();
        set({
          requestTab: "websocket",
          websocketRequest: emptyWebSocketRequest(),
        });
      },
    },
    {
      id: "new-grpc",
      kind: "command" as const,
      title: "New gRPC Request",
      subtitle: "Start a blank gRPC request",
      keywords: "new grpc request create",
      run: () => {
        resetRequest();
        set({ requestTab: "grpc", grpcRequest: emptyGrpcRequest() });
      },
    },
    // Navigation
    {
      id: "nav-collections",
      kind: "command" as const,
      title: "Go to Collections",
      subtitle: "Open Collections sidebar",
      keywords: "go navigate collections sidebar",
      run: () => set({ sidebarSection: "collections" }),
    },
    {
      id: "nav-history",
      kind: "command" as const,
      title: "Go to History",
      subtitle: "Open History sidebar",
      keywords: "go navigate history sidebar",
      run: () => set({ sidebarSection: "history" }),
    },
    {
      id: "nav-environments",
      kind: "command" as const,
      title: "Go to Environments",
      subtitle: "Open Environments sidebar",
      keywords: "go navigate environments sidebar",
      run: () => set({ sidebarSection: "environments" }),
    },
    {
      id: "nav-flows",
      kind: "command" as const,
      title: "Go to Flows",
      subtitle: "Open Flows sidebar",
      keywords: "go navigate flows sidebar",
      run: () => set({ sidebarSection: "flows" }),
    },
    {
      id: "nav-mocks",
      kind: "command" as const,
      title: "Go to Mocks",
      subtitle: "Open Mock server sidebar",
      keywords: "go navigate mocks mock server sidebar",
      run: () => set({ sidebarSection: "mocks" }),
    },
    // UI toggles
    {
      id: "toggle-sidebar",
      kind: "command" as const,
      title: "Toggle Sidebar",
      subtitle: sidebarCollapsed ? "Show sidebar" : "Hide sidebar",
      keywords: "toggle sidebar show hide collapse",
      run: () => set({ sidebarCollapsed: !sidebarCollapsed }),
    },
    {
      id: "open-settings",
      kind: "command" as const,
      title: "Open Settings",
      subtitle: "View and edit settings",
      keywords: "settings preferences open",
      run: () => set({ showSettings: true }),
    },
    {
      id: "open-help",
      kind: "command" as const,
      title: "Open Help",
      subtitle: "View keyboard shortcuts and tips",
      keywords: "help shortcuts tips keyboard",
      run: () => set({ showHelp: true }),
    },
    {
      id: "clear-history",
      kind: "command" as const,
      title: "Clear History",
      subtitle: "Remove all history entries",
      keywords: "clear history delete remove",
      run: () => set({ showClearHistoryModal: true }),
    },
  ];

  const query = commandQuery.trim();
  const fuse = new Fuse(allItems, {
    keys: ["title", "keywords", "subtitle"],
    threshold: 0.4,
  });
  const items = query
    ? fuse.search(query).map((r) => r.item)
    : allItems.slice(0, 10);

  if (!commandPaletteOpen) return null;

  const KIND_LABELS: Record<string, string> = {
    request: "Request",
    environment: "Env",
    command: "Command",
    collection: "Collection",
    flow: "Flow",
  };
  const KIND_COLORS: Record<string, string> = {
    request: "text-blue-600",
    environment: "text-violet-600",
    command: "text-zinc-600",
    collection: "text-amber-600",
    flow: "text-emerald-600",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/20 backdrop-blur-[1px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) set({ commandPaletteOpen: false });
      }}
    >
      <div className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
          <Search size={15} className="text-[var(--text-3)] shrink-0" />
          <input
            ref={inputRef}
            value={commandQuery}
            onChange={(e) => {
              set({ commandQuery: e.target.value });
              setSelectedIndex(0);
            }}
            placeholder="Search requests, environments, commands…"
            className="flex-1 bg-transparent outline-none text-sm text-[var(--text-1)] placeholder-[var(--text-3)]"
          />
          <kbd className="text-2xs px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-3)]">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-1">
          {items.length === 0 && (
            <p className="px-4 py-6 text-sm text-[var(--text-3)] text-center">
              No results
            </p>
          )}
          {items.map((item, i) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer ${i === selectedIndex ? "bg-[var(--accent-subtle)]" : "hover:bg-[var(--surface-2)]"}`}
              onMouseEnter={() => setSelectedIndex(i)}
              onClick={() => {
                item.run();
                set({ commandPaletteOpen: false });
              }}
            >
              {item.method ? (
                <MethodBadge method={item.method} />
              ) : (
                <span
                  className={`text-2xs font-medium ${KIND_COLORS[item.kind] ?? "text-zinc-500"}`}
                >
                  {KIND_LABELS[item.kind] ?? item.kind}
                </span>
              )}
              <span className="flex-1 text-sm text-[var(--text-1)] truncate">
                {item.title}
              </span>
              <span className="text-xs text-[var(--text-3)] truncate max-w-[160px]">
                {item.subtitle}
              </span>
              {i === selectedIndex && (
                <ArrowRight
                  size={12}
                  className="text-[var(--accent)] shrink-0"
                />
              )}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-[var(--border)] bg-[var(--surface-2)]">
          {[
            ["↑↓", "Navigate"],
            ["↵", "Select"],
            ["esc", "Close"],
          ].map(([key, label]) => (
            <span
              key={key}
              className="flex items-center gap-1.5 text-2xs text-[var(--text-3)]"
            >
              <kbd className="px-1 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] font-mono">
                {key}
              </kbd>{" "}
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
