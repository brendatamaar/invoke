import type { CodeEditorLang } from "../../../types";

export function getBodyInfo(response: any, responsePretty: boolean) {
  const ct = response
    ? ((Array.isArray(response.headers)
        ? response.headers.find((h: any) => h.key.toLowerCase() === "content-type")
            ?.value
        : "") ?? "")
    : "";
  const isJson = response
    ? ct.includes("json") ||
      (() => {
        try {
          JSON.parse(response.body);
          return true;
        } catch {
          return false;
        }
      })()
    : false;
  const lang: CodeEditorLang = isJson
    ? "json"
    : ct.includes("xml") || ct.includes("html")
      ? "xml"
      : "text";
  const displayBody =
    response && isJson && responsePretty
      ? prettyBody(response.body)
      : (response?.body ?? "");
  return { isJson, lang, displayBody };
}

export function responsePath(url?: string) {
  try {
    return new URL(url ?? "").pathname || "/";
  } catch {
    return url ?? "/";
  }
}

function prettyBody(body: string) {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}
