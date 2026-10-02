export class UpstreamError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(
    code: string,
    message: string,
    options: { retryable: boolean; cause?: unknown },
  ) {
    super(message, { cause: options.cause });
    this.name = "UpstreamError";
    this.code = code;
    this.retryable = options.retryable;
  }
}
