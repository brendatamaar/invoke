import yaml from "js-yaml";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import {
  exportCollectionZip,
  importInvokeZip,
  importYamlFiles,
  type Folder,
  type SavedRequest,
} from "./index";
import { fixtureCollection } from "./test-fixtures";

describe("invoke YAML", () => {
  it("loads YAML with JSON schema instead of JavaScript tags", async () => {
    const file = new File(
      ["type: !!js/function 'function () { return 1 }'"],
      "bad.invoke.yaml",
    );
    await expect(importYamlFiles([file])).rejects.toThrow();
  });

  it("round-trips a .invoke.zip export back into the same collection structure", async () => {
    const { collection, folders, requests } = fixtureCollection();
    const blob = await exportCollectionZip(collection, requests, folders);
    const imported = await importInvokeZip(blob);

    expect(imported.collection.name).toBe(collection.name);
    expect(imported.folders).toHaveLength(1);
    expect(imported.folders[0].name).toBe(folders[0].name);
    expect(imported.requests).toHaveLength(1);
    expect(imported.requests[0].name).toBe(requests[0].name);
    expect(imported.requests[0].folderId).toBe(imported.folders[0].id);
    expect(imported.requests[0].protocol).toBe("rest");
    expect(imported.requests[0].request).toMatchObject({
      method: "POST",
      url: "{{base_url}}/users",
      bodyMode: "json",
      body: '{ "name": "Ada" }',
    });
  });

  it("exports request YAML in the PRD flat request format", async () => {
    const { collection, folders, requests } = fixtureCollection();
    const blob = await exportCollectionZip(collection, requests, folders);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const folderEntry = Object.values(zip.files).find((entry) =>
      entry.name.endsWith("folder.invoke.yaml"),
    );
    const requestEntry = Object.values(zip.files).find((entry) =>
      entry.name.endsWith("create-user.invoke.yaml"),
    );
    expect(folderEntry).toBeDefined();
    expect(requestEntry).toBeDefined();

    const folderDoc = yaml.load(await folderEntry!.async("string")) as any;
    expect(folderDoc).toMatchObject({
      invoke_version: "1.0",
      type: "folder",
      id: folders[0].id,
      name: "users",
    });

    const doc = yaml.load(await requestEntry!.async("string")) as any;
    expect(doc.request).toBeUndefined();
    expect(doc).toMatchObject({
      invoke_version: "1.0",
      type: "request",
      folderId: folders[0].id,
      name: "Create user",
      protocol: "rest",
      method: "POST",
      url: "{{base_url}}/users",
      headers: { "Content-Type": "application/json" },
      body: { type: "json", content: '{ "name": "Ada" }' },
    });
  });

  it("disambiguates duplicate folder and request slugs in ZIP export", async () => {
    const { collection, requests } = fixtureCollection();
    const duplicateFolders: Folder[] = [
      {
        id: "fld_a",
        collectionId: collection.id,
        parentFolderId: null,
        name: "users",
        variables: [],
        sortOrder: 1,
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: "fld_b",
        collectionId: collection.id,
        parentFolderId: null,
        name: "users",
        variables: [],
        sortOrder: 2,
        createdAt: 1,
        updatedAt: 1,
      },
    ];
    const duplicateRequests: SavedRequest[] = [
      {
        ...requests[0],
        id: "req_a",
        folderId: duplicateFolders[0].id,
        name: "Create user",
      },
      {
        ...requests[0],
        id: "req_b",
        folderId: duplicateFolders[0].id,
        name: "Create user",
      },
      {
        ...requests[0],
        id: "req_c",
        folderId: duplicateFolders[1].id,
        name: "Create user",
      },
    ];

    const blob = await exportCollectionZip(
      collection,
      duplicateRequests,
      duplicateFolders,
    );
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const names = Object.keys(zip.files);

    expect(
      names.some((name) => name.includes("users/create-user.invoke.yaml")),
    ).toBe(true);
    expect(
      names.some((name) => name.includes("users/create-user-2.invoke.yaml")),
    ).toBe(true);
    expect(
      names.some((name) => name.includes("users-2/create-user.invoke.yaml")),
    ).toBe(true);
  });
});
