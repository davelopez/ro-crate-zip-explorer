import { beforeAll, describe, expect, it } from "vitest";
import type { ZipArchive } from "../src/interfaces";
import { testFileProvider, verifyCrateMetadataContext, type TestZipFile } from "./testUtils";

describe("LocalZipService Implementation", async () => {
  const testFile = await testFileProvider.local("rocrate-test.zip");

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
        expect(zipArchive.entries.length).toBe(expectations.entriesCount);
      });
    });

    describe("extractFile", () => {
      it("should decompress and return the content of the file in the remote Zip archive", async () => {
        expect(zipArchive.entries.length).toBeGreaterThan(0);
        const remoteMetadataFile = zipArchive.findFileByName("ro-crate-metadata.json");

        if (!remoteMetadataFile) {
          throw new Error("No RO-Crate metadata file found in the ZIP archive");
        }

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
