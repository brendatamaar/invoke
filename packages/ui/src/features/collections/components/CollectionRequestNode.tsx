import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, GripVertical, MoreHorizontal, Trash2 } from "lucide-react";
import type { GraphQLRequestConfig, GrpcRequestConfig, RequestConfig, SavedRequest, WebSocketRequestConfig } from "@invoke/core";
import { useStore, coreStore } from "../../../store";
import { MethodBadge, protocolMethod } from "../../../components/shared/MethodBadge";
import { ConfirmModal } from "../../../components/shared/ConfirmModal";
import { PromptModal } from "../../../components/shared/PromptModal";
import { CollectionMenuItem } from "./CollectionMenuItem";

const COMPARE_FIELDS: (keyof RequestConfig)[] = [
  "method", "url", "params", "headers", "bodyMode", "body", "auth",
  "timeoutMs", "variables", "assertions", "extractionRules", "options",
  "scripts", "retryPolicy",
];

function pickFields(obj: unknown) {
  const o = obj as Record<string, unknown>;
  return Object.fromEntries(COMPARE_FIELDS.map((k) => [k, o[k]]));
}

export function CollectionRequestNode({
  request,
  collectionId,
}: {
  request: SavedRequest;
  collectionId: string;
}) {
  const { set, setRequest, setGraphqlRequest, setWebsocketRequest, setGrpcRequest, addToast, request: activeRequest } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [duplicateName, setDuplicateName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const isActive = activeRequest.id === request.id;
  const isDirty = useMemo(() => {
    if (!isActive) return false;
    return (
      JSON.stringify(pickFields(activeRequest)) !==
      JSON.stringify(pickFields(request.request))
    );
  }, [isActive, activeRequest, request.request]);

  const open = () => {
    const meta = {
      id: request.id,
      name: request.name,
      collectionId: request.collectionId,
      folderId: request.folderId,
      protocol: request.protocol,
    };

    if (request.protocol === "graphql") {
      setGraphqlRequest(request.request as GraphQLRequestConfig);
      setRequest(meta);
      set({ requestTab: "graphql" });
      return;
    }

    if (request.protocol === "websocket") {
      setWebsocketRequest(request.request as WebSocketRequestConfig);
      setRequest(meta);
      return;
    }

    if (request.protocol === "grpc") {
      setGrpcRequest(request.request as GrpcRequestConfig);
      setRequest(meta);
      return;
    }

    const draft = request.request as RequestConfig;
    const draftParams = draft.params ?? [];
    let params = draftParams;
    if (draftParams.length === 0) {
      const url = draft.url ?? "";
      const qIdx = url.indexOf("?");
      if (qIdx !== -1) {
        const parsed: typeof params = [];
        new URLSearchParams(url.slice(qIdx + 1)).forEach((value, key) => {
          if (key) parsed.push({ key, value, enabled: true });
        });
        if (parsed.length > 0) params = parsed;
      }
    }
    setRequest({ ...draft, params, ...meta });
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
      const reqs = await coreStore.listRequests(collectionId);
      set({ requests: reqs });
      addToast("success", "Request duplicated");
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const del = async () => {
    setConfirmDelete(false);
    try {
      await coreStore.deleteRequest(request.id);
      const reqs = await coreStore.listRequests(collectionId);
      set({ requests: reqs });
      addToast("success", "Request deleted");
    } catch (e) {
      addToast("error", String(e));
    }
  };

  return (
    <>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("requestId", request.id);
          e.dataTransfer.setData("collectionId", request.collectionId);
          e.dataTransfer.setData(`collection/${request.collectionId}`, "");
          e.dataTransfer.setData(`folder/${request.folderId ?? "none"}`, "");
          e.dataTransfer.effectAllowed = "move";
          setDragging(true);
        }}
        onDragEnd={() => setDragging(false)}
        className={`group relative flex items-center gap-1.5 px-3 py-1 hover:bg-[var(--surface-2)] cursor-pointer rounded mx-1 transition-opacity ${dragging ? "opacity-40" : ""}`}
        onClick={open}
      >
        <GripVertical
          size={11}
          className="shrink-0 opacity-0 group-hover:opacity-100 text-[var(--text-3)] cursor-grab"
        />
        <MethodBadge
          method={protocolMethod(request.protocol, (request.request as { method?: string })?.method)}
        />
        <span className="flex-1 text-xs text-[var(--text-1)] truncate">
          {request.name ||
            (request.request as { url?: string })?.url ||
            "Untitled"}
        </span>
        {isDirty && (
          <span
            title="Unsaved changes"
            className="shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--warn)]"
          />
        )}
        <div
          ref={menuRef}
          className="opacity-0 group-hover:opacity-100 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-0.5 rounded hover:bg-[var(--border)] text-[var(--text-3)]"
          >
            <MoreHorizontal size={13} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 z-20 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-2)] py-1 min-w-[140px]"
              onClick={(e) => e.stopPropagation()}
            >
              <CollectionMenuItem
                icon={<Copy size={12} />}
                label="Duplicate"
                onClick={() => {
                  setMenuOpen(false);
                  setDuplicateName(`${request.name || "Untitled"} Copy`);
                }}
              />
              <CollectionMenuItem
                icon={<Trash2 size={12} />}
                label="Delete"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmDelete(true);
                }}
                danger
              />
            </div>
          )}
        </div>
      </div>

      <PromptModal
        open={duplicateName !== null}
        title="Duplicate Request"
        label="Name"
        defaultValue={duplicateName ?? ""}
        confirmLabel="Duplicate"
        onConfirm={duplicate}
        onClose={() => setDuplicateName(null)}
      />
      <ConfirmModal
        open={confirmDelete}
        title="Delete Request"
        message={
          <span className="flex flex-col gap-2">
            <span>Are you sure you want to delete:</span>
            <strong className="break-all">{request.name || "Untitled"}</strong>
            <span>This action cannot be undone.</span>
          </span>
        }
        confirmLabel="Delete"
        danger
        onConfirm={del}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}
