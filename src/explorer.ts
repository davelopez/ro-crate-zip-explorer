import { ROCrate } from "ro-crate";
import type { ROCrateZip, ZipEntryInfo, ZipService } from "./interfaces.js";
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

  constructor(source: File | string) {
    this.zipService = zipServiceFactory(source);
  }

  async open(): Promise<ROCrateZip> {
    await this.zipService.open();
    const files = this.zipService.zipContents;
    const crateEntry = this.findCrateEntry(files);
    const crate = await this.extractROCrateMetadata(crateEntry);
    return { crate, files };
  }

  private findCrateEntry(files: ZipEntryInfo[]): ZipEntryInfo {
    const roCrateFileEntry = files.find((file) => file.filename === ROCRATE_METADATA_FILENAME);
    if (!roCrateFileEntry) {
      throw new Error("No RO-Crate metadata file found in the ZIP archive");
    }
    return roCrateFileEntry;
  }

  private async extractROCrateMetadata(crateEntry: ZipEntryInfo): Promise<ROCrate> {
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
