import { DOMStorageWrapper } from './DOMStorageWrapper';
import { MemoryStorage } from './MemoryStorage';

/**
* Helper to create a DOMStorageWrapper or else fall back to MemoryStorage.
* TODO: Once MemoryStorage and DOMStorageWrapper have a shared interface this method annotation should change
* to reflect this type
*
* @param {string} domStorageName Name of the underlying storage object
*   (e.g. 'localStorage' or 'sessionStorage').
* @return {?} Turning off type information until a common interface is defined.
*/
const createStoragefor = function(domStorageName) {
  try {
    // NOTE: just accessing "localStorage" or "window['localStorage']" may throw a security exception,
    // so it must be inside the try/catch.
    if (typeof window !== 'undefined' && typeof window[domStorageName] !== 'undefined') {
      // Need to test cache. Just because it's here doesn't mean it works
      var domStorage = window[domStorageName];
      domStorage.setItem('firebase:sentinel', 'cache');
      domStorage.removeItem('firebase:sentinel');
      return new DOMStorageWrapper(domStorage);
    }
  } catch (e) {
  }
  
  // Failed to create wrapper.  Just return in-memory storage.
  // TODO: log?
  return new MemoryStorage();
};


/** A storage object that lasts across sessions */
export const PersistentStorage = createStoragefor('localStorage');


/** A storage object that only lasts one session */
export const SessionStorage = createStoragefor('sessionStorage');
