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
 * Fetches a specific byte range as a Buffer.
 * @param url - The URL to fetch the byte range from.
 * @param start - The start byte position of the range.
 * @param length - The length of the byte range to fetch.
 * @returns A promise that resolves with the fetched byte range as a Buffer.
 */
export async function getRange(url: string, start: number, length: number): Promise<Buffer> {
  const response = await fetch(url, {
    headers: { Range: `bytes=${start}-${start + length - 1}` },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch range ${start}-${start + length - 1} . Status: ${response.status} ${response.statusText}`,
    );
  }

  return Buffer.from(await response.arrayBuffer());
}
