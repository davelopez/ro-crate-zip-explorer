<script setup lang="ts">
import type { ROCrateZip, ZipFileEntry } from "ro-crate-zip-explorer";

interface Props {
  roCrateZipFile?: ROCrateZip;
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
  <div v-if="roCrateZipFile">
    <h3>RO-Crate Zip file contents</h3>
    <ul>
      <li v-for="file in roCrateZipFile.zipEntries" :key="file.path">
        {{ file.path }} <a v-if="file.type === 'File'" @click="downloadFile(file as ZipFileEntry)">Download</a>
      </li>
    </ul>
  </div>
</template>
