/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { setUnexpectedErrorHandler } from './lib/base/common/errors';
import { InstantiationService } from './lib/platform/instantiation/common/instantiationService';
import { IInstantiationService } from './lib/platform/instantiation/common/instantiation';
import { ServiceCollection } from './lib/platform/instantiation/common/serviceCollection';
import { IProductService } from './lib/platform/product/common/productService';
import product from './lib/platform/product/common/product';

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
        console.log(productService);
      });
    } catch (error) {
      // await instantiationService.invokeFunction();
    }
  }

  private createServices(): [IInstantiationService] {
    const services = new ServiceCollection();
    process.once('exit', () => console.log('exit'));

    // Product
    const productService = { _serviceBrand: undefined, ...product };
    services.set(IProductService, productService);

    return [new InstantiationService(services, true)];
  }

  private async initServices(): Promise<void> {
    return Promise.resolve();
  }
}

new ChatEaseMain().main();
