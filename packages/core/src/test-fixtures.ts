import {
  emptyRequest,
  toRequestConfig,
  type Collection,
  type ExecuteResponse,
  type Flow,
  type Folder,
  type MockRoute,
  type SavedRequest,
} from "./index";

export function responseFixture(): ExecuteResponse {
  return {
    status: 200,
    statusText: "200 OK",
    headers: [
      { key: "Content-Type", value: "application/json", enabled: true },
    ],
    body: "{}",
    timing: {
      dnsMs: 0,
      tcpMs: 0,
      tlsMs: 0,
      ttfbMs: 1,
      transferMs: 1,
      totalMs: 2,
    },
    requestSize: 0,
    responseSize: 2,
  };
}

export function mockRoute(partial: Partial<MockRoute> = {}): MockRoute {
  return {
    id: "route_1",
    enabled: true,
    method: "GET",
    pathPattern: "/users/:id",
    status: 200,
    headers: [
      { key: "Content-Type", value: "application/json", enabled: true },
    ],
    body: "{}",
    latencyMs: 0,
    ...partial,
  };
}

export function flowFixture(partial: Partial<Flow> = {}): Flow {
  return {
    id: "flow_1",
    name: "Smoke flow",
    createdAt: 1,
    updatedAt: 1,
    steps: [
      {
        id: "request_1",
        type: "request",
        name: "List users",
        request: {
          ...emptyRequest(),
          url: "https://api.example.com/users",
          headers: [
            { key: "Accept", value: "application/json", enabled: true },
          ],
        },
      },
    ],
    ...partial,
  };
}

export function fixtureCollection(): {
  collection: Collection;
  folders: Folder[];
  requests: SavedRequest[];
} {
  const collection: Collection = {
    id: "col_1",
    name: "JSONPlaceholder",
    variables: [
      {
        key: "base_url",
        value: "https://jsonplaceholder.typicode.com",
        enabled: true,
      },
    ],
    sortOrder: 1,
    createdAt: 1,
    updatedAt: 1,
  };
  const request = toRequestConfig({
    ...emptyRequest(),
    method: "POST",
    url: "{{base_url}}/users",
    headers: [
      { key: "Content-Type", value: "application/json", enabled: true },
    ],
    bodyMode: "json",
    body: '{ "name": "Ada" }',
  });
  const folder: Folder = {
    id: "fld_1",
    collectionId: collection.id,
    parentFolderId: null,
    name: "users",
    variables: [],
    sortOrder: 1,
    createdAt: 1,
    updatedAt: 1,
  };
  return {
    collection,
    folders: [folder],
    requests: [
      {
        id: "req_1",
        collectionId: collection.id,
        folderId: folder.id,
        name: "Create user",
        protocol: "rest",
        request,
        sortOrder: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    ],
  };
}
