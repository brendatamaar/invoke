import { describe, expect, it } from "vitest";
import {
  emptyGrpcRequest,
  generateGrpcBufCurl,
  generateGrpcCodeSnippet,
  isGrpcRequestConfig,
  parseGrpcurl,
  resolveGrpcRequest,
} from "../src/index";

describe("isGrpcRequestConfig", () => {
  it("returns true for a valid gRPC request config", () => {
    expect(isGrpcRequestConfig(emptyGrpcRequest())).toBe(true);
  });

  it("returns false for a REST request", () => {
    expect(
      isGrpcRequestConfig({ url: "http://example.com", method: "GET" }),
    ).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isGrpcRequestConfig({} as any)).toBe(false);
    expect(isGrpcRequestConfig({ url: "" } as any)).toBe(false);
  });
});

describe("resolveGrpcRequest", () => {
  it("resolves variables in address, service, method, metadata, and body", () => {
    const request = {
      ...emptyGrpcRequest(),
      address: "{{host}}:{{port}}",
      service: "{{pkg}}.Greeter",
      method: "{{rpc}}",
      metadata: [
        { key: "authorization", value: "Bearer {{token}}", enabled: true },
      ],
      body: '{"name":"{{name}}"}',
    };
    const env = {
      id: "1",
      name: "test",
      variables: [
        { key: "host", value: "api.example.com", enabled: true },
        { key: "port", value: "443", enabled: true },
        { key: "pkg", value: "hello", enabled: true },
        { key: "rpc", value: "SayHello", enabled: true },
        { key: "token", value: "abc123", enabled: true },
        { key: "name", value: "World", enabled: true },
      ],
      createdAt: 0,
      updatedAt: 0,
    };
    const { request: resolved, unresolved } = resolveGrpcRequest(request, env);
    expect(resolved.address).toBe("api.example.com:443");
    expect(resolved.service).toBe("hello.Greeter");
    expect(resolved.method).toBe("SayHello");
    expect(resolved.metadata[0].value).toBe("Bearer abc123");
    expect(resolved.body).toBe('{"name":"World"}');
    expect(unresolved).toEqual([]);
  });

  it("tracks unresolved variables", () => {
    const request = {
      ...emptyGrpcRequest(),
      address: "{{missing_host}}:50051",
    };
    const { request: resolved, unresolved } = resolveGrpcRequest(request);
    expect(resolved.address).toBe("{{missing_host}}:50051");
    expect(unresolved).toContain("missing_host");
  });
});

describe("parseGrpcurl", () => {
  it("parses a basic grpcurl command", () => {
    const result = parseGrpcurl(
      'grpcurl -plaintext -d \'{"name":"world"}\' localhost:50051 hello.Greeter/SayHello',
    );
    expect(result).not.toBeNull();
    expect(result!.address).toBe("localhost:50051");
    expect(result!.service).toBe("hello.Greeter");
    expect(result!.method).toBe("SayHello");
    expect(result!.body).toBe('{"name":"world"}');
    expect(result!.tls).toBe(false);
  });

  it("parses headers and timeout", () => {
    const result = parseGrpcurl(
      "grpcurl -rpc-header 'x-api-key: secret' -connect-timeout 5 api.example.com:443 pkg.Svc/Method",
    );
    expect(result!.tls).toBe(true);
    expect(result!.metadata).toContainEqual({
      key: "x-api-key",
      value: "secret",
      enabled: true,
    });
    expect(result!.timeoutMs).toBe(5000);
  });

  it("extracts bearer auth from metadata", () => {
    const result = parseGrpcurl(
      "grpcurl -rpc-header 'authorization: Bearer mytoken' -plaintext localhost:50051 svc/M",
    );
    expect(result!.auth).toEqual({ type: "bearer", token: "mytoken" });
    expect(
      result!.metadata.find((m) => m.key === "authorization"),
    ).toBeUndefined();
  });

  it("returns null for non-grpcurl commands", () => {
    expect(parseGrpcurl("curl http://example.com")).toBeNull();
  });
});

describe("gRPC codegen", () => {
  const request = {
    ...emptyGrpcRequest(),
    address: "api.example.com:443",
    service: "hello.Greeter",
    method: "SayHello",
    metadata: [{ key: "authorization", value: "Bearer token", enabled: true }],
    body: '{"name":"world"}',
    tls: true,
    timeoutMs: 5000,
  };

  it("generates grpcurl command", () => {
    const snippet = generateGrpcCodeSnippet(request, "grpc-grpcurl");
    expect(snippet.code).toContain("grpcurl");
    expect(snippet.code).toContain("-rpc-header");
    expect(snippet.code).toContain("authorization: Bearer token");
    expect(snippet.code).toContain("api.example.com:443");
    expect(snippet.code).toContain("hello.Greeter/SayHello");
    expect(snippet.code).not.toContain("-plaintext");
  });

  it("generates grpcurl with -plaintext for non-TLS", () => {
    const plainReq = { ...request, tls: false };
    const snippet = generateGrpcCodeSnippet(plainReq, "grpc-grpcurl");
    expect(snippet.code).toContain("-plaintext");
  });

  it("generates buf curl command", () => {
    const code = generateGrpcBufCurl(request);
    expect(code).toContain("buf");
    expect(code).toContain("curl");
    expect(code).toContain(
      "https://api.example.com:443/hello.Greeter/SayHello",
    );
  });

  it("generates Go gRPC client", () => {
    const snippet = generateGrpcCodeSnippet(request, "grpc-go");
    expect(snippet.code).toContain("grpc.NewClient");
    expect(snippet.code).toContain("hello.Greeter/SayHello");
    expect(snippet.code).toContain("metadata");
  });

  it("generates Node @grpc/grpc-js client", () => {
    const snippet = generateGrpcCodeSnippet(request, "grpc-node");
    expect(snippet.code).toContain("@grpc/grpc-js");
    expect(snippet.code).toContain("SayHello");
  });

  it("generates Python grpcio client", () => {
    const snippet = generateGrpcCodeSnippet(request, "grpc-python");
    expect(snippet.code).toContain("import grpc");
    expect(snippet.code).toContain("SayHello");
  });

  it("generates Java gRPC client", () => {
    const snippet = generateGrpcCodeSnippet(request, "grpc-java");
    expect(snippet.code).toContain("ManagedChannel");
    expect(snippet.code).toContain("Greeter");
  });

  it("generates C# gRPC client", () => {
    const snippet = generateGrpcCodeSnippet(request, "grpc-csharp");
    expect(snippet.code).toContain("GrpcChannel");
    expect(snippet.code).toContain("Greeter");
  });

  it("generates Kotlin gRPC client", () => {
    const snippet = generateGrpcCodeSnippet(request, "grpc-kotlin");
    expect(snippet.code).toContain("ManagedChannelBuilder");
    expect(snippet.code).toContain("Greeter");
  });
});
