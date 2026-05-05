import type { Assertion, ExtractionRule } from "./assertion";
import type { AuthConfig } from "./auth";
import type { BodyMode, HttpMethod, KeyValue } from "./common";

export interface RequestConfig {
  method: HttpMethod;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  bodyMode: BodyMode;
  body: string;
  auth: AuthConfig;
  timeoutMs: number;
  variables?: KeyValue[];
  assertions?: Assertion[];
  extractionRules?: ExtractionRule[];
  options?: RequestOptions;
  scripts?: RequestScripts;
}

export interface RequestOptions {
  followRedirects?: boolean;
  maxRedirects?: number;
  verifySsl?: boolean;
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
