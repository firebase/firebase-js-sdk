import { BrowserStorage } from "./storage/BrowserStorage";
import { MemoryStorage } from "./storage/MemoryStorage";

let memoryStorageFallback;

function createBrowserStorage(domStorageName) {
  try {
    // NOTE: just accessing "localStorage" or "window['localStorage']" may throw a security exception,
    // so it must be inside the try/catch.
    if (typeof window !== 'undefined' && typeof window[domStorageName] !== 'undefined') {
      // Need to test cache. Just because it's here doesn't mean it works
      var domStorage = window[domStorageName];
      domStorage.setItem('firebase:sentinel', 'cache');
      domStorage.removeItem('firebase:sentinel');
      return new BrowserStorage(domStorage);
    }
  } catch (e) {
  }

  // Failed to create wrapper.  Just return in-memory storage container
  return new MemoryStorage();
};

export const SessionStorage = createBrowserStorage('sessionStorage');
export const LocalStorage = createBrowserStorage('localStorage');