import {
  Cookie,
  Database,
  Download,
  Globe,
  Minus,
  Monitor,
  Moon,
  Network,
  Palette,
  Plus,
  Save,
  Sun,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  INITIAL_PROTOCOL_DEFAULTS,
  parseWorkspaceBackup,
  serializeWorkspace,
} from "@invoke/core";
import type {
  DefaultProtocolOptions,
  ProtocolNetworkDefaults,
  RequestOptions,
  RequestProtocol,
  RetentionSettings,
  TlsClientConfig,
} from "@invoke/core";
import { coreStore, useStore } from "../../../store";
import { useCollections, useCookies, useFolders, useFlows, useHistory, useRetentionSettings } from "../../../hooks/useDb";
import { Select } from "../../../components/shared/Select";
import type { GeneralDraft, SettingsTab, ThemeMode } from "../../../types";

const PROTOCOLS: RequestProtocol[] = ["rest", "graphql", "websocket", "grpc"];
const FONT_SIZE_MIN = 11;
const FONT_SIZE_MAX = 16;
const DEFAULT_RETENTION: RetentionSettings = {
  maxEntries: 0,
  retentionDays: 0,
};

const TAB_ITEMS: Array<{
  id: SettingsTab;
  label: string;
  Icon: typeof Palette;
}> = [
  { id: "general", label: "General", Icon: Palette },
  { id: "network", label: "Network", Icon: Globe },
  { id: "proxy", label: "Proxy", Icon: Network },
  { id: "storage", label: "Storage", Icon: Database },
  { id: "backup", label: "Backup", Icon: Save },
];

const PROTOCOL_LABELS: Record<RequestProtocol, string> = {
  rest: "REST",
  graphql: "GraphQL",
  websocket: "WebSocket",
  grpc: "gRPC",
};

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function getStoredTheme(): ThemeMode {
  const stored = localStorage.getItem("theme");
  if (isThemeMode(stored)) return stored;

  const applied = document.documentElement.getAttribute("data-theme");
  if (applied === "light" || applied === "dark") return applied;
  return "dark";
}

function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode !== "system") return mode;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyUiFontSize(size: number) {
  document.documentElement.style.fontSize = `${size}px`;
}

function buildGeneralDraft(
  uiFontSize: number,
  editorWordWrap: boolean,
): GeneralDraft {
  return {
    theme: getStoredTheme(),
    uiFontSize,
    editorWordWrap,
  };
}

function cloneOptions(options?: RequestOptions): RequestOptions {
  const next: RequestOptions = { ...(options ?? {}) };
  if (options?.proxy) next.proxy = { ...options.proxy };
  if (options?.tlsClientConfig)
    next.tlsClientConfig = { ...options.tlsClientConfig };
  return next;
}

function buildProtocolDraft(source: {
  options?: RequestOptions;
}): ProtocolNetworkDefaults {
  return {
    options: cloneOptions(source.options),
  };
}

function cloneProtocolDefaults(
  defaults: DefaultProtocolOptions,
): DefaultProtocolOptions {
  return {
    rest: buildProtocolDraft(defaults.rest),
    graphql: buildProtocolDraft(defaults.graphql),
    websocket: buildProtocolDraft(defaults.websocket),
    grpc: buildProtocolDraft(defaults.grpc),
  };
}

function sameValue(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function clampNumber(value: number, min: number, max?: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max ?? value);
}

function numericInputValue(
  raw: string,
  fallback: number,
  min: number,
  max?: number,
) {
  if (raw.trim() === "") return fallback;
  return clampNumber(Number(raw), min, max);
}

function isRedirectProtocol(protocol: RequestProtocol) {
  return protocol === "rest" || protocol === "graphql";
}

function hasAdvancedTimeouts(protocol: RequestProtocol) {
  return protocol === "rest" || protocol === "graphql" || protocol === "grpc";
}

