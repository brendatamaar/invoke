import type { AuthConfig } from "./auth";
import type { HttpMethod } from "./common";

export type FlatRequestDocument = {
  invoke_version: string;
  type: "request";
  id?: string;
  name: string;
  protocol: "rest" | "graphql";
  folderId?: string | null;
  method?: HttpMethod;
  url: string;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  auth?: AuthConfig;
  body?: {
    type: "none" | "json" | "text" | "form-data" | "form-urlencoded";
    content?: string;
  };
  graphql?: {
    query: string;
    variables?: string;
    operationName?: string;
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
