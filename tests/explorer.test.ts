import { assert, beforeAll, describe, expect, it } from "vitest";
import { ROCrateZipExplorer, ZipExplorer } from "../src";
import type { IZipExplorer, ZipArchive } from "../src/interfaces";
import { testFileProvider, verifyCrateMetadataContext, type TestZipFile } from "./testUtils";

describe("ZipExplorer", () => {
  describe("Explore local ZIP file", async () => {
    const localTestFile = await testFileProvider.local("rocrate-test.zip");

    testExplorerWithFile(localTestFile);
  });

  describe("Explore remote ZIP file", async () => {
    const remoteTestFile = await testFileProvider.remote("rocrate-test.zip");

    testExplorerWithFile(remoteTestFile);
  });
});

describe("ROCrateZipExplorer", () => {
  describe("Explore local ZIP file", async () => {
    const localTestFile = await testFileProvider.local("rocrate-test.zip");
    const explorer = new ROCrateZipExplorer(localTestFile.source);

    testROCrateExplorer(explorer);
  });

  describe("Explore remote ZIP file", async () => {
    const remoteTestFile = await testFileProvider.remote("rocrate-test.zip");
    const explorer = new ROCrateZipExplorer(remoteTestFile.source);

    testROCrateExplorer(explorer);
  });

  describe("Wrapping a ZipExplorer with ROCrateZipExplorer", async () => {
    const localTestFile = await testFileProvider.local("rocrate-test.zip");
    const zipExplorer = new ZipExplorer(localTestFile.source);

    const explorer = new ROCrateZipExplorer(zipExplorer);

    testROCrateExplorer(explorer);
  });

  describe("Explore non-RO-Crate ZIP file using ROCrateZipExplorer", async () => {
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

      it("should throw an error when extracting metadata", async () => {
        await expect(explorer.extractMetadata()).rejects.toThrow("No RO-Crate metadata found in the ZIP archive");
      });
    });
  });
});

const testExplorerWithFile = (zipTestFile: TestZipFile) => {
  let explorer: IZipExplorer;

  beforeAll(async () => {
    explorer = new ZipExplorer(zipTestFile.source);
    await explorer.open();
  });

  describe("open", () => {
    it("should return the ZIP archive", () => {
      expect(explorer.zipArchive).toBeDefined();
    });

    it("should have the correct number of entries in the ZIP archive", () => {
      expect(explorer.zipArchive.entries.size).toBe(zipTestFile.expectations.entriesCount);
    });

    it("should return the same ZIP archive when called again", async () => {
      const secondOpen = await explorer.open();
      expect(secondOpen).toBe(explorer.zipArchive);
    });
  });

  describe("Extract metadata", () => {
    beforeAll(async () => {
      await explorer.extractMetadata();
    });

    it("should extract basic metadata from the ZIP entries", () => {
      const testFileName = "Trim_on_data_1_1690cb0a3211e932.txt";
      const testFilePath = `datasets/${testFileName}`;
      const file = explorer.zipArchive.findFileByName(testFilePath);

      assert(file, `File ${testFilePath} not found in the ZIP archive`);

      const metadata = explorer.getFileEntryMetadata(file);
      expect(metadata).toBeDefined();
      expect(metadata.name).toBe(testFileName);
      expect(metadata.size).toBe(849463);
      expect(metadata.description).toBeUndefined();
    });
  });

  describe("File access", () => {
    it("should extract the contents of a file in the ZIP archive", async () => {
      const file = explorer.zipArchive.findFileByName("ro-crate-metadata.json");
      assert(file, "File not found in the ZIP archive");
      const fileContents = await explorer.getFileContents(file);
      expect(fileContents).toBeDefined();
      expect(fileContents.byteLength).toBe(10253);
    });
  });
};

const testROCrateExplorer = (explorer: ROCrateZipExplorer) => {
  describe("Before opening", () => {
    it("should throw an error when trying to check the RO-Crate presence", () => {
      expect(() => explorer.hasCrate).toThrow("Please call open() before accessing the ZIP archive");
    });
  });

  describe("After opening", () => {
    const testEntryFileName = "Trim_on_data_1_1690cb0a3211e932.txt";

    beforeAll(async () => {
      await explorer.open();
    });

    it("should extract the contents of a file in the ZIP archive", async () => {
      const file = explorer.zipArchive.findFileByName("ro-crate-metadata.json");
      assert(file, "File not found in the ZIP archive");
      const fileContents = await explorer.getFileContents(file);
      expect(fileContents).toBeDefined();
      expect(fileContents.byteLength).toBe(10253);
    });

    describe("Before extracting metadata", () => {
      it("should throw an error when trying to access the RO-Crate metadata", () => {
        expect(() => !!explorer.crate).toThrow("No RO-Crate metadata found in the ZIP archive");
      });

      it("should throw an error when trying to get file entry metadata", () => {
        const file = explorer.zipArchive.findFileByName(testEntryFileName);
        assert(file, "File not found in the ZIP archive");
        expect(() => explorer.getFileEntryMetadata(file)).toThrow(
          `Metadata for file ${file.path} not found. Make sure to call extractMetadata() first.`,
        );
      });
    });

    describe("After extracting metadata", () => {
      beforeAll(async () => {
        await explorer.extractMetadata();
      });

      describe("crate access", () => {
        it("should indicate that the ZIP archive contains an RO-Crate", () => {
          expect(explorer.hasCrate).toBe(true);
        });

        it("should provide the RO-Crate metadata", () => {
          expect(explorer.crate).toBeDefined();
          verifyCrateMetadataContext(explorer.crate);
        });
      });

      describe("Extract basic file metadata from the crate", () => {
        it("should extract metadata from a file entry", () => {
          const expectedNameFromMetadata = "Trim on data 1";

          const file = explorer.zipArchive.findFileByName(testEntryFileName);

          assert(file, `File ${testEntryFileName} not found in the ZIP archive`);

          const metadata = explorer.getFileEntryMetadata(file);
          expect(metadata).toBeDefined();
          expect(metadata.name).toBe(expectedNameFromMetadata);
          expect(metadata.size).toBe(849463);
          expect(metadata.description).toBeUndefined();
        });
      });
    });
  });
};
