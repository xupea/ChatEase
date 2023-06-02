import { IDisposable } from './lifecycle';

/**
 * A barrier that is initially closed and then becomes opened permanently.
 */
export class Barrier {
  private _isOpen: boolean;
  private _promise: Promise<boolean>;
  private _completePromise!: (v: boolean) => void;

  constructor() {
    this._isOpen = false;
    this._promise = new Promise<boolean>((c, e) => {
      this._completePromise = c;
    });
  }

  isOpen(): boolean {
    return this._isOpen;
  }

  open(): void {
    this._isOpen = true;
    this._completePromise(true);
  }

  wait(): Promise<boolean> {
    return this._promise;
  }
}

export interface IdleDeadline {
  readonly didTimeout: boolean;
  timeRemaining(): number;
}

export let runWhenIdle: (
  callback: (idle: IdleDeadline) => void,
  timeout?: number
) => IDisposable;

export class IdleValue<T> {
  private readonly _executor: () => void;
  private readonly _handle: IDisposable;

  private _didRun: boolean = false;
  private _value?: T;
  private _error: unknown;

  constructor(executor: () => T) {
    this._executor = () => {
      try {
        this._value = executor();
      } catch (err) {
        this._error = err;
      } finally {
        this._didRun = true;
      }
    };
    this._handle = runWhenIdle(() => this._executor());
  }

  dispose(): void {
    this._handle.dispose();
  }

  get value(): T {
    if (!this._didRun) {
      this._handle.dispose();
      this._executor();
    }
    if (this._error) {
      throw this._error;
    }
    return this._value!;
  }

  get isInitialized(): boolean {
    return this._didRun;
  }
}
