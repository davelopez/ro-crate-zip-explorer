import JSZip from "jszip";
import { ROCrate } from "ro-crate";
import type { ROCrateZip, ZipEntryInfo } from "./interfaces";

const ROCRATE_METADATA_FILENAME = "ro-crate-metadata.json";

export class ROCrateZipExplorer {
  async openZipFile(file: File): Promise<ROCrateZip> {
    const arrayBuffer = await file.arrayBuffer();
    const zip = new JSZip();
    const content = await zip.loadAsync(arrayBuffer);
    const crate = await this.readROCrateMetadata(content);
    const files = this.getFiles(content);
    return { crate, files };
  }

  private async readROCrateMetadata(content: JSZip) {
    const roCrateMetadata = await content.file(ROCRATE_METADATA_FILENAME)?.async("string");
    if (!roCrateMetadata) {
      throw new Error("No RO-Crate metadata file found in the ZIP archive");
    }
    const json = JSON.parse(roCrateMetadata) as Record<string, unknown>;
    const crate = new ROCrate(json, { array: false, link: true });
    return crate;
  }

  private getFiles(content: JSZip): ZipEntryInfo[] {
    const result: ZipEntryInfo[] = [];
    content.forEach((path, file) => {
      console.log(path, file);
      result.push({
        filename: file.name,
        headerOffset: 0,
        compressType: 8,
        compressSize: 10,
        fileSize: 0,
        date_time: file.date,
        isDir: () => file.dir,
        isCompressed: () => true,
      });
    });

    return result;
  }
}
