import JSZip from "jszip";

const ROCRATE_METADATA_FILENAME = "ro-crate-metadata.json";

export class ROCrateZipExplorer {
  async openZipFile(file: File): Promise<any> {
    const arrayBuffer = await file.arrayBuffer();
    const zip = new JSZip();
    const content = await zip.loadAsync(arrayBuffer);
    return await this.readROCratMetadata(content);
  }

  async openZipUrl(url: string): Promise<any> {
    const response = await fetch(url);
    const blob = await response.blob();
    const zip = new JSZip();
    const content = await zip.loadAsync(blob);
    return await this.readROCratMetadata(content);
  }

  private async readROCratMetadata(content: JSZip) {
    const roCrateMetadata = await content.file(ROCRATE_METADATA_FILENAME)?.async("string");
    if (!roCrateMetadata) {
      throw new Error("No RO-Crate metadata file found in the ZIP archive");
    }
    return JSON.parse(roCrateMetadata);
  }
}
