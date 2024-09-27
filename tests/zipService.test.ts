import { beforeAll, describe, expect, it } from "vitest";
import type { ZipService } from "../src/interfaces";
import { LocalZipService } from "../src/zip/localZipService";
import { RemoteZipService } from "../src/zip/remoteZipService";
import { testFileProvider } from "./testUtils";

describe("LocalZipService Implementation", async () => {
  const file = await testFileProvider.local("simple-invocation.rocrate.zip");

  testZipService(() => new LocalZipService(file));
});

describe("RemoteZipService Implementation", async () => {
  const url = await testFileProvider.remote("simple-invocation.rocrate.zip");

  testZipService(() => new RemoteZipService(url));
});

const testZipService = (createZipService: () => ZipService) => {
  let zipService: ZipService;

  beforeAll(() => {
    zipService = createZipService();
  });

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
};
