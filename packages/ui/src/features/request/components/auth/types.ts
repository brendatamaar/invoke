import type { AuthConfig } from "@invoke/core";

export type AuthFormProps = {
  auth: AuthConfig;
  setAuth: (auth: AuthConfig) => void;
};
