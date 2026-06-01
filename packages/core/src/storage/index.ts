import type {
  CachedGraphQLSchema,
  Collection,
  DefaultProtocolOptions,
  DiffIgnoreRule,
  Environment,
  Flow,
  Folder,
  HistoryEntry,
  ProtocolRequestConfig,
  RequestDraft,
  RequestProtocol,
  ResponseExample,
  RetentionSettings,
  SavedRequest,
  StoredCookie,
} from "../types";
import * as collectionStorage from "./collections";
import * as cookieStorage from "./cookies";
import { db } from "./db";
import * as environmentStorage from "./environments";
import * as flowStorage from "./flows";
import * as historyStorage from "./history";
import * as metaStorage from "./meta";
import * as workspaceStorage from "./workspace";

export class InvokeStore {
  private db = db;

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
    return collectionStorage.listRequests(this.db, collectionId);
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
    return collectionStorage.saveRequest(this.db, request, name, collectionId, options);
  }

  async deleteRequest(requestId: string) {
    await collectionStorage.deleteRequest(this.db, requestId);
  }

  async listEnvironments() {
    return environmentStorage.listEnvironments(this.db);
  }

  async saveEnvironment(
    environment: Partial<Environment> & Pick<Environment, "name" | "variables">,
  ) {
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
