//Based on https://github.com/agarrec-vivlio/zip-stream-cli/blob/main/src/services/zipService.js

import { getRange } from "./utils/rangeFetcher";
import * as stream from "stream";
import * as zlib from "zlib";

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

    let offset = 0;
    while (offset < cdirData.length) {
      const fileNameLength = cdirData.readUInt16LE(offset + 28);
      const extraFieldLength = cdirData.readUInt16LE(offset + 30);
      const fileName = cdirData.subarray(offset + 46, offset + 46 + fileNameLength).toString("utf-8");

      const compressSize = cdirData.readUInt32LE(offset + 20);
      const uncompressSize = cdirData.readUInt32LE(offset + 24);

      const fileInfo = createZipEntryInfo(
        fileName,
        cdirData.readUInt32LE(offset + 12),
        cdirData.readUInt32LE(offset + 42),
        cdirData.readUInt16LE(offset + 10),
        compressSize,
        uncompressSize,
      );

      files.push(fileInfo);
      offset += 46 + fileNameLength + extraFieldLength + cdirData.readUInt16LE(offset + 32);
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
 * @returns A promise that resolves with the content when the file is processed.
 */
export async function extractFile(file: ZipEntryInfo, url: string): Promise<Buffer> {
  try {
    if (file.isDir()) throw new Error("Cannot extract a directory from a ZIP file.");

    const fileDataOffset = await getFileDataOffset(url, file);
    const fileData = await getRange(url, fileDataOffset, file.compressSize);

    if (file.compressSize > 0 && fileData.length !== file.compressSize) {
      throw new Error("File data size mismatch.");
    }

    let fileStream;
    if (file.compressType === 0) {
      fileStream = stream.Readable.from(fileData);
    } else if (file.compressType === 8) {
      fileStream = stream.Readable.from(fileData).pipe(zlib.createInflateRaw());
    } else {
      throw new Error(`Unsupported compression method: ${file.compressType}`);
    }

    return await downloadFile(fileStream);
  } catch (error) {
    console.error(`Error opening ZIP file entry: ${file.filename}`, error);
    throw error;
  }
}

async function getFileDataOffset(url: string, file: ZipEntryInfo) {
  const localHeaderData = await getRange(url, file.headerOffset, 30);
  const fileNameLength = localHeaderData.readUInt16LE(26);
  const extraFieldLength = localHeaderData.readUInt16LE(28);
  const fileDataOffset = file.headerOffset + 30 + fileNameLength + extraFieldLength;
  return fileDataOffset;
}

async function downloadFile(fileStream: stream.Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of fileStream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
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
    const eocdOffset = eocdData.lastIndexOf(Buffer.from("504b0506", "hex"));

    if (eocdOffset === -1) throw new Error("Cannot find the End of Central Directory (EOCD) in the ZIP file.");

    const cdirOffset = eocdData.readUInt32LE(eocdOffset + 16);
    const cdirSize = eocdData.readUInt32LE(eocdOffset + 12);

    return getRange(url, cdirOffset, cdirSize);
  } catch (error) {
    console.error("Error fetching Central Directory:", error);
    throw error;
  }
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
