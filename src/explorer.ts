import { ROCrate } from "ro-crate";
import type {
  AnyZipEntry,
  IFileMetadataProvider,
  IROCrateExplorer,
  IZipExplorer,
  ZipArchive,
  ZipEntryMetadata,
  ZipFileEntry,
  ZipService,
  ZipSource,
} from "./interfaces.js";
import type { ROCrateImmutableView } from "./types/ro-crate-interfaces.js";
import { combineDefined } from "./utils.js";
import { LocalZipService } from "./zip/localZipService.js";
import { RemoteZipService } from "./zip/remoteZipService.js";

const ROCRATE_METADATA_FILENAME = "ro-crate-metadata.json";

/**
 * An abstract class for providing file metadata from a ZIP archive.
 * This class implements the IFileMetadataProvider interface and provides
 * methods for extracting metadata from files in the ZIP archive.
 */
abstract class AbstractFileMetadataProvider implements IFileMetadataProvider {
  private fileMetadataMap: Map<string, ZipEntryMetadata> = new Map<string, ZipEntryMetadata>();

  public abstract get entries(): Map<string, AnyZipEntry>;

  public async extractMetadata(): Promise<void> {
    this.fileMetadataMap.clear();

    await this.loadMetadata();

    const zipFileEntries = this.entries.values();
    for (const entry of zipFileEntries) {
      if (entry.type === "File") {
        const metadata = this.extractMetadataFromEntry(entry);
        this.fileMetadataMap.set(entry.path, metadata);
      }
    }
  }

  public getFileEntryMetadata(entry: ZipFileEntry): ZipEntryMetadata {
    const metadata = this.fileMetadataMap.get(entry.path);
    if (!metadata) {
      throw new Error(`Metadata for file ${entry.path} not found. Make sure to call extractMetadata() first.`);
    }
    return metadata;
  }

  /**
   * Loads the metadata from the ZIP archive.
   *
   * **This method should be implemented by subclasses since it is specific to the type of metadata being loaded.**
   *
   * **The default implementation does nothing.**
   *
   * @returns A promise that resolves when the metadata is loaded.
   * @throws Throws an error if the metadata cannot be loaded.
   * @remarks
   * This method is called by the `extractMetadata` method to load the metadata from the contents of the ZIP archive
   * prior to extracting the metadata from each file entry.
   */
  protected loadMetadata(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Extracts partial file metadata from a ZIP file entry.
   *
   * **This method should be implemented by subclasses to provide specific metadata extraction logic.**
   *
   * The default implementation extracts the file name and size from the zip file entry.
   * @param entry - The ZIP file entry to extract metadata from.
   * @returns A partial FileMetadata object containing the extracted metadata.
   *
   * @remarks
   * This method returns all the metadata that can be extracted from the information provided by loadMetadata.
   * The metadata returned by this method is merged with the metadata extracted from the ZIP file entry itself.
   */
  protected extractPartialFileMetadata(entry: ZipFileEntry): Partial<ZipEntryMetadata> {
    return this.extractBasicFileMetadata(entry);
  }

  /**
   * Extracts basic file metadata from a ZIP file entry.
   * @param entry - The ZIP file entry to extract metadata from.
   * @returns A FileMetadata object containing basic metadata from the ZIP file entry.
   *
   * @remarks
   * This method extracts the file name and size from the zip file entry.
   */
  protected extractBasicFileMetadata(entry: ZipFileEntry): ZipEntryMetadata {
    return {
      path: entry.path,
      entry: entry,
      name: entry.path.split("/").pop() ?? entry.path,
      size: entry.fileSize,
      dateTime: entry.dateTime,
      // TODO: read comment from the zip entry?
      description: undefined,
    };
  }

  /**
   * Extracts metadata from a ZIP file entry.
   * @param entry - The ZIP file entry to extract metadata from.
   * @returns A FileMetadata object containing the extracted metadata.
   *
   * @remarks
   * This method merges the metadata extracted from the ZIP file entry itself with the metadata
   * extracted by the `extractPartialFileMetadata` method.
   */
  protected extractMetadataFromEntry(entry: ZipFileEntry): ZipEntryMetadata {
    const entryMetadata = this.extractBasicFileMetadata(entry);
    const partialMetadata = this.extractPartialFileMetadata(entry);
    return combineDefined(entryMetadata, partialMetadata);
  }
}

/**
 * A class for exploring the contents of a ZIP archive.
 *
 * You can either pass a File object representing a ZIP archive or a URL string pointing to a remotely hosted ZIP archive.
 *
 * Example usage:
 * ```typescript
 * const explorer = new ZipExplorer("https://example.com/archive.zip");
 * const zip = await explorer.open();
 * console.log(zip.size);
 * ```
 */
export class ZipExplorer extends AbstractFileMetadataProvider implements IZipExplorer {
  private readonly zipService: ZipService;
  private _zipArchive?: ZipArchive;