function FieldRow({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-3">
      <label className="text-xs text-[var(--text-2)]">{label}</label>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">{children}</div>
        {hint && <p className="mt-1 text-2xs text-[var(--text-3)]">{hint}</p>}
      </div>
    </div>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-xs text-[var(--text-3)]">{description}</p>
      )}
    </div>
  );
}

function CheckboxControl({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-[var(--text-2)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.currentTarget.checked)}
        className="h-4 w-4"
      />
      {label}
    </label>
  );
}

export function SettingsPanel() {
  const {
    showSettings,
    set,
    request,
    protocolDefaults,
    requests,
    environments,
    uiFontSize,
    editorWordWrap,
    settingsTab,
    addToast,
  } = useStore();
  const collections = useCollections();
  const folders = useFolders();
  const flows = useFlows();
  const history = useHistory();
  const cookies = useCookies();
  const retentionSettings = useRetentionSettings();

  const activeProtocol = (request.protocol ?? "rest") as RequestProtocol;
  const [tab, setTab] = useState<SettingsTab>("general");
  const [general, setGeneral] = useState<GeneralDraft>(() =>
    buildGeneralDraft(uiFontSize, editorWordWrap),
  );
  const [drafts, setDrafts] = useState<DefaultProtocolOptions>(() =>
    cloneProtocolDefaults(protocolDefaults),
  );
  const [editingProtocol, setEditingProtocol] =
    useState<RequestProtocol>(activeProtocol);
  const [retentionDraft, setRetentionDraft] = useState<RetentionSettings>(
    retentionSettings ?? DEFAULT_RETENTION,
  );
  const [storageStats, setStorageStats] = useState<Record<string, number>>({});
  const [confirmClearCookies, setConfirmClearCookies] = useState(false);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const persistedGeneral = useMemo(
    () => buildGeneralDraft(uiFontSize, editorWordWrap),
    [editorWordWrap, uiFontSize],
  );

  const persistedDrafts = useMemo(
    () => cloneProtocolDefaults(protocolDefaults),
    [protocolDefaults],
  );

  const normalizedRetention = retentionSettings ?? DEFAULT_RETENTION;

  const dirty = useMemo(
    () =>
      !sameValue(general, persistedGeneral) ||
      !sameValue(retentionDraft, normalizedRetention) ||
      PROTOCOLS.some(
        (protocol) => !sameValue(drafts[protocol], persistedDrafts[protocol]),
      ),
    [
      drafts,
      general,
      normalizedRetention,
      persistedDrafts,
      persistedGeneral,
      retentionDraft,
    ],
  );

  useEffect(() => {
    if (!showSettings) return;

    setTab(settingsTab ?? "general");
    setGeneral(buildGeneralDraft(uiFontSize, editorWordWrap));
    setDrafts(cloneProtocolDefaults(protocolDefaults));
    setEditingProtocol(activeProtocol);
    setRetentionDraft(retentionSettings ?? DEFAULT_RETENTION);
    setConfirmClearCookies(false);
    coreStore
      .getStorageStats()
      .then(setStorageStats)
      .catch(() => {});
  }, [
    activeProtocol,
    editorWordWrap,
    protocolDefaults,
    retentionSettings,
    showSettings,
    settingsTab,
    uiFontSize,
  ]);

  useEffect(() => {
    if (!showSettings) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape")
        set({ showSettings: false, settingsTab: undefined });
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [set, showSettings]);

  if (!showSettings) return null;

  const activeDraft = drafts[editingProtocol];
  const activeOptions = activeDraft.options;
  const activeProxy = activeOptions.proxy;

  function updateProtocolDraft(
    protocol: RequestProtocol,
    updater: (draft: ProtocolNetworkDefaults) => ProtocolNetworkDefaults,
  ) {
    setDrafts((prev) => ({
      ...prev,
      [protocol]: updater(prev[protocol]),
    }));
  }

  function patchActiveOptions(patch: Partial<RequestOptions>) {
    updateProtocolDraft(editingProtocol, (draft) => ({
      ...draft,
      options: { ...draft.options, ...patch },
    }));
  }

  function ensureProxy() {
    patchActiveOptions({ proxy: { type: "http", url: "" } });
  }

  function removeProxy() {
    updateProtocolDraft(editingProtocol, (draft) => {
      const { proxy: _proxy, ...options } = draft.options;
      return { ...draft, options };
    });
  }

  function patchProxy(patch: Partial<NonNullable<RequestOptions["proxy"]>>) {
    updateProtocolDraft(editingProtocol, (draft) => ({
      ...draft,
      options: {
        ...draft.options,
        proxy: {
          type: draft.options.proxy?.type ?? "http",
          url: draft.options.proxy?.url ?? "",
          ...draft.options.proxy,
          ...patch,
        },
      },
    }));
  }

  function patchTlsClientConfig(patch: Partial<TlsClientConfig>) {
    updateProtocolDraft(editingProtocol, (draft) => {
      const tlsClientConfig: TlsClientConfig = {
        ...(draft.options.tlsClientConfig ?? {}),
        ...patch,
      };
      for (const key of Object.keys(tlsClientConfig) as Array<
        keyof TlsClientConfig
      >) {
        if (!tlsClientConfig[key]) delete tlsClientConfig[key];
      }
      return {
        ...draft,
        options: {
          ...draft.options,
          tlsClientConfig,
        },
      };
    });
  }

  function resetActiveProtocolDefaults() {
    updateProtocolDraft(editingProtocol, () =>
      buildProtocolDraft(INITIAL_PROTOCOL_DEFAULTS[editingProtocol]),
    );
  }

  async function handleExportWorkspace() {
    try {
      const data = await coreStore.exportWorkspace();
      const backup = serializeWorkspace(data);
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoke-workspace-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast("success", "Workspace exported");
    } catch (e) {
      addToast("error", String(e));
    }
  }

  async function handleImportWorkspace(file?: File) {
    if (!file) return;
    try {
      const text = await file.text();
      const backup = parseWorkspaceBackup(text);
      await coreStore.importWorkspace(backup);
      const [envs, defaults] = await Promise.all([
        coreStore.listEnvironments(),
        coreStore.getDefaultProtocolOptions(),
      ]);
      const reqs = await coreStore.listRequests();
      set({
        environments: envs,
        requests: reqs,
        protocolDefaults: defaults,
      });
      addToast(
        "success",
        `Workspace imported: ${backup.collections.length} collections, ${backup.environments.length} environments, ${backup.flows.length} flows`,
      );
    } catch (e) {
      addToast("error", String(e));
    } finally {
      if (backupInputRef.current) backupInputRef.current.value = "";
    }
  }

  async function handleClearCookies() {
    if (!confirmClearCookies) {
      setConfirmClearCookies(true);
      return;
    }

    try {
      await coreStore.clearCookies();
      setConfirmClearCookies(false);
      addToast("info", "Cookies cleared");
    } catch (e) {
      addToast("error", String(e));
    }
  }

  async function handleSave() {
    const effectiveTheme = resolveTheme(general.theme);
    document.documentElement.setAttribute("data-theme", effectiveTheme);
    localStorage.setItem("theme", general.theme);

    applyUiFontSize(general.uiFontSize);
    localStorage.setItem("uiFontSize", String(general.uiFontSize));
    localStorage.setItem("editorWordWrap", String(general.editorWordWrap));

    try {
      await coreStore.setDefaultProtocolOptions(drafts);
      await coreStore.setRetentionSettings(retentionDraft);
      set({
        editorWordWrap: general.editorWordWrap,
        uiFontSize: general.uiFontSize,
        protocolDefaults: cloneProtocolDefaults(drafts),
        showSettings: false,
        settingsTab: undefined,
      });
    } catch (e) {
      addToast("error", String(e));
      set({
        editorWordWrap: general.editorWordWrap,
        uiFontSize: general.uiFontSize,
        showSettings: false,
        settingsTab: undefined,
      });
    }
  }

  function handleCancel() {
    set({ showSettings: false, settingsTab: undefined });
  }

  function renderNavItem(item: (typeof TAB_ITEMS)[number]) {
    const active = tab === item.id;
    const Icon = item.Icon;
    return (
      <button
        key={item.id}
        onClick={() => setTab(item.id)}
        className={`flex w-full items-center gap-2 border-l-2 px-3 py-2 text-left text-xs transition-colors ${
          active
            ? "border-[var(--accent)] bg-[var(--bg-3)] text-[var(--fg-0)]"
            : "border-transparent text-[var(--fg-2)] hover:bg-[var(--bg-2)] hover:text-[var(--fg-1)]"
        }`}
      >
        <Icon size={14} />
        <span>{item.label}</span>
      </button>
    );
  }

  function renderGeneralSection() {
    return (
      <div className="flex flex-col gap-5">
        <SectionTitle
          title="Appearance"
          description="Interface preferences for the workspace."
        />

        <FieldRow label="Theme">
          <div className="inline-flex overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-2)] p-0.5">
            {[
              { value: "light" as ThemeMode, label: "Light", Icon: Sun },
              { value: "dark" as ThemeMode, label: "Dark", Icon: Moon },
              { value: "system" as ThemeMode, label: "System", Icon: Monitor },
            ].map(({ value, label, Icon }) => {
              const selected = general.theme === value;
              return (
                <button
                  key={value}
                  onClick={() =>
                    setGeneral((draft) => ({ ...draft, theme: value }))
                  }
                  className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs transition-colors ${
                    selected
                      ? "bg-[var(--accent-faint)] text-[var(--accent)]"
                      : "text-[var(--text-3)] hover:bg-[var(--bg-3)] hover:text-[var(--text-2)]"
                  }`}
                >
                  <Icon size={13} />
                  {label}
                </button>
              );
            })}
          </div>
        </FieldRow>

        <FieldRow label="UI font size" hint="Range: 11 to 16px.">
          <button
            onClick={() =>
              setGeneral((draft) => ({
                ...draft,
                uiFontSize: clampNumber(
                  draft.uiFontSize - 1,
                  FONT_SIZE_MIN,
                  FONT_SIZE_MAX,
                ),
              }))
            }
            disabled={general.uiFontSize <= FONT_SIZE_MIN}
            className="btn p-1.5 disabled:cursor-not-allowed disabled:opacity-40"
            title="Decrease font size"
          >
            <Minus size={13} />
          </button>
          <span className="w-10 text-center font-mono text-xs text-[var(--text-1)]">
            {general.uiFontSize}
          </span>
          <button
            onClick={() =>
              setGeneral((draft) => ({
                ...draft,
                uiFontSize: clampNumber(
                  draft.uiFontSize + 1,
                  FONT_SIZE_MIN,
                  FONT_SIZE_MAX,
                ),
              }))
            }
            disabled={general.uiFontSize >= FONT_SIZE_MAX}
            className="btn p-1.5 disabled:cursor-not-allowed disabled:opacity-40"
            title="Increase font size"
          >
            <Plus size={13} />
          </button>
        </FieldRow>

        <FieldRow label="Editor word wrap">
          <CheckboxControl
            checked={general.editorWordWrap}
            onChange={(checked) =>
              setGeneral((draft) => ({ ...draft, editorWordWrap: checked }))
            }
            label="Wrap long lines in code editors"
          />
        </FieldRow>
      </div>
    );
  }

  function renderProtocolPills() {
    return (
      <div className="flex flex-wrap gap-2">
        {PROTOCOLS.map((protocol) => {
          const active = protocol === editingProtocol;
          return (
            <button
              key={protocol}
              onClick={() => setEditingProtocol(protocol)}
              className={`rounded border px-3 py-1.5 text-xs transition-colors ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent-faint)] text-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--text-3)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-2)] hover:text-[var(--text-2)]"
              }`}
            >
              {PROTOCOL_LABELS[protocol]}
            </button>
          );
        })}
      </div>
    );
  }

  function renderNetworkSection() {
    const showRedirects = isRedirectProtocol(editingProtocol);
    const showAdvancedTimeouts = hasAdvancedTimeouts(editingProtocol);
    const followsRedirects = activeOptions.followRedirects ?? true;
    const tls = activeOptions.tlsClientConfig ?? {};

    return (
      <div className="flex flex-col gap-5">
        <SectionTitle
          title="Network policy"
          description="These settings apply to all requests of this protocol. Per-request timeout and retry policy are in each request's Options tab."
        />
        {renderProtocolPills()}

        <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-4">
          {showAdvancedTimeouts && (
            <>
              <FieldRow
                label="Connect timeout (ms)"
                hint="Blank uses the executor default."
              >
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={activeOptions.connectTimeoutMs ?? ""}
                  onChange={(e) =>
                    patchActiveOptions({
                      connectTimeoutMs: e.currentTarget.value
                        ? numericInputValue(e.currentTarget.value, 0, 0)
                        : undefined,
                    })
                  }
                  placeholder="default"
                  className="input w-32 text-xs"
                />
              </FieldRow>

              <FieldRow
                label="Read timeout (ms)"
                hint="Blank uses the executor default."
              >
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={activeOptions.readTimeoutMs ?? ""}
                  onChange={(e) =>
                    patchActiveOptions({
                      readTimeoutMs: e.currentTarget.value
                        ? numericInputValue(e.currentTarget.value, 0, 0)
                        : undefined,
                    })
                  }
                  placeholder="default"
                  className="input w-32 text-xs"
                />
              </FieldRow>
            </>
          )}

          {showRedirects && (
            <>
              <FieldRow label="Follow redirects">
                <CheckboxControl
                  checked={followsRedirects}
                  onChange={(checked) =>
                    patchActiveOptions({ followRedirects: checked })
                  }
                />
              </FieldRow>

              {followsRedirects && (
                <FieldRow label="Max redirects">
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={activeOptions.maxRedirects ?? 10}
                    onChange={(e) =>
                      patchActiveOptions({
                        maxRedirects: numericInputValue(
                          e.currentTarget.value,
                          10,
                          0,
                          30,
                        ),
                      })
                    }
                    className="input w-20 text-xs"
                  />
                </FieldRow>
              )}
            </>
          )}

          <FieldRow label="Verify TLS">
            <CheckboxControl
              checked={activeOptions.verifySsl ?? true}
              onChange={(checked) => patchActiveOptions({ verifySsl: checked })}
            />
          </FieldRow>

          <FieldRow label="Allow private IPs">
            <CheckboxControl
              checked={activeOptions.allowPrivateAddresses ?? true}
              onChange={(checked) =>
                patchActiveOptions({ allowPrivateAddresses: checked })
              }
            />
          </FieldRow>

          <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-4">
            <SectionTitle
              title="TLS client certificate"
              description="Optional client certificate settings for this protocol."
            />
            <FieldRow label="CA certificate">
              <textarea
                rows={3}
                value={tls.caCertPem ?? ""}
                onChange={(e) =>
                  patchTlsClientConfig({ caCertPem: e.currentTarget.value })
                }
                placeholder="-----BEGIN CERTIFICATE-----"
                className="input min-w-0 flex-1 resize-y font-mono text-2xs"
              />
            </FieldRow>
            <FieldRow label="Client certificate">
              <textarea
                rows={3}
                value={tls.clientCertPem ?? ""}
                onChange={(e) =>
                  patchTlsClientConfig({
                    clientCertPem: e.currentTarget.value,
                  })
                }
                placeholder="-----BEGIN CERTIFICATE-----"
                className="input min-w-0 flex-1 resize-y font-mono text-2xs"
              />
            </FieldRow>
            <FieldRow label="Client key">
              <textarea
                rows={3}
                value={tls.clientKeyPem ?? ""}
                onChange={(e) =>
                  patchTlsClientConfig({ clientKeyPem: e.currentTarget.value })
                }
                placeholder="-----BEGIN PRIVATE KEY-----"
                className="input min-w-0 flex-1 resize-y font-mono text-2xs"
              />
            </FieldRow>
            <FieldRow label="Server name">
              <input
                type="text"
                value={tls.serverName ?? ""}
                onChange={(e) =>
                  patchTlsClientConfig({ serverName: e.currentTarget.value })
                }
                placeholder="override.example.com"
                className="input min-w-0 flex-1 text-xs"
              />
            </FieldRow>
          </div>

          <div className="pt-1">
            <button
              onClick={resetActiveProtocolDefaults}
              className="text-2xs text-[var(--text-3)] underline hover:text-[var(--text-1)]"
            >
              Reset {PROTOCOL_LABELS[editingProtocol]} defaults to factory
              values
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderProxySection() {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <SectionTitle
            title={`${PROTOCOL_LABELS[editingProtocol]} proxy`}
            description="Proxy policy for all requests in this protocol."
          />
          <button
            onClick={activeProxy ? removeProxy : ensureProxy}
            className="btn text-xs"
          >
            {activeProxy ? "Remove" : "Configure"}
          </button>
        </div>

        {renderProtocolPills()}

        {activeProxy ? (
          <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-4">
            <FieldRow label="Type">
              <Select
                value={activeProxy.type}
                onChange={(e) =>
                  patchProxy({
                    type: e.target.value as "http" | "socks5",
                  })
                }
                size="xs"
                wrapperClassName="w-32"
              >
                <option value="http">HTTP</option>
                <option value="socks5">SOCKS5</option>
              </Select>
            </FieldRow>
            <FieldRow label="URL">
              <input
                type="text"
                value={activeProxy.url}
                onChange={(e) => patchProxy({ url: e.currentTarget.value })}
                placeholder="http://127.0.0.1:8080"
                className="input min-w-0 flex-1 text-xs"
              />
            </FieldRow>
            <FieldRow label="Username">
              <input
                type="text"
                value={activeProxy.username ?? ""}
                onChange={(e) =>
                  patchProxy({ username: e.currentTarget.value })
                }
                className="input min-w-0 flex-1 text-xs"
              />
            </FieldRow>
            <FieldRow label="Password">
              <input
                type="password"
                value={activeProxy.password ?? ""}
                onChange={(e) =>
                  patchProxy({ password: e.currentTarget.value })
                }
                className="input min-w-0 flex-1 text-xs"
              />
            </FieldRow>
          </div>
        ) : (
          <div className="border border-dashed border-[var(--border)] bg-[var(--bg-2)] px-4 py-5 text-center text-xs text-[var(--text-3)]">
            No proxy configured for {PROTOCOL_LABELS[editingProtocol]}.
          </div>
        )}
      </div>
    );
  }

  function renderStorageSection() {
    const statItems = [
      {
        label: "Collections",
        value: storageStats.collections ?? collections.length,
      },
      { label: "Requests", value: storageStats.requests ?? requests.length },
      { label: "History", value: storageStats.history ?? history.length },
      {
        label: "Environments",
        value: storageStats.environments ?? environments.length,
      },
      { label: "Flows", value: storageStats.flows ?? flows.length },
      { label: "Folders", value: storageStats.folders ?? folders.length },
    ];

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <SectionTitle
            title="Retention"
            description="Pinned history entries are never deleted by cleanup."
          />
          <FieldRow label="Max entries" hint="0 keeps unlimited entries.">
            <input
              type="number"
              min={0}
              step={100}
              value={retentionDraft.maxEntries}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => {
                const value = numericInputValue(e.currentTarget.value, 0, 0);
                setRetentionDraft((draft) => ({ ...draft, maxEntries: value }));
              }}
              className="input w-24 text-xs"
            />
          </FieldRow>
          <FieldRow label="Keep days" hint="0 keeps entries indefinitely.">
            <input
              type="number"
              min={0}
              step={1}
              value={retentionDraft.retentionDays}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => {
                const value = numericInputValue(e.currentTarget.value, 0, 0);
                setRetentionDraft((draft) => ({ ...draft, retentionDays: value }));
              }}
              className="input w-24 text-xs"
            />
          </FieldRow>
        </div>

        <div className="flex flex-col gap-3">
          <SectionTitle title="Stats" />
          <div className="grid grid-cols-3 gap-2">
            {statItems.map(({ label, value }) => (
              <div
                key={label}
                className="rounded-md bg-[var(--bg-2)] px-3 py-3 text-center"
              >
                <div className="font-mono text-sm font-semibold text-[var(--text-1)]">
                  {value}
                </div>
                <div className="mt-1 text-2xs text-[var(--text-3)]">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <SectionTitle title="Data management" />
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() =>
                set({
                  showSettings: false,
                  settingsTab: undefined,
                  showClearHistoryModal: true,
                })
              }
              className="btn flex items-center justify-center gap-2 text-xs"
            >
              <Trash2 size={13} />
              Clear History
            </button>
            <button
              onClick={handleClearCookies}
              disabled={cookies.length === 0}
              className="btn flex items-center justify-center gap-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Cookie size={13} />
              {confirmClearCookies ? "Confirm Clear" : "Clear Cookies"}
            </button>
          </div>
          {confirmClearCookies && (
            <div className="flex items-center gap-3 bg-[var(--danger-bg)] px-3 py-2 text-xs text-[var(--text-2)]">
              <span className="flex-1">
                Clear all stored cookies from this workspace?
              </span>
              <button
                onClick={() => setConfirmClearCookies(false)}
                className="btn text-2xs"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderBackupSection() {
    return (
      <div className="flex flex-col gap-5">
        <SectionTitle
          title="Workspace backup"
          description="Export or import collections, environments, and flows as JSON."
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2 rounded-md bg-[var(--bg-2)] p-4">
            <button
              onClick={handleExportWorkspace}
              className="btn btn-primary flex items-center justify-center gap-2 text-xs"
            >
              <Download size={13} />
              Export workspace
            </button>
            <p className="text-2xs text-[var(--text-3)]">
              Save the current workspace to a timestamped JSON file.
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-md bg-[var(--bg-2)] p-4">
            <input
              ref={backupInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) =>
                handleImportWorkspace(e.currentTarget.files?.[0])
              }
            />
            <button
              onClick={() => backupInputRef.current?.click()}
              className="btn flex items-center justify-center gap-2 text-xs"
            >
              <Upload size={13} />
              Import workspace
            </button>
            <p className="text-2xs text-[var(--text-3)]">
              Merge a workspace backup into the current local data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleCancel}
    >
      <div
        className="flex max-h-[80vh] w-[760px] max-w-[calc(100vw-32px)] flex-col rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-pop)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
          <span className="text-sm font-semibold">Settings</span>
          <button
            onClick={handleCancel}
            className="ml-auto rounded p-1 text-[var(--text-3)] hover:bg-[var(--surface-2)]"
            title="Close settings"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <nav className="w-[170px] shrink-0 border-r border-[var(--border)] bg-[var(--bg-1)] p-2">
            {TAB_ITEMS.map(renderNavItem)}
          </nav>

          <div className="min-h-[430px] flex-1 overflow-y-auto p-5">
            {tab === "general" && renderGeneralSection()}
            {tab === "network" && renderNetworkSection()}
            {tab === "proxy" && renderProxySection()}
            {tab === "storage" && renderStorageSection()}
            {tab === "backup" && renderBackupSection()}
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-[var(--border)] px-4 py-3">
          <div className="mr-auto flex items-center gap-2 text-2xs text-[var(--text-3)]">
            {dirty && (
              <>
                <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                <span>Unsaved changes</span>
              </>
            )}
          </div>
          <button onClick={handleCancel} className="btn px-4 py-1.5 text-xs">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary px-4 py-1.5 text-xs"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
