import type { Assertion, ExtractionRule } from "./assertion";
import type { AuthConfig } from "./auth";
import type { BodyMode, HttpMethod, KeyValue } from "./common";

export interface RetryPolicy {
  maxRetries: number;
  retryOnTimeout: boolean;
  retryOn5xx: boolean;
  backoffMs: number;
}

export interface RequestConfig {
  method: HttpMethod;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  bodyMode: BodyMode;
  body: string;
  bodyFileName?: string;
  auth: AuthConfig;
  timeoutMs: number;
  variables?: KeyValue[];
  pathVariables?: KeyValue[];
  assertions?: Assertion[];
  extractionRules?: ExtractionRule[];
  options?: RequestOptions;
  scripts?: RequestScripts;
  retryPolicy?: RetryPolicy;
}

export type HttpVersion = "auto" | "http1" | "h2c";

export interface RequestOptions {
  followRedirects?: boolean;
  maxRedirects?: number;
  verifySsl?: boolean;
  allowPrivateAddresses?: boolean;
  connectTimeoutMs?: number;
  readTimeoutMs?: number;
  httpVersion?: HttpVersion;
  tlsClientConfig?: TlsClientConfig;
  proxy?: {
    type: "http" | "socks5";
    url: string;
    username?: string;
    password?: string;
  };
}

export interface TlsClientConfig {
  clientCertPem?: string;
  clientKeyPem?: string;
  caCertPem?: string;
  serverName?: string;
}

export interface RequestScripts {
  preRequest?: string;
  postResponse?: string;
}
