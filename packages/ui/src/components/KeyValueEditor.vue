<script setup lang="ts">
import type { KeyValue } from "@invoke/core";
import { ref } from "vue";

const props = defineProps<{ items: KeyValue[]; testPrefix?: string }>();
defineEmits<{ add: []; remove: [index: number] }>();

const bulkMode = ref(false);
const bulkText = ref("");

function variableNames(value: string) {
  return [...value.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map((match) => match[1].trim());
}

function openBulkEdit() {
  bulkText.value = props.items
    .map((item) => `${item.enabled === false ? "# " : ""}${item.key}: ${item.value}`)
    .join("\n");
  bulkMode.value = true;
}

function applyBulkEdit() {
  const next = bulkText.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const enabled = !line.startsWith("#");
      const source = enabled ? line : line.slice(1).trim();
      const separator = source.indexOf(":");
      if (separator === -1) return { key: source, value: "", enabled };
      return {
        key: source.slice(0, separator).trim(),
        value: source.slice(separator + 1).trim(),
        enabled
      };
    });
  props.items.splice(0, props.items.length, ...next);
  bulkMode.value = false;
}
</script>

<template>
  <div class="kv-editor">
    <div class="kv-toolbar">
      <button type="button" :data-testid="testPrefix ? `${testPrefix}-add` : undefined" @click="$emit('add')">Add row</button>
      <button type="button" @click="openBulkEdit">Bulk edit</button>
    </div>

    <template v-if="!bulkMode">
      <div v-for="(item, index) in items" :key="index" class="kv-row">
        <label class="check"><input v-model="item.enabled" type="checkbox" /> on</label>
        <input v-model="item.key" :data-testid="testPrefix ? `${testPrefix}-key` : undefined" placeholder="key" />
        <div class="kv-value-wrap">
          <input v-model="item.value" :data-testid="testPrefix ? `${testPrefix}-value` : undefined" placeholder="value" />
          <span v-for="name in variableNames(item.value)" :key="name" class="var-chip">{{ name }}</span>
        </div>
        <button type="button" @click="$emit('remove', index)">Remove</button>
      </div>
    </template>

    <div v-else class="bulk-editor">
      <textarea v-model="bulkText" spellcheck="false" placeholder="Authorization: Bearer {{token}}" />
      <div>
        <button type="button" @click="bulkMode = false">Cancel</button>
        <button type="button" class="send" @click="applyBulkEdit">Apply</button>
      </div>
    </div>
  </div>
</template>
