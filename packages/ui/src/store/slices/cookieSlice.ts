import type { AppState } from "../../types";

export type CookieSlice = Pick<
  AppState,
  "cookies" | "enableCookies" | "showCookieManager"
>;

export function createCookieSlice(): CookieSlice {
  return {
    cookies: [],
    enableCookies: true,
    showCookieManager: false,
  };
}
