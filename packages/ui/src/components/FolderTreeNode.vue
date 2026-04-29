<script setup lang="ts">
import type { Folder, RequestConfig, SavedRequest } from "@invoke/core";

defineOptions({ name: "FolderTreeNode" });

interface FolderTreeNodeView {
  folder: Folder;
  folders: FolderTreeNodeView[];
  requests: SavedRequest[];
  depth: number;
}

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
</script>

<template>
  <div class="folder-node" :style="{ '--depth': node.depth }">
    <button
      class="folder-row"
      data-testid="folder-row"
      @click="emit('toggle', node.folder.id)"
      @contextmenu.prevent="emit('folderContext', $event, node.folder)"
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
      />
      <button
        v-for="saved in node.requests"
        :key="saved.id"
        class="request-row nested"
        :class="{ active: activeRequestId === saved.id }"
        @click="emit('load', saved)"
        @contextmenu.prevent="emit('requestContext', $event, saved)"
      >
        <span :data-method="savedMethod(saved)">{{ savedMethod(saved) }}</span>
        <strong>{{ saved.name }}</strong>
        <small>{{ saved.folderId ? "in folder" : "" }}</small>
      </button>
    </div>
  </div>
</template>
