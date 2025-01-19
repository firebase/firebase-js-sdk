import { writeFile, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { isAbsolute, join } from "node:path";

async function getWebConfig() {
    let configFromEnvironment = undefined;
    // $FIREBASE_WEBAPP_CONFIG can be either a JSON representation of FirebaseOptions or the path
    // to a filename
    if (process.env.FIREBASE_WEBAPP_CONFIG) {
        if (process.env.FIREBASE_WEBAPP_CONFIG.startsWith("{\"")) {
            try {
                configFromEnvironment = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
            } catch(e) {
                console.error("FIREBASE_WEBAPP_CONFIG could not be parsed.", e);
            }
        } if (process.env.FIREBASE_WEBAPP_CONFIG.startsWith("{")) {
            // TODO temporary
            configFromEnvironment = Object.fromEntries(
                process.env.FIREBASE_WEBAPP_CONFIG
                    .match(/^{(.+)}$/)[1]
                    .split(',')
                    .map(it => it.match("([^\:]+)\:(.+)")?.slice(1))
                    .filter(it => it)
                );
        } else {
            const fileName = process.env.FIREBASE_WEBAPP_CONFIG;
            const fileURL = pathToFileURL(isAbsolute(fileName) ? fileName : join(process.cwd(), fileName));
            const fileContents = await readFile(fileURL, "utf-8").catch((err) => {
                console.error(err);
                return undefined;
            });
            if (fileContents) {
                try {
                    configFromEnvironment = JSON.parse(fileContents);
                } catch(e) {
                    console.error(`Contents of ${fileName} could not be parsed.`, e);
                }
            }
        }
    }

    // In Firebase App Hosting the config provided to the environment variable is up-to-date and
    // "complete" we should not reach out to the webConfig endpoint to freshen it
    if (process.env.X_GOOGLE_TARGET_PLATFORM === "fah") {
        return configFromEnvironment;
    }

    if (!configFromEnvironment) {
        return undefined;
    }
    const projectId = configFromEnvironment.projectId || "-";
    const appId = configFromEnvironment.appId;
    const apiKey = configFromEnvironment.apiKey;
    if (!appId || !apiKey) {
        console.error("appId and apiKey are needed");
        return undefined;
    }
    const response = await fetch(
        `https://firebase.googleapis.com/v1alpha/projects/${projectId}/apps/${appId}/webConfig`,
        { headers: { "x-goog-api-key": apiKey } }
    ).catch((e) => {
        // TODO add sensible error
        console.error(e);
        return configFromEnvironment;
    });
    if (!response.ok) {
        // TODO add sensible error
        console.error("yikes.");
        return configFromEnvironment;
    }
    const json = await response.json().catch(() => {
        // TODO add sensible error
        console.error("also yikes.");
        return configFromEnvironment;
    });
    return { ...json, apiKey };
}

const config = await getWebConfig();

const emulatorHosts = {
    // TODO: remote config, functions, and data connect emulators?
    firestore: process.env.FIRESTORE_EMULATOR_HOST,
    database: process.env.FIREBASE_DATABASE_EMULATOR_HOST,
    storage: process.env.FIREBASE_STORAGE_EMULATOR_HOST,
    auth: process.env.FIREBASE_AUTH_EMULATOR_HOST,
};

const anyEmulatorHosts = Object.values(emulatorHosts).filter(it => it).length > 0;

// getDefaults() will use this object, rather than fallback to other autoinit suppliers, if it's
// truthy—if we've done nothing here, make it falsy.
const defaults = (config || anyEmulatorHosts) ? { config, emulatorHosts } : undefined;

await Promise.all([
    writeFile(join(import.meta.dirname, "defaults.js"), `module.exports = ${JSON.stringify(defaults)}`),
    writeFile(join(import.meta.dirname, "defaults.mjs"), `export default ${JSON.stringify(defaults)}`),
]);
