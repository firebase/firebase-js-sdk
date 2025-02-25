const { writeFile, readFile } = require("node:fs/promises");
const { pathToFileURL } = require("node:url");
const { isAbsolute, join } = require("node:path");

function getConfigFromEnv() {
    if (!process.env.FIREBASE_WEBAPP_CONFIG) {
        return Promise.resolve(undefined);
    }
    
    // Like FIREBASE_CONFIG (admin autoinit) FIREBASE_WEBAPP_CONFIG can be
    // either a JSON representation of FirebaseOptions or the path to a filename
    if (process.env.FIREBASE_WEBAPP_CONFIG.startsWith("{\"")) {
        try {
            return Promise.resolve(JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG));
        } catch(e) {
            console.error("FIREBASE_WEBAPP_CONFIG could not be parsed.\n", e);
            return Promise.resolve(undefined);
        }
    }

    const fileName = process.env.FIREBASE_WEBAPP_CONFIG;
    const fileURL = pathToFileURL(isAbsolute(fileName) ? fileName : join(process.cwd(), fileName));
    return readFile(fileURL, "utf-8").then((fileContents) => {
        try {
            return JSON.parse(fileContents);
        } catch(e) {
            console.error(`Contents of "${fileName}" could not be parsed.\n`, e);
            return undefined;
        }
    }, (e) => {
        console.error(`Contents of "${fileName}" could not be parsed.\n`, e);
        return undefined;
    });
}

getConfigFromEnv().then((partialConfig) => {

    if (!partialConfig) {
        return undefined;
    }
    // In Firebase App Hosting the config provided to the environment variable is up-to-date and
    // "complete" we should not reach out to the webConfig endpoint to freshen it
    if (process.env.X_GOOGLE_TARGET_PLATFORM === "fah") {
        return partialConfig;
    }
    const projectId = partialConfig.projectId || "-";
    const appId = partialConfig.appId;
    const apiKey = partialConfig.apiKey;
    if (!appId || !apiKey) {
        console.error(`Unable to fetch Firebase config, appId and apiKey are required.`);
        return undefined;
    }
    
    return fetch(
        `https://firebase.googleapis.com/v1alpha/projects/${projectId}/apps/${appId}/webConfig`,
        { headers: { "x-goog-api-key": apiKey } }
    ).then((response) => {
        if (!response.ok) {
            console.error(`Unable to fetch Firebase config, API returned ${response.statusText} (${response.status})`);
            return undefined;
        }
        return response.json().then((json) => ({ ...json, apiKey }));
    });

}).then((config) => {

    const emulatorHosts = Object.entries({
        firestore: process.env.FIRESTORE_EMULATOR_HOST,
        database: process.env.FIREBASE_DATABASE_EMULATOR_HOST,
        storage: process.env.FIREBASE_STORAGE_EMULATOR_HOST,
        auth: process.env.FIREBASE_AUTH_EMULATOR_HOST,
    }).reduce(
        // We want a falsy value if none of the above are defined
        (current, [key, value]) => value ? { ...current, [key]: value } : current,
        undefined
    );
    
    // getDefaults() will use this object, rather than fallback to other autoinit suppliers, if it's
    // truthy—if we've done nothing here, make it falsy.
    const defaults = (config || emulatorHosts) ? { config, emulatorHosts } : undefined;

    return Promise.all([
        writeFile(join(__dirname, "autoinit_env.js"), `module.exports = ${JSON.stringify(defaults)}`),
        writeFile(join(__dirname, "autoinit_env.mjs"), `export default ${JSON.stringify(defaults)}`),
    ]);

}).then(
    () => process.exit(0),
    () => process.exit(0),
);
