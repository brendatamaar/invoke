import type { KeyValue, RequestProtocol } from "./common";
import type { ProtocolRequestConfig } from "./protocols";
import type { RequestConfig } from "./request";

export interface RequestDraft extends RequestConfig {
  id?: string;
  collectionId?: string;
  folderId?: string | null;
  name?: string;
  protocol?: RequestProtocol;
  sortOrder?: number;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  variables?: KeyValue[];
  sortOrder?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Folder {
  id: string;
  collectionId: string;
  parentFolderId?: string | null;
  name: string;
  description?: string;
  variables?: KeyValue[];
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface SavedRequest {
  id: string;
  collectionId: string;
  folderId?: string | null;
  name: string;
  protocol: RequestProtocol;
  request: ProtocolRequestConfig;
  requestMode?: "server" | "browser";
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface Environment {
  id: string;
  name: string;
  variables: KeyValue[];
  createdAt: number;
  updatedAt: number;
}
