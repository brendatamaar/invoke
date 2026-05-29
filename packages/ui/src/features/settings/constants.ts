import { Database, Globe, Network, Palette, Save } from "lucide-react";
import type { RequestProtocol, RetentionSettings } from "@invoke/core";
import type { SettingsTab } from "../../types";

export const PROTOCOLS: RequestProtocol[] = ["rest", "graphql", "websocket", "grpc"];

export const FONT_SIZE_MIN = 11;
export const FONT_SIZE_MAX = 16;

export const DEFAULT_RETENTION: RetentionSettings = {
  maxEntries: 0,
  retentionDays: 0,
};

export const TAB_ITEMS: Array<{
  id: SettingsTab;
  label: string;
  Icon: typeof Palette;
}> = [
  { id: "general", label: "General", Icon: Palette },
  { id: "network", label: "Network", Icon: Globe },
  { id: "proxy", label: "Proxy", Icon: Network },
  { id: "storage", label: "Storage", Icon: Database },
  { id: "backup", label: "Backup", Icon: Save },
];

export const PROTOCOL_LABELS: Record<RequestProtocol, string> = {
  rest: "REST",
  graphql: "GraphQL",
  websocket: "WebSocket",
  grpc: "gRPC",
};
