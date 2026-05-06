import { Moon, Sun, X } from "lucide-react";
import { useState } from "react";
import { useStore } from "../../store";
import type { RequestOptions, RequestProtocol } from "@invoke/core";

interface Draft {
  theme: string;
  timeoutMs: number;
  options: RequestOptions;
}

function buildDraft(
  protocol: RequestProtocol,
  request: { timeoutMs: number; options?: RequestOptions },
  graphqlRequest: { timeoutMs: number; options?: RequestOptions },
  websocketRequest: { timeoutMs?: number; options?: RequestOptions },
  grpcRequest: { timeoutMs: number; options?: RequestOptions },
): Draft {
  let timeoutMs: number;
  let options: RequestOptions;
  if (protocol === "graphql") {
    timeoutMs = graphqlRequest.timeoutMs;
    options = { ...graphqlRequest.options };
  } else if (protocol === "websocket") {
    timeoutMs = websocketRequest.timeoutMs ?? 30000;
    options = { ...websocketRequest.options };
  } else if (protocol === "grpc") {
    timeoutMs = grpcRequest.timeoutMs;
    options = { ...grpcRequest.options };
  } else {
    timeoutMs = request.timeoutMs;
    options = { ...request.options };
  }

  return {
    theme: document.documentElement.getAttribute("data-theme") ?? "dark",
    timeoutMs,
    options,
  };
}

