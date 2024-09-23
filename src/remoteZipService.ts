//Based on https://github.com/agarrec-vivlio/zip-stream-cli/blob/main/src/services/zipService.js

import { getRange } from "./utils/rangeFetcher";
import * as pako from "pako";

/**
 * Represents information about an entry in a ZIP archive.
 */
interface ZipEntryInfo {
  /** The name of the file in the ZIP archive. */
  filename: string;

  /** The offset of the file header in the ZIP archive. */
  headerOffset: number;

  /** The compression method used for the file. */
  compressType: number;

  /** The compressed size of the file. */
  compressSize: number;

  /** The uncompressed size of the file. */
  fileSize: number;

  /** The date and time encoded in the ZIP entry. */
  date_time: Date;

  /** Determines if the entry is a directory. */
  isDir: () => boolean;

  /** Determines if the entry is compressed. */
  isCompressed: () => boolean;
}

/**
 * Lists entries (files and directories) from the Central Directory of a remote ZIP file.
 * The remote server must support range requests.
 * @param url - The URL of the ZIP file.
 * @returns A promise that resolves with an array of ZipEntryInfo objects.
 */
export async function listFiles(url: string): Promise<ZipEntryInfo[]> {
  try {
    const headResponse = await fetch(url, { method: "HEAD" });

    const acceptRanges = headResponse.headers.get("accept-ranges");
    if (!acceptRanges || acceptRanges === "none") throw new Error("The server doesn't support range requests.");

    const contentLength = headResponse.headers.get("content-length");
    if (!contentLength) throw new Error("Cannot get content length of ZIP file.");

    const cdirData = await getCentralDirectory(Number(contentLength), url);
    const files = [];

    const dataView = new DataView(cdirData.buffer);
    let offset = 0;
    while (offset < cdirData.length) {
      const fileNameLength = dataView.getUint16(offset + 28, true);
      const extraFieldLength = dataView.getUint16(offset + 30, true);
      const fileNameStartOffset = offset + 46;
      const extractedFileName = cdirData.subarray(fileNameStartOffset, fileNameStartOffset + fileNameLength);
      const fileName = new TextDecoder().decode(extractedFileName);

      const compressSize = dataView.getUint32(offset + 20, true);
      const uncompressSize = dataView.getUint32(offset + 24, true);

      const fileInfo = createZipEntryInfo(
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
 * Extracts a single file from a remote ZIP archive.
 * @param file - The file information object.
 * @param url - The URL of the ZIP file.
 * @returns A promise that resolves with the content as a Uint8Array.
 */
export async function extractFile(file: ZipEntryInfo, url: string): Promise<Uint8Array> {
  try {
    if (file.isDir()) throw new Error("Cannot extract a directory from a ZIP file.");

    const fileDataOffset = await getFileDataOffset(url, file);
    const fileData = await getRange(url, fileDataOffset, file.compressSize);

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

async function getFileDataOffset(url: string, file: ZipEntryInfo) {
  const localHeaderData = await getRange(url, file.headerOffset, 30);
  const dataView = new DataView(localHeaderData.buffer);
  const fileNameLength = dataView.getUint16(26, true);
  const extraFieldLength = dataView.getUint16(28, true);
  const fileDataOffset = file.headerOffset + 30 + fileNameLength + extraFieldLength;
  return fileDataOffset;
}

/**
 * Fetches the Central Directory of a ZIP file.
 * @param zipSize - The total size of the ZIP file.
 * @param url - The URL of the ZIP file.
 * @returns A promise that resolves with the Central Directory data.
 */
async function getCentralDirectory(zipSize: number, url: string) {
  try {
    const rangeStart = Math.max(zipSize - 65536, 0);
    const rangeLength = Math.min(zipSize, 65536);
    const eocdData = await getRange(url, rangeStart, rangeLength);
    const eocdOffset = findCentralDirectoryOffset(eocdData);

    if (eocdOffset === -1) throw new Error("Cannot find the End of Central Directory (EOCD) in the ZIP file.");

    const dataView = new DataView(eocdData.buffer);
    const cdirOffset = dataView.getUint32(eocdOffset + 16, true);
    const cdirSize = dataView.getUint32(eocdOffset + 12, true);

    return getRange(url, cdirOffset, cdirSize);
  } catch (error) {
    console.error("Error fetching Central Directory:", error);
    throw error;
  }
}

function findCentralDirectoryOffset(data: Uint8Array) {
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
 * Creates an object containing information about a ZIP file entry.
 */
function createZipEntryInfo(
  filename: string,
  date_time: number,
  headerOffset: number,
  compressType: number,
  compressSize: number,
  fileSize: number,
): ZipEntryInfo {
  const dateTime = decodeDateTime(date_time);

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

function decodeDateTime(date_time: number) {
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
