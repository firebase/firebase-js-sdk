import { StorageImplNext } from './storage';

export async function getAuthToken(storage: StorageImplNext): Promise<string | null> {
    const auth = storage._authProvider.getImmediate({ optional: true });

    let authToken: null | string = null;
    if (auth) {
        authToken = (await auth.getToken())?.accessToken || null;
    }

    return authToken;
}