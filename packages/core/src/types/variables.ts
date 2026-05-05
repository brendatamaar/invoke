import type { KeyValue } from "./common";

export interface VariableScope {
  name?: string;
  variables: KeyValue[] | Record<string, string>;
}
