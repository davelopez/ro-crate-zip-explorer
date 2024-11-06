import type { ROCrate } from "ro-crate";

/**
 * Represents a Zip archive containing an RO-Crate manifest.
 */
export interface ROCrateZip {
  readonly crate: ROCrate;
  readonly zipEntries: AnyZipEntry[];
}

export interface ZipFileEntry extends ZipEntry {
  readonly type: "File";
  data(): Promise<Uint8Array>;
}

export interface ZipDirectoryEntry extends ZipEntry {
  readonly type: "Directory";
}

export type AnyZipEntry = ZipFileEntry | ZipDirectoryEntry;

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
  readonly zipContents: AnyZipEntry[];

  /**
   * The total size of the ZIP archive in bytes.
   * @throws Throws an error if the service is not initialized.
   */
  readonly zipSize: number;

  /**
   * Finds a file in the ZIP archive by its name.
   * @param fileName - The name of the file to find.
   * @returns The file information object or `undefined` if the file is not found.
   * @throws Throws an error if the service is not initialized.
   */
  findFileByName(fileName: string): ZipFileEntry | undefined;

  /**
   * Extracts a single file from a ZIP archive.
   * @param file - The file information object.
   * @returns A promise that resolves with the file content as a Uint8Array.
   * @throws Throws an error if the service is not initialized or if the file cannot be extracted.
   */
  extractFile(file: AnyZipEntry): Promise<Uint8Array>;
}

type EntryType = "File" | "Directory";

/**
 * Represents internal information about an entry in a ZIP archive.
 * This information can be used to extract the file from the archive.
 */
export interface ZipEntry {
  /** The full name (relative path) of the file in the ZIP archive. */
  readonly path: string;

  /** The offset of the file header in the ZIP archive. */
  readonly headerOffset: number;

  /** The compression method used for the file. */
  readonly compressType: number;

  /** The compressed size of the file. */
  readonly compressSize: number;

  /** The uncompressed size of the file. */
  readonly fileSize: number;

  /** The date and time encoded in the ZIP entry. */
  readonly dateTime: Date;

  /** Determines if the entry is a directory or a file.*/
  readonly type: EntryType;

  /** Determines if the entry is compressed. */
  readonly isCompressed: boolean;
}
