import { describe, expect, it } from "vitest";
import {
  importHarFile,
  importHoppscotchCollection,
  importInsomniaExport,
  importPostmanCollection,
  parseCurl,
  type RequestConfig,
} from "./index";

describe("third-party imports", () => {
  it("parses a basic curl command", () => {
    const parsed = parseCurl(
      `curl -H "Authorization: Bearer xyz" https://api.example.com/me`,
    );
    expect(parsed.url).toBe("https://api.example.com/me");
    expect(parsed.auth?.type).toBe("bearer");
  });

  it("imports Insomnia v4 exports with folders, requests, and environments", () => {
    const imported = importInsomniaExport({
      resources: [
        { _id: "wrk_1", _type: "workspace", name: "Insomnia API" },
        {
          _id: "fld_1",
          _type: "request_group",
          parentId: "wrk_1",
          name: "auth",
        },
        {
          _id: "req_1",
          _type: "request",
          parentId: "fld_1",
          name: "Login",
          method: "POST",
          url: "{{ base_url }}/login",
          headers: [{ name: "Content-Type", value: "application/json" }],
          body: {
            mimeType: "application/json",
            text: '{ "email": "ada@example.com" }',
          },
        },
        {
          _id: "env_1",
          _type: "environment",
          name: "staging",
          data: { base_url: "https://api.example.com" },
        },
      ],
    });

    expect(imported.collection.name).toBe("Insomnia API");
    expect(imported.folders[0].name).toBe("auth");
    expect(imported.requests[0].folderId).toBe(imported.folders[0].id);
    expect(imported.environments[0].variables).toContainEqual({
      key: "base_url",
      value: "https://api.example.com",
      enabled: true,
    });
  });

  it("imports Hoppscotch collections with nested folders", () => {
    const imported = importHoppscotchCollection({
      name: "Hoppscotch API",
      folders: [
        {
          name: "users",
          requests: [
            {
              name: "List users",
              method: "GET",
              endpoint: "{{base_url}}/users",
            },
          ],
        },
      ],
      environments: [
        {
          name: "local",
          variables: [{ key: "base_url", value: "http://localhost:3000" }],
        },
      ],
    });

    expect(imported.collection.name).toBe("Hoppscotch API");
    expect(imported.folders[0].name).toBe("users");
    expect(imported.requests[0].folderId).toBe(imported.folders[0].id);
    expect((imported.requests[0].request as RequestConfig).url).toBe(
      "{{base_url}}/users",
    );
  });

  it("imports HAR entries as REST requests", () => {
    const imported = importHarFile({
      log: {
        creator: { name: "Chrome DevTools" },
        entries: [
          {
            request: {
              method: "POST",
              url: "https://api.example.com/login?debug=1",
              headers: [
                { name: ":authority", value: "api.example.com" },
                { name: "Host", value: "api.example.com" },
                {
                  name: "Content-Type",
                  value: "application/x-www-form-urlencoded",
                },
                { name: "X-Trace", value: "abc" },
              ],
              queryString: [],
              postData: {
                mimeType: "application/x-www-form-urlencoded",
                params: [{ name: "email", value: "ada@example.com" }],
              },
            },
          },
          {
            request: {
              method: "PUT",
              url: "{{base_url}}/upload?kind=avatar",
              headers: [{ name: "Content-Type", value: "multipart/form-data" }],
              postData: {
                mimeType: "multipart/form-data; boundary=----invoke",
                params: [{ name: "file", value: "avatar.png" }],
              },
            },
          },
        ],
      },
    });

    expect(imported.collection.name).toBe("Chrome DevTools (HAR)");
    expect(imported.requests).toHaveLength(2);

    const login = imported.requests[0].request as RequestConfig;
    expect(login.url).toBe("https://api.example.com/login");
    expect(login.params).toContainEqual({
      key: "debug",
      value: "1",
      enabled: true,
    });
    expect(login.headers.map((header) => header.key.toLowerCase())).toEqual([
      "content-type",
      "x-trace",
    ]);
    expect(login.bodyMode).toBe("urlencoded");
    expect(JSON.parse(login.body)).toEqual([
      { key: "email", value: "ada@example.com", enabled: true },
    ]);

    const upload = imported.requests[1].request as RequestConfig;
    expect(upload.url).toBe("{{base_url}}/upload");
    expect(upload.params).toContainEqual({
      key: "kind",
      value: "avatar",
      enabled: true,
    });
    expect(upload.bodyMode).toBe("form-data");
  });

  it("imports Postman nested folders into Invoke folders", () => {
    const imported = importPostmanCollection({
      info: { name: "Postman API" },
      item: [
        {
          name: "auth",
          item: [
            {
              name: "oauth",
              item: [
                {
                  name: "Refresh token",
                  request: {
                    method: "POST",
                    url: "https://api.example.com/token",
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    const auth = imported.folders.find((folder) => folder.name === "auth");
    const oauth = imported.folders.find((folder) => folder.name === "oauth");
    expect(auth).toBeDefined();
    expect(oauth).toBeDefined();
    expect(oauth?.parentFolderId).toBe(auth?.id);
    expect(imported.requests[0].folderId).toBe(oauth?.id);
  });
});
