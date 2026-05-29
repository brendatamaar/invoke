import type { StatusBadgeProps } from "../../types";

const HTTP_STATUS_LABELS: Record<number, string> = {
  100: "Continue",
  101: "Switching Protocols",
  102: "Processing",
  103: "Early Hints",
  200: "OK",
  201: "Created",
  202: "Accepted",
  203: "Non-Authoritative Information",
  204: "No Content",
  205: "Reset Content",
  206: "Partial Content",
  207: "Multi-Status",
  208: "Already Reported",
  226: "IM Used",
  300: "Multiple Choices",
  301: "Moved Permanently",
  302: "Found",
  303: "See Other",
  304: "Not Modified",
  305: "Use Proxy",
  307: "Temporary Redirect",
  308: "Permanent Redirect",
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  406: "Not Acceptable",
  407: "Proxy Authentication Required",
  408: "Request Timeout",
  409: "Conflict",
  410: "Gone",
  411: "Length Required",
  412: "Precondition Failed",
  413: "Content Too Large",
  414: "URI Too Long",
  415: "Unsupported Media Type",
  416: "Range Not Satisfiable",
  417: "Expectation Failed",
  418: "I'm a teapot",
  421: "Misdirected Request",
  422: "Unprocessable Content",
  423: "Locked",
  424: "Failed Dependency",
  425: "Too Early",
  426: "Upgrade Required",
  428: "Precondition Required",
  429: "Too Many Requests",
  431: "Request Header Fields Too Large",
  451: "Unavailable For Legal Reasons",
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
  505: "HTTP Version Not Supported",
  506: "Variant Also Negotiates",
  507: "Insufficient Storage",
  508: "Loop Detected",
  510: "Not Extended",
  511: "Network Authentication Required",
};

export function StatusBadge({ status, showLabel = false }: StatusBadgeProps) {
  let color = "var(--fg-2)";
  let bg = "transparent";
  let border = "var(--line-2)";
  const label = showLabel ? HTTP_STATUS_LABELS[status] : null;

  if (status === 0) {
    color = "var(--danger)";
    bg = "var(--danger-bg)";
    border = "var(--danger)";
  } else if (status >= 200 && status < 300) {
    color = "var(--ok)";
    bg = "var(--ok-bg)";
    border = "var(--ok)";
  } else if (status >= 300 && status < 400) {
    color = "var(--info)";
    bg = "var(--info-bg)";
    border = "var(--info)";
  } else if (status >= 400) {
    color = "var(--danger)";
    bg = "var(--danger-bg)";
    border = "var(--danger)";
  }

  return (
    <span
      className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded-[var(--r-2)] inline-block leading-4 border"
      style={{ color, background: bg, borderColor: border }}
    >
      {status === 0 ? "ERR" : [status, label].filter(Boolean).join(" ")}
    </span>
  );
}
