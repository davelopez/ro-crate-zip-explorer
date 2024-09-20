import { describe, it, expect } from "vitest";
import { listFiles, extractFile } from "./remoteZipService";

describe("remoteZipService", () => {
  const validZipUrl =
    "https://github.com/davelopez/ro-crate-zip-explorer/raw/main/test-data/simple-invocation.rocrate.zip";

  describe("listFiles", () => {
    it("should return a list with all the files and directories contained in the remote Zip archive", async () => {
      const files = await listFiles(validZipUrl);
      expect(files.length).toBeGreaterThan(0);
    });
  });

  describe("extractFile", () => {
    it("should decompress and return the content of the file in the remote Zip archive", async () => {
      const files = await listFiles(validZipUrl);
      expect(files.length).toBeGreaterThan(0);
      const remoteMetadataFile = files.find((file) => file.filename === "ro-crate-metadata.json");
      expect(remoteMetadataFile).toBeDefined();

      const metadataFile = await extractFile(remoteMetadataFile!, validZipUrl);
      expect(metadataFile).toBeDefined();

      const json = JSON.parse(metadataFile.toString());
      expect(json["@context"]).toBe("https://w3id.org/ro/crate/1.1/context");
    });
  });
});
