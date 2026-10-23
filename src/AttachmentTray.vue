<script setup lang="ts">
export interface LocalAttachment { id: number; file: File; url?: string }
defineProps<{ files: LocalAttachment[]; removable?: boolean }>();
defineEmits<{ (event: 'remove', id: number): void }>();
const formatSize = (size: number) => size < 1024 ? `${size} B` : size < 1048576 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1048576).toFixed(1)} MB`;
</script>
<template>
  <section v-if="files.length" class="attachment-tray" aria-label="附件预览">
    <header><strong>附件 · {{ files.length }}</strong><small>本地预览</small></header>
    <ul>
      <li v-for="item in files" :key="item.id">
        <img v-if="item.url" :src="item.url" :alt="item.file.name">
        <span v-else class="attachment-tray__icon" aria-hidden="true">▤</span>
        <div><strong :title="item.file.name">{{ item.file.name }}</strong><small>{{ formatSize(item.file.size) }}</small></div>
        <button v-if="removable" type="button" :aria-label="`移除附件 ${item.file.name}`" @click="$emit('remove', item.id)">×</button>
      </li>
    </ul>
  </section>
</template>
<style>
.attachment-tray { padding: .85rem; border: 1px solid #d2d7e4; border-radius: .75rem; background: #f8f9fc; margin-bottom: 1rem; }
.attachment-tray header { display: flex; justify-content: space-between; font-size: .85rem; margin-bottom: .7rem; }
.attachment-tray small { color: #6c7488; font-size: .75rem; }
.attachment-tray ul { display: flex; flex-wrap: wrap; gap: .6rem; padding: 0; margin: 0; list-style: none; }
.attachment-tray li { display: flex; align-items: center; gap: .6rem; padding: .5rem; border: 1px solid #dce0e9; border-radius: .5rem; width: min(260px, 100%); background: white; }
.attachment-tray img, .attachment-tray__icon { width: 3rem; height: 3rem; object-fit: cover; border-radius: .3rem; flex-shrink: 0; }
.attachment-tray__icon { display: grid; place-items: center; color: #6366f1; background: #edf0f6; font-size: 1.7rem; }
.attachment-tray li div { flex: 1; min-width: 0; }
.attachment-tray li strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .8rem; }
.attachment-tray button { border: 0; background: transparent; cursor: pointer; padding: .3rem; color: #6c7488; }
</style>
