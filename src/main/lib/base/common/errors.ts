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
}

export const errorHandler = new ErrorHandler();

export function setUnexpectedErrorHandler(
  newUnexpectedErrorHandler: (e: any) => void
): void {
  errorHandler.setUnexpectedErrorHandler(newUnexpectedErrorHandler);
}

export function illegalState(name?: string): Error {
  if (name) {
    return new Error(`Illegal state: ${name}`);
  } else {
    return new Error('Illegal state');
  }
}
