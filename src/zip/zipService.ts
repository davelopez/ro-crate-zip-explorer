/**
 * Initially inspired by https://github.com/agarrec-vivlio/zip-stream-cli/blob/main/src/services/zipService.js
 * Other sources:
 * - https://pkwaredownloads.blob.core.windows.net/pkware-general/Documentation/APPNOTE-6.3.9.TXT
 * - https://en.wikipedia.org/wiki/ZIP_(file_format)
 * - https://users.cs.jmu.edu/buchhofp/forensics/formats/pkzip.html
 */

import * as pako from "pako";
import type { AnyZipEntry, ZipArchive, ZipDirectoryEntry, ZipEntry, ZipFileEntry, ZipService } from "../interfaces.js";

/**
 * Abstract class that provides common functionality for ZIP archive services.
 */
export abstract class AbstractZipService implements ZipService {
  private _eocdData?: EndOfCentralDirectoryData;

  public async open(): Promise<ZipArchive> {
    await this.doOpen();
    this._eocdData = await this.loadEOCDData();
    const entries = await this.getZipEntries();
    const zipArchive: ZipArchive = {
      entries,
      size: this.zipSize,
      isZip64: this.eocdData.isZip64,
      findFileByName: (fileName: string) =>
        entries.find((file) => file.type === "File" && file.path.endsWith(fileName)) as ZipFileEntry,
    };
    this.cleanupAfterInitialization();
    return zipArchive;
  }

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

