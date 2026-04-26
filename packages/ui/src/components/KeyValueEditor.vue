<script setup lang="ts">
import type { KeyValue } from "@invoke/core";

defineProps<{ items: KeyValue[] }>();
defineEmits<{ add: []; remove: [index: number] }>();
</script>

<template>
  <div>
    <div v-for="(item, index) in items" :key="index" class="kv-row">
      <label class="check"><input v-model="item.enabled" type="checkbox" /> on</label>
      <input v-model="item.key" placeholder="key" />
      <input v-model="item.value" placeholder="value" />
      <button @click="$emit('remove', index)">Remove</button>
    </div>
    <button @click="$emit('add')">Add row</button>
  </div>
</template>
