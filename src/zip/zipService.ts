//Based on https://github.com/agarrec-vivlio/zip-stream-cli/blob/main/src/services/zipService.js

import * as pako from "pako";
import type { AnyZipEntry, ZipDirectoryEntry, ZipEntry, ZipFileEntry, ZipService } from "../interfaces";

const MAX_EOCD_SIZE = 65536;

interface ParsedCentralDirectoryFileHeader {
  fileName: string;
  dateTime: number;
  crc32: number;
  headerOffset: number;
  compressType: number;
  compressSize: number;
  uncompressSize: number;
  nextOffset: number;
}

export abstract class AbstractZipService implements ZipService {
  protected isInitializing = false;

  protected _zipContents?: AnyZipEntry[];
  private _eocdData?: Uint8Array;

  public async open(): Promise<void> {
    if (this.isInitializing || this.isInitialized) {
      return;
    }
    this.isInitializing = true;
    await this.doOpen();
    this._eocdData = await this.loadEOCDData();
    this._zipContents = await this.listFiles();
    this.isInitializing = false;
  }

  protected get isInitialized(): boolean {
    return this._zipContents !== undefined;
  }

  protected get eocdData(): Uint8Array {
    if (this._eocdData === undefined) {
      throw new Error("End of Central Directory (EOCD) data not loaded.");
    }
    return this._eocdData;
  }

  /** Perform internal operations to open the ZIP archive depending on the service type. */
  protected abstract doOpen(): Promise<void>;

  /**
   * The total size of the ZIP archive in bytes.
   */
  public abstract get zipSize(): number;

  /**
   * The list of files in the ZIP archive.
   */
  public get zipContents(): AnyZipEntry[] {
    this.checkInitialized();
    if (!this._zipContents) {
      throw new Error("ZIP contents not loaded.");
    }
    return this._zipContents;
  }

  public findFileByName(fileName: string): ZipFileEntry | undefined {
    this.checkInitialized();
    return this._zipContents?.find((file) => file.type === "File" && file.path.endsWith(fileName)) as ZipFileEntry;
  }

  protected async listFiles(): Promise<AnyZipEntry[]> {
    if (this._zipContents) {
      return this._zipContents;
    }

    try {
      const centralDirectoryData = await this.getCentralDirectory();
      const dataView = new DataView(centralDirectoryData.buffer);
      const entries = [];
      let offset = 0;
      while (offset < centralDirectoryData.length) {
        const centralDirectoryFileHeader = this.parseCentralDirectoryFileHeader(dataView, offset);
        const entry = this.createZipEntry(centralDirectoryFileHeader);

        entries.push(entry);
        offset += centralDirectoryFileHeader.nextOffset;
      }

      return entries;
    } catch (error) {
      console.error("Error listing files from ZIP:", error);
      throw error;
    }
  }

  /**
   * Parses a single ZIP file entry from the Central Directory.
   * @param dataView - The DataView object containing the Central Directory data.
   * @param offset - The offset of the entry in the Central Directory.
   * @returns An object containing relevant data from the parsed central directory file header.
   *
   * Each central directory file header looks like this:
   *
   * | Offset | Bytes | Description                                    |
   * |--------|-------|------------------------------------------------|
   * | 0      | 4     | Signature (0x02014b50)                         |
   * | 4      | 2     | Version made by                                |
   * | 6      | 2     | Minimum version needed to extract              |
   * | 8      | 2     | Bit flag                                       |
   * | 10     | 2     | Compression method                             |
   * | 12     | 2     | File last modification time (MS-DOS format)    |
   * | 14     | 2     | File last modification date (MS-DOS format)    |
   * | 16     | 4     | CRC-32 of uncompressed data                    |
   * | 20     | 4     | Compressed size                                |
   * | 24     | 4     | Uncompressed size                              |
   * | 28     | 2     | File name length (n)                           |
   * | 30     | 2     | Extra field length (m)                         |
   * | 32     | 2     | File comment length (k)                        |
   * | 34     | 2     | Disk number where file starts                  |
   * | 36     | 2     | Internal file attributes                       |
   * | 38     | 4     | External file attributes                       |
   * | 42     | 4     | Offset of local file header (from start of disk) |
   * | 46     | n     | File name                                      |
   * | 46+n   | m     | Extra field                                    |
   * | 46+n+m | k     | File comment                                   |
   */
  public parseCentralDirectoryFileHeader(dataView: DataView, offset: number): ParsedCentralDirectoryFileHeader {
    const fileNameLength = dataView.getUint16(offset + 28, true);
    const extraFieldLength = dataView.getUint16(offset + 30, true);
    const fileNameStartOffset = offset + 46;
    const fileNameEndOffset = fileNameStartOffset + fileNameLength;
    const fileNameBuffer = dataView.buffer.slice(fileNameStartOffset, fileNameEndOffset);

    const fileName = new TextDecoder().decode(fileNameBuffer);
    const dateTime = dataView.getUint32(offset + 12, true);
    const crc32 = dataView.getUint32(offset + 16, true);
    const headerOffset = dataView.getUint32(offset + 42, true);
    const compressType = dataView.getUint16(offset + 10, true);
    const compressSize = dataView.getUint32(offset + 20, true);
    const uncompressSize = dataView.getUint32(offset + 24, true);

    const fileCommentLength = dataView.getUint16(offset + 32, true);
    const nextOffset = 46 + fileNameLength + extraFieldLength + fileCommentLength;
    return { fileName, dateTime, crc32, headerOffset, compressType, compressSize, uncompressSize, nextOffset };
  }

