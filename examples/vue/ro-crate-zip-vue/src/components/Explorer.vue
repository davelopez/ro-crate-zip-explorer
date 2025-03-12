<script setup lang="ts">
import type { ZipArchive, ZipFileEntry } from "ro-crate-zip-explorer";

interface Props {
  zipArchive?: ZipArchive;
}

const props = defineProps<Props>();

async function downloadFile(entry: ZipFileEntry) {
  const fileData = await entry.data();
  const blob = new Blob([fileData], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = entry.path;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div v-if="zipArchive">
    <h3>RO-Crate Zip file contents</h3>
    <ul>
      <li v-for="file in zipArchive.entries" :key="file.path">
        <span v-if="file.type == 'File'"> 📄 </span>
        <span v-else-if="file.type == 'Directory'"> 📁 </span>
        {{ file.path }}
        <span v-if="file.type === 'File'">
          <span v-if="file.type === 'File'">({{ file.fileSize }} bytes) </span>
          <button @click="downloadFile(file as ZipFileEntry)">Download</button>
        </span>
      </li>
    </ul>
  </div>
</template>
