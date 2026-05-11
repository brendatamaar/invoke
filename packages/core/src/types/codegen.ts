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
