// Borrowed from: https://github.com/agarrec-vivlio/zip-stream-cli/blob/main/src/utils/rangeFetcher.js

/**
 * Fetches a specific byte range from a given URL.
 * @param url - The URL to fetch the byte range from.
 * @param start - The start byte position of the range.
 * @param end - The end byte position of the range.
 * @returns A promise that resolves with the fetched byte range as a stream.
 * @throws Throws an error if the fetch request fails.
 */
export async function fetchByteRange(url: string, start: number, end: number) {
  const response = await fetch(url, {
    headers: { Range: `bytes=${start}-${end}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch range ${start}-${end}. Status: ${response.status} ${response.statusText}`);
  }

  return response.body;
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
 * @throws Throws an error if the URL is invalid.
 */
export function validateUrl(url: string) {
  try {
    new URL(url);
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
