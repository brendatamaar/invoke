import yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import {
  emptyRequest,
  exportCollectionAsOpenApi,
  importOpenApiSpec,
  toRequestConfig,
  type Collection,
  type Folder,
  type RequestConfig,
  type SavedRequest,
} from "../src/index";

describe("OpenAPI import/export", () => {
  it("imports OpenAPI operations into tag folders with placeholders", async () => {
    const imported = await importOpenApiSpec({
      openapi: "3.0.3",
      info: { title: "Petstore" },
      servers: [{ url: "https://petstore.example.com" }],
      paths: {
        "/pet/{petId}": {
          get: {
            tags: ["pet"],
            operationId: "getPetById",
            parameters: [
              {
                name: "petId",
                in: "path",
                required: true,
                schema: { type: "integer" },
              },
              { name: "include", in: "query", schema: { type: "string" } },
              { name: "X-Client", in: "header", schema: { type: "string" } },
            ],
          },
        },
      },
    });

    expect(imported.collection.name).toBe("Petstore");
    expect(imported.folders).toHaveLength(1);
    expect(imported.folders[0].name).toBe("pet");
    expect(imported.requests[0].folderId).toBe(imported.folders[0].id);
    expect(imported.environments).toHaveLength(1);
    expect(imported.environments[0].variables).toContainEqual({
      key: "base_url",
      value: "https://petstore.example.com",
      enabled: true,
    });
    expect(imported.requests[0].request).toMatchObject({
      method: "GET",
      url: "{{base_url}}/pet/{{petId}}",
      params: [{ key: "include", value: "{{include}}", enabled: true }],
      headers: [{ key: "X-Client", value: "{{X-Client}}", enabled: true }],
    });
  });

  it("merges OpenAPI allOf schemas when generating request body examples", async () => {
    const imported = await importOpenApiSpec({
      openapi: "3.0.3",
      info: { title: "Petstore" },
      paths: {
        "/pet": {
          post: {
            tags: ["pet"],
            operationId: "createPet",
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/PetBase" },
                      {
                        type: "object",
                        properties: {
                          tag: { type: "string", example: "featured" },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          PetBase: {
            type: "object",
            properties: {
              id: { type: "integer", example: 123 },
              name: { type: "string", example: "Nori" },
            },
          },
        },
      },
    });

    expect(JSON.parse(String((imported.requests[0].request as RequestConfig).body))).toEqual({
      id: 123,
      name: "Nori",
      tag: "featured",
    });
  });

  it("exports REST collections as OpenAPI 3.0.3", () => {
    const now = Date.now();
    const collection: Collection = {
      id: "collection-1",
      name: "Users API",
      variables: [],
      sortOrder: now,
      createdAt: now,
      updatedAt: now,
    };
    const folder: Folder = {
      id: "folder-1",
      collectionId: collection.id,
      parentFolderId: null,
      name: "users",
      variables: [],
      sortOrder: now,
      createdAt: now,
      updatedAt: now,
    };
    const requests: SavedRequest[] = [
      {
        id: "request-1",
        collectionId: collection.id,
        folderId: folder.id,
        name: "Get user",
        protocol: "rest",
        request: toRequestConfig({
          ...emptyRequest(),
          method: "GET",
          url: "https://api.example.com/users/{{userId}}",
          params: [{ key: "include", value: "profile", enabled: true }],
          headers: [
            { key: "X-Trace", value: "abc", enabled: true },
            { key: "Authorization", value: "Bearer token", enabled: true },
          ],
        }),
        sortOrder: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "request-2",
        collectionId: collection.id,
        folderId: folder.id,
        name: "Create user",
        protocol: "rest",
        request: toRequestConfig({
          ...emptyRequest(),
          method: "POST",
          url: "https://api.example.com/users",
          bodyMode: "json",
          body: '{ "name": "Ada" }',
        }),
        sortOrder: now + 1,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const spec = yaml.load(exportCollectionAsOpenApi(collection, requests, [folder])) as any;

    expect(spec.openapi).toBe("3.0.3");
    expect(spec.info.title).toBe("Users API");
    expect(spec.tags).toEqual([{ name: "users" }]);

    const getUser = spec.paths["/users/{userId}"].get;
    expect(getUser.tags).toEqual(["users"]);
    expect(getUser.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "userId",
          in: "path",
          required: true,
        }),
        expect.objectContaining({
          name: "include",
          in: "query",
          example: "profile",
        }),
        expect.objectContaining({
          name: "X-Trace",
          in: "header",
          example: "abc",
        }),
      ]),
    );
    expect(getUser.parameters.some((parameter: any) => parameter.name === "Authorization")).toBe(
      false,
    );

    expect(spec.paths["/users"].post.requestBody.content["application/json"].example).toEqual({
      name: "Ada",
    });
  });

  it("resolves local OpenAPI component refs before walking operations", async () => {
    const imported = await importOpenApiSpec({
      openapi: "3.0.3",
      info: { title: "Component Ref API" },
      servers: [{ url: "https://api.example.com" }],
      paths: {
        "/accounts/{accountId}": {
          parameters: [{ $ref: "#/components/parameters/AccountId" }],
          get: {
            tags: ["accounts"],
            operationId: "retrieveAccount",
            parameters: [
              { $ref: "#/components/parameters/Expand" },
              { $ref: "#/components/parameters/ApiVersion" },
            ],
          },
        },
      },
      components: {
        parameters: {
          AccountId: {
            name: "accountId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          Expand: { name: "expand", in: "query", schema: { type: "string" } },
          ApiVersion: {
            name: "Stripe-Version",
            in: "header",
            schema: { type: "string" },
          },
        },
      },
    });

    expect(imported.requests[0].request).toMatchObject({
      url: "{{base_url}}/accounts/{{accountId}}",
      params: [{ key: "expand", value: "{{expand}}", enabled: true }],
      headers: [{ key: "Stripe-Version", value: "{{Stripe-Version}}", enabled: true }],
    });
  });

  it("imports a vendored GitHub OpenAPI subset", async () => {
    const imported = await importOpenApiSpec({
      openapi: "3.0.3",
      info: { title: "GitHub REST API" },
      servers: [{ url: "https://api.github.com" }],
      paths: {
        "/repos/{owner}/{repo}/issues": {
          get: {
            tags: ["issues"],
            operationId: "issues/list-for-repo",
            parameters: [
              {
                name: "owner",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
              {
                name: "repo",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
              {
                name: "state",
                in: "query",
                schema: { type: "string", enum: ["open", "closed", "all"] },
              },
              {
                name: "X-GitHub-Api-Version",
                in: "header",
                schema: { type: "string" },
              },
            ],
          },
        },
      },
    });

    expect(imported.collection.name).toBe("GitHub REST API");
    expect(imported.folders[0].name).toBe("issues");
    expect(imported.environments[0].variables).toContainEqual({
      key: "base_url",
      value: "https://api.github.com",
      enabled: true,
    });
    expect(imported.requests[0].request).toMatchObject({
      method: "GET",
      url: "{{base_url}}/repos/{{owner}}/{{repo}}/issues",
      params: [{ key: "state", value: "{{state}}", enabled: true }],
      headers: [
        {
          key: "X-GitHub-Api-Version",
          value: "{{X-GitHub-Api-Version}}",
          enabled: true,
        },
      ],
    });
  });

  it("throws a clear error for external OpenAPI refs in the browser importer", async () => {
    await expect(
      importOpenApiSpec({
        openapi: "3.0.3",
        info: { title: "Remote Ref API" },
        paths: {
          "/pets": {
            get: {
              tags: ["pets"],
              parameters: [
                {
                  $ref: "https://example.com/openapi.yaml#/components/parameters/PetId",
                },
              ],
            },
          },
        },
      }),
    ).rejects.toThrow(/external \$ref not supported in browser context/);
  });

  it("returns a useful OpenAPI import error for malformed specs", async () => {
    await expect(
      importOpenApiSpec({
        openapi: "3.0.3",
        info: { title: "Malformed" },
      }),
    ).rejects.toThrow(/OpenAPI import failed: OpenAPI document is missing required paths object/);
  });
});
