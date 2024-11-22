import fs from "fs";
import path from "path";
import util from "util";

const readFile = util.promisify(fs.readFile);

type TestFileNames = "simple-invocation.rocrate.zip" | "zip64-test.zip";

interface TestFileProvider {
  /**
   * Returns a File object containing the contents of the specified test ZIP file from the test-data directory.
   */
  local(testFileName: TestFileNames): Promise<File>;

  /**
   * Returns the URL of the specified test ZIP file from the test-data directory on GitHub.
   */
  remote(testFileName: TestFileNames): Promise<string>;
}

export const testFileProvider: TestFileProvider = {
  local: getTestZipFile,
  remote: getTestZipUrl,
};

async function getTestZipFile(testFileName: TestFileNames): Promise<File> {
  const zipContents = await readFile(path.resolve(__dirname, "..", "tests", "test-data", testFileName));
  const file = new File([zipContents], testFileName);
  return file;
}

async function getTestZipUrl(testFileName: TestFileNames): Promise<string> {
  return Promise.resolve(`https://github.com/davelopez/ro-crate-zip-explorer/raw/main/tests/test-data/${testFileName}`);
}
