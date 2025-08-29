
import { ComponentContainer, InstanceFactoryOptions } from "@firebase/component";
import { AIError } from "./errors";
import { decodeInstanceIdentifier } from "./helpers";
import { chromeAdapterFactory } from "./methods/chrome-adapter";
import { AIService } from "./service";
import { AIErrorCode } from "./types";

export function factory(
  container: ComponentContainer,
  { instanceIdentifier }: InstanceFactoryOptions
): AIService {
  if (!instanceIdentifier) {
    throw new AIError(
      AIErrorCode.ERROR,
      'AIService instance identifier is undefined.'
    );
  }

  const backend = decodeInstanceIdentifier(instanceIdentifier);

  // getImmediate for FirebaseApp will always succeed
  const app = container.getProvider('app').getImmediate();
  const auth = container.getProvider('auth-internal');
  const appCheckProvider = container.getProvider('app-check-internal');

  return new AIService(
    app,
    backend,
    auth,
    appCheckProvider,
    chromeAdapterFactory
  );
}
