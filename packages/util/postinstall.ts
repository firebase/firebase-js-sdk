import { writeFile, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { isAbsolute, join } from "node:path";
import type { FirebaseOptions } from "@firebase/app";

async function getWebConfig(): Promise<FirebaseOptions|undefined> {
    // $FIREBASE_WEBAPP_CONFIG can be either a JSON representation of FirebaseOptions or the path
    // to a filename
    if (!process.env.FIREBASE_WEBAPP_CONFIG) {
        return undefined;
    }

    let configFromEnvironment: Partial<FirebaseOptions>|undefined = undefined;
    if (process.env.FIREBASE_WEBAPP_CONFIG.startsWith("{\"")) {
        try {
            configFromEnvironment = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
        } catch(e) {
            console.error("FIREBASE_WEBAPP_CONFIG could not be parsed.", e);
        }
    } else {
        const fileName = process.env.FIREBASE_WEBAPP_CONFIG;
        const fileURL = pathToFileURL(isAbsolute(fileName) ? fileName : join(process.cwd(), fileName));
        const fileContents = await readFile(fileURL, "utf-8").catch((err) => {
            console.error(err);
        });
        if (fileContents) {
            try {
                configFromEnvironment = JSON.parse(fileContents);
            } catch(e) {
                console.error(`Contents of ${fileName} could not be parsed.`, e);
            }
        }
    }

    // In Firebase App Hosting the config provided to the environment variable is up-to-date and
    // "complete" we should not reach out to the webConfig endpoint to freshen it
    if (process.env.X_GOOGLE_TARGET_PLATFORM === "fah") {
        return configFromEnvironment as FirebaseOptions;
    }

    if (!configFromEnvironment) {
        return undefined;
    }
    const projectId = configFromEnvironment.projectId || "-";
    const appId = configFromEnvironment.appId;
    const apiKey = configFromEnvironment.apiKey;
    if (!appId || !apiKey) {
        return undefined;
    }

    try {
        const response = await fetch(
            `https://firebase.googleapis.com/v1alpha/projects/${projectId}/apps/${appId}/webConfig`,
            { headers: { "x-goog-api-key": apiKey } }
        );
        if (!response.ok) {
            return undefined;
        }
        const json = await response.json();
        return { ...json, apiKey };
    } catch(e) {
        return undefined;
    }
}

getWebConfig().then(async (config) => {
    
    const emulatorHosts = Object.entries({
        firestore: process.env.FIRESTORE_EMULATOR_HOST,
        database: process.env.FIREBASE_DATABASE_EMULATOR_HOST,
        storage: process.env.FIREBASE_STORAGE_EMULATOR_HOST,
        auth: process.env.FIREBASE_AUTH_EMULATOR_HOST,
    }).reduce(
        // We want a falsy value if none of the above are defined
        (current, [key, value]) => value ? { ...current, [key]: value } : current,
        undefined as Record<string,string>|undefined
    );
    
    // getDefaults() will use this object, rather than fallback to other autoinit suppliers, if it's
    // truthy—if we've done nothing here, make it falsy.
    const defaults = (config || emulatorHosts) ? { config, emulatorHosts } : undefined;

    await Promise.all([
        writeFile(join(__dirname, "autoinit_env.js"), `module.exports = ${JSON.stringify(defaults)}`),
        writeFile(join(__dirname, "autoinit_env.mjs"), `export default ${JSON.stringify(defaults)}`),
    ]);

    process.exit(0);

});