  public constructor(public readonly source: ZipSource) {
    super();
    this.zipService = zipServiceFactory(source);
  }

  public get entries(): Map<string, AnyZipEntry> {
    return this.ensureZipArchiveOpen().entries;
  }

  /**
   * The underlying ZIP archive object.
   * @throws Throws an error if the ZIP archive is not open.
   * @returns The opened ZIP archive.
   */
  public get zipArchive(): ZipArchive {
    return this.ensureZipArchiveOpen();
  }

  /**
   * Ensures that the ZIP archive is open and returns it.
   * @throws Throws an error if the ZIP archive is not open.
   * @returns The opened ZIP archive.
   */
  public ensureZipArchiveOpen(): ZipArchive {
    if (!this._zipArchive) {
      throw new Error("Please call open() before accessing the ZIP archive");
    }
    return this._zipArchive;
  }

  public async open(): Promise<ZipArchive> {
    if (!this._zipArchive) {
      this._zipArchive = await this.zipService.open();
    }
    return this._zipArchive;
  }

  public async getFileContents(fileEntry: ZipFileEntry) {
    return await this.zipService.extractFile(fileEntry);
  }

  public getFileStream(fileEntry: ZipFileEntry): ReadableStream<Uint8Array> {
    return this.zipService.extractFileStream(fileEntry);
  }
}

/**
 * An abstract class for exploring the contents of a ZIP archive that contains additional files that
 * provide metadata for the files in the archive. It is used as a base class for
 * `ROCrateZipExplorer` and other ZIP explorers that require metadata extraction.
 *
 * You can either pass a File object representing a ZIP archive, a URL string pointing to a remotely hosted ZIP archive
 * or an instance of IZipExplorer.
 *
 * Passing an instance of IZipExplorer allows you to reuse the same basic information about the ZIP archive
 * without having to open it again.
 *
 * You must implement the `loadMetadata` method to load the metadata from the ZIP archive (usually from a file in the archive) in
 * order to extract additional metadata for the files in the archive. You also need to implement the
 * `extractPartialFileMetadata` method to extract the metadata from the file entry itself once the metadata
 * has been loaded.
 *
 * For an example of how to implement a custom ZIP explorer, which loads metadata from a file in the archive,
 * see the `ROCrateZipExplorer` class.
 */
export abstract class AbstractZipExplorer extends AbstractFileMetadataProvider implements IZipExplorer {
  protected readonly explorer: IZipExplorer;

  constructor(sourceOrExplorer: ZipSource | IZipExplorer) {
    super();
    if (isZipExplorer(sourceOrExplorer)) {
      this.explorer = sourceOrExplorer;
    } else {
      this.explorer = new ZipExplorer(sourceOrExplorer);
    }
  }

  public get entries(): Map<string, AnyZipEntry> {
    return this.explorer.entries;
  }

