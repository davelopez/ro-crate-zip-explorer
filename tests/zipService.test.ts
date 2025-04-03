import { assert, beforeAll, describe, expect, it, vi } from "vitest";
import type { ZipArchive } from "../src/interfaces";
import { testFileProvider, verifyCrateMetadataContext, type TestZipFile } from "./testUtils";

describe("LocalZipService Implementation", async () => {
  const testFile = await testFileProvider.local("rocrate-test.zip");

  describe("Find files by name", () => {
    let zipArchive: ZipArchive;
    const testFileNameSufix = "1690cb0a3211e932.txt";
    const testFileName = `Trim_on_data_1_${testFileNameSufix}`;
    const testFilePath = `datasets/${testFileName}`;

    beforeAll(async () => {
      zipArchive = await testFile.zipService.open();
    });

    it("should find a file by its full path in the ZIP archive", () => {
      const file = zipArchive.findFileByName(testFilePath);
      assert(file, "File not found in the ZIP archive");
      expect(file.path).toBe(testFilePath);
    });

    it("should find a file by its name in the ZIP archive", () => {
      const file = zipArchive.findFileByName(testFileName);
      assert(file, "File not found in the ZIP archive");
      expect(file.path).toBe(testFilePath);
    });

    it("should return undefined if the file is not found", () => {
      const file = zipArchive.findFileByName("nonexistent.txt");
      expect(file).toBeUndefined();
    });
  });

  testZipService(testFile);

  describe("ZIP64 support", async () => {
    const testFile = await testFileProvider.local("zip64-test.zip");

    testZipService(testFile);
  });
});

describe("RemoteZipService Implementation", async () => {
  const testFile = await testFileProvider.remote("rocrate-test.zip");

  testZipService(testFile);

  describe("ZIP64 support", async () => {
    const testFile = await testFileProvider.remote("zip64-test.zip");

    testZipService(testFile);
  });
});

describe("ZipService.extractFile", () => {
  it("should throw an error when extracting a directory", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
      // Suppress console.error output, since we expect an error to be thrown
    });

    try {
      const testFile = await testFileProvider.local("rocrate-test.zip");
      const zipService = testFile.zipService;
      const zipArchive = await zipService.open();
      const directory = zipArchive.findEntryMatching((entry) => entry.type === "Directory");

      assert(directory, "No directory found in the ZIP archive");
      await expect(zipService.extractFile(directory)).rejects.toThrow("Cannot extract a directory");
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});

const testZipService = (zipTestFile: TestZipFile) => {
  const zipService = zipTestFile.zipService;
  const expectations = zipTestFile.expectations;
  let zipArchive: ZipArchive;

  beforeAll(async () => {
    zipArchive = await zipTestFile.zipService.open();
  });

  describe("zipArchive", () => {
    describe("listFiles", () => {
      it("should return a list with all the files and directories contained in the remote Zip archive", () => {
        expect(zipArchive.entries.size).toBe(expectations.entriesCount);
      });
    });

    describe("extractFile", () => {
      it("should decompress and return the content of the file in the remote Zip archive", async () => {
        expect(zipArchive.entries.size).toBeGreaterThan(0);
        const remoteMetadataFile = zipArchive.findFileByName("ro-crate-metadata.json");

        assert(remoteMetadataFile, "No RO-Crate metadata file found in the ZIP archive");

        const metadataFileData = await zipService.extractFile(remoteMetadataFile);
        expect(metadataFileData).toBeDefined();

        const metadataFileText = new TextDecoder().decode(metadataFileData);
        const metadataObject = JSON.parse(metadataFileText) as Record<string, unknown>;
        verifyCrateMetadataContext(metadataObject);
      });
    });

    it("should return the expected value for isZip64", () => {
      expect(zipArchive.isZip64).toBe(expectations.isZip64);
    });

    it("should return the expected value for size", () => {
      expect(zipArchive.size).toBe(expectations.zipSize);
    });
  });
};