      if (file.compressionMethod === 0) {
        return fileData;
      } else if (file.compressionMethod === 8) {
        return pako.inflateRaw(fileData);
      } else {
        throw new Error(`Unsupported compression method: ${file.compressionMethod}`);
      }
    } catch (error) {
      console.error(`Error opening ZIP file entry: ${file.path}`, error);
      throw error;
    }
  }

  /** The size of the ZIP archive in bytes. */
  protected abstract get zipSize(): number;

  /** Perform internal operations to open the ZIP archive.
   * Must be implemented by subclasses.
   */
  protected abstract doOpen(): Promise<void>;

  /**
   * Fetches a range of bytes from the ZIP archive.
   * @param start - The start offset of the range.
   * @param length - The length of the range.
   * @returns A promise that resolves with the requested range of bytes.
   * Must be implemented by subclasses.
   */
  protected abstract getRange(start: number, length: number): Promise<Uint8Array>;

  /**
   * The End of Central Directory (EOCD) data of the ZIP archive.
   * @throws An error if the EOCD data has not been loaded.
   * @returns The EOCD data object.
   */
  protected get eocdData(): EndOfCentralDirectoryData {
    if (this._eocdData === undefined) {
      throw new Error("End of Central Directory (EOCD) data not loaded.");
    }
    return this._eocdData;
  }

  /**
   * Retrieves the ZIP entries from the Central Directory.
   * @returns A promise that resolves with an array of ZIP file entries.
   * @throws An error if the ZIP entries cannot be parsed.
   */
  protected async getZipEntries(): Promise<AnyZipEntry[]> {
    try {
      const entries = [];
      let offset = 0;
      const centralDirectoryData = await this.getCentralDirectory();
      while (offset < centralDirectoryData.byteLength) {
        const centralDirectoryFileHeader = this.parseCentralDirectoryFileHeader(centralDirectoryData, offset);
        const entry = this.createZipEntry(centralDirectoryFileHeader);

        entries.push(entry);
        offset += centralDirectoryFileHeader.nextOffset;
      }
      return entries;
    } catch (error) {
      console.error("Error parsing entries from Central Directory:", error);
      throw error;
    }
  }

  /**
   * Parses a single ZIP file entry from the Central Directory.
   * @param dataView - The DataView object containing the Central Directory data.
   * @param offset - The offset of the entry in the Central Directory.
   * @returns An object containing relevant data from the parsed central directory file header.
   *
   * Each central directory file header has the following structure:
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
  private parseCentralDirectoryFileHeader(dataView: DataView, offset: number): ParsedCentralDirectoryFileHeader {
    const signature = dataView.getUint32(offset, true);
    if (signature !== ZipConstants.CENTRAL_DIRECTORY_FILE_HEADER_SIGNATURE) {
      throw new Error("Invalid Central Directory file header signature.");
    }

    const fileNameLength = dataView.getUint16(offset + 28, true);
    const extraFieldLength = dataView.getUint16(offset + 30, true);
    const fileNameStartOffset = offset + 46;
    const fileNameEndOffset = fileNameStartOffset + fileNameLength;
    const fileNameBuffer = dataView.buffer.slice(fileNameStartOffset, fileNameEndOffset);

    const fileName = new TextDecoder().decode(fileNameBuffer);
    const dateTime = dataView.getUint32(offset + 12, true);
    const crc32 = dataView.getUint32(offset + 16, true);
    const compressionMethod = dataView.getUint16(offset + 10, true);
    const fileCommentLength = dataView.getUint16(offset + 32, true);

    let compressedSize = dataView.getUint32(offset + 20, true);
    let uncompressedSize = dataView.getUint32(offset + 24, true);
    let headerOffset = dataView.getUint32(offset + 42, true);

    if (headerOffset === ZipConstants.ZIP64_VALUE_STORED_IN_EXTRA_FIELD) {
      const zip64ExtraField = parseZip64ExtraField();
      headerOffset = Number(zip64ExtraField.headerOffset);
      compressedSize = Number(zip64ExtraField.compressedSize);
      uncompressedSize = Number(zip64ExtraField.uncompressedSize);
    }

    const nextOffset = 46 + fileNameLength + extraFieldLength + fileCommentLength;

    return {
      fileName,
      dateTime,
      crc32,
      headerOffset,
      compressionMethod,
      compressedSize,
      uncompressedSize,
      nextOffset,
    };

    /**
     * The ZIP64 extra field has the following structure:
     *
     * | Offset | Bytes | Description                                    |
     * |--------|-------|------------------------------------------------|
     * | 0      | 2     | ZIP64 extra field signature (0x0001)           |
     * | 2      | 2     | Size of the ZIP64 extra field                  |
     * | 4      | 8     | Original uncompressed size                     |
     * | 12     | 8     | Compressed size                                |
     * | 20     | 8     | Offset of local header record                  |
     * | 28     | 4     | Disk number start                              |
     */
    function parseZip64ExtraField(): Zip64ExtraField {
      const extraFieldStart = fileNameEndOffset;
      const extraFieldEnd = extraFieldStart + extraFieldLength;
      const extraFieldData = dataView.buffer.slice(extraFieldStart, extraFieldEnd);
      const extraFieldDataView = new DataView(extraFieldData);
      const signature = extraFieldDataView.getUint16(0, true);
      if (signature !== ZipConstants.ZIP64_EXTRA_FIELD_SIGNATURE) {
        throw new Error("Invalid ZIP64 extra field signature.");
      }
      const uncompressedSize = extraFieldDataView.getBigUint64(4, true);
      const compressedSize = extraFieldDataView.getBigUint64(12, true);
      const headerOffset = extraFieldDataView.getBigUint64(20, true);
      return {
        uncompressedSize,
        compressedSize,
        headerOffset,
      };
    }
  }

  /**
   * Fetches the raw bytes corresponding to the Central Directory of a ZIP file.
   * @returns A promise that resolves with the Central Directory raw data.
   */
  private async getCentralDirectory(): Promise<DataView> {
    try {
      const eocdOffset = this.eocdData.offset;
      const cdirOffset = this.eocdData.dataView.getUint32(eocdOffset + 16, true);
      const cdirSize = this.eocdData.dataView.getUint32(eocdOffset + 12, true);

      const cdirBytes = await this.getRange(cdirOffset, cdirSize);
      return new DataView(cdirBytes.buffer);
    } catch (error) {
      console.error("Error fetching Central Directory:", error);
      throw error;
    }
  }

  /**
   * Retrieves the End of Central Directory (EOCD) data from the ZIP archive.
   * The EOCD record is located at the end of the ZIP file and has a maximum size of about 65 KB.
   * @returns A promise that resolves with the EOCD data.
   * @throws An error if the EOCD data cannot be loaded.
   */
  private async loadEOCDData(): Promise<EndOfCentralDirectoryData> {
    const zipSize = this.zipSize;
    const rangeStart = Math.max(zipSize - ZipConstants.MAX_EOCD_SIZE, 0);
    const rangeLength = Math.min(zipSize, ZipConstants.MAX_EOCD_SIZE);
    const eocdBytes = await this.getRange(rangeStart, rangeLength);
    const eocdDataView = new DataView(eocdBytes.buffer);
    return new EndOfCentralDirectoryData(eocdDataView);
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
    const entry: ZipEntry = {
      path: centralDirectoryFileHeader.fileName,
      headerOffset: centralDirectoryFileHeader.headerOffset,
      compressionMethod: centralDirectoryFileHeader.compressionMethod,
      compressSize: centralDirectoryFileHeader.compressedSize,
      fileSize: centralDirectoryFileHeader.uncompressedSize,
      dateTime: this.decodeDateTime(centralDirectoryFileHeader.dateTime),
      type: centralDirectoryFileHeader.fileName.endsWith("/") ? "Directory" : "File",
      isCompressed: centralDirectoryFileHeader.compressedSize !== centralDirectoryFileHeader.uncompressedSize,
    };

    if (entry.type === "Directory") {
      return entry as ZipDirectoryEntry;
    } else {
      return { ...entry, data: () => this.extractFile(entry) };
    }
  }

  private decodeDateTime(dateTime: number): Date {
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

  /**
   * Cleans up internal data after the ZIP archive has been initialized.
   */
  protected cleanupAfterInitialization() {
    // Clear the EOCD data after initialization to free up memory.
    this._eocdData = undefined;
  }
}

