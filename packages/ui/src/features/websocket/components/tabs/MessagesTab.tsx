import { useReducer, useRef } from "react";
import type { WsSavedMessage } from "@invoke/core";
import { useStore } from "../../../../store";
import { webSocketSend } from "../../api";
import type { MsgTemplate, SavedMessageDraft } from "../../types";
import { resolveDynamicVars } from "../../utils/body";
import { SavedMessagesModal } from "../SavedMessagesModal";
import { WebSocketComposer } from "../WebSocketComposer";

export function MessagesTab() {
  const {
    wsSessions,
    activeWsSessionId,
    setWsSession,
    addToast,
    websocketRequest,
    setWebsocketRequest,
  } = useStore();
  const activeSession = wsSessions.find((s) => s.id === activeWsSessionId) ?? wsSessions[0];
  type TabState = {
    showTemplates: boolean;
    showSavedModal: boolean;
    selectedSaved: string | null;
    expandedSaved: string | null;
    editDraft: SavedMessageDraft | null;
    message: string;
    binaryMode: boolean;
  };
  const [tabState, tabDispatch] = useReducer(
    (prev: TabState, patch: Partial<TabState>) => ({ ...prev, ...patch }),
    {
      showTemplates: false,
      showSavedModal: false,
      selectedSaved: null,
      expandedSaved: null,
      editDraft: null,
      message: "",
      binaryMode: false,
    },
  );
  const {
    showTemplates,
    showSavedModal,
    selectedSaved,
    expandedSaved,
    editDraft,
    message,
    binaryMode,
  } = tabState;
  const setShowTemplates = (v: boolean) => tabDispatch({ showTemplates: v });
  const setShowSavedModal = (v: boolean) => tabDispatch({ showSavedModal: v });
  const setSelectedSaved = (v: string | null) => tabDispatch({ selectedSaved: v });
  const setExpandedSaved = (v: string | null) => tabDispatch({ expandedSaved: v });
  const setEditDraft = (v: SavedMessageDraft | null) => tabDispatch({ editDraft: v });
  const setMessage = (v: string) => tabDispatch({ message: v });
  const setBinaryMode = (v: boolean) => tabDispatch({ binaryMode: v });
  const subIdRef = useRef(0);

  const websocketState = activeSession?.state ?? "disconnected";
  const savedMessages = websocketRequest.savedMessages ?? [];
  const preset = websocketRequest.preset ?? "none";
  const gqlSubscribed = !!activeSession?.activeGqlSubscriptionId;
  const currentSubId = activeSession?.activeGqlSubscriptionId ?? "";

  const send = async () => {
    if (!message.trim() || !activeSession) return;
    const body = resolveDynamicVars(message);
    setMessage("");
    try {
      await webSocketSend(activeSession.connectionId ?? "", body, binaryMode);
    } catch (e) {
      setMessage(body);
      addToast("error", String(e));
    }
  };

  const sendGqlSubscribe = async () => {
    if (!activeSession) return;
    const id = `sub_${++subIdRef.current}`;
    let vars: unknown = {};
    try {
      vars = JSON.parse(websocketRequest.presetVariables ?? "{}");
    } catch {
      /* invalid JSON */
    }
    const frame = JSON.stringify({
      type: "subscribe",
      id,
      payload: { query: websocketRequest.presetQuery ?? "", variables: vars },
    });
    setWsSession(activeSession.id, { activeGqlSubscriptionId: id });
    try {
      await webSocketSend(activeSession.connectionId ?? "", frame);
    } catch (e) {
      setWsSession(activeSession.id, { activeGqlSubscriptionId: undefined });
      addToast("error", String(e));
    }
  };

  const sendGqlUnsubscribe = async () => {
    if (!activeSession) return;
    const frame = JSON.stringify({ type: "complete", id: currentSubId });
    setWsSession(activeSession.id, { activeGqlSubscriptionId: undefined });
    try {
      await webSocketSend(activeSession.connectionId ?? "", frame);
    } catch (e) {
      setWsSession(activeSession.id, { activeGqlSubscriptionId: currentSubId });
      addToast("error", String(e));
    }
  };

  const addSavedMessage = () => {
    setWebsocketRequest({
      savedMessages: [
        ...savedMessages,
        { id: crypto.randomUUID(), label: "", body: "", type: "text", autoSend: false },
      ],
    });
  };

  const addFromTemplate = (tpl: MsgTemplate) => {
    setWebsocketRequest({
      savedMessages: [
        ...savedMessages,
        {
          id: crypto.randomUUID(),
          label: tpl.label,
          body: tpl.body,
          type: tpl.type,
          autoSend: false,
        },
      ],
    });
    setShowTemplates(false);
  };

  const updateSavedMessage = (id: string, partial: Partial<WsSavedMessage>) => {
    setWebsocketRequest({
      savedMessages: savedMessages.map((m) => (m.id === id ? { ...m, ...partial } : m)),
    });
  };

  const removeSavedMessage = (id: string) => {
    setWebsocketRequest({
      savedMessages: savedMessages.filter((m) => m.id !== id),
    });
  };

  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      <WebSocketComposer
        preset={preset}
        websocketRequest={websocketRequest}
        websocketState={websocketState}
        message={message}
        binaryMode={binaryMode}
        gqlSubscribed={gqlSubscribed}
        onRequestChange={setWebsocketRequest}
        onMessageChange={setMessage}
        onBinaryModeChange={setBinaryMode}
        onSend={send}
        onSubscribe={sendGqlSubscribe}
        onUnsubscribe={sendGqlUnsubscribe}
        onOpenSaved={() => setShowSavedModal(true)}
      />

      {showSavedModal && (
        <SavedMessagesModal
          savedMessages={savedMessages}
          selectedSaved={selectedSaved}
          expandedSaved={expandedSaved}
          editDraft={editDraft}
          showTemplates={showTemplates}
          onClose={() => setShowSavedModal(false)}
          onAdd={addSavedMessage}
          onAddTemplate={addFromTemplate}
          onSelectSaved={setSelectedSaved}
          onExpandedSaved={setExpandedSaved}
          onEditDraft={setEditDraft}
          onUpdateSaved={updateSavedMessage}
          onRemoveSaved={removeSavedMessage}
          onShowTemplates={setShowTemplates}
          onLoad={(msg) => {
            setMessage(msg.body);
            setBinaryMode(msg.type === "binary");
            setShowSavedModal(false);
            setSelectedSaved(null);
          }}
        />
      )}
    </div>
  );
}
