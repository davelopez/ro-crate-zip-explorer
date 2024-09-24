import JSZip from "jszip";
import { ROCrate } from "ro-crate";

const ROCRATE_METADATA_FILENAME = "ro-crate-metadata.json";

export class ROCrateZipExplorer {
  async openZipFile(file: File): Promise<ROCrate> {
    const arrayBuffer = await file.arrayBuffer();
    const zip = new JSZip();
    const content = await zip.loadAsync(arrayBuffer);
    return await this.readROCrateMetadata(content);
  }

  async openZipUrl(url: string): Promise<ROCrate> {
    const response = await fetch(url);
    const blob = await response.blob();
    const zip = new JSZip();
    const content = await zip.loadAsync(blob);
    return await this.readROCrateMetadata(content);
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
}
