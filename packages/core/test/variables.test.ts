import { describe, expect, it } from "vitest";
import {
  exportEnvText,
  isSensitiveVariableName,
  parseEnvText,
  resolveTemplate,
} from "../src/index";

describe("variables", () => {
  it("resolves environment and dynamic variables", () => {
    const result = resolveTemplate("{{base_url}}/{{$randomInt}}", {
      base_url: "https://api.example.com",
    });
    expect(result.value).toMatch(/^https:\/\/api\.example\.com\/\d+$/);
    expect(result.unresolved).toEqual([]);
  });

  it("tracks unresolved variables", () => {
    const result = resolveTemplate("{{missing}}", {});
    expect(result.value).toBe("{{missing}}");
    expect(result.unresolved).toEqual(["missing"]);
  });

  it("parses and exports .env variables with sensitive defaults", () => {
    const variables = parseEnvText(`
      # local config
      API_URL=https://api.example.com
      API_TOKEN="secret\\nline"
      export PUBLIC_NAME=Ada
    `);

    expect(variables).toEqual([
      {
        key: "API_URL",
        value: "https://api.example.com",
        enabled: true,
        sensitive: false,
      },
      {
        key: "API_TOKEN",
        value: "secret\nline",
        enabled: true,
        sensitive: true,
      },
      {
        key: "PUBLIC_NAME",
        value: "Ada",
        enabled: true,
        sensitive: false,
      },
    ]);
    expect(isSensitiveVariableName("CLIENT_SECRET")).toBe(true);
    expect(exportEnvText(variables)).toBe(
      "API_URL=https://api.example.com\nPUBLIC_NAME=Ada",
    );
    expect(exportEnvText(variables, { includeSensitive: true })).toContain(
      'API_TOKEN="secret\\nline"',
    );
  });
});
