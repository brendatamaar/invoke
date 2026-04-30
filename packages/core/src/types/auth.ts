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
}

export interface AwsSigV4SignOptions {
  now?: Date;
}
