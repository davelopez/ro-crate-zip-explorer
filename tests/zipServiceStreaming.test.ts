import { crc32, createCRC32 } from "hash-wasm";
import { beforeAll, describe, expect, it } from "vitest";

import type { AnyZipEntry, ZipService, ZipSource } from "../src/interfaces";
import { LocalZipService } from "../src/zip/localZipService";
import { RemoteZipService } from "../src/zip/remoteZipService";

import { getMemoryUsage, testFileProvider } from "./testUtils";

function runZipMemoryTests(
  serviceName: string,
  serviceFactory: (source: ZipSource) => ZipService,
  getTestFile: () => Promise<{ source: ZipSource }>,
) {
  describe(`${serviceName} extraction memory usage`, () => {
    const expectedFile = {
      name: "largefile.bin",
      checksum: "2a0e7dbb",
    };

    let service: ZipService;
    let entry: AnyZipEntry;

    beforeAll(async () => {
      const testFile = await getTestFile();
      service = serviceFactory(testFile.source);
      const zipArchive = await service.open();
      const targetEntry = zipArchive.entries.get(expectedFile.name);
      if (!targetEntry || targetEntry.type === "Directory") {
        throw new Error(`Entry "${expectedFile.name}" not found or is a directory`);
      }
      entry = targetEntry;
    });

    it("should load entire file into memory when using extractFile", { timeout: 30_000 }, async () => {
      const before = getMemoryUsage();

      const fileBuffer = await service.extractFile(entry);

      const after = getMemoryUsage();
      const memoryUsed = after - before;

      expect(memoryUsed).toBeGreaterThan(entry.fileSize);

      const checksum = await crc32(fileBuffer);
      expect(checksum).toBe(expectedFile.checksum);
    });

    it("extractFileStream should not load entire file into memory", { timeout: 30_000 }, async () => {
      const hasher = await createCRC32();

      const before = getMemoryUsage();

      const stream = service.extractFileStream(entry);
      const reader = stream.getReader();
      let done = false;
      while (!done) {
        const result = await reader.read();
        const { value, done: isDone } = result;
        done = isDone;
        if (value) {
          hasher.update(value);
        }
      }

      const after = getMemoryUsage();
      const memoryUsed = after - before;

      expect(memoryUsed).toBeLessThan(entry.fileSize * 0.1);
      const checksum = hasher.digest();
      expect(checksum).toBe(expectedFile.checksum);
    });
  });
}

describe("ZIP extraction memory usage", () => {
  runZipMemoryTests(
    "LocalZipService",
    (source) => new LocalZipService(source as File),
    () => testFileProvider.local("largefile.zip"),
  );

  runZipMemoryTests(
    "RemoteZipService",
    (source) => new RemoteZipService(source as string),
    () => testFileProvider.remote("largefile.zip"),
  );
});
