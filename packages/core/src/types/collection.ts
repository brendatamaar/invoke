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
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  /** AES-GCM encrypted JSON of the `auth` field. Present when a passphrase is configured. */
  encryptedAuth?: string;
}

export interface Environment {
  id: string;
  name: string;
  variables: KeyValue[];
  createdAt: number;
  updatedAt: number;
  /** AES-GCM encrypted JSON of sensitive variables (where sensitive===true). Present when a passphrase is configured. */
  encryptedVariables?: string;
}
