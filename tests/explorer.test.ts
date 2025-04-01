import { beforeAll, describe, expect, it } from "vitest";
import { ROCrateZipExplorer } from "../src";
import type { ZipArchive } from "../src/interfaces";
import { testFileProvider, verifyCrateMetadataContext, type TestZipFile } from "./testUtils";

describe("ROCrateZipExplorer", () => {
  describe("Explore local ZIP file", async () => {
    const localTestFile = await testFileProvider.local("rocrate-test.zip");

    testExplorer(localTestFile);
  });

  describe("Explore remote ZIP file", async () => {
    const remoteTestFile = await testFileProvider.remote("rocrate-test.zip");

    testExplorer(remoteTestFile);
  });

  describe("Explore non-RO-Crate ZIP file", async () => {
    const nonROCrateTestFile = await testFileProvider.local("non-rocrate-test.zip");
    const explorer = new ROCrateZipExplorer(nonROCrateTestFile.source);

    describe("Before opening", () => {
      it("should throw an error when trying to access the entries", () => {
        expect(() => explorer.entries).toThrow("Please call open() before accessing the ZIP archive");
      });

      it("should throw an error when trying to check the RO-Crate presence", () => {
        expect(() => explorer.hasCrate).toThrow("Please call open() before accessing the ZIP archive");
      });
    });

    describe("After opening", () => {
      let zipArchive: ZipArchive;

      beforeAll(async () => {
        zipArchive = await explorer.open();
      });

      it("should open a regular ZIP file without issues", () => {
        expect(zipArchive).toBeDefined();
      });

      it("should indicate that the ZIP archive does not contain an RO-Crate", () => {
        expect(explorer.hasCrate).toBe(false);
      });

      it("should throw an error when trying to access the RO-Crate metadata", () => {
        expect(() => !!explorer.crate).toThrow("No RO-Crate metadata found in the ZIP archive");
      });
    });
  });
});

const testExplorer = (zipTestFile: TestZipFile) => {
  let explorer: ROCrateZipExplorer;
  let zipArchive: ZipArchive;

  beforeAll(async () => {
    explorer = new ROCrateZipExplorer(zipTestFile.source);
    zipArchive = await explorer.open();
    await explorer.extractMetadata();
  });

  describe("open", () => {
    it("should return the ZIP archive", () => {
      expect(zipArchive).toBeDefined();
    });

    it("should have the correct number of entries in the ZIP archive", () => {
      expect(zipArchive.entries.size).toBe(zipTestFile.expectations.entriesCount);
    });

    it("should indicate that the ZIP archive contains an RO-Crate", () => {
      expect(explorer.hasCrate).toBe(true);
    });

    it("should provide the RO-Crate metadata", () => {
      expect(explorer.crate).toBeDefined();
      verifyCrateMetadataContext(explorer.crate);
    });

    it("should return the same ZIP archive when called again", async () => {
      const secondOpen = await explorer.open();
      expect(secondOpen).toBe(zipArchive);
    });
  });

  describe("getFileContents", () => {
    it("should extract the contents of a file in the ZIP archive", async () => {
      const file = zipArchive.findFileByName("ro-crate-metadata.json");
      expect(file).toBeDefined();
      if (file) {
        const fileContents = await explorer.getFileContents(file);
        expect(fileContents).toBeDefined();
        expect(fileContents.byteLength).toBe(10253);
      }
    });
  });
};
