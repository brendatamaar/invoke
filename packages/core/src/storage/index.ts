import type {
  AuthConfig,
  CachedGraphQLSchema,
  Collection,
  DefaultProtocolOptions,
  DiffIgnoreRule,
  Environment,
  Flow,
  Folder,
  HistoryEntry,
  KeyValue,
  ProtocolRequestConfig,
  RequestDraft,
  RequestProtocol,
  ResponseExample,
  RetentionSettings,
  SavedRequest,
  StoredCookie,
} from "../types";
import { encryptJson, decryptJson } from "../lib/crypto";
import * as collectionStorage from "./collections";
import * as cookieStorage from "./cookies";
import { db } from "./db";
import * as environmentStorage from "./environments";
import * as flowStorage from "./flows";
import * as historyStorage from "./history";
import * as metaStorage from "./meta";
import * as workspaceStorage from "./workspace";

function hasAuthSecrets(auth: AuthConfig | undefined): boolean {
  if (!auth || auth.type === "none") return false;
  return !!(
    auth.password ||
    auth.token ||
    auth.clientSecret ||
    auth.awsSecretAccessKey ||
    auth.accessToken ||
    auth.refreshToken ||
    auth.apiKeyValue
  );
}

const SENSITIVE_METADATA_KEYS = /^(authorization|cookie|x-api-key|.*-token.*)$/i;

function hasSensitiveMetadata(metadata: KeyValue[] | undefined): boolean {
  if (!metadata?.length) return false;
  return metadata.some((m) => m.enabled !== false && SENSITIVE_METADATA_KEYS.test(m.key));
}

function sensitiveMetadataEntries(metadata: KeyValue[]): KeyValue[] {
  return metadata.filter((m) => m.enabled !== false && SENSITIVE_METADATA_KEYS.test(m.key));
}

function redactMetadata(metadata: KeyValue[]): KeyValue[] {
  return metadata.map((m) => (SENSITIVE_METADATA_KEYS.test(m.key) ? { ...m, value: "••••••" } : m));
}

export class InvokeStore {
  private db = db;
  private cryptoKey: CryptoKey | null = null;

  setCryptoKey(key: CryptoKey) {
    this.cryptoKey = key;
  }

  clearCryptoKey() {
    this.cryptoKey = null;
  }

  hasCryptoKey(): boolean {
    return this.cryptoKey !== null;
  }

  async hasSalt(): Promise<boolean> {
    const salt = await metaStorage.getMeta<string>(this.db, "crypto:salt");
    return !!salt;
  }

  async getCryptoSalt(): Promise<string | undefined> {
    return metaStorage.getMeta<string>(this.db, "crypto:salt");
  }

  async initializeCrypto(key: CryptoKey, saltBase64: string) {
    this.cryptoKey = key;
    await metaStorage.setMeta(this.db, "crypto:salt", saltBase64);
    const verifyBlob = await encryptJson("invoke-verify-v1", key);
    await metaStorage.setMeta(this.db, "crypto:verify", verifyBlob);
  }

  async verifyCryptoKey(key: CryptoKey): Promise<boolean> {
    const verifyBlob = await metaStorage.getMeta<string>(this.db, "crypto:verify");
    if (!verifyBlob) return false;
    try {
      const value = await decryptJson<string>(verifyBlob, key);
      return value === "invoke-verify-v1";
    } catch {
      return false;
    }
  }

  close() {
    this.db.close();
  }

  async listCollections() {
    return collectionStorage.listCollections(this.db);
  }

  async createCollection(name: string, data: Partial<Collection> = {}) {
    return collectionStorage.createCollection(this.db, name, data);
  }

  async updateCollection(collection: Collection) {
    return collectionStorage.updateCollection(this.db, collection);
  }

  async deleteCollection(collectionId: string) {
    await collectionStorage.deleteCollection(this.db, collectionId);
  }

  async listRequests(collectionId?: string) {
    const requests = await collectionStorage.listRequests(this.db, collectionId);
    if (!this.cryptoKey) return requests;
    return Promise.all(requests.map((r) => this.decryptRequest(r)));
  }

  private async decryptRequest(r: SavedRequest): Promise<SavedRequest> {
    if (!this.cryptoKey) return r;
    if (!r.encryptedAuth && !r.encryptedMetadata && !r.encryptedTlsKey) return r;
    try {
      let req = r.request as any;
      if (r.encryptedAuth) {
        const auth = await decryptJson<AuthConfig>(r.encryptedAuth, this.cryptoKey);
        req = { ...req, auth };
      }
      if (r.encryptedMetadata) {
        const sensitive = await decryptJson<KeyValue[]>(r.encryptedMetadata, this.cryptoKey);
        const redacted = (req.metadata ?? []) as KeyValue[];
        const nonSensitive = redacted.filter((m: KeyValue) => !SENSITIVE_METADATA_KEYS.test(m.key));
        req = { ...req, metadata: [...nonSensitive, ...sensitive] };
      }
      if (r.encryptedTlsKey) {
        const clientKeyPem = await decryptJson<string>(r.encryptedTlsKey, this.cryptoKey);
        req = {
          ...req,
          options: {
            ...req.options,
            tlsClientConfig: { ...req.options?.tlsClientConfig, clientKeyPem },
          },
        };
      }
      return {
        ...r,
        request: req as ProtocolRequestConfig,
        encryptedAuth: undefined,
        encryptedMetadata: undefined,
        encryptedTlsKey: undefined,
      };
    } catch {
      return r;
    }
  }

