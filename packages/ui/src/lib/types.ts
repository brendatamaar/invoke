import type { Collection, Folder, SavedRequest } from "@invoke/core";

export type ContextTarget =
  | { type: "collection"; collection: Collection }
  | { type: "folder"; folder: Folder }
  | { type: "request"; request: SavedRequest };

export type PaletteKind =
  | "command"
  | "collection"
  | "folder"
  | "request"
  | "environment"
  | "history"
  | "flow";
export type SidebarSection =
  | "collections"
  | "history"
  | "environments"
  | "flows"
  | "mocks";
export type RequestTab =
  | "params"
  | "headers"
  | "auth"
  | "body"
  | "graphql"
  | "graphqlVariables"
  | "websocket"
  | "grpc"
  | "assertions"
  | "extract"
  | "scripts";
export type ResponseTab =
  | "body"
  | "headers"
  | "timing"
  | "tls"
  | "assertions"
  | "code";

export interface PaletteItem {
  id: string;
  kind: PaletteKind;
  title: string;
  subtitle: string;
  keywords: string;
  method?: string;
  run: () => void | Promise<void>;
}

export interface WebSocketLogItem {
  id: string;
  direction: "sent" | "received" | "system";
  type: string;
  body: string;
  createdAt: number;
}

export interface Toast {
  id: string;
  kind: "success" | "error" | "info" | "warn";
  message: string;
}
