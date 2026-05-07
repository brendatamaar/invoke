import type { AuthType } from "./common";

export interface AuthConfig {
  type: AuthType;
  username?: string;
  password?: string;
  token?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyIn?: "header" | "query";
  tokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsSessionToken?: string;
  awsRegion?: string;
  awsService?: string;
  // OAuth2 authorization-code flow extras
  flow?: "client_credentials" | "authorization_code";
  authUrl?: string;
  redirectUri?: string;
  pkce?: boolean;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number; // unix ms
}

export interface AwsSigV4SignOptions {
  now?: Date;
}
