import { ComponentContainer } from './component_container';

export const enum InstantiationMode {
    LAZY, // Currently all components are LAZY in JS SDK
    EAGER
}

/**
 * Factory to create a component of type T, given a ComponentContainer.
 * ComponentContainer is the IOC container that provides PROVIDERS
 * for dependencies.
 *
 * NOTE: The container only provides PROVIDERS rather than the actual instances of dependencies.
 * It is useful for lazily loaded dependencies and optional dependencies.
 */
export type ServiceFactory<T = unknown> = (
    container: ComponentContainer,
    instanceIdentifier?: string
) => T;
