import fs from "fs";
import path from "path";
import util from "util";
import { expect } from "vitest";
import type { ROCrateImmutableView } from "../src/index.js";
import type { ZipService } from "../src/interfaces.js";
import { LocalZipService } from "../src/zip/localZipService.js";
import { RemoteZipService } from "../src/zip/remoteZipService.js";

const readFile = util.promisify(fs.readFile);

type TestFileNames = "rocrate-test.zip" | "zip64-test.zip" | "non-rocrate-test.zip" | "largefile.zip";

const TestFileExpectations: Record<TestFileNames, TestZipExpectations> = {
  "rocrate-test.zip": {
    entriesCount: 19,
    zipSize: 19631,
    isZip64: false,
  },
  "zip64-test.zip": {
    entriesCount: 19,
    zipSize: 11107,
    isZip64: true,
  },
  "non-rocrate-test.zip": {
    entriesCount: 1,
    zipSize: 218,
    isZip64: false,
  },
  "largefile.zip": {
    entriesCount: 1,
    zipSize: 261118,
    isZip64: false,
  },
};

/**
 * Convenience methods for retrieving test ZIP files and their expected results.
 */
interface TestFileProvider {
  /**
   * Returns a local test ZIP file service and its expected results from the test-data directory.
   */
  local(testFileName: TestFileNames): Promise<TestZipFile>;

  /**
   * Returns a remote test ZIP file service and its expected results from the test-data directory on GitHub.
   */
  remote(testFileName: TestFileNames): Promise<TestZipFile>;
}

export const testFileProvider: TestFileProvider = {
  local: getTestZipFile,
  remote: getTestZipUrl,
};

async function getTestZipFile(testFileName: TestFileNames): Promise<TestZipFile> {
  const zipContents = await readFile(path.resolve(__dirname, "..", "tests", "test-data", testFileName));
  const file = new File([zipContents], testFileName);
  return {
    source: file,
    zipService: new LocalZipService(file),
    expectations: TestFileExpectations[testFileName],
  };
}

async function getTestZipUrl(testFileName: TestFileNames): Promise<TestZipFile> {
  const remoteZipUrl = `https://github.com/davelopez/ro-crate-zip-explorer/raw/main/tests/test-data/${testFileName}`;
  return Promise.resolve({
    source: remoteZipUrl,
    zipService: new RemoteZipService(remoteZipUrl),
    expectations: TestFileExpectations[testFileName],
  });
}

/**
 * The expected results of testing a ZIP archive.
 */
export interface TestZipExpectations {
  /**
   * The expected number of files and directories in the ZIP archive.
   */
  entriesCount: number;

  /**
   * The expected size of the ZIP archive.
   */
  zipSize: number;

  /**
   * Whether the ZIP archive is a ZIP64 file.
   */
  isZip64: boolean;
}

/**
 * A test ZIP service and its expected results.
 */
export interface TestZipFile {
  /** The ZIP archive source, either a local file or a remote URL. */
  source: File | string;

  /** The ZIP service to test. */
  zipService: ZipService;

  /** The expected results of testing the ZIP service. */
  expectations: TestZipExpectations;
}

export function verifyCrateMetadataContext(
  crate: ROCrateImmutableView | Record<string, unknown>,
  expectedContextUrl = "https://w3id.org/ro/crate/1.1/context",
) {
  const context = crate["@context"];
  if (typeof context === "string") {
    expect(context).toBe(expectedContextUrl);
  } else if (Array.isArray(context)) {
    expect(context[0]).toBe(expectedContextUrl);
  }
}

/**
 * Returns the current memory usage of the process for array buffers.
 * This function is useful for debugging and performance analysis.
 */
export function getMemoryUsage() {
  return process.memoryUsage().arrayBuffers;
}
