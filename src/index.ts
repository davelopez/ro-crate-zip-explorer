import type { AnyZipEntry, ZipFileEntry, ZipSource } from "./interfaces.js";

export { AbstractZipExplorerWithMetadata, ROCrateZipExplorer, ZipExplorer } from "./explorer.js";
export type {
  AnyZipEntry,
  IZipExplorer,
  IZipExplorerWithMetadata,
  ZipArchive,
  ZipDirectoryEntry,
  ZipFileEntry,
} from "./interfaces.js";
export type { Entity as ROCrateEntity, ROCrateImmutableView } from "./types/ro-crate-interfaces.js";

export function isRemoteZip(source: ZipSource): source is string {
  return typeof source === "string";
}

export function isFileEntry(entry?: AnyZipEntry): entry is ZipFileEntry {
  return entry !== undefined && entry.type === "File";
}
