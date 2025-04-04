export { isFileEntry, isRemoteZip } from "./utils.js";

export { AbstractZipExplorer, ROCrateZipExplorer, ZipExplorer } from "./explorer.js";
export type {
  AnyZipEntry,
  IZipExplorer,
  ZipArchive,
  ZipDirectoryEntry,
  ZipEntryMetadata,
  ZipFileEntry,
} from "./interfaces.js";
export type { Entity as ROCrateEntity, ROCrateImmutableView } from "./types/ro-crate-interfaces.js";
