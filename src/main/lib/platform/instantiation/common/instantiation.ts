import * as descriptors from './descriptors';

/**
 * Identifies a service of type `T`.
 */
export interface ServiceIdentifier<T> {
  (...args: any[]): void;
  type: T;
}

export namespace _util {
  export const serviceIds = new Map<string, ServiceIdentifier<any>>();

  export const DI_TARGET = '$di$target';
  export const DI_DEPENDENCIES = '$di$dependencies';

  export function getServiceDependencies(
    ctor: any
  ): { id: ServiceIdentifier<any>; index: number }[] {
    return ctor[DI_DEPENDENCIES] || [];
  }
}

export type BrandedService = { _serviceBrand: undefined };

export interface ServicesAccessor {
  get<T>(id: ServiceIdentifier<T>): T;
}

export type GetLeadingNonServiceArgs<TArgs extends any[]> = TArgs extends []
  ? []
  : TArgs extends [...infer TFirst, BrandedService]
  ? GetLeadingNonServiceArgs<TFirst>
  : TArgs;

export interface IInstantiationService {
  readonly _serviceBrand: undefined;

  /**
   * Synchronously creates an instance that is denoted by the descriptor
   */
  createInstance<T>(descriptor: descriptors.SyncDescriptor0<T>): T;
  createInstance<
    Ctor extends new (...args: any[]) => any,
    R extends InstanceType<Ctor>
  >(
    ctor: Ctor,
    ...args: GetLeadingNonServiceArgs<ConstructorParameters<Ctor>>
  ): R;

  /**
   * Calls a function with a service accessor.
   */
  invokeFunction<R, TS extends any[] = []>(
    fn: (accessor: ServicesAccessor, ...args: TS) => R,
    ...args: TS
  ): R;
}

export const IInstantiationService = createDecorator<IInstantiationService>(
  'instantiationService'
);

function storeServiceDependency(
  id: Function,
  target: Function,
  index: number
): void {
  if ((target as any)[_util.DI_TARGET] === target) {
    (target as any)[_util.DI_DEPENDENCIES].push({ id, index });
  } else {
    (target as any)[_util.DI_DEPENDENCIES] = [{ id, index }];
    (target as any)[_util.DI_TARGET] = target;
  }
}

export function createDecorator<T>(serviceId: string): ServiceIdentifier<T> {
  if (_util.serviceIds.has(serviceId)) {
    return _util.serviceIds.get(serviceId)!;
  }

  const id = <any>function (target: Function, key: string, index: number): any {
    if (arguments.length !== 3) {
      throw new Error(
        '@IServiceName-decorator can only be used to decorate a parameter'
      );
    }
    storeServiceDependency(id, target, index);
  };

  id.toString = () => serviceId;

  _util.serviceIds.set(serviceId, id);
  return id;
}
