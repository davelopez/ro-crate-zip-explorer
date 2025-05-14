import { ensureUrlSupportsRanges, followRedirects, getRange, validateUrl, type RangeSupport } from "../utils.js";
import { AbstractZipService } from "./zipService.js";

export class RemoteZipService extends AbstractZipService {
  private url: string;
  private rangeSupport?: RangeSupport;

  constructor(url: string) {
    super(url);
    this.url = validateUrl(url);
  }

  protected override async doOpen(): Promise<void> {
    this.url = await followRedirects(this.url);
    this.rangeSupport = await ensureUrlSupportsRanges(this.url);
  }

  public get zipSize(): number {
    return this.rangeSupport?.contentLength ?? 0;
  }

  protected override async getRange(start: number, length: number): Promise<Uint8Array> {
    return getRange(this.url, start, length);
  }

  /**
   * Return a ReadableStream of exactly bytes [start…start+length-1].
   */
  protected override async getRangeStream(start: number, length: number): Promise<ReadableStream<Uint8Array>> {
    const end = start + length - 1;
    const res = await fetch(this.url, {
      headers: { Range: `bytes=${start}-${end}` },
    });

    // HTTP 206 = Partial Content
    if (!res.ok || res.status !== 206) {
      throw new Error(`Range request failed: ${res.status} ${res.statusText}`);
    }

    if (!res.body) {
      throw new Error("ReadableStream not supported by this environment");
    }

    return res.body;
  }
}
