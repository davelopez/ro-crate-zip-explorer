import fs from "fs";
import path from "path";
import util from "util";
import type { ZipService } from "../src/interfaces";
import { LocalZipService, RemoteZipService } from "../src/zip";

const readFile = util.promisify(fs.readFile);

type TestFileNames = "simple-invocation.rocrate.zip" | "zip64-test.zip";

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
    zipService: new LocalZipService(file),
    expectations: {
      entriesCount: 19,
      zipSize: zipContents.length,
      isZip64: testFileName === "zip64-test.zip",
    },
  };
}

async function getTestZipUrl(testFileName: TestFileNames): Promise<TestZipFile> {
  const remoteZipUrl = `https://github.com/davelopez/ro-crate-zip-explorer/raw/main/tests/test-data/${testFileName}`;
  return Promise.resolve({
    zipService: new RemoteZipService(remoteZipUrl),
    expectations: {
      entriesCount: 19,
      zipSize: 0,
      isZip64: testFileName === "zip64-test.zip",
    },
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
  /** The ZIP service to test. */
  zipService: ZipService;

  /** The expected results of testing the ZIP service. */
  expectations: TestZipExpectations;
}
