import { AbstractZipService } from "./zipService.js";

export class LocalZipService extends AbstractZipService {
  constructor(private zipFile: File) {
    super(zipFile);
  }

  public override async doOpen(): Promise<void> {
    // Nothing to do here for now.
  }

  public get zipSize(): number {
    return this.zipFile.size;
  }

  protected override async getRange(start: number, length: number): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(new Uint8Array(reader.result));
        } else {
          reject(new Error("Failed to read file data."));
        }
      };
      reader.onerror = () => {
        reject(new Error("Failed to read file data."));
      };
      const blob = this.zipFile.slice(start, start + length);
      reader.readAsArrayBuffer(blob);
    });
  }

  protected override getRangeStream(start: number, length: number): Promise<ReadableStream<Uint8Array>> {
    const blobSlice = this.zipFile.slice(start, start + length);
    return Promise.resolve(blobSlice.stream());
  }
}
