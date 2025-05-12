import { createSHA256 } from "hash-wasm";
import { beforeAll, describe, expect, it } from "vitest";

import type { AnyZipEntry } from "../src/interfaces";
import { LocalZipService } from "../src/zip/localZipService";
import { getArrayBufferChecksum, getMemoryUsage, testFileProvider } from "./testUtils";

describe("ZIP extraction memory usage", () => {
  const expectedFile = {
    name: "largefile.bin",
    checksum: "a6d72ac7690f53be6ae46ba88506bd97302a093f7108472bd9efc3cefda06484",
  };
  let service: LocalZipService;
  let entry: AnyZipEntry;

  beforeAll(async () => {
    const testFile = await testFileProvider.local("largefile.zip");
    service = new LocalZipService(testFile.source as File);
    const zipArchive = await service.open();
    const targetEntry = zipArchive.entries.get(expectedFile.name);
    if (!targetEntry || targetEntry.type === "Directory") {
      throw new Error(`Entry "${expectedFile.name}" not found or is a directory`);
    }
    entry = targetEntry;
  });

  it(
    "should load entire file into memory when using extractFile",
    { timeout: 30_000 }, // This test can take a while
    async () => {
      const before = getMemoryUsage();

      const fileBuffer = await service.extractFile(entry);

      const after = getMemoryUsage();
      const memoryUsed = after - before;

      // Expect that at least the full uncompressed size was allocated
      expect(memoryUsed).toBeGreaterThan(entry.fileSize);

      // Expect that the checksum of the extracted file matches the expected checksum
      const checkshum = await getArrayBufferChecksum(fileBuffer);
      expect(checkshum).toBe(expectedFile.checksum);
    },
  );

  it(
    "extractFileStream should not load entire file into memory",
    { timeout: 30_000 }, // This test can take a while
    async () => {
      const before = getMemoryUsage();

      const hasher = await createSHA256();

      // Streamed extraction
      const stream = service.extractFileStream(entry);
      const reader = stream.getReader();
      let done = false;
      while (!done) {
        const result = await reader.read();
        const { value, done: isDone } = result;
        done = isDone;
        // process chunks without buffering
        if (value) {
          hasher.update(value);
        }
      }

      const after = getMemoryUsage();
      const memoryUsed = after - before;

      // Expect memory overhead to be small compared to file size
      expect(memoryUsed).toBeLessThan(entry.fileSize * 0.1);

      const hashHex = hasher.digest();
      // Expect that the checksum of the extracted file matches the expected checksum
      expect(hashHex).toBe(expectedFile.checksum);
    },
  );
});
