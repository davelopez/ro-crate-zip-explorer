<script setup lang="ts">
import { type ROCrateZip } from "ro-crate-zip-explorer";

interface Props {
  roCrateZipFile?: ROCrateZip;
}

const props = defineProps<Props>();
</script>

<template>
  <div v-if="roCrateZipFile">
    <h3>RO-Crate Zip file contents</h3>
    <ul>
      <li v-for="file in roCrateZipFile.files" :key="file.filename">
        {{ file.filename }}
      </li>
    </ul>
  </div>
</template>
