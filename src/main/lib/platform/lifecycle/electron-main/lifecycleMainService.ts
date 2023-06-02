import { app } from 'electron';
import { Barrier } from '../../../base/common/async';
import { createDecorator } from '../../instantiation/common/instantiation';
import { Disposable } from '../../../base/common/lifecycle';
import { Event } from '../../../base/common/event';

export const ILifecycleMainService = createDecorator<ILifecycleMainService>(
  'lifecycleMainService'
);

interface WindowLoadEvent {
  /**
   * The window that is loaded to a new workspace.
   */
  readonly window: ICodeWindow;

  /**
   * The workspace the window is loaded into.
   */
  readonly workspace:
    | IWorkspaceIdentifier
    | ISingleFolderWorkspaceIdentifier
    | undefined;

  /**
   * More details why the window loads to a new workspace.
   */
  readonly reason: LoadReason;
}

export const enum ShutdownReason {
  /**
   * The application exits normally.
   */
  QUIT = 1,

  /**
   * The application exits abnormally and is being
   * killed with an exit code (e.g. from integration
   * test run)
   */
  KILL,
}

export interface ShutdownEvent {
  /**
   * More details why the application is shutting down.
   */
  reason: ShutdownReason;

  /**
   * Allows to join the shutdown. The promise can be a long running operation but it
   * will block the application from closing.
   */
  join(id: string, promise: Promise<void>): void;
}

export interface ILifecycleMainService {
  readonly _serviceBrand: undefined;

  /**
   * Will be true if the program was restarted (e.g. due to explicit request or update).
   */
  readonly wasRestarted: boolean;

  /**
   * Will be true if the program was requested to quit.
   */
  readonly quitRequested: boolean;

  /**
   * A flag indicating in what phase of the lifecycle we currently are.
   */
  phase: LifecycleMainPhase;

  /**
   * An event that fires when the application is about to shutdown before any window is closed.
   * The shutdown can still be prevented by any window that vetos this event.
   */
  readonly onBeforeShutdown: Event<void>;

  /**
   * An event that fires after the onBeforeShutdown event has been fired and after no window has
   * vetoed the shutdown sequence. At this point listeners are ensured that the application will
   * quit without veto.
   */
  readonly onWillShutdown: Event<ShutdownEvent>;

  /**
   * An event that fires when a window is loading. This can either be a window opening for the
   * first time or a window reloading or changing to another URL.
   */
  readonly onWillLoadWindow: Event<WindowLoadEvent>;

  /**
   * An event that fires before a window closes. This event is fired after any veto has been dealt
   * with so that listeners know for sure that the window will close without veto.
   */
  readonly onBeforeCloseWindow: Event<ICodeWindow>;

  /**
   * Make a `ICodeWindow` known to the lifecycle main service.
   */
  registerWindow(window: ICodeWindow): void;

  /**
   * Reload a window. All lifecycle event handlers are triggered.
   */
  reload(window: ICodeWindow, cli?: NativeParsedArgs): Promise<void>;

  /**
   * Unload a window for the provided reason. All lifecycle event handlers are triggered.
   */
  unload(
    window: ICodeWindow,
    reason: UnloadReason
  ): Promise<boolean /* veto */>;

  /**
   * Restart the application with optional arguments (CLI). All lifecycle event handlers are triggered.
   */
  relaunch(options?: {
    addArgs?: string[];
    removeArgs?: string[];
  }): Promise<void>;

  /**
   * Shutdown the application normally. All lifecycle event handlers are triggered.
   */
  quit(willRestart?: boolean): Promise<boolean /* veto */>;

  /**
   * Forcefully shutdown the application and optionally set an exit code.
   *
   * This method should only be used in rare situations where it is important
   * to set an exit code (e.g. running tests) or when the application is
   * not in a healthy state and should terminate asap.
   *
   * This method does not fire the normal lifecycle events to the windows,
   * that normally can be vetoed. Windows are destroyed without a chance
   * of components to participate. The only lifecycle event handler that
   * is triggered is `onWillShutdown` in the main process.
   */
  kill(code?: number): Promise<void>;

  /**
   * Returns a promise that resolves when a certain lifecycle phase
   * has started.
   */
  when(phase: LifecycleMainPhase): Promise<void>;
}

export const enum LifecycleMainPhase {
  /**
   * The first phase signals that we are about to startup.
   */
  Starting = 1,

  /**
   * Services are ready and first window is about to open.
   */
  Ready = 2,

  /**
   * This phase signals a point in time after the window has opened
   * and is typically the best place to do work that is not required
   * for the window to open.
   */
  AfterWindowOpen = 3,

  /**
   * The last phase after a window has opened and some time has passed
   * (2-5 seconds).
   */
  Eventually = 4,
}

export class LifecycleMainService
  extends Disposable
  implements ILifecycleMainService
{
  declare readonly _serviceBrand: undefined;

  private readonly _onWillShutdown = this._register(
    new Emitter<ShutdownEvent>()
  );
  readonly onWillShutdown = this._onWillShutdown.event;

  private _phase = LifecycleMainPhase.Starting;

  private readonly phaseWhen = new Map<LifecycleMainPhase, Barrier>();

  constructor() {
    super();
    this.when(LifecycleMainPhase.Ready).then(() => this.registerListeners());
  }

  private registerListeners(): void {
    // before-quit: an event that is fired if application quit was
    // requested but before any window was closed.
    const beforeQuitListener = () => {};
    app.addListener('before-quit', beforeQuitListener);

    // window-all-closed: an event that only fires when the last window
    // was closed. We override this event to be in charge if app.quit()
    // should be called or not.
    const windowAllClosedListener = () => {};
    app.addListener('window-all-closed', windowAllClosedListener);
    app.once('will-quit', (e) => {
      // Prevent the quit until the shutdown promise was resolved
      e.preventDefault();

      // Quit again, this time do not prevent this, since our
      // will-quit listener is only installed "once". Also
      // remove any listener we have that is no longer needed

      app.removeListener('before-quit', beforeQuitListener);
      app.removeListener('window-all-closed', windowAllClosedListener);

      app.quit();
    });
  }

  get phase(): LifecycleMainPhase {
    return this._phase;
  }

  set phase(value: LifecycleMainPhase) {
    if (value < this.phase) {
      throw new Error(`Lifecycle cannot go backwards`);
    }

    if (this._phase === value) {
      return;
    }

    // this.trace(`lifecycle (main): phase changed (value: ${value})`);

    this._phase = value;

    const barrier = this.phaseWhen.get(this._phase);
    if (barrier) {
      barrier.open();
      this.phaseWhen.delete(this._phase);
    }
  }

  async when(phase: LifecycleMainPhase): Promise<void> {
    if (phase <= this._phase) {
      return;
    }

    let barrier = this.phaseWhen.get(phase);
    if (!barrier) {
      barrier = new Barrier();
      this.phaseWhen.set(phase, barrier);
    }

    await barrier.wait();
  }

  async relaunch(options?: {
    addArgs?: string[];
    removeArgs?: string[];
  }): Promise<void> {}

  async kill(code?: number): Promise<void> {
    app.exit(code);
  }
}
