export type CodeExportTarget =
  | "curl"
  | "fetch"
  | "python-requests"
  | "node-axios"
  | "node-fetch"
  | "python-httpx"
  | "go-net-http"
  | "java-okhttp"
  | "kotlin-okhttp"
  | "ruby-net-http"
  | "php-guzzle"
  | "csharp-httpclient"
  | "rust-reqwest"
  | "powershell"
  | "httpie"
  | "graphql-fetch"
  | "graphql-apollo"
  | "graphql-urql";

export interface CodeSnippet {
  target: CodeExportTarget;
  label: string;
  language: "shell" | "javascript" | "python";
  filename: string;
  code: string;
}

export type WsCodeExportTarget =
  | "ws-wscat"
  | "ws-websocat"
  | "ws-javascript"
  | "ws-node-ws"
  | "ws-python-websockets";

export interface WsCodeSnippet {
  target: WsCodeExportTarget;
  label: string;
  language: "shell" | "javascript" | "python";
  filename: string;
  code: string;
}

export type GrpcCodeExportTarget =
  | "grpc-grpcurl"
  | "grpc-go"
  | "grpc-node"
  | "grpc-python"
  | "grpc-java"
  | "grpc-csharp"
  | "grpc-kotlin";

export interface GrpcCodeSnippet {
  target: GrpcCodeExportTarget;
  label: string;
  language: "shell" | "javascript" | "python" | "go" | "java" | "csharp" | "kotlin";
  filename: string;
  code: string;
}
