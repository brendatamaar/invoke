import type { AppState } from "../../types";

export type CookieSlice = Pick<AppState, "enableCookies" | "showCookieManager">;

export function createCookieSlice(): CookieSlice {
  return {
    enableCookies: true,
    showCookieManager: false,
  };
}
