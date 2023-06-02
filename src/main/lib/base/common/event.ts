import { DisposableStore, IDisposable } from './lifecycle';

/**
 * An event with zero or one parameters that can be subscribed to. The event is a function itself.
 */
export interface Event<T> {
  (
    listener: (e: T) => any,
    thisArgs?: any,
    disposables?: IDisposable[] | DisposableStore
  ): IDisposable;
}

export class Emitter<T> {
  constructor(options?: EmitterOptions) {

  }
}
