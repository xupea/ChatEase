import { IProductConfiguration } from 'main/lib/base/common/product';
import { createDecorator } from '../../instantiation/common/instantiation';

export const IProductService =
  createDecorator<IProductService>('productService');

export interface IProductService extends Readonly<IProductConfiguration> {
  readonly _serviceBrand: undefined;
}
