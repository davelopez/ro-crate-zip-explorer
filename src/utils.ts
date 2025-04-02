// Inspired from: https://github.com/agarrec-vivlio/zip-stream-cli/blob/main/src/utils/rangeFetcher.js

import type { AnyZipEntry, ZipFileEntry, ZipSource } from "./interfaces.js";

/**
 * Contains information about the range support of a URL.
 * The information is composed from some relevant headers from the response.
 */
export interface RangeSupport {
  acceptRanges: string | null;
  contentLength: number;
}

/**
 * Ensure that the provided URL supports byte ranges.
 * @param url - The URL to check.
 * @returns A promise with relevant information about the range support.
 * @throws Throws an error if the fetch request fails.
 */
export async function ensureUrlSupportsRanges(url: string): Promise<RangeSupport> {
  const headResponse = await fetch(url, {
    method: "HEAD",
  });

  if (!headResponse.ok) {
    throw new Error(`Failed to fetch headers for URL: '${url}'. Status: ${headResponse.statusText}`);
  }

  const contentLength = Number(headResponse.headers.get("content-length"));
  let acceptRanges = headResponse.headers.get("accept-ranges");

  if (!acceptRanges) {
    // Some servers may not provide the "Accept-Ranges" header in a HEAD request even if they support range requests.
    // So intead of relying on the header, we can make a range request for the first byte and check the response status.
    const response = await fetch(url, {
      headers: { Range: `bytes=0-0` },
    });

    if (!response.ok) {
      throw new Error(`The server doesn't support range requests for URL: '${url}'. Status: ${response.statusText}`);
    }

    acceptRanges = response.headers.get("accept-ranges");
  }

  return {
    acceptRanges,
    contentLength,
  };
}

/**
 * Fetches a specific byte range as a Uint8Array.
 * @param url - The URL to fetch the byte range from.
 * @param start - The start byte position of the range.
 * @param length - The length of the byte range to fetch.
 * @returns A promise that resolves with the fetched byte range as a Uint8Array.
 */
export async function getRange(url: string, start: number, length: number): Promise<Uint8Array> {
  const response = await fetch(url, {
    headers: { Range: `bytes=${start}-${start + length - 1}` },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch range ${start}-${start + length - 1} . Status: ${response.status} ${response.statusText}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Validates a URL.
 * @param url - The URL to validate.
 * @returns The URL if it is valid.
 * @throws Throws an error if the URL is invalid.
 */
export function validateUrl(url: string): string {
  try {
    new URL(url);
    return url;
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
}

export async function followRedirects(url: string): Promise<string> {
  let currentUrl = url;
  let response: Response;

  do {
    // Send a HEAD request to only get headers without downloading the body
    response = await fetch(currentUrl, {
      method: "HEAD",
      redirect: "manual", // Prevent automatic following of redirects
    });

    if (isRedirectStatus(response.status)) {
      // Get the new URL from the "Location" header
      const location = response.headers.get("Location");
      if (location) {
        // If the location is relative, resolve it against the current URL
        const locationIsRelative = !location.startsWith("http");
        if (locationIsRelative) {
          const currentUrlObj = new URL(currentUrl);
          currentUrl = new URL(location, currentUrlObj).toString();
        } else {
          currentUrl = location;
        }
      } else {
        throw new Error("Redirect location missing in response");
      }
    } else {
      // If it's not a redirect status, we've reached the final URL
      break;
    }
  } while (isRedirectStatus(response.status));

  return currentUrl;
}

/**
 * Checks if a status code is a redirect status code.
 * @param status - The status code to check.
 * @returns `true` if the status code is a redirect status code, otherwise `false`.
 */
function isRedirectStatus(status: number): boolean {
  return status >= 300 && status < 400;
}

/**
 * Type guard to check if the source of a ZIP archive is a remote URL.
 * @param source - The source to check.
 * @returns True if the source is a string (remote URL), false otherwise.
 */
export function isRemoteZip(source: ZipSource): source is string {
  return typeof source === "string";
}

/**
 * Type guard to check if a ZIP entry is of type File.
 * @param source - The source to check.
 * @returns True if the entry is a File, false if it is a Directory or undefined.
 */
export function isFileEntry(entry?: AnyZipEntry): entry is ZipFileEntry {
  return entry !== undefined && entry.type === "File";
}
