# RO-Crate Zip Explorer

**RO-Crate Zip Explorer** is a TypeScript library that provides an API for browsing and reading **RO-Crate metadata files** directly within ZIP archives. It enables web developers to integrate RO-Crate import functionality into their projects, supporting both **local and remote ZIP archives**.

## ✨ Features

- Open and read ZIP archives containing **RO-Crate metadata**.
- Extract and parse **RO-Crate metadata files**.
- Access individual **files and directories** within the ZIP archive.
- Support for **both local and remote ZIP archives**.

## 📦 Installation

Install via **npm** or **yarn**:

```sh
npm install ro-crate-zip-explorer
# or
yarn add ro-crate-zip-explorer
```

## 🚀 Usage

### Importing the Library

```typescript
import { ROCrateZipExplorer } from "ro-crate-zip-explorer";
```

### Opening a Local ZIP Archive

```typescript
const fileInput = document.querySelector('input[type="file"]');

fileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  const explorer = new ROCrateZipExplorer(file);
  const { crate, zip } = await explorer.open();

  console.log(crate.context);
  console.log(zip.size);
});
```

### Opening a Remote ZIP Archive

```typescript
const explorer = new ROCrateZipExplorer("https://example.com/archive.zip");
const { crate, zip } = await explorer.open();

console.log(crate.context);
console.log(zip.size);
```

> [!IMPORTANT]
> This library uses the **Fetch API** to explore remote ZIP archives. Ensure proper **CORS headers** are set if the archive is hosted on a different domain.

### Extracting File Contents

```typescript
const fileEntry = zip.findFileByName("path/to/file.txt");

if (fileEntry) {
  const fileContents = await explorer.getFileContents(fileEntry);
  console.log(new TextDecoder().decode(fileContents));
}
```

## 🛠 Example Projects

Explore how **RO-Crate Zip Explorer** can be used in real-world applications!

### 📌 Vue.js Example

A Vue.js example demonstrating how to integrate **RO-Crate Zip Explorer** into a frontend project is available in the repository:

🔗 **[Vue Example: RO-Crate-Zip-Vue](examples/vue/ro-crate-zip-vue/)**

This example showcases:

- Opening a local or remote RO-Crate ZIP archive
- Handling file contents from the archive

Clone the repository and try it out!

## 📄 License

This project is licensed under the **MIT License**.
