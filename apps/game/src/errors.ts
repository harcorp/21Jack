import { errorStatus, type ErrorCode } from "@21jack/contracts";

export class GameError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "GameError";
  }
  get status(): number {
    return errorStatus[this.code];
  }
}

/** Engine unreachable or answered with an unexpected error. */
export class EngineUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineUnavailableError";
  }
}
