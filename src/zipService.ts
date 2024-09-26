//Based on https://github.com/agarrec-vivlio/zip-stream-cli/blob/main/src/services/zipService.js

import type { ZipEntryInfo, ZipService } from "./interfaces";
import * as pako from "pako";

const MAX_EOCD_SIZE = 65536;

export abstract class AbstractZipService implements ZipService {
  public async listFiles(): Promise<ZipEntryInfo[]> {
    try {
      const centralDirectoryData = await this.getCentralDirectory();
      const files = [];

      const dataView = new DataView(centralDirectoryData.buffer);
      let offset = 0;
      while (offset < centralDirectoryData.length) {
        const fileNameLength = dataView.getUint16(offset + 28, true);
        const extraFieldLength = dataView.getUint16(offset + 30, true);
        const fileNameStartOffset = offset + 46;
        const extractedFileName = centralDirectoryData.subarray(
          fileNameStartOffset,
          fileNameStartOffset + fileNameLength,
        );
        const fileName = new TextDecoder().decode(extractedFileName);

        const compressSize = dataView.getUint32(offset + 20, true);
        const uncompressSize = dataView.getUint32(offset + 24, true);

        const fileInfo = this.createZipEntryInfo(
          fileName,
          dataView.getUint32(offset + 12, true),
          dataView.getUint32(offset + 42, true),
          dataView.getUint16(offset + 10, true),
          compressSize,
          uncompressSize,
        );

        files.push(fileInfo);
        offset += 46 + fileNameLength + extraFieldLength + dataView.getUint16(offset + 32, true);
      }

      return files;
    } catch (error) {
      console.error("Error listing files from ZIP:", error);
      throw error;
    }
  }

  /**
   * Extracts a single file from a ZIP archive.
   * @param file - The file information object.
   * @returns A promise that resolves with the file content as a Uint8Array.
   */
  public async extractFile(file: ZipEntryInfo): Promise<Uint8Array> {
    try {
      if (file.isDir()) throw new Error("Cannot extract a directory from a ZIP file.");

      const fileDataOffset = await this.calculateFileDataOffset(file);
      const fileData = await this.getRange(fileDataOffset, file.compressSize);

      if (file.compressSize > 0 && fileData.byteLength !== file.compressSize) {
        throw new Error("File data size mismatch.");
      }

      if (file.compressType === 0) {
        return fileData;
      } else if (file.compressType === 8) {
        return pako.inflateRaw(fileData);
      } else {
        throw new Error(`Unsupported compression method: ${file.compressType}`);
      }
    } catch (error) {
      console.error(`Error opening ZIP file entry: ${file.filename}`, error);
      throw error;
    }
  }

  /**
   * Fetches the raw bytes corresponding to the Central Directory of a ZIP file.
   * @returns A promise that resolves with the Central Directory raw data.
   */
  private async getCentralDirectory(): Promise<Uint8Array> {
    try {
      const eocdData = await this.retrieveEOCDData();
      const eocdOffset = this.findEndOfCentralDirectoryOffset(eocdData);

      if (eocdOffset === -1) throw new Error("Cannot find the End of Central Directory (EOCD) in the ZIP file.");

      const dataView = new DataView(eocdData.buffer);
      const cdirOffset = dataView.getUint32(eocdOffset + 16, true);
      const cdirSize = dataView.getUint32(eocdOffset + 12, true);

      return await this.getRange(cdirOffset, cdirSize);
    } catch (error) {
      console.error("Error fetching Central Directory:", error);
      throw error;
    }
  }

  /**
   * Retrieves the End of Central Directory (EOCD) data from the ZIP archive.
   * The EOCD record is located at the end of the ZIP file and has a maximum size of about 65 KB.
   * @returns A promise that resolves with the EOCD data.
   */
  private async retrieveEOCDData(): Promise<Uint8Array> {
    const zipSize = await this.getZipSize();
    const rangeStart = Math.max(zipSize - MAX_EOCD_SIZE, 0);
    const rangeLength = Math.min(zipSize, MAX_EOCD_SIZE);
    const eocdData = await this.getRange(rangeStart, rangeLength);
    return eocdData;
  }

  /**
   * Finds the offset of the End of Central Directory (EOCD) record in the ZIP archive.
   * @param data - The data buffer containing the EOCD record.
   * @returns The offset of the EOCD record.
   */
  private findEndOfCentralDirectoryOffset(data: Uint8Array) {
    const dataView = new DataView(data.buffer);
    let offset = data.length - 22;
    while (offset >= 0) {
      if (dataView.getUint32(offset, true) === 0x06054b50) {
        return offset;
      }
      offset--;
    }
    return -1;
  }

  /**
   * Determines the offset of the file data in the ZIP archive.
   * @param file - The file information object.
   * @returns A promise that resolves with the offset of the file data.
   */
  private async calculateFileDataOffset(file: ZipEntryInfo): Promise<number> {
    const localHeaderData = await this.getRange(file.headerOffset, 30);
    const dataView = new DataView(localHeaderData.buffer);
    const fileNameLength = dataView.getUint16(26, true);
    const extraFieldLength = dataView.getUint16(28, true);
    const fileDataOffset = file.headerOffset + 30 + fileNameLength + extraFieldLength;
    return fileDataOffset;
  }

  /**
   * Creates an object containing information about a ZIP file entry.
   */
  private createZipEntryInfo(
    filename: string,
    date_time: number,
    headerOffset: number,
    compressType: number,
    compressSize: number,
    fileSize: number,
  ): ZipEntryInfo {
    const dateTime = this.decodeDateTime(date_time);

    return {
      filename,
      headerOffset,
      compressType,
      compressSize,
      fileSize,
      date_time: dateTime,
      isDir: () => filename.endsWith("/"),
      isCompressed: () => compressSize !== fileSize,
    };
  }

  private decodeDateTime(date_time: number) {
    const getBits = (val: number, ...args: number[]) =>
      args.map((n) => {
        const bit = val & (2 ** n - 1);
        val >>= n;
        return bit;
      });

    const [sec, mins, hour, day, mon, year] = getBits(date_time, 5, 6, 5, 5, 4, 7);
    const dateTime = new Date((year ?? 0) + 1980, (mon ?? 1) - 1, day, hour, mins, sec);
    return dateTime;
  }

  /**
   * Fetches a range of bytes from the ZIP archive.
   */
  protected abstract getRange(start: number, length: number): Promise<Uint8Array>;

  /**
   * Retrieves the total size of the ZIP archive.
   */
  protected abstract getZipSize(): Promise<number>;
}