export function SettingsPanel() {
  const {
    showSettings,
    set,
    request,
    setRequest,
    graphqlRequest,
    setGraphqlRequest,
    websocketRequest,
    setWebsocketRequest,
    grpcRequest,
    setGrpcRequest,
    collections,
    requests,
    history,
  } = useStore();

  const protocol = (request.protocol ?? "rest") as RequestProtocol;

  const [draft, setDraft] = useState<Draft>(() =>
    buildDraft(
      protocol,
      request,
      graphqlRequest,
      websocketRequest,
      grpcRequest,
    ),
  );

  if (!showSettings) return null;

  const isDark = draft.theme === "dark";

  const opts = draft.options as {
    verifySsl?: boolean;
    followRedirects?: boolean;
    proxy?: {
      type: "http" | "socks5";
      url: string;
      username?: string;
      password?: string;
    };
  };

  function patchOptions(patch: Partial<RequestOptions>) {
    setDraft((d) => ({ ...d, options: { ...d.options, ...patch } }));
  }

  function ensureProxy() {
    if (!opts.proxy) patchOptions({ proxy: { type: "http", url: "" } });
  }

  function removeProxy() {
    const { proxy: _, ...rest } = draft.options;
    setDraft((d) => ({ ...d, options: rest }));
  }

  function patchProxy(patch: object) {
    patchOptions({
      proxy: {
        type: opts.proxy?.type ?? "http",
        url: opts.proxy?.url ?? "",
        ...opts.proxy,
        ...patch,
      },
    });
  }

  function handleSave() {
    document.documentElement.setAttribute("data-theme", draft.theme);
    localStorage.setItem("theme", draft.theme);

    if (protocol === "graphql")
      setGraphqlRequest({ timeoutMs: draft.timeoutMs, options: draft.options });
    else if (protocol === "websocket")
      setWebsocketRequest({
        timeoutMs: draft.timeoutMs,
        options: draft.options,
      });
    else if (protocol === "grpc")
      setGrpcRequest({
        timeoutMs: draft.timeoutMs,
        options: draft.options as never,
      });
    else setRequest({ timeoutMs: draft.timeoutMs, options: draft.options });

    set({ showSettings: false });
  }

  function handleCancel() {
    set({ showSettings: false });
  }

  const Row = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[var(--text-2)] w-32 shrink-0">
        {label}
      </span>
      <div className="flex-1 flex items-center gap-2">{children}</div>
    </div>
  );

  const Section = ({ title }: { title: string }) => (
    <p className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-3">
      {title}
    </p>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleCancel}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl flex flex-col max-h-[85vh]"
        style={{ width: 420 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
          <span className="text-sm font-semibold">Settings</span>
          <button
            onClick={handleCancel}
            className="ml-auto p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-3)]"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-5 overflow-y-auto flex-1">
          {/* Appearance */}
          <div>
            <Section title="Appearance" />
            <Row label="Theme">
              <div className="flex items-center gap-2">
                <Sun size={13} className="text-[var(--text-3)]" />
                <button
                  role="switch"
                  aria-checked={isDark}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      theme: isDark ? "light" : "dark",
                    }))
                  }
                  className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none ${
                    isDark ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                      isDark ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
                <Moon size={13} className="text-[var(--text-3)]" />
                <span className="text-xs text-[var(--text-2)] ml-1 capitalize">
                  {draft.theme}
                </span>
              </div>
            </Row>
          </div>

          {/* Request Defaults */}
          <div>
            <Section title={`Request Defaults · ${protocol}`} />
            <div className="flex flex-col gap-3">
              <Row label="Timeout (ms)">
                <input
                  type="number"
                  min={100}
                  step={500}
                  value={draft.timeoutMs}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      timeoutMs: Number(e.target.value),
                    }))
                  }
                  className="input text-xs w-28"
                />
              </Row>
              {(protocol === "rest" || protocol === "graphql") && (
                <Row label="Follow Redirects">
                  <input
                    type="checkbox"
                    checked={opts.followRedirects ?? true}
                    onChange={(e) =>
                      patchOptions({ followRedirects: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                </Row>
              )}
              <Row label="Verify TLS">
                <input
                  type="checkbox"
                  checked={opts.verifySsl ?? true}
                  onChange={(e) =>
                    patchOptions({ verifySsl: e.target.checked })
                  }
                  className="w-4 h-4"
                />
              </Row>
            </div>
          </div>

          {/* Proxy */}
          <div>
            <div className="flex items-center mb-3">
              <Section title="Proxy" />
              <button
                onClick={opts.proxy ? removeProxy : ensureProxy}
                className="ml-auto text-2xs text-[var(--text-3)] hover:text-[var(--text)] underline"
              >
                {opts.proxy ? "Remove" : "Configure"}
              </button>
            </div>
            {opts.proxy && (
              <div className="flex flex-col gap-3">
                <Row label="Type">
                  <select
                    value={opts.proxy.type}
                    onChange={(e) => patchProxy({ type: e.target.value })}
                    className="input text-xs"
                  >
                    <option value="http">HTTP</option>
                    <option value="socks5">SOCKS5</option>
                  </select>
                </Row>
                <Row label="URL">
                  <input
                    type="text"
                    value={opts.proxy.url}
                    onChange={(e) => patchProxy({ url: e.target.value })}
                    placeholder="http://127.0.0.1:8080"
                    className="input text-xs flex-1"
                  />
                </Row>
                <Row label="Username">
                  <input
                    type="text"
                    value={opts.proxy.username ?? ""}
                    onChange={(e) => patchProxy({ username: e.target.value })}
                    className="input text-xs flex-1"
                  />
                </Row>
                <Row label="Password">
                  <input
                    type="password"
                    value={opts.proxy.password ?? ""}
                    onChange={(e) => patchProxy({ password: e.target.value })}
                    className="input text-xs flex-1"
                  />
                </Row>
              </div>
            )}
          </div>

          {/* Stats */}
          <div>
            <Section title="Data" />
            <div className="flex gap-4">
              {[
                { label: "Collections", value: collections.length },
                { label: "Requests", value: requests.length },
                { label: "History", value: history.length },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex-1 bg-[var(--surface-2)] rounded-lg px-3 py-2 text-center"
                >
                  <div className="text-sm font-semibold">{value}</div>
                  <div className="text-2xs text-[var(--text-3)] mt-0.5">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--border)]">
          <button onClick={handleCancel} className="btn text-xs px-4 py-1.5">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary text-xs px-4 py-1.5"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