  /**
   * Extracts a single file from a ZIP archive.
   * @param file - The file information object.
   * @returns A promise that resolves with the file content as a Uint8Array.
   */
  public async extractFile(file: ZipEntry): Promise<Uint8Array> {
    try {
      if (file.type === "Directory") {
        throw new Error("Cannot extract a directory.");
      }

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
      console.error(`Error opening ZIP file entry: ${file.path}`, error);
      throw error;
    }
  }

  /**
   * Fetches the raw bytes corresponding to the Central Directory of a ZIP file.
   * @returns A promise that resolves with the Central Directory raw data.
   */
  private async getCentralDirectory(): Promise<Uint8Array> {
    try {
      const eocdOffset = this.findEndOfCentralDirectoryOffset();

      if (eocdOffset === -1) throw new Error("Cannot find the End of Central Directory (EOCD) in the ZIP file.");

      const dataView = new DataView(this.eocdData.buffer);
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
  private async loadEOCDData(): Promise<Uint8Array> {
    const zipSize = this.zipSize;
    const rangeStart = Math.max(zipSize - MAX_EOCD_SIZE, 0);
    const rangeLength = Math.min(zipSize, MAX_EOCD_SIZE);
    const eocdData = await this.getRange(rangeStart, rangeLength);
    return eocdData;
  }

  /**
   * Finds the offset of the End of Central Directory (EOCD) record in the ZIP archive.
   * @returns The offset of the EOCD record.
   */
  private findEndOfCentralDirectoryOffset() {
    const dataView = new DataView(this.eocdData.buffer);
    let offset = this.eocdData.length - 22;
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
  private async calculateFileDataOffset(file: ZipEntry): Promise<number> {
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
  private createZipEntry(centralDirectoryFileHeader: ParsedCentralDirectoryFileHeader): AnyZipEntry {
    const decodedDateTime = this.decodeDateTime(centralDirectoryFileHeader.dateTime);

    const entry: ZipEntry = {
      path: centralDirectoryFileHeader.fileName,
      headerOffset: centralDirectoryFileHeader.headerOffset,
      compressType: centralDirectoryFileHeader.compressType,
      compressSize: centralDirectoryFileHeader.compressSize,
      fileSize: centralDirectoryFileHeader.uncompressSize,
      dateTime: decodedDateTime,
      type: centralDirectoryFileHeader.fileName.endsWith("/") ? "Directory" : "File",
      isCompressed: centralDirectoryFileHeader.compressSize !== centralDirectoryFileHeader.uncompressSize,
    };

    if (entry.type === "Directory") {
      return entry as ZipDirectoryEntry;
    } else {
      return { ...entry, data: () => this.extractFile(entry) };
    }
  }

  private decodeDateTime(dateTime: number) {
    const getBits = (val: number, ...args: number[]) =>
      args.map((n) => {
        const bit = val & (2 ** n - 1);
        val >>= n;
        return bit;
      });

    const [sec, mins, hour, day, mon, year] = getBits(dateTime, 5, 6, 5, 5, 4, 7);
    const decodedDateTime = new Date((year ?? 0) + 1980, (mon ?? 1) - 1, day, hour, mins, sec);
    return decodedDateTime;
  }

  private checkInitialized() {
    if (!this.isInitialized) {
      throw new Error("Service not initialized. Call open() first.");
    }
  }

  /**
   * Fetches a range of bytes from the ZIP archive.
   */
  protected abstract getRange(start: number, length: number): Promise<Uint8Array>;
}
