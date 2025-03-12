# RO-Crate Zip Explorer

**RO-Crate Zip Explorer** is a TypeScript library for browsing and extracting **RO-Crate metadata files** directly within ZIP archives. It provides a read-only interface to access and navigate **RO-Crate metadata** while leveraging the [ro-crate-js](https://github.com/Language-Research-Technology/ro-crate-js/tree/master) library.

## ✨ Features

- **Supports both local and remote ZIP archives**.
- **Browse ZIP archives** contents with ease without downloading the entire archive.
- **Extract and parse RO-Crate metadata** effortlessly.
- **Fetch and read files** from the ZIP archive.
- **Compatible with modern browsers** and **Node.js** environments.
- **Fully typed with TypeScript**.

## 📦 Installation

Install via **npm** or **yarn**:

```sh
npm install ro-crate-zip-explorer
# or
yarn add ro-crate-zip-explorer
```

## 🚀 Usage

### Supported Environments

- **Browser**: Works with `<input type="file">` for local file selection.
- **Node.js**: Supports loading ZIP archives from the filesystem.
- **Remote Files**: Can fetch and parse ZIP files over HTTP(S), provided proper CORS headers are configured.

### Importing the Library

```typescript
import { ROCrateZipExplorer } from "ro-crate-zip-explorer";
```

### Opening a Local RO-Crate ZIP Archive

```typescript
const fileInput = document.querySelector('input[type="file"]');

fileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  const explorer = new ROCrateZipExplorer(file);
  const zip = await explorer.open();

  console.log("Total files and directories in the ZIP:", zip.entries.length);
  console.log("RO-Crate Root Dataset:", explorer.crate.rootDataset);
});
```

### Opening a Remote RO-Crate ZIP Archive

```typescript
const explorer = new ROCrateZipExplorer("https://example.com/archive.zip");
const zip = await explorer.open();

console.log("Total files and directories in the ZIP:", zip.entries.length);
console.log("RO-Crate Root Dataset:", explorer.crate.rootDataset);
```

> [!TIP]
> Need to explore a standard ZIP file? Use the `ZipExplorer` class instead:
>
> ```typescript
> import { ZipExplorer } from "ro-crate-zip-explorer";
>
> const explorer = new ZipExplorer("https://example.com/archive.zip");
> const zip = await explorer.open();
>
> console.log("Total files and directories in the ZIP:", zip.entries.length);
> ```

> [!IMPORTANT]
> This library uses the **Fetch API** to load remote ZIP archives. Ensure the server provides proper **CORS headers** if hosting files on another domain.

### Extracting File Contents

```typescript
const fileEntry = zip.findFileByName("path/to/file.txt");

if (fileEntry) {
  const fileContents = await explorer.getFileContents(fileEntry);
  console.log(new TextDecoder().decode(fileContents));
} else {
  console.error("File not found in the ZIP archive.");
}
```

## 🛠 Example Projects

Explore how **RO-Crate Zip Explorer** integrates into other projects:

### 📌 Vue.js Example

A simple **Vue.js** demo is available in the repository:

🔗 **[Vue Example: RO-Crate-Zip-Vue](https://github.com/davelopez/ro-crate-zip-explorer/tree/main/examples/vue/ro-crate-zip-vue#ro-crate-zip-vue)**

#### Example Usage in Vue:

```vue
<template>
  <input type="file" @change="handleFileUpload" />
</template>

<script setup>
import { ROCrateZipExplorer } from "ro-crate-zip-explorer";

const handleFileUpload = async (event) => {
  try {
    const file = event.target.files[0];
    const explorer = new ROCrateZipExplorer(file);
    const zip = await explorer.open();

    console.log("Total files and directories in the ZIP:", zip.entries.length);
  } catch (error) {
    console.error("Error opening ZIP archive:", error);
  }
};
</script>
```

## 📄 License

This project is licensed under the **MIT License**.
