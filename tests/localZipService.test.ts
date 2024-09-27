import { describe, it, expect } from "vitest";
import { LocalZipService } from "../src/zip/localZipService";
import fs from "fs";
import path from "path";
import util from "util";

const readFile = util.promisify(fs.readFile);

async function getTestZipFile() {
  const zipContents = await readFile(
    path.resolve(__dirname, "..", "tests", "test-data", "simple-invocation.rocrate.zip"),
  );
  const file = new File([zipContents], "simple-invocation.rocrate.zip");
  return file;
}

describe("LocalZipService", async () => {
  const zipService = new LocalZipService(await getTestZipFile());

  describe("listFiles", () => {
    it("should return a list with all the files and directories contained in the remote Zip archive", async () => {
      const files = await zipService.listFiles();
      expect(files.length).toBeGreaterThan(0);
    });
  });

  describe("extractFile", () => {
    it("should decompress and return the content of the file in the remote Zip archive", async () => {
      const files = await zipService.listFiles();
      expect(files.length).toBeGreaterThan(0);
      const remoteMetadataFile = files.find((file) => file.filename === "ro-crate-metadata.json");

      if (!remoteMetadataFile) {
        throw new Error("No RO-Crate metadata file found in the ZIP archive");
      }

      const metadataFileData = await zipService.extractFile(remoteMetadataFile);
      expect(metadataFileData).toBeDefined();

      const metadataFileText = new TextDecoder().decode(metadataFileData);

      const json = JSON.parse(metadataFileText) as Record<string, unknown>;
      expect(json["@context"]).toBe("https://w3id.org/ro/crate/1.1/context");
    });
  });
});
