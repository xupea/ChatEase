export class ErrorHandler {
  private unexpectedErrorHandler: (e: any) => void;

  constructor() {
    this.unexpectedErrorHandler = (e: any) => {
      console.error(e);
    };
  }

  setUnexpectedErrorHandler(newUnexpectedErrorHandler: (e: any) => void) {
    this.unexpectedErrorHandler = newUnexpectedErrorHandler;
  }

  onUnexpectedError(e: any): void {
    this.unexpectedErrorHandler(e);
    this.emit(e);
  }
}

export const errorHandler = new ErrorHandler();

export function setUnexpectedErrorHandler(
  newUnexpectedErrorHandler: (e: any) => void
): void {
  errorHandler.setUnexpectedErrorHandler(newUnexpectedErrorHandler);
}

export function onUnexpectedError(e: any): undefined {
  // ignore errors from cancelled promises
  if (!isCancellationError(e)) {
    errorHandler.onUnexpectedError(e);
  }
  return undefined;
}

export function illegalState(name?: string): Error {
  if (name) {
    return new Error(`Illegal state: ${name}`);
  } else {
    return new Error('Illegal state');
  }
}

export class ExpectedError extends Error {
  readonly isExpected = true;
}
