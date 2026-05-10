import type { RequestOptions } from "@invoke/core";

export interface SettingsDraft {
  theme: string;
  timeoutMs: number;
  options: RequestOptions;
}
