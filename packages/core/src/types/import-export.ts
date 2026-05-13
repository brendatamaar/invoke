import type { AuthConfig } from "./auth";
import type { HttpMethod } from "./common";

export type FlatRequestDocument = {
  invoke_version: string;
  type: "request";
  id?: string;
  name: string;
  protocol: "rest" | "graphql" | "grpc";
  folderId?: string | null;
  method?: HttpMethod;
  url: string;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  auth?: AuthConfig;
  body?: {
    type: "none" | "json" | "text" | "form-data" | "form-urlencoded" | "file";
    content?: string;
  };
  graphql?: {
    query: string;
    variables?: string;
    operationName?: string;
  };
  grpc?: {
    address: string;
    service: string;
    method: string;
    metadata?: Record<string, string>;
    body?: string;
    tls?: boolean;
    timeoutMs?: number;
    compression?: "none" | "gzip";
  };
  variables?: Record<string, string>;
  timeoutMs?: number;
};

export type FolderDocument = {
  invoke_version: string;
  type: "folder";
  id: string;
  name: string;
  parentFolderId?: string | null;
  description?: string;
  variables?: Record<string, string>;
  sortOrder?: number;
};

export type YamlBodyType = NonNullable<FlatRequestDocument["body"]>["type"];