  public get zipArchive(): ZipArchive {
    return this.explorer.zipArchive;
  }

  /**
   * Ensures that the ZIP archive is open and returns it.
   * @throws Throws an error if the ZIP archive is not open.
   * @returns The opened ZIP archive.
   */
  public ensureZipArchiveOpen(): ZipArchive {
    return this.explorer.zipArchive;
  }

  public open(): Promise<ZipArchive> {
    return this.explorer.open();
  }

  public getFileContents(fileEntry: ZipFileEntry): Promise<Uint8Array> {
    return this.explorer.getFileContents(fileEntry);
  }

  public getFileStream(fileEntry: ZipFileEntry): ReadableStream<Uint8Array> {
    return this.explorer.getFileStream(fileEntry);
  }
}

/**
 * A class for exploring the contents of a ZIP archive containing an RO-Crate manifest.
 *
 * You can either pass a File object representing a ZIP archive or a URL string pointing to a remotely hosted ZIP archive.
 *
 * Example usage:
 * ```typescript
 * const explorer = new ROCrateZipExplorer("https://example.com/archive.zip");
 * const zip = await explorer.open();
 * console.log(zip.size);
 *
 * if (explorer.hasCrate) {
 *   console.log(explorer.crate.graphSize);
 * } else {
 *   console.log("No RO-Crate metadata found in the ZIP archive");
 * }
 * ```
 */
export class ROCrateZipExplorer extends AbstractZipExplorer implements IROCrateExplorer {
  private _crate?: ROCrate | null = undefined;

  public get hasCrate(): boolean {
    return Boolean(this.ensureZipArchiveOpen().findFileByName(ROCRATE_METADATA_FILENAME));
  }

  public get crate(): ROCrateImmutableView {
    if (this._crate) {
      // Here only an immutable view of the RO-Crate is returned
      return this._crate as ROCrateImmutableView;
    }
    this.ensureZipArchiveOpen();
    throw new Error("No RO-Crate metadata found in the ZIP archive");
  }

  /**
   * Loads the RO-Crate metadata from the ZIP archive.
   * This method is called by the `extractMetadata` method to load the metadata from the contents of the ZIP archive
   * prior to extracting the metadata from each file entry.
   */
  protected override async loadMetadata(): Promise<void> {
    if (!this._crate) {
      this._crate = await this.extractROCrateMetadata(this.ensureZipArchiveOpen());
    }
  }

  protected override extractPartialFileMetadata(entry: ZipFileEntry): Partial<ZipEntryMetadata> {
    const base = this.extractBasicFileMetadata(entry);
    const entity = this.crate.getEntity(entry.path);
    if (!entity) {
      return base;
    }
    // Enhance the base metadata (from the zip entry) with additional properties that can be extracted
    // from the entity in the RO-Crate graph.
    const entityName = "name" in entity && typeof entity.name === "string" ? entity.name : undefined;
    const entityDescription =
      "description" in entity && typeof entity.description === "string" ? entity.description : undefined;
    return {
      ...base,
      name: entityName ?? base.name,
      description: entityDescription ?? base.description,
    };
  }

  private async extractROCrateMetadata(zipArchive: ZipArchive): Promise<ROCrate | null> {
    const crateEntry = zipArchive.findFileByName(ROCRATE_METADATA_FILENAME);
    if (!crateEntry) {
      return null;
    }
    const crateData = await crateEntry.data();
    const crateJson = new TextDecoder().decode(crateData);
    const json = JSON.parse(crateJson) as Record<string, unknown>;
    const crate = new ROCrate(json, { array: false, link: true });
    return crate;
  }
}

function zipServiceFactory(source: ZipSource): ZipService {
  if (source instanceof File) {
    return new LocalZipService(source);
  } else {
    return new RemoteZipService(source);
  }
}

function isZipExplorer(source: ZipSource | IZipExplorer): source is IZipExplorer {
  return source instanceof ZipExplorer;
}
