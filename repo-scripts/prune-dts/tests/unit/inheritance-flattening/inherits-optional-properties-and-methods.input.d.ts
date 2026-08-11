interface BaseOpts {
  timeout?: number;
  onProgress?(pct: number): void;
}
export interface PublicOpts extends BaseOpts {}
