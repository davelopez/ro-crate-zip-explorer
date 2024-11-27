import { beforeAll, describe, expect, it } from "vitest";
import { ROCrateZipExplorer, type ROCrateZip } from "../src";
import { testFileProvider, verifyCrateMetadataContext, type TestZipFile } from "./testUtils";

describe("ROCrateZipExplorer", () => {
  describe("Explore local ZIP file", async () => {
    const localTestFile = await testFileProvider.local("simple-invocation.rocrate.zip");

    testExplorer(localTestFile);
  });

  describe("Explore remote ZIP file", async () => {
    const remoteTestFile = await testFileProvider.remote("simple-invocation.rocrate.zip");

    testExplorer(remoteTestFile);
  });
});

const testExplorer = (zipTestFile: TestZipFile) => {
  let explorer: ROCrateZipExplorer;
  let rocrateZip: ROCrateZip;

  beforeAll(async () => {
    explorer = new ROCrateZipExplorer(zipTestFile.source);
    rocrateZip = await explorer.open();
  });

  describe("open", () => {
    it("should open the ZIP archive and extract the RO-Crate metadata", () => {
      expect(rocrateZip).toBeDefined();
      expect(rocrateZip.zip).toBeDefined();
      expect(rocrateZip.crate).toBeDefined();
      verifyCrateMetadataContext(rocrateZip.crate as Record<string, unknown>);
    });
  });

  describe("getFileContents", () => {
    it("should extract the contents of a file in the ZIP archive", async () => {
      const file = rocrateZip.zip.findFileByName("ro-crate-metadata.json");
      expect(file).toBeDefined();
      if (file) {
        const fileContents = await explorer.getFileContents(file);
        expect(fileContents).toBeDefined();
        expect(fileContents.byteLength).toBe(10253);
      }
    });
  });
};
