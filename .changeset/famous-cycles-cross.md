---
"ro-crate-zip-explorer": minor
---

Refactor explorer class API

This refactors the `ZipExplorer` and `ROCrateZipExplorer` classes, as well as the related interfaces. These changes include **breaking changes** to the API, but please note that **the API is not yet stable** and will likely change further in the future until a stable release is reached.

The main changes are:

- A new `ZipExplorer` class has been introduced, which is a generic class that can be used to explore any ZIP archive.
- **(Breaking change)** The `ROCrateZip` interface has been removed.
- **(Breaking change)** Calling the `open` method on a `ZipExplorer` or `ROCrateZipExplorer` instance now returns a `Promise` that resolves to a `ZipArchive` object.
- **(Breaking change)** When using `ROCrateZipExplorer`, the `hasCrate` and `crate` properties can be used to check if the ZIP archive contains a RO-Crate and to access the RO-Crate metadata, respectively.
