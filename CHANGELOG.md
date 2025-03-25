# ro-crate-zip-explorer

## 0.2.1

### Patch Changes

- 9ae14d2: Improve archive source handling

## 0.2.0

### Minor Changes

- 8265a96: Refactor explorer class API

  This refactors the `ZipExplorer` and `ROCrateZipExplorer` classes, as well as the related interfaces. These changes include **breaking changes** to the API, but please note that **the API is not yet stable** and will likely change further in the future until a stable release is reached.

  The main changes are:

  - A new `ZipExplorer` class has been introduced, which is a generic class that can be used to explore any ZIP archive.
  - **(Breaking change)** The `ROCrateZip` interface has been removed.
  - **(Breaking change)** Calling the `open` method on a `ZipExplorer` or `ROCrateZipExplorer` instance now returns a `Promise` that resolves to a `ZipArchive` object.
  - **(Breaking change)** When using `ROCrateZipExplorer`, the `hasCrate` and `crate` properties can be used to check if the ZIP archive contains a RO-Crate and to access the RO-Crate metadata, respectively.

### Patch Changes

- 32f1e8b: Improve some type definitions for RO-Crate

  This is still a work in progress, but it improves some of the type definitions for the RO-Crate classes and interfaces.

- 3166fa7: Expose internal RO-Crate types to library consumers

## 0.1.1

### Patch Changes

- 44816b0: Use strict import paths in TypeScript to avoid issues with the build process in other projects that use Webpack.

## 0.1.0

### Minor Changes

- 6cc85c8: Initial release
