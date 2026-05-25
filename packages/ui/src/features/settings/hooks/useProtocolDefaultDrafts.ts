import { useEffect, useState } from "react";
import { INITIAL_PROTOCOL_DEFAULTS } from "@invoke/core";
import type {
  DefaultProtocolOptions,
  ProtocolNetworkDefaults,
  RequestOptions,
  RequestProtocol,
  TlsClientConfig,
} from "@invoke/core";
import { buildProtocolDraft, cloneProtocolDefaults } from "../utils/draft";

export function useProtocolDefaultDrafts({
  showSettings,
  protocolDefaults,
  activeProtocol,
}: {
  showSettings: boolean;
  protocolDefaults: DefaultProtocolOptions;
  activeProtocol: RequestProtocol;
}) {
  const [drafts, setDrafts] = useState<DefaultProtocolOptions>(() =>
    cloneProtocolDefaults(protocolDefaults),
  );
  const [editingProtocol, setEditingProtocol] =
    useState<RequestProtocol>(activeProtocol);

  useEffect(() => {
    if (!showSettings) return;
    setDrafts(cloneProtocolDefaults(protocolDefaults));
    setEditingProtocol(activeProtocol);
  }, [activeProtocol, protocolDefaults, showSettings]);

  const activeDraft = drafts[editingProtocol];
  const activeOptions = activeDraft.options;
  const activeProxy = activeOptions.proxy;

  function updateProtocolDraft(
    protocol: RequestProtocol,
    updater: (draft: ProtocolNetworkDefaults) => ProtocolNetworkDefaults,
  ) {
    setDrafts((prev) => ({ ...prev, [protocol]: updater(prev[protocol]) }));
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
      return { ...draft, options: { ...draft.options, tlsClientConfig } };
    });
  }

  function resetActiveProtocolDefaults() {
    updateProtocolDraft(editingProtocol, () =>
      buildProtocolDraft(INITIAL_PROTOCOL_DEFAULTS[editingProtocol]),
    );
  }

  return {
    drafts,
    editingProtocol,
    activeOptions,
    activeProxy,
    setEditingProtocol,
    patchActiveOptions,
    ensureProxy,
    removeProxy,
    patchProxy,
    patchTlsClientConfig,
    resetActiveProtocolDefaults,
  };
}
