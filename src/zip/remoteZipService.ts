import { getRange, validateUrl } from "../utils";
import { AbstractZipService } from "./zipService";

export class RemoteZipService extends AbstractZipService {
  constructor(private url: string) {
    validateUrl(url);
    super();
  }

  protected override async getRange(start: number, length: number): Promise<Uint8Array> {
    return getRange(this.url, start, length);
  }

  protected override async getZipSize(): Promise<number> {
    const headResponse = await fetch(this.url, { method: "HEAD" });

    const acceptRanges = headResponse.headers.get("accept-ranges");
    if (!acceptRanges || acceptRanges === "none") throw new Error("The server doesn't support range requests.");

    const contentLength = headResponse.headers.get("content-length");
    if (!contentLength) throw new Error("Cannot get content length of remote ZIP file.");

    return Number(contentLength);
  }
}
