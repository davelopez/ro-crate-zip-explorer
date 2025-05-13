import { describe, expect, it, vi } from "vitest";
import type { ZipDirectoryEntry, ZipFileEntry } from "../src";
import type { ZipSource } from "../src/interfaces";
import {
  combineDefined,
  ensureUrlSupportsRanges,
  followRedirects,
  getRange,
  isFileEntry,
  isRemoteZip,
  validateUrl,
} from "../src/utils";

describe("ensureUrlSupportsRanges", () => {
  it("should return range support information for a valid URL", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      headers: {
        get: (header: string) => (header === "content-length" ? "1000" : "bytes"),
      },
    });

    const result = await ensureUrlSupportsRanges("http://example.com");
    expect(result).toEqual({ acceptRanges: "bytes", contentLength: 1000 });
  });

  it("should throw an error if the URL cannot be fetched", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      statusText: "Not Found",
    });

    await expect(ensureUrlSupportsRanges("http://example.com")).rejects.toThrow("Failed to fetch headers for URL:");
  });

  it("should handle missing 'Accept-Ranges' header in HEAD request but present in range request", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (header: string) => (header === "content-length" ? "1000" : null),
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (header: string) => (header === "accept-ranges" ? "bytes" : null),
        },
      });

    const result = await ensureUrlSupportsRanges("http://example.com");
    expect(result).toEqual({ acceptRanges: "bytes", contentLength: 1000 });
  });

  it("should handle missing 'Content-Length' header", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      headers: {
        get: (header: string) => (header === "accept-ranges" ? "bytes" : null),
      },
    });

    const result = await ensureUrlSupportsRanges("http://example.com");
    expect(result).toEqual({ acceptRanges: "bytes", contentLength: 0 });
  });

  it("should throw an error if the server doesn't support range requests", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (header: string) => (header === "content-length" ? "1000" : null),
        },
      })
      .mockResolvedValueOnce({
        ok: false,
        statusText: "Range Not Satisfiable",
      });

    await expect(ensureUrlSupportsRanges("http://example.com")).rejects.toThrow(
      "The server doesn't support range requests for URL:",
    );
  });
});

describe("getRange", () => {
  it("should fetch a specific byte range as a Uint8Array", async () => {
    const mockArrayBuffer = new ArrayBuffer(10);
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockArrayBuffer),
    });

    const result = await getRange("http://example.com", 0, 10);
    expect(result).toEqual(new Uint8Array(mockArrayBuffer));
  });

  it("should throw an error if the range request fails", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    await expect(getRange("http://example.com", 0, 10)).rejects.toThrow("Failed to fetch range");
  });
});

describe("validateUrl", () => {
  it("should return the URL if it is valid", () => {
    const url = "http://example.com";
    expect(validateUrl(url)).toBe(url);
  });

  it("should throw an error if the URL is invalid", () => {
    const url = "invalid-url";
    expect(() => validateUrl(url)).toThrow("Invalid URL:");
  });
});

describe("followRedirects", () => {
  it("should follow redirects and return the final URL", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        status: 301,
        headers: {
          get: (header: string) => (header === "Location" ? "http://redirect.com" : null),
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: {
          get: () => null,
        },
      });

    const result = await followRedirects("http://example.com");
    expect(result).toBe("http://redirect.com");
  });

  it("should throw an error if the redirect location is missing", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      status: 301,
      headers: {
        get: () => null,
      },
    });

    await expect(followRedirects("http://example.com")).rejects.toThrow("Redirect location missing in response");
  });

  it("should resolve relative redirect locations against the current URL", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        status: 301,
        headers: {
          get: (header: string) => (header === "Location" ? "/relative-path" : null),
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: {
          get: () => null,
        },
      });

    const result = await followRedirects("http://example.com");
    expect(result).toBe("http://example.com/relative-path");
  });
});

describe("isFileEntry", () => {
  const baseEntryMock = {
    dateTime: new Date(),
    headerOffset: 0,
    compressionMethod: 0,
    compressSize: 0,
    fileSize: 0,
    isCompressed: false,
  };

  it("should return true for a file entry", () => {
    const fileMock: ZipFileEntry = {
      type: "File",
      path: "file.txt",
      data() {
        return Promise.resolve(new Uint8Array());
      },
      stream() {
        return new ReadableStream<Uint8Array>();
      },
      ...baseEntryMock,
    };
    expect(isFileEntry(fileMock)).toBe(true);
  });

  it("should return false for a directory entry", () => {
    const directoryMock: ZipDirectoryEntry = {
      type: "Directory",
      path: "directory/",
      ...baseEntryMock,
    };
    expect(isFileEntry(directoryMock)).toBe(false);
  });
});

describe("isRemoteZip", () => {
  it("should return true for a remote URL", () => {
    const source: ZipSource = "http://example.com/file.zip";
    expect(isRemoteZip(source)).toBe(true);
  });

  it("should return false for a local file path", () => {
    const source: ZipSource = new File([], "file.zip");
    expect(isRemoteZip(source)).toBe(false);
  });
});

describe("combineDefined", () => {
  it("should merge properties from source into target", () => {
    const target = { a: 1, b: 2 };
    const source = { b: 3, c: 4 };
    const result = combineDefined(target, source);
    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  it("should ignore undefined properties in the source", () => {
    const target = { a: 1, b: 2 };
    const source = { b: undefined, c: 4 };
    const result = combineDefined(target, source);
    expect(result).toEqual({ a: 1, b: 2, c: 4 });
  });

  it("should return the target if the source is empty", () => {
    const target = { a: 1, b: 2 };
    const source = {};
    const result = combineDefined(target, source);
    expect(result).toEqual(target);
  });

  it("should return a new object without modifying the original target or source", () => {
    const target = { a: 1, b: 2 };
    const source = { b: 3, c: 4 };
    const result = combineDefined(target, source);
    expect(result).not.toBe(target);
    expect(result).not.toBe(source);
    expect(target).toEqual({ a: 1, b: 2 });
    expect(source).toEqual({ b: 3, c: 4 });
  });
});
