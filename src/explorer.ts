import { ROCrate } from "ro-crate";
import type { IROCrateExplorer, IZipExplorer, ZipArchive, ZipFileEntry, ZipService } from "./interfaces.js";
import type { ROCrateImmutableView } from "./types/ro-crate-interfaces.js";
import { LocalZipService } from "./zip/localZipService.js";
import { RemoteZipService } from "./zip/remoteZipService.js";

const ROCRATE_METADATA_FILENAME = "ro-crate-metadata.json";

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
export class ZipExplorer implements IZipExplorer {
  protected readonly zipService: ZipService;
  protected zipArchive?: ZipArchive;

  public constructor(source: File | string) {
    this.zipService = zipServiceFactory(source);
  }

  public async open(): Promise<ZipArchive> {
    if (!this.zipArchive) {
      this.zipArchive = await this.zipService.open();
    }
    return this.zipArchive;
  }

  public async getFileContents(fileEntry: ZipFileEntry) {
    return await this.zipService.extractFile(fileEntry);
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
export class ROCrateZipExplorer extends ZipExplorer implements IROCrateExplorer {
  private _crate?: ROCrate | null = undefined;

  public get hasCrate(): boolean {
    this.ensureZipArchiveOpen();
    return Boolean(this._crate);
  }

  public get crate(): ROCrateImmutableView {
    if (this._crate) {
      // Here only an immutable view of the RO-Crate is returned
      return this._crate as ROCrateImmutableView;
    }
    this.ensureZipArchiveOpen();
    throw new Error("No RO-Crate metadata found in the ZIP archive");
  }

  public override async open(): Promise<ZipArchive> {
    const zipArchive = await super.open();
    this._crate = await this.extractROCrateMetadata(zipArchive);
    return zipArchive;
  }

  private async extractROCrateMetadata(zipArchive: ZipArchive): Promise<ROCrate | null> {
    const crateEntry = this.findCrateEntry(zipArchive);
    if (!crateEntry) {
      return null;
    }
    const crateData = await this.zipService.extractFile(crateEntry);
    const crateJson = new TextDecoder().decode(crateData);
    const json = JSON.parse(crateJson) as Record<string, unknown>;
    const crate = new ROCrate(json, { array: false, link: true });
    return crate;
  }

  private findCrateEntry(zipArchive: ZipArchive): ZipFileEntry | undefined {
    const roCrateFileEntry = zipArchive.findFileByName(ROCRATE_METADATA_FILENAME);
    return roCrateFileEntry;
  }

  private ensureZipArchiveOpen(): void {
    if (!this.zipArchive) {
      throw new Error("Please call open() before trying to access the RO-Crate");
    }
  }
}

function zipServiceFactory(source: File | string): ZipService {
  if (source instanceof File) {
    return new LocalZipService(source);
  } else {
    return new RemoteZipService(source);
  }
}
