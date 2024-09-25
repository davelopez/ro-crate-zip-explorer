<script setup lang="ts">
import BrowseLocal from "./components/BrowseLocal.vue";
import BrowseRemote from "./components/BrowseRemote.vue";
import { ref } from "vue";

const isLocal = ref<boolean>(true);
</script>

<template>
  <main>
    <h1><span class="green">RO-Crate Zip Explorer</span> Example</h1>
    <p>
      This is a simple example of a Vue 3 application that can browse the contents of a local or remote (URL) RO-Crate
      ZIP file.
    </p>

    <div class="selector">
      <label> <input type="radio" v-model="isLocal" :value="true" /> Local </label>
      <label> <input type="radio" v-model="isLocal" :value="false" /> Remote </label>
    </div>

    <BrowseLocal v-if="isLocal" class="option-content" />
    <BrowseRemote v-else class="option-content" />
  </main>
</template>

<style lang="css">
h1 {
  font-size: 2.5em;
}

/* Increase the size of the radio button and labels */
input[type="radio"] {
  transform: scale(1.5);
  margin-right: 0.5em;
  vertical-align: middle;
}

label {
  margin-right: 1em;
  font-size: 1.5em;
}

.selector {
  margin-left: 0.5em;
}

.option-content {
  margin-top: 2em;
  margin-left: 0.5em;
}
</style>