  async listFolders(collectionId?: string) {
    return collectionStorage.listFolders(this.db, collectionId);
  }

  async createFolder(
    collectionId: string,
    name: string,
    parentFolderId: string | null = null,
    data: Partial<Folder> = {},
  ) {
    return collectionStorage.createFolder(this.db, collectionId, name, parentFolderId, data);
  }

  async updateFolder(folder: Folder) {
    return collectionStorage.updateFolder(this.db, folder);
  }

  async deleteFolder(folderId: string) {
    await collectionStorage.deleteFolder(this.db, folderId);
  }

  async moveRequest(requestId: string, folderId: string | null) {
    return collectionStorage.moveRequest(this.db, requestId, folderId);
  }

  async reorderRequests(ids: string[]) {
    return collectionStorage.reorderRequests(this.db, ids);
  }

  async saveRequest(
    request: ProtocolRequestConfig | RequestDraft,
    name: string,
    collectionId: string,
    options: {
      id?: string;
      folderId?: string | null;
      protocol?: RequestProtocol;
      sortOrder?: number;
      createdAt?: number;
    } = {},
  ) {
    const saved = await collectionStorage.saveRequest(
      this.db,
      request,
      name,
      collectionId,
      options,
    );
    if (this.cryptoKey) {
      const req = saved.request as any;
      let patched = saved;
      let needsWrite = false;

      if (hasAuthSecrets(req?.auth)) {
        const encryptedAuth = await encryptJson(req.auth, this.cryptoKey);
        const redactedAuth: AuthConfig = { type: req.auth.type };
        const patchedRequest = {
          ...(patched.request as any),
          auth: redactedAuth,
        };
        patched = {
          ...patched,
          request: patchedRequest as ProtocolRequestConfig,
          encryptedAuth,
        };
        needsWrite = true;
      }

      if (hasSensitiveMetadata(req?.metadata)) {
        const sensitive = sensitiveMetadataEntries(req.metadata);
        const encryptedMetadata = await encryptJson(sensitive, this.cryptoKey);
        const patchedRequest = {
          ...(patched.request as any),
          metadata: redactMetadata(req.metadata),
        };
        patched = {
          ...patched,
          request: patchedRequest as ProtocolRequestConfig,
          encryptedMetadata,
        };
        needsWrite = true;
      }

      const tlsKey = req?.options?.tlsClientConfig?.clientKeyPem;
      if (tlsKey) {
        const encryptedTlsKey = await encryptJson(tlsKey, this.cryptoKey);
        const patchedRequest = {
          ...(patched.request as any),
          options: {
            ...(patched.request as any).options,
            tlsClientConfig: {
              ...(patched.request as any).options?.tlsClientConfig,
              clientKeyPem: "",
            },
          },
        };
        patched = {
          ...patched,
          request: patchedRequest as ProtocolRequestConfig,
          encryptedTlsKey,
        };
        needsWrite = true;
      }

      if (needsWrite) {
        await this.db.requests.put(patched);
        return patched;
      }
    }
    return saved;
  }

  async deleteRequest(requestId: string) {
    await collectionStorage.deleteRequest(this.db, requestId);
  }

  async listEnvironments() {
    const envs = await environmentStorage.listEnvironments(this.db);
    if (!this.cryptoKey) return envs;
    return Promise.all(envs.map((e) => this.decryptEnvironment(e)));
  }

  private async decryptEnvironment(e: Environment): Promise<Environment> {
    if (!e.encryptedVariables || !this.cryptoKey) return e;
    try {
      const sensitive = await decryptJson<KeyValue[]>(e.encryptedVariables, this.cryptoKey);
      const nonSensitive = e.variables.filter((v) => !v.sensitive);
      return {
        ...e,
        variables: [...nonSensitive, ...sensitive],
        encryptedVariables: undefined,
      };
    } catch {
      return e;
    }
  }

  async saveEnvironment(
    environment: Partial<Environment> & Pick<Environment, "name" | "variables">,
  ) {
    if (this.cryptoKey) {
      const sensitiveVars = environment.variables.filter((v) => v.sensitive && v.value);
      const plainVars = environment.variables.filter((v) => !v.sensitive || !v.value);
      if (sensitiveVars.length > 0) {
        const encryptedVariables = await encryptJson(sensitiveVars, this.cryptoKey);
        const redactedSensitive = sensitiveVars.map((v) => ({
          ...v,
          value: "[redacted]",
        }));
        return environmentStorage.saveEnvironment(this.db, {
          ...environment,
          variables: [...plainVars, ...redactedSensitive],
          encryptedVariables,
        });
      }
    }
    return environmentStorage.saveEnvironment(this.db, environment);
  }

