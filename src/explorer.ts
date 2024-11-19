import { ROCrate } from "ro-crate";
import type { ROCrateZip, ZipFileEntry, ZipService } from "./interfaces.js";
import { LocalZipService, RemoteZipService } from "./zip";
export type { ROCrateZip };

const ROCRATE_METADATA_FILENAME = "ro-crate-metadata.json";

/**
 * A class for exploring the contents of a ZIP archive containing an RO-Crate manifest.
 *
 * You can either pass a File object representing a ZIP archive or a URL string pointing to a remotely hosted ZIP archive.
 *
 * Example usage:
 * ```typescript
 * const explorer = new ROCrateZipExplorer("https://example.com/archive.zip");
 * const { crate, zip } = await explorer.open();
 * console.log(crate.context);
 * console.log(zip.size);
 * ```
 */
export class ROCrateZipExplorer {
  private zipService: ZipService;
  private crateZip?: ROCrateZip;

  public constructor(source: File | string) {
    this.zipService = zipServiceFactory(source);
  }

  public async open(): Promise<ROCrateZip> {
    if (this.crateZip) {
      return this.crateZip;
    }
    const zip = await this.zipService.open();
    const crate = await this.extractROCrateMetadata();
    this.crateZip = { crate, zip };
    return this.crateZip;
  }

  public async getFileContents(fileEntry: ZipFileEntry) {
    await this.zipService.extractFile(fileEntry);
  }

  private async extractROCrateMetadata(): Promise<ROCrate> {
    const crateEntry = this.findCrateEntry();
    const crateData = await this.zipService.extractFile(crateEntry);
    const crateJson = new TextDecoder().decode(crateData);
    const json = JSON.parse(crateJson) as Record<string, unknown>;
    const crate = new ROCrate(json, { array: false, link: true });
    return crate;
  }

  private findCrateEntry(): ZipFileEntry {
    if (!this.crateZip) {
      throw new Error("The ZIP archive has not been opened yet. Call the `open` method first.");
    }
    const roCrateFileEntry = this.crateZip.zip.findFileByName(ROCRATE_METADATA_FILENAME);
    if (!roCrateFileEntry) {
      throw new Error("No RO-Crate metadata file found in the ZIP archive");
    }
    return roCrateFileEntry;
  }
}

function zipServiceFactory(source: File | string): ZipService {
  if (source instanceof File) {
    return new LocalZipService(source);
  } else {
    return new RemoteZipService(source);
  }
}
