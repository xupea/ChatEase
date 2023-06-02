/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable camelcase */
import { once } from './functional';

/**
 * An object that performs a cleanup operation when `.dispose()` is called.
 *
 * Some examples of how disposables are used:
 *
 * - An event listener that removes itself when `.dispose()` is called.
 * - A resource such as a file system watcher that cleans up the resource when `.dispose()` is called.
 * - The return value from registering a provider. When `.dispose()` is called, the provider is unregistered.
 */
const TRACK_DISPOSABLES = false;
let disposableTracker: IDisposableTracker | null = null;

export interface IDisposableTracker {
  /**
   * Is called on construction of a disposable.
   */
  trackDisposable(disposable: IDisposable): void;

  /**
   * Is called when a disposable is registered as child of another disposable (e.g. {@link DisposableStore}).
   * If parent is `null`, the disposable is removed from its former parent.
   */
  setParent(child: IDisposable, parent: IDisposable | null): void;

  /**
   * Is called after a disposable is disposed.
   */
  markAsDisposed(disposable: IDisposable): void;

  /**
   * Indicates that the given object is a singleton which does not need to be disposed.
   */
  markAsSingleton(disposable: IDisposable): void;
}

export function setDisposableTracker(tracker: IDisposableTracker | null): void {
  disposableTracker = tracker;
}

if (TRACK_DISPOSABLES) {
  const __is_disposable_tracked__ = '__is_disposable_tracked__';
  setDisposableTracker(
    new (class implements IDisposableTracker {
      trackDisposable(x: IDisposable): void {
        const stack = new Error('Potentially leaked disposable').stack!;
        setTimeout(() => {
          if (!(x as any)[__is_disposable_tracked__]) {
            console.log(stack);
          }
        }, 3000);
      }

      setParent(child: IDisposable, parent: IDisposable | null): void {
        if (child && child !== Disposable.None) {
          try {
            (child as any)[__is_disposable_tracked__] = true;
          } catch {
            // noop
          }
        }
      }

      markAsDisposed(disposable: IDisposable): void {
        if (disposable && disposable !== Disposable.None) {
          try {
            (disposable as any)[__is_disposable_tracked__] = true;
          } catch {
            // noop
          }
        }
      }
      markAsSingleton(disposable: IDisposable): void {}
    })()
  );
}

export interface IDisposable {
  dispose(): void;
}

export class DisposableStore implements IDisposable {
  private readonly _toDispose = new Set<IDisposable>();
  private _isDisposed = false;

  public dispose(): void {
    if (this._isDisposed) {
      return;
    }

    markAsDisposed(this);
    this._isDisposed = true;
    this.clear();
  }

  /**
   * Dispose of all registered disposables but do not mark this object as disposed.
   */
  public clear(): void {
    if (this._toDispose.size === 0) {
      return;
    }

    try {
      dispose(this._toDispose);
    } finally {
      this._toDispose.clear();
    }
  }

  public add<T extends IDisposable>(o: T): T {
    return o;
  }
}

function trackDisposable<T extends IDisposable>(x: T): T {
  disposableTracker?.trackDisposable(x);
  return x;
}

function markAsDisposed(disposable: IDisposable): void {
  disposableTracker?.markAsDisposed(disposable);
}

function setParentOfDisposable(
  child: IDisposable,
  parent: IDisposable | null
): void {
  disposableTracker?.setParent(child, parent);
}

export function markAsSingleton<T extends IDisposable>(singleton: T): T {
  disposableTracker?.markAsSingleton(singleton);
  return singleton;
}

export function toDisposable(fn: () => void): IDisposable {
  const self = trackDisposable({
    dispose: once(() => {
      markAsDisposed(self);
      fn();
    }),
  });
  return self;
}

export abstract class Disposable implements IDisposable {
  /**
   * A disposable that does nothing when it is disposed of.
   *
   * TODO: This should not be a static property.
   */
  static readonly None = Object.freeze<IDisposable>({ dispose() {} });

  protected readonly _store = new DisposableStore();

  constructor() {
    trackDisposable(this);
    setParentOfDisposable(this._store, this);
  }

  public dispose(): void {
    markAsDisposed(this);

    this._store.dispose();
  }

  /**
   * Adds `o` to the collection of disposables managed by this object.
   */
  protected _register<T extends IDisposable>(o: T): T {
    if ((o as unknown as Disposable) === this) {
      throw new Error('Cannot register a disposable on itself!');
    }
    return this._store.add(o);
  }
}
