import {
  emptyGraphQLRequest,
  emptyGrpcRequest,
  emptyWebSocketRequest,
} from "@invoke/core";
import { useCollections, useFlows, useHistory, useMockRoutes } from "../../../hooks/useDb";
import { useStore } from "../../../store";
import type { PaletteItem } from "../../../types";

export function usePaletteItems() {
  return [...useEntityPaletteItems(), ...useCommandPaletteItems()];
}

function useEntityPaletteItems(): PaletteItem[] {
  const { requests, environments, set, setRequest } = useStore();
  const collections = useCollections();
  const flows = useFlows();
  const history = useHistory(50);
  const mockRoutes = useMockRoutes();

  return [
    ...requests.map((request) => {
      const draft = request.request as { method?: string; url?: string } | undefined;
      return {
        id: request.id,
        kind: "request" as const,
        title: request.name || draft?.url || "Untitled",
        subtitle: draft?.url || "",
        keywords: `${draft?.method ?? ""} ${draft?.url ?? ""} ${request.name}`,
        method: draft?.method,
        run: () =>
          setRequest({
            method: (draft?.method ?? "GET") as Parameters<typeof setRequest>[0]["method"],
            url: draft?.url ?? "",
            name: request.name,
          }),
      };
    }),
    ...environments.map((environment) => ({
      id: environment.id,
      kind: "environment" as const,
      title: environment.name,
      subtitle: `${environment.variables?.length ?? 0} variables`,
      keywords: environment.name,
      run: () => set({ activeEnvironmentId: environment.id }),
    })),
    ...flows.map((flow) => ({
      id: `flow-${flow.id}`,
      kind: "flow" as const,
      title: flow.name,
      subtitle: `${flow.steps?.length ?? 0} steps`,
      keywords: `flow ${flow.name}`,
      run: () =>
        set({ sidebarCollapsed: false, sidebarSection: "flows", flowDraft: flow }),
    })),
    ...collections.map((collection) => ({
      id: `col-${collection.id}`,
      kind: "collection" as const,
      title: collection.name,
      subtitle: "Collection",
      keywords: `collection ${collection.name}`,
      run: () => set({ sidebarCollapsed: false, sidebarSection: "collections" }),
    })),
    ...history.slice(0, 50).map((entry) => {
      const request = entry.request as { method?: string; url?: string } | undefined;
      const url = request?.url ?? "";
      const method = request?.method ?? "GET";
      return {
        id: `hist-${entry.id}`,
        kind: "history" as const,
        title: entry.label ? `${entry.label} - ${url}` : url,
        subtitle: `${method} - ${entry.response?.status ?? "-"}`,
        keywords: `history ${method} ${url} ${entry.label ?? ""} ${entry.response?.status ?? ""}`,
        method,
        run: () => {
          setRequest({
            method: method as Parameters<typeof setRequest>[0]["method"],
            url,
            headers:
              ((request as { headers?: unknown[] })?.headers as Parameters<typeof setRequest>[0]["headers"]) ?? [],
            body: (request as { body?: string })?.body ?? "",
          });
          set({ sidebarCollapsed: false, sidebarSection: "history" });
        },
      };
    }),
    ...mockRoutes.map((route) => ({
      id: `mock-${route.id}`,
      kind: "mock" as const,
      title: `${route.method} ${route.pathPattern}`,
      subtitle: `Mock - ${route.status}`,
      keywords: `mock ${route.method} ${route.pathPattern}`,
      method: route.method,
      run: () => set({ sidebarCollapsed: false, sidebarSection: "mocks" }),
    })),
  ];
}

function useCommandPaletteItems(): PaletteItem[] {
  const { sidebarCollapsed, set, setRequest, resetRequest } = useStore();
  return [
    {
      id: "new-request",
      kind: "command",
      title: "New REST Request",
      subtitle: "Start a blank REST request",
      keywords: "new request create http",
      run: () => resetRequest(),
    },
    {
      id: "new-graphql",
      kind: "command",
      title: "New GraphQL Request",
      subtitle: "Start a blank GraphQL request",
      keywords: "new graphql request create",
      run: () => {
        resetRequest();
        setRequest({ protocol: "graphql" });
        set({ requestTab: "graphql", graphqlRequest: emptyGraphQLRequest() });
      },
    },
    {
      id: "new-websocket",
      kind: "command",
      title: "New WebSocket Request",
      subtitle: "Start a blank WebSocket connection",
      keywords: "new websocket ws request create",
      run: () => {
        resetRequest();
        setRequest({ protocol: "websocket" });
        set({ requestTab: "websocket", websocketRequest: emptyWebSocketRequest() });
      },
    },
    {
      id: "new-grpc",
      kind: "command",
      title: "New gRPC Request",
      subtitle: "Start a blank gRPC request",
      keywords: "new grpc request create",
      run: () => {
        resetRequest();
        setRequest({ protocol: "grpc" });
        set({ requestTab: "grpc", grpcRequest: emptyGrpcRequest() });
      },
    },
    ...navItems(set),
    {
      id: "toggle-sidebar",
      kind: "command",
      title: "Toggle Sidebar",
      subtitle: sidebarCollapsed ? "Show sidebar" : "Hide sidebar",
      keywords: "toggle sidebar show hide collapse",
      run: () => set({ sidebarCollapsed: !sidebarCollapsed }),
    },
    {
      id: "open-settings",
      kind: "command",
      title: "Open Settings",
      subtitle: "View and edit settings",
      keywords: "settings preferences open",
      run: () => set({ showSettings: true, settingsTab: undefined }),
    },
    {
      id: "open-help",
      kind: "command",
      title: "Open Help",
      subtitle: "View keyboard shortcuts and tips",
      keywords: "help shortcuts tips keyboard",
      run: () => set({ showHelp: true }),
    },
    {
      id: "clear-history",
      kind: "command",
      title: "Clear History",
      subtitle: "Remove all history entries",
      keywords: "clear history delete remove",
      run: () => set({ showClearHistoryModal: true }),
    },
  ];
}

function navItems(set: ReturnType<typeof useStore.getState>["set"]): PaletteItem[] {
  return [
    ["collections", "Collections", "Open Collections sidebar"],
    ["history", "History", "Open History sidebar"],
    ["environments", "Environments", "Open Environments sidebar"],
    ["flows", "Flows", "Open Flows sidebar"],
    ["mocks", "Mocks", "Open Mock server sidebar"],
  ].map(([section, label, subtitle]) => ({
    id: `nav-${section}`,
    kind: "command",
    title: `Go to ${label}`,
    subtitle,
    keywords: `go navigate ${section} sidebar`,
    run: () => set({ sidebarCollapsed: false, sidebarSection: section as any }),
  }));
}
