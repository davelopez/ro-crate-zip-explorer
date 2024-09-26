<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue";
import { useFileSystemAccess } from "@vueuse/core";
import { ROCrateZipExplorer, type ROCrateZip } from "ro-crate-zip-explorer";

const dataType = ref<"Text" | "ArrayBuffer" | "Blob">("ArrayBuffer");
const fileSystemAccess = useFileSystemAccess({
  dataType,
  types: [
    {
      description: "Zip files",
      accept: {
        "application/zip": [".zip"],
      },
    },
  ],
  excludeAcceptAllOption: true,
});

const browserSupported = computed(() => results.isSupported);

const results = reactive({
  isSupported: fileSystemAccess.isSupported,
  fileName: fileSystemAccess.fileName,
  fileMIME: fileSystemAccess.fileMIME,
  fileSize: fileSystemAccess.fileSize,
  fileLastModified: fileSystemAccess.fileLastModified,
  file: fileSystemAccess.file,
});

const roCrateZipFile = ref<ROCrateZip>();

watch(results, async () => {
  if (results.file) {
    const explorer = new ROCrateZipExplorer(results.file);
    roCrateZipFile.value = await explorer.open();
  }
});
</script>

<template>
  <main>
    <h2>Browse <span class="green">local</span> RO-Crate Zip files</h2>

    <div v-if="!browserSupported">
      <p>
        <span class="red"
          >Your browser does not support the
          <a
            href="https://developer.mozilla.org/en-US/docs/Web/API/File_System_API"
            target="_blank"
            rel="noopener noreferrer"
            >File System Access API</a
          >.</span
        >
        <br />
        Please use a
        <a
          href="https://developer.mozilla.org/en-US/docs/Web/API/Window/showOpenFilePicker#browser_compatibility"
          target="_blank"
          rel="noopener noreferrer"
          >browser that supports this API</a
        >, such as the latest version of Chrome, Edge, or Opera.
      </p>
    </div>

    <button :disabled="!browserSupported" @click="fileSystemAccess.open()">Browse</button>

    <div v-if="results.fileName">
      <p>
        <span class="green">File:</span> {{ results.fileName }}
        <br />
        <span class="green">MIME type:</span> {{ results.fileMIME }}
        <br />
        <span class="green">Size:</span> {{ results.fileSize }} bytes
        <br />
        <span class="green">Last modified:</span> {{ new Date(results.fileLastModified) }}
      </p>

      <div v-if="roCrateZipFile">
        <h3>RO-Crate Zip file contents</h3>
        <ul>
          <li v-for="file in roCrateZipFile.files" :key="file.filename">
            {{ file.filename }}
          </li>
        </ul>
      </div>
    </div>
  </main>
</template>
