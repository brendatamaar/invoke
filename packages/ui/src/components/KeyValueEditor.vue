<script setup lang="ts">
import type { KeyValue } from "@invoke/core";

defineProps<{ items: KeyValue[]; testPrefix?: string }>();
defineEmits<{ add: []; remove: [index: number] }>();
</script>

<template>
  <div>
    <div v-for="(item, index) in items" :key="index" class="kv-row">
      <label class="check"><input v-model="item.enabled" type="checkbox" /> on</label>
      <input v-model="item.key" :data-testid="testPrefix ? `${testPrefix}-key` : undefined" placeholder="key" />
      <input v-model="item.value" :data-testid="testPrefix ? `${testPrefix}-value` : undefined" placeholder="value" />
      <button @click="$emit('remove', index)">Remove</button>
    </div>
    <button :data-testid="testPrefix ? `${testPrefix}-add` : undefined" @click="$emit('add')">Add row</button>
  </div>
</template>