/**
 * Represents relevant data from the End of Central Directory (EOCD) record of a ZIP archive.
 *
 * The EOCD record has the following structure:
 *
 * | Offset | Bytes | Description                                                                   |
 * |--------|-------|-------------------------------------------------------------------------------|
 * | 0      | 4     | Signature (0x06054b50)                                                        |
 * | 4      | 2     | Number of this disk                                                           |
 * | 6      | 2     | Disk where central directory starts                                           |
 * | 8      | 2     | Number of central directory records on this disk                              |
 * | 10     | 2     | Total number of central directory records                                     |
 * | 12     | 4     | Size of central directory                                                     |
 * | 16     | 4     | Offset of start of central directory with respect to the starting disk number |
 * | 20     | 2     | ZIP file comment length                                                       |
 * | 22     | n     | ZIP file comment                                                              |
 */
class EndOfCentralDirectoryData {
  /** The DataView object to access the raw EOCD data. */
  public readonly dataView: DataView;

  /** The start offset of the End of Central Directory (EOCD) record in the ZIP archive. */
  public readonly offset: number;

  /** Indicates if the ZIP archive is a ZIP64 archive. */
  public readonly isZip64: boolean;

  /**
   * Creates a new EndOfCentralDirectoryData object.
   * @param dataView - The raw EOCD data as DataView.
   * @throws An error if the EOCD record cannot be found.
   */
  constructor(dataView: DataView) {
    this.dataView = dataView;
    this.offset = this.findEndOfCentralDirectoryOffset();
    const zip64Locator = this.readZip64Locator();
    this.isZip64 = zip64Locator != undefined;
  }

  /**
   * Finds the offset of the End of Central Directory (EOCD) record in the ZIP archive.
   * @returns The offset of the EOCD record.
   * @throws An error if the EOCD record cannot be found.
   */
  private findEndOfCentralDirectoryOffset() {
    let offset = this.dataView.byteLength - 22;
    while (offset >= 0) {
      if (this.dataView.getUint32(offset, true) === ZipConstants.END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
        return offset;
      }
      offset--;
    }
    throw new Error("Cannot find the End of Central Directory (EOCD). This is not a valid ZIP file.");
  }

  /**
   * Reads the ZIP64 End of Central Directory Locator record from the ZIP archive.
   * @returns The ZIP64 End of Central Directory Locator record if found, otherwise undefined.
   */
  private readZip64Locator(): Zip64EOCDLocator | undefined {
    const zip64EOCDLocatorOffset = this.offset - 20;

    if (zip64EOCDLocatorOffset < 0) return undefined;

    const value = this.dataView.getUint32(zip64EOCDLocatorOffset, true);
    const locatorFound = value === ZipConstants.ZIP64_EOCD_LOCATOR_SIGNATURE;
    if (locatorFound) {
      const diskNumber = this.dataView.getUint32(zip64EOCDLocatorOffset + 4, true);
      const eocdStartOffset = this.dataView.getBigUint64(zip64EOCDLocatorOffset + 8, true);
      const totalNumberOfDisks = this.dataView.getUint32(zip64EOCDLocatorOffset + 16, true);
      const locatorRecord: Zip64EOCDLocator = {
        diskNumber,
        eocdStartOffset,
        totalNumberOfDisks,
      };
      return locatorRecord;
    }
  }
}

interface ParsedCentralDirectoryFileHeader {
  fileName: string;
  dateTime: number;
  crc32: number;
  headerOffset: number;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  nextOffset: number;
}

interface Zip64EOCDLocator {
  readonly diskNumber: number;
  readonly eocdStartOffset: bigint;
  readonly totalNumberOfDisks: number;
}

interface Zip64ExtraField {
  readonly uncompressedSize: bigint;
  readonly compressedSize: bigint;
  readonly headerOffset: bigint;
}

const ZipConstants = {
  /** The maximum size of the End of Central Directory (EOCD) record in bytes. */
  MAX_EOCD_SIZE: 65536,

  /** Identifies the End of Central Directory (EOCD) record start in a ZIP archive. */
  END_OF_CENTRAL_DIRECTORY_SIGNATURE: 0x06054b50,

  /** Identifies the Central Directory File Header of an entry in a ZIP archive. */
  CENTRAL_DIRECTORY_FILE_HEADER_SIGNATURE: 0x02014b50,

  /** Identifies the ZIP64 End of Central Directory Locator record. */
  ZIP64_EOCD_LOCATOR_SIGNATURE: 0x07064b50,

  /** Identifies a ZIP64 extra field record in a Local File Header. */
  ZIP64_EXTRA_FIELD_SIGNATURE: 0x0001,

  /** Value used to indicate that the ZIP64 real value is stored in the Extra Field. */
  ZIP64_VALUE_STORED_IN_EXTRA_FIELD: 0xffffffff,
} as const;
