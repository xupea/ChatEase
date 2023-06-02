/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */

import { app } from 'electron';
import {
  ExpectedError,
  setUnexpectedErrorHandler,
} from './lib/base/common/errors';
import { InstantiationService } from './lib/platform/instantiation/common/instantiationService';
import {
  IInstantiationService,
  ServicesAccessor,
} from './lib/platform/instantiation/common/instantiation';
import { ServiceCollection } from './lib/platform/instantiation/common/serviceCollection';
import { IProductService } from './lib/platform/product/common/productService';
import {
  ILifecycleMainService,
  LifecycleMainService,
} from './lib/platform/lifecycle/electron-main/lifecycleMainService';
import product from './lib/platform/product/common/product';
import { ChatEaseApplication } from './app';
import { SyncDescriptor } from './lib/platform/instantiation/common/descriptors';
import { once } from './lib/base/common/functional';

class ChatEaseMain {
  main() {
    try {
      this.startup();
    } catch (error: any) {
      console.error(error.message);
      app.exit(1);
    }
  }

  private async startup(): Promise<void> {
    // Set the error handler early enough so that we are not getting the
    // default electron error dialog popping up
    setUnexpectedErrorHandler((err) => console.error(err));

    // Create services
    const [instantiationService] = this.createServices();

    try {
      await this.initServices();

      // Startup
      await instantiationService.invokeFunction(async (accessor) => {
        const productService = accessor.get(IProductService);
        const lifecycleMainService = accessor.get(ILifecycleMainService);
        // console.log(productService);
        // console.log(lifecycleMainService);

        once(lifecycleMainService.onWillShutdown)((evt) => {
          console.log(evt);
        });
      });
    } catch (error: any) {
      instantiationService.invokeFunction(this.quit, error);
    }

    return instantiationService.createInstance(ChatEaseApplication).startup();
  }

  private createServices(): [IInstantiationService] {
    const services = new ServiceCollection();
    process.once('exit', () => console.log('exit'));

    // Product
    const productService = { _serviceBrand: undefined, ...product };
    services.set(IProductService, productService);

    // Lifecycle
    services.set(
      ILifecycleMainService,
      new SyncDescriptor(LifecycleMainService, undefined, false)
    );

    return [new InstantiationService(services, true)];
  }

  private async initServices(): Promise<void> {
    return Promise.resolve();
  }

  private quit(
    accessor: ServicesAccessor,
    reason?: ExpectedError | Error
  ): void {
    const lifecycleMainService = accessor.get(ILifecycleMainService);

    let exitCode = 0;

    if (reason) {
      if ((reason as ExpectedError).isExpected) {
        if (reason.message) {
          // logService.trace(reason.message);
        }
      } else {
        exitCode = 1; // signal error to the outside

        if (reason.stack) {
          // logService.error(reason.stack);
        } else {
          // logService.error(`Startup error: ${reason.toString()}`);
        }
      }
    }

    lifecycleMainService.kill(exitCode);
  }
}

new ChatEaseMain().main();
