import { ROCrate } from "ro-crate";
import type { ROCrateZip, ZipEntry, ZipFileEntry, ZipService } from "./interfaces.js";
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
 * const { crate, files } = await explorer.open();
 * console.log(crate.context);
 * console.log(files);
 * ```
 */
export class ROCrateZipExplorer {
  private zipService: ZipService;

  public constructor(source: File | string) {
    this.zipService = zipServiceFactory(source);
  }

  public async open(): Promise<ROCrateZip> {
    await this.zipService.open();
    const zipEntries = this.zipService.zipContents;
    const crateEntry = this.findCrateEntry(zipEntries);
    const crate = await this.extractROCrateMetadata(crateEntry);
    return { crate, zipEntries };
  }

  public async getFileContents(fileEntry: ZipFileEntry) {
    await this.zipService.extractFile(fileEntry);
  }

  private findCrateEntry(files: ZipEntry[]): ZipEntry {
    const roCrateFileEntry = files.find((file) => file.path === ROCRATE_METADATA_FILENAME);
    if (!roCrateFileEntry) {
      throw new Error("No RO-Crate metadata file found in the ZIP archive");
    }
    return roCrateFileEntry;
  }

  private async extractROCrateMetadata(crateEntry: ZipEntry): Promise<ROCrate> {
    const crateData = await this.zipService.extractFile(crateEntry);
    const crateJson = new TextDecoder().decode(crateData);
    const json = JSON.parse(crateJson) as Record<string, unknown>;
    const crate = new ROCrate(json, { array: false, link: true });
    return crate;
  }
}

function zipServiceFactory(source: File | string): ZipService {
  if (source instanceof File) {
    return new LocalZipService(source);
  } else {
    return new RemoteZipService(source);
  }
}
