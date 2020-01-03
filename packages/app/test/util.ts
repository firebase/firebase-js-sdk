import { FirebaseService } from '@firebase/app-types/private';
import { FirebaseApp } from '@firebase/app-types';
import { ComponentType, Component } from '@firebase/component';

export class TestService implements FirebaseService {
  constructor(private app_: FirebaseApp, public instanceIdentifier?: string) {}

  // TODO(koss): Shouldn't this just be an added method on
  // the service instance?
  get app(): FirebaseApp {
    return this.app_;
  }

  delete(): Promise<void> {
    return new Promise((resolve: (v?: void) => void) => {
      setTimeout(() => resolve(), 10);
    });
  }
}

export function createTestComponent(
  name: string,
  multiInstances = false,
  type = ComponentType.PUBLIC
): Component {
  const component = new Component(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name as any,
    container => new TestService(container.getProvider('app').getImmediate()),
    type
  );
  component.setMultipleInstances(multiInstances);
  return component;
}
