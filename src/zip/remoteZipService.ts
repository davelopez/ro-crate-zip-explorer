import { ensureUrlSupportsRanges, followRedirects, getRange, validateUrl, type RangeSupport } from "../utils.js";
import { AbstractZipService } from "./zipService.js";

export class RemoteZipService extends AbstractZipService {
  private url: string;
  private rangeSupport?: RangeSupport;

  constructor(private originalUrl: string) {
    super();
    this.url = validateUrl(originalUrl);
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
}
