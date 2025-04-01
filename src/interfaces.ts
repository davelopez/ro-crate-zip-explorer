import type { ROCrateImmutableView } from "./types/ro-crate-interfaces.js";

/**
 * Types of sources that can be used to open a ZIP archive.
 */
export type ZipSource = File | string;

/**
 * Represents an interface for a service that can open a ZIP archive,
 * explore its contents, and extract files from it.
 */
export interface IZipExplorer {
  /** A map of file names to their corresponding file information objects. */
  readonly entries: Map<string, AnyZipEntry>;

  readonly zipArchive: ZipArchive;

  ensureZipArchiveOpen(): ZipArchive;

  /**
   * Opens the ZIP archive and performs any necessary initialization.
   * @returns A promise that resolves when the ZIP archive is opened.
   * @throws Throws an error if the ZIP archive cannot be opened.
   */
  open(): Promise<ZipArchive>;

  /**
   * Extracts the contents of a file from the ZIP archive.
   * @param fileEntry - The file information object.
   * @returns A promise that resolves with the file content as a Uint8Array.
   * @throws Throws an error if the file cannot be extracted.
   *
   * @remarks
   * This loads the entire file into memory. Consider using this method only for small files.
   */
  getFileContents(fileEntry: ZipFileEntry): Promise<Uint8Array>;
}

export interface FileMetadata {
  /** The name of the file. */
  name: string;
  /** The size of the file in bytes. */
  size: number;
  /** An optional description of the file. */
  description?: string;
}

export interface IMetadataProvider {
  extractMetadata(): Promise<void>;
  getFileEntryMetadata(entry: ZipFileEntry): FileMetadata;
}

export interface IZipExplorerWithMetadata extends IZipExplorer, IMetadataProvider {}

export interface IROCrateExplorer {
  /**
   * Determines if the ZIP archive contains an RO-Crate manifest.
   */
  hasCrate: boolean;

  /**
   * The RO-Crate metadata in the ZIP archive.
   * @throws Throws an error if the ZIP archive does not contain an RO-Crate manifest.
   */
  crate: ROCrateImmutableView;
}

/**
 * Represents a ZIP archive and its contents.
 */
export interface ZipArchive {
  /** A map of file names to their corresponding file information objects. */
  readonly entries: Map<string, AnyZipEntry>;

  /** The total size of the ZIP archive in bytes. */
  readonly size: number;

  /** Determines if the ZIP archive is a ZIP64 archive. */
  readonly isZip64: boolean;

  /**
   * Determines the source of the ZIP archive.
   * Either a File object or a URL string.
   */
  readonly source: ZipSource;

  /**
   * Finds a file in the ZIP archive by its name.
   * @param fileName - The name of the file to find.
   * @returns The file information object or `undefined` if the file is not found.
   * @throws Throws an error if the service is not initialized (i.e., if `open` has not been called).
   */
  findFileByName(fileName: string): ZipFileEntry | undefined;

  /**
   * Finds an entry in the ZIP archive that matches a specific criteria.
   * @param predicate - A function that takes a file information object and returns a boolean indicating whether the file matches the criteria.
   * @returns The first file information object that matches the criteria or `undefined` if no match is found.
   * @throws Throws an error if the service is not initialized (i.e., if `open` has not been called).
   */
  findEntry(predicate: (entry: AnyZipEntry) => boolean): AnyZipEntry | undefined;
}

/**
 * Represents either a file or a directory in a ZIP archive.
 */
export type AnyZipEntry = ZipFileEntry | ZipDirectoryEntry;

/**
 * Represents a file in a ZIP archive.
 */
export interface ZipFileEntry extends ZipEntry {
  readonly type: "File";

  /**
   * Extracts the file content from the ZIP archive.
   * @returns A promise that resolves with the file content as a Uint8Array.
   * @throws Throws an error if the service is not initialized (i.e., if `open` has not been called)
   * or if the file cannot be extracted.
   *
   * @remarks
   * This loads the entire file into memory. Consider using this method only for small files.
   */
  data(): Promise<Uint8Array>;
}

/**
 * Represents a directory in a ZIP archive.
 */
export interface ZipDirectoryEntry extends ZipEntry {
  readonly type: "Directory";
}

/**
 * Represents a service for working with ZIP archives.
 */
export interface ZipService {
  /**
   * Opens the ZIP archive and performs any necessary initialization.
   * @returns A promise that resolves when the ZIP archive is opened with
   * the list of files in the archive and metadata about the archive.
   * @throws Throws an error if the ZIP archive cannot be opened.
   */
  open(): Promise<ZipArchive>;

  /**
   * Extracts a single file from a ZIP archive.
   * @param file - The file information object.
   * @returns A promise that resolves with the file content as a Uint8Array.
   * @throws Throws an error if the service is not initialized (i.e., if `open` has not been called)
   * or if the file cannot be extracted.
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
  readonly compressionMethod: number;

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
