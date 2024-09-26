import type { ROCrate } from "ro-crate";

/**
 * Represents a Zip archive containing an RO-Crate manifest.
 */
export interface ROCrateZip {
  crate: ROCrate;
  files: ZipEntryInfo[];
}

/**
 * Represents a service for working with ZIP archives.
 */
export interface ZipService {
  /**
   * Lists entries (files and directories) from the Central Directory of a ZIP file.
   * @returns A promise that resolves with an array of ZipEntryInfo objects.
   */
  listFiles(): Promise<ZipEntryInfo[]>;

  /**
   * Extracts a single file from a ZIP archive.
   * @param file - The file information object.
   * @returns A promise that resolves with the file content as a Uint8Array.
   */
  extractFile(file: ZipEntryInfo): Promise<Uint8Array>;
}

/**
 * Represents information about an entry in a ZIP archive.
 */
export interface ZipEntryInfo {
  /** The name of the file in the ZIP archive. */
  filename: string;

  /** The offset of the file header in the ZIP archive. */
  headerOffset: number;

  /** The compression method used for the file. */
  compressType: number;

  /** The compressed size of the file. */
  compressSize: number;

  /** The uncompressed size of the file. */
  fileSize: number;

  /** The date and time encoded in the ZIP entry. */
  date_time: Date;

  /** Determines if the entry is a directory. */
  isDir: () => boolean;

  /** Determines if the entry is compressed. */
  isCompressed: () => boolean;
}
