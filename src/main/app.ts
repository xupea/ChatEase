import {
  ILifecycleMainService,
  LifecycleMainPhase,
} from './lib/platform/lifecycle/electron-main/lifecycleMainService';

export class ChatEaseApplication {
  constructor(
    @ILifecycleMainService
    private readonly lifecycleMainService: ILifecycleMainService
  ) {
    this.registerListeners();
  }

  private registerListeners(): void {
    // process.on('uncaughtException', (error) => onUnexpectedError(error));
    // process.on('unhandledRejection', (reason: unknown) =>
    //   onUnexpectedError(reason)
    // );
  }

  async startup(): Promise<void> {
    // this.logService.debug('Starting VS Code');

    this.lifecycleMainService.phase = LifecycleMainPhase.Ready;
  }
}
