import type { RequestProtocol } from "./common";
import type { RequestOptions } from "./request";

export type NetworkOptions = Pick<
  RequestOptions,
  | "followRedirects"
  | "maxRedirects"
  | "verifySsl"
  | "allowPrivateAddresses"
  | "connectTimeoutMs"
  | "readTimeoutMs"
  | "proxy"
  | "tlsClientConfig"
>;

export interface ProtocolNetworkDefaults {
  options: NetworkOptions;
}

export type DefaultProtocolOptions = Record<RequestProtocol, ProtocolNetworkDefaults>;

export const INITIAL_PROTOCOL_DEFAULTS: DefaultProtocolOptions = {
  rest: {
    options: {
      followRedirects: true,
      maxRedirects: 10,
      verifySsl: true,
      allowPrivateAddresses: true,
      tlsClientConfig: {},
    },
  },
  graphql: {
    options: {
      followRedirects: true,
      maxRedirects: 10,
      verifySsl: true,
      allowPrivateAddresses: true,
      tlsClientConfig: {},
    },
  },
  websocket: {
    options: {
      verifySsl: true,
      allowPrivateAddresses: true,
      tlsClientConfig: {},
    },
  },
  grpc: {
    options: {
      verifySsl: true,
      allowPrivateAddresses: true,
      tlsClientConfig: {},
    },
  },
};

export const NETWORK_OPTION_KEYS = [
  "followRedirects",
  "maxRedirects",
  "verifySsl",
  "allowPrivateAddresses",
  "connectTimeoutMs",
  "readTimeoutMs",
  "proxy",
  "tlsClientConfig",
] as const satisfies readonly (keyof RequestOptions)[];
