<script setup lang="ts">
import type { Folder, RequestConfig, SavedRequest } from "@invoke/core";
import type { FolderTreeNodeView, TreeDragPayload } from "../types";

defineOptions({ name: "FolderTreeNode" });

const props = defineProps<{
  node: FolderTreeNodeView;
  activeRequestId?: string;
  expandedFolderIds: string[];
}>();

const emit = defineEmits<{
  toggle: [folderId: string];
  load: [request: SavedRequest];
  folderContext: [event: MouseEvent, folder: Folder];
  requestContext: [event: MouseEvent, request: SavedRequest];
  dragStart: [event: DragEvent, payload: TreeDragPayload];
  dragEnd: [];
  dropFolder: [event: DragEvent, folder: Folder];
  dropRequest: [event: DragEvent, request: SavedRequest];
}>();

function isExpanded(folderId: string) {
  return props.expandedFolderIds.includes(folderId);
}

function savedMethod(saved: SavedRequest) {
  if (saved.protocol === "graphql") return "GQL";
  if (saved.protocol === "websocket") return "WS";
  if (saved.protocol === "grpc") return "RPC";
  return (saved.request as RequestConfig).method;
}

function forwardFolderContext(event: MouseEvent, folder: Folder) {
  emit("folderContext", event, folder);
}

function forwardRequestContext(event: MouseEvent, request: SavedRequest) {
  emit("requestContext", event, request);
}

function forwardDragStart(event: DragEvent, payload: TreeDragPayload) {
  emit("dragStart", event, payload);
}

function forwardDropFolder(event: DragEvent, folder: Folder) {
  emit("dropFolder", event, folder);
}

function forwardDropRequest(event: DragEvent, request: SavedRequest) {
  emit("dropRequest", event, request);
}
</script>

<template>
  <div class="folder-node" :style="{ '--depth': node.depth }">
    <button
      class="folder-row"
      data-testid="folder-row"
      draggable="true"
      @click="emit('toggle', node.folder.id)"
      @contextmenu.prevent="emit('folderContext', $event, node.folder)"
      @dragstart="emit('dragStart', $event, { type: 'folder', id: node.folder.id })"
      @dragend="emit('dragEnd')"
      @dragover.prevent
      @drop="emit('dropFolder', $event, node.folder)"
    >
      <span class="folder-caret" :class="{ open: isExpanded(node.folder.id) }" aria-hidden="true"></span>
      <strong>{{ node.folder.name }}</strong>
      <small>{{ node.folders.length + node.requests.length }}</small>
    </button>

    <div v-if="isExpanded(node.folder.id)" class="folder-children">
      <FolderTreeNode
        v-for="child in node.folders"
        :key="child.folder.id"
        :node="child"
        :active-request-id="activeRequestId"
        :expanded-folder-ids="expandedFolderIds"
        @toggle="emit('toggle', $event)"
        @load="emit('load', $event)"
        @folder-context="forwardFolderContext"
        @request-context="forwardRequestContext"
        @drag-start="forwardDragStart"
        @drag-end="emit('dragEnd')"
        @drop-folder="forwardDropFolder"
        @drop-request="forwardDropRequest"
      />
      <button
        v-for="saved in node.requests"
        :key="saved.id"
        class="request-row nested"
        :class="{ active: activeRequestId === saved.id }"
        draggable="true"
        @click="emit('load', saved)"
        @contextmenu.prevent="emit('requestContext', $event, saved)"
        @dragstart="emit('dragStart', $event, { type: 'request', id: saved.id })"
        @dragend="emit('dragEnd')"
        @dragover.prevent
        @drop="emit('dropRequest', $event, saved)"
      >
        <span :data-method="savedMethod(saved)">{{ savedMethod(saved) }}</span>
        <strong>{{ saved.name }}</strong>
        <small>{{ saved.folderId ? "in folder" : "" }}</small>
      </button>
    </div>
  </div>
</template>
