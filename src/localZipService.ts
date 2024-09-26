import { AbstractZipService } from "./zipService";

export class LocalZipService extends AbstractZipService {
  constructor(private zipFile: File) {
    super();
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

  protected override getZipSize(): Promise<number> {
    return Promise.resolve(this.zipFile.size);
  }
}
