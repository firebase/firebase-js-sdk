/**
 * The Vertex AI in Firebase Web SDK.
 *
 * @packageDocumentation
 */
import { registerVersion, _registerComponent } from '@firebase/app';
import { GenAIService } from './service';
import { GENAI_TYPE } from './constants';
import { Component, ComponentType } from '@firebase/component';
import { name, version } from '../package.json';
import { decodeInstanceIdentifier } from './helpers';
import { GenAIError, VertexAIError } from './api';
import { GenAIErrorCode } from './types';

declare global {
  interface Window {
    [key: string]: unknown;
  }
}

function registerGenAI(): void {
  _registerComponent(
    new Component(
      GENAI_TYPE,
      (container, { instanceIdentifier }) => {
        if (!instanceIdentifier) {
          throw new GenAIError(GenAIErrorCode.ERROR, 'GenAIService instance identifier is undefined.');
        }

        const backend = decodeInstanceIdentifier(instanceIdentifier);
        // getImmediate for FirebaseApp will always succeed
        const app = container.getProvider('app').getImmediate();
        const auth = container.getProvider('auth-internal');
        const appCheckProvider = container.getProvider('app-check-internal');
        return new GenAIService(app, backend, auth, appCheckProvider);
      },
      ComponentType.PUBLIC
    ).setMultipleInstances(true)
  );

  registerVersion(name, version);
  // BUILD_TARGET will be replaced by values like esm2017, cjs2017, etc during the compilation
  registerVersion(name, version, '__BUILD_TARGET__');
}

registerGenAI();

export * from './api';
export * from './public-types';
