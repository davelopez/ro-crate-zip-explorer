<script setup lang="ts">
import { ref, computed } from "vue";
import { ROCrateZipExplorer, type ROCrateZip } from "ro-crate-zip-explorer";
import Explorer from "./Explorer.vue";

const url = ref<string>(
  "https://raw.githubusercontent.com/davelopez/ro-crate-zip-explorer/refs/heads/main/tests/test-data/simple-invocation.rocrate.zip",
);
const roCrateZipFile = ref<ROCrateZip>();

const canExploreRemote = computed(() => {
  try {
    new URL(url.value);
    return true;
  } catch {
    return false;
  }
});

const exploreTooltip = computed(() => {
  if (canExploreRemote.value) {
    return "";
  } else {
    return "Please enter a valid URL";
  }
});

async function exploreRemote() {
  console.log("URL", url.value);
  const explorer = new ROCrateZipExplorer(url.value);
  roCrateZipFile.value = await explorer.open();
}
</script>

<template>
  <main>
    <h2>Browse <span class="green">remote</span> RO-Crate Zip files</h2>
    <p>
      <span class="green"><b>Important!</b></span> The server hosting the zip file must acept
      <a
        href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests"
        target="_blank"
        rel="noopener noreferrer"
        >HTTP range requests</a
      >.
    </p>

    <input type="url" v-model="url" placeholder="Enter the URL of the RO-Crate Zip file" required class="url-input" />

    <button :disabled="!canExploreRemote" @click="exploreRemote" class="button" :title="exploreTooltip">Explore</button>

    <Explorer :ro-crate-zip-file="roCrateZipFile" />
  </main>
</template>

<style scoped>
.url-input {
  width: 90%;
  padding: 0.5rem;
  margin: 1rem 0;
  font-size: 1rem;
}
</style>
