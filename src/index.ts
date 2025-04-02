import type { AnyZipEntry, ZipFileEntry, ZipSource } from "./interfaces.js";

export { AbstractZipExplorer, ROCrateZipExplorer, ZipExplorer } from "./explorer.js";
export type { AnyZipEntry, IZipExplorer, ZipArchive, ZipDirectoryEntry, ZipFileEntry } from "./interfaces.js";
export type { Entity as ROCrateEntity, ROCrateImmutableView } from "./types/ro-crate-interfaces.js";

/**
 * Type guard to check if the source of a ZIP archive is a remote URL.
 * @param source - The source to check.
 * @returns True if the source is a string (remote URL), false otherwise.
 */
export function isRemoteZip(source: ZipSource): source is string {
  return typeof source === "string";
}

/**
 * Type guard to check if a ZIP entry is of type File.
 * @param source - The source to check.
 * @returns True if the entry is a File, false if it is a Directory or undefined.
 */
export function isFileEntry(entry?: AnyZipEntry): entry is ZipFileEntry {
  return entry !== undefined && entry.type === "File";
}
