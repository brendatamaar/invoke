import { useEffect, useMemo, useReducer, useRef } from "react";
import { GripVertical } from "lucide-react";
import type { RequestConfig, SavedRequest } from "@invoke/core";
import { useStore, coreStore } from "../../../store";
import { webSocketClose } from "../../websocket/api";
import { MethodBadge } from "../../../components/shared/MethodBadge";
import { protocolMethod } from "../../../components/shared/methodUtils";
import { CollectionRequestMenu } from "./tree/CollectionRequestMenu";
import { CollectionRequestModals } from "./tree/CollectionRequestModals";
import { openSavedRequest } from "./tree/openSavedRequest";

const COMPARE_FIELDS: (keyof RequestConfig)[] = [
  "method",
  "url",
  "params",
  "headers",
  "bodyMode",
  "body",
  "auth",
  "timeoutMs",
  "variables",
  "assertions",
  "extractionRules",
  "options",
  "scripts",
  "retryPolicy",
];

export function CollectionRequestNode({
  request,
  collectionId,
}: {
  request: SavedRequest;
  collectionId: string;
}) {
  const store = useStore();
  type NodeState = {
    menuOpen: boolean;
    showDetail: boolean;
    confirmDelete: boolean;
    confirmDisconnect: boolean;
    duplicateName: string | null;
    dragging: boolean;
  };
  const [state, dispatch] = useReducer(
    (prev: NodeState, patch: Partial<NodeState>) => ({ ...prev, ...patch }),
    {
      menuOpen: false,
      showDetail: false,
      confirmDelete: false,
      confirmDisconnect: false,
      duplicateName: null,
      dragging: false,
    },
  );
  const { menuOpen, showDetail, confirmDelete, confirmDisconnect, duplicateName, dragging } = state;
  const setMenuOpen = (v: boolean) => dispatch({ menuOpen: v });
  const setShowDetail = (v: boolean) => dispatch({ showDetail: v });
  const setConfirmDelete = (v: boolean) => dispatch({ confirmDelete: v });
  const setConfirmDisconnect = (v: boolean) => dispatch({ confirmDisconnect: v });
  const setDuplicateName = (v: string | null) => dispatch({ duplicateName: v });
  const setDragging = (v: boolean) => dispatch({ dragging: v });
  const menuRef = useRef<HTMLDivElement>(null);
  const pendingOpenRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const isActive = store.request.id === request.id;
  const isDirty = useMemo(
    () =>
      isActive &&
      JSON.stringify(pickFields(store.request)) !== JSON.stringify(pickFields(request.request)),
    [isActive, store.request, request.request],
  );

  const doOpen = () => openSavedRequest(request, store);
  const open = () => {
    const activeSession =
      store.wsSessions.find((session) => session.id === store.activeWsSessionId) ??
      store.wsSessions[0];
    const activeWs = ["connected", "connecting"].includes(activeSession?.state ?? "");
    const anyWs = store.wsSessions.some((session) =>
      ["connected", "connecting"].includes(session.state),
    );
    if (
      (request.protocol === "websocket" && activeWs) ||
      (request.protocol !== "websocket" && anyWs)
    ) {
      pendingOpenRef.current = doOpen;
      setConfirmDisconnect(true);
      return;
    }
    doOpen();
  };

  const duplicate = async (name: string) => {
    setDuplicateName(null);
    try {
      await coreStore.saveRequest(
        request.request as Parameters<typeof coreStore.saveRequest>[0],
        name,
        collectionId,
        { folderId: request.folderId ?? null },
      );
      store.set({ requests: await coreStore.listRequests(collectionId) });
      store.addToast("success", "Request duplicated");
    } catch (error) {
      store.addToast("error", String(error));
    }
  };

  const del = async () => {
    setConfirmDelete(false);
    try {
      await coreStore.deleteRequest(request.id);
      store.set({ requests: await coreStore.listRequests(collectionId) });
      store.addToast("success", "Request deleted");
    } catch (error) {
      store.addToast("error", String(error));
    }
  };

  const disconnectAndOpen = () => {
    setConfirmDisconnect(false);
    const activeSession = store.wsSessions.find(
      (session) => session.id === store.activeWsSessionId,
    );
    const sessions =
      request.protocol === "websocket" && activeSession ? [activeSession] : store.wsSessions;
    for (const session of sessions) {
      if (session.connectionId) webSocketClose(session.connectionId).catch(() => {});
      if (session.state !== "disconnected") {
        store.setWsSession(session.id, { state: "disconnected", connectionId: "" });
      }
    }
    pendingOpenRef.current?.();
    pendingOpenRef.current = null;
  };

  return (
    <>
      <div
        draggable
        onDragStart={(event) => startDrag(event, request, setDragging)}
        onDragEnd={() => setDragging(false)}
        className={`group relative flex items-center gap-1.5 rounded mx-1 transition-opacity ${dragging ? "opacity-40" : ""}`}
      >
        <button
          type="button"
          className="flex flex-1 items-center gap-1.5 px-3 py-1 hover:bg-[var(--surface-2)] cursor-pointer text-left min-w-0"
          onClick={open}
        >
          <GripVertical
            size={11}
            className="shrink-0 opacity-0 group-hover:opacity-100 text-[var(--text-3)] cursor-grab"
          />
          <MethodBadge
            method={protocolMethod(
              request.protocol,
              (request.request as { method?: string })?.method,
            )}
          />
          <span className="flex-1 text-xs text-[var(--text-1)] truncate">
            {request.name || (request.request as { url?: string })?.url || "Untitled"}
          </span>
          {isDirty && (
            <span
              title="Unsaved changes"
              className="shrink-0 size-1.5 rounded-full bg-[var(--warn)]"
            />
          )}
        </button>
        <CollectionRequestMenu
          open={menuOpen}
          menuRef={menuRef}
          onToggle={() => setMenuOpen(!menuOpen)}
          onDetail={() => {
            setMenuOpen(false);
            setShowDetail(true);
          }}
          onDuplicate={() => {
            setMenuOpen(false);
            setDuplicateName(`${request.name || "Untitled"} Copy`);
          }}
          onDelete={() => {
            setMenuOpen(false);
            setConfirmDelete(true);
          }}
        />
      </div>
      <CollectionRequestModals
        request={request}
        requestName={request.name || "Untitled"}
        showDetail={showDetail}
        duplicateName={duplicateName}
        confirmDisconnect={confirmDisconnect}
        confirmDelete={confirmDelete}
        onDetailClose={() => setShowDetail(false)}
        onDuplicate={duplicate}
        onDuplicateClose={() => setDuplicateName(null)}
        onConfirmDisconnect={disconnectAndOpen}
        onDisconnectClose={() => {
          setConfirmDisconnect(false);
          pendingOpenRef.current = null;
        }}
        onConfirmDelete={del}
        onDeleteClose={() => setConfirmDelete(false)}
      />
    </>
  );
}

function pickFields(obj: unknown) {
  const record = obj as Record<string, unknown>;
  return Object.fromEntries(COMPARE_FIELDS.map((key) => [key, record[key]]));
}

function startDrag(
  event: React.DragEvent,
  request: SavedRequest,
  setDragging: (dragging: boolean) => void,
) {
  event.dataTransfer.setData("requestId", request.id);
  event.dataTransfer.setData("collectionId", request.collectionId);
  event.dataTransfer.setData(`collection/${request.collectionId}`, "");
  event.dataTransfer.setData(`folder/${request.folderId ?? "none"}`, "");
  event.dataTransfer.effectAllowed = "move";
  setDragging(true);
}
