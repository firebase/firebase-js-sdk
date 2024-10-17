import { FirebaseOptions } from "@firebase/app-types";

declare const FirebaseDefaults: {
    config?: FirebaseOptions;
    emulatorHosts?: Record<string, string|undefined>;
} | undefined;

export default FirebaseDefaults;
