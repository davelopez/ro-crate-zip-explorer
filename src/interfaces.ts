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
   * Opens the ZIP archive and performs any necessary initialization.
   *
   * @throws Throws an error if the ZIP archive cannot be opened.
   */
  open(): Promise<void>;

  /**
   * The list of files in the ZIP archive.
   * @throws Throws an error if the service is not initialized.
   */
  get zipContents(): ZipEntryInfo[];

  /**
   * The total size of the ZIP archive in bytes.
   * @throws Throws an error if the service is not initialized.
   */
  get zipSize(): number;

  /**
   * Extracts a single file from a ZIP archive.
   * @param file - The file information object.
   * @returns A promise that resolves with the file content as a Uint8Array.
   * @throws Throws an error if the service is not initialized or if the file cannot be extracted.
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