  async deleteEnvironment(environmentId: string) {
    await environmentStorage.deleteEnvironment(this.db, environmentId);
  }

  async getActiveEnvironmentId() {
    return environmentStorage.getActiveEnvironmentId(this.db);
  }

  async setActiveEnvironmentId(environmentId?: string) {
    await environmentStorage.setActiveEnvironmentId(this.db, environmentId);
  }

  async getMeta<T>(key: string): Promise<T | undefined> {
    return metaStorage.getMeta<T>(this.db, key);
  }

  async setMeta(key: string, value: unknown) {
    await metaStorage.setMeta(this.db, key, value);
  }

  async getGraphQLSchema(endpoint: string) {
    return metaStorage.getGraphQLSchema(this.db, endpoint);
  }

  async saveGraphQLSchema(schema: CachedGraphQLSchema) {
    return metaStorage.saveGraphQLSchema(this.db, schema);
  }

  async addHistory(entry: Omit<HistoryEntry, "id" | "createdAt">) {
    return historyStorage.addHistory(this.db, entry);
  }

  async pinHistoryEntry(id: string, pinned: boolean) {
    await historyStorage.pinHistoryEntry(this.db, id, pinned);
  }

  async setHistoryEntryLabel(id: string, label: string) {
    await historyStorage.setHistoryEntryLabel(this.db, id, label);
  }

  async getRetentionSettings(): Promise<RetentionSettings | undefined> {
    return metaStorage.getRetentionSettings(this.db);
  }

  async setRetentionSettings(settings: RetentionSettings) {
    await metaStorage.setRetentionSettings(this.db, settings);
  }

  async getDefaultProtocolOptions(): Promise<DefaultProtocolOptions> {
    return metaStorage.getDefaultProtocolOptions(this.db);
  }

  async setDefaultProtocolOptions(defaults: DefaultProtocolOptions) {
    await metaStorage.setDefaultProtocolOptions(this.db, defaults);
  }

  async getStorageStats(): Promise<Record<string, number>> {
    return workspaceStorage.getStorageStats(this.db);
  }

  async listResponseExamples(): Promise<ResponseExample[]> {
    return metaStorage.listResponseExamples(this.db);
  }

  async saveResponseExample(example: ResponseExample): Promise<void> {
    await metaStorage.saveResponseExample(this.db, example);
  }

  async deleteResponseExample(id: string): Promise<void> {
    await metaStorage.deleteResponseExample(this.db, id);
  }

  async listDiffIgnoreRules(): Promise<DiffIgnoreRule[]> {
    return metaStorage.listDiffIgnoreRules(this.db);
  }

  async saveDiffIgnoreRules(rules: DiffIgnoreRule[]): Promise<void> {
    await metaStorage.saveDiffIgnoreRules(this.db, rules);
  }

  async clearHistory() {
    await historyStorage.clearHistory(this.db);
  }

  async deleteHistoryEntry(id: string) {
    await historyStorage.deleteHistoryEntry(this.db, id);
  }

  async deleteHistoryEntries(ids: string[]) {
    await historyStorage.deleteHistoryEntries(this.db, ids);
  }

  async listHistory(limit = 100) {
    return historyStorage.listHistory(this.db, limit);
  }

  async searchHistory(query: string, limit = 100) {
    return historyStorage.searchHistory(this.db, query, limit);
  }

  async listFlows() {
    return flowStorage.listFlows(this.db);
  }

  async saveFlow(flow: Partial<Flow> & Pick<Flow, "name" | "steps">) {
    return flowStorage.saveFlow(this.db, flow);
  }

  async deleteFlow(flowId: string) {
    await flowStorage.deleteFlow(this.db, flowId);
  }

  async listCookies(): Promise<StoredCookie[]> {
    return cookieStorage.listCookies(this.db);
  }

  async upsertCookie(cookie: StoredCookie): Promise<void> {
    await cookieStorage.upsertCookie(this.db, cookie);
  }

  async upsertCookies(cookies: StoredCookie[]): Promise<void> {
    await cookieStorage.upsertCookies(this.db, cookies);
  }

  async updateCookie(cookie: StoredCookie): Promise<void> {
    await cookieStorage.updateCookie(this.db, cookie);
  }

  async deleteCookie(cookieId: string): Promise<void> {
    await cookieStorage.deleteCookie(this.db, cookieId);
  }

  async clearCookies(domain?: string): Promise<void> {
    await cookieStorage.clearCookies(this.db, domain);
  }

  async exportWorkspace() {
    return workspaceStorage.exportWorkspace(this.db);
  }

  async importWorkspace(data: {
    collections: Collection[];
    folders: Folder[];
    requests: SavedRequest[];
    environments: Environment[];
    flows: Flow[];
    defaultProtocolOptions?: DefaultProtocolOptions;
  }): Promise<void> {
    await workspaceStorage.importWorkspace(this.db, data);
  }
}
