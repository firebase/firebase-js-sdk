import { Path } from "./Path";
import { RepoInfo } from "../../core/RepoInfo";
import { fatal, warn } from "../../../utils/libs/logger";

function urlDecode(str) {
  return decodeURIComponent(str.replace(/\+/g, " "));
}


/**
 * Logs a warning if the containing page uses https. Called when a call to new Firebase
 * does not use https.
 */
export function warnIfPageIsSecure() {
  // Be very careful accessing browser globals. Who knows what may or may not exist.
  if (typeof window !== 'undefined' && window.location && window.location.protocol &&
      window.location.protocol.indexOf('https:') !== -1) {
    warn('Insecure Firebase access from a secure page. ' +
                      'Please use https in calls to new Firebase().');
  }
};

/**
 *
 * @param {!string} dataURL
 * @return {{repoInfo: !fb.core.RepoInfo, path: !Path}}
 */
export function parseRepoInfo(dataURL) {
  var parsedUrl = parseURL(dataURL),
      namespace = parsedUrl.subdomain;

  if (parsedUrl.domain === 'firebase') {
    fatal(parsedUrl.host +
                       ' is no longer supported. ' +
                       'Please use <YOUR FIREBASE>.firebaseio.com instead');
  }

  // Catch common error of uninitialized namespace value.
  if (!namespace || namespace == 'undefined') {
    fatal('Cannot parse Firebase url. ' +
                       'Please use https://<YOUR FIREBASE>.firebaseio.com');
  }

  if (!parsedUrl.secure) {
    warnIfPageIsSecure();
  }

  var webSocketOnly = (parsedUrl.scheme === 'ws') || (parsedUrl.scheme === 'wss');

  return {
    repoInfo: new RepoInfo(parsedUrl.host, parsedUrl.secure, namespace, webSocketOnly),
    path: new Path(parsedUrl.pathString)
  };
};

/**
 *
 * @param {!string} dataURL
 * @return {{host: string, port: number, domain: string, subdomain: string, secure: boolean, scheme: string, pathString: string}}
 */
export function parseURL(dataURL) {
  // Default to empty strings in the event of a malformed string.
  var host = '', domain = '', subdomain = '', pathString = '';

  // Always default to SSL, unless otherwise specified.
  var secure = true, scheme = 'https', port = 443;

  // Don't do any validation here. The caller is responsible for validating the result of parsing.
  if (typeof dataURL === 'string') {
    // Parse scheme.
    var colonInd = dataURL.indexOf('//');
    if (colonInd >= 0) {
      scheme = dataURL.substring(0, colonInd - 1);
      dataURL = dataURL.substring(colonInd + 2);
    }

    // Parse host and path.
    var slashInd = dataURL.indexOf('/');
    if (slashInd === -1) {
      slashInd = dataURL.length;
    }
    host = dataURL.substring(0, slashInd);
    pathString = decodePath(dataURL.substring(slashInd));

    var parts = host.split('.');
    if (parts.length === 3) {
      // Normalize namespaces to lowercase to share storage / connection.
      domain = parts[1];
      subdomain = parts[0].toLowerCase();
    } else if (parts.length === 2) {
      domain = parts[0];
    }

    // If we have a port, use scheme for determining if it's secure.
    colonInd = host.indexOf(':');
    if (colonInd >= 0) {
      secure = (scheme === 'https') || (scheme === 'wss');
      port = parseInt(host.substring(colonInd + 1), 10);
    }
  }

  return {
    host: host,
    port: port,
    domain: domain,
    subdomain: subdomain,
    secure: secure,
    scheme: scheme,
    pathString: pathString
  };
};

/**
 * @param {!string} pathString
 * @return {string}
 */
export function decodePath(pathString) {
  var pathStringDecoded = '';
  var pieces = pathString.split('/');
  for (var i = 0; i < pieces.length; i++) {
    if (pieces[i].length > 0) {
      var piece = pieces[i];
      try {
        piece = urlDecode(piece);
      } catch (e) {}
      pathStringDecoded += '/' + piece;
    }
  }
  return pathStringDecoded;
};

/**
 * Helper to run some code but catch any exceptions and re-throw them later.
 * Useful for preventing user callbacks from breaking internal code.
 *
 * Re-throwing the exception from a setTimeout is a little evil, but it's very
 * convenient (we don't have to try to figure out when is a safe point to
 * re-throw it), and the behavior seems reasonable:
 *
 * * If you aren't pausing on exceptions, you get an error in the console with
 *   the correct stack trace.
 * * If you're pausing on all exceptions, the debugger will pause on your
 *   exception and then again when we rethrow it.
 * * If you're only pausing on uncaught exceptions, the debugger will only pause
 *   on us re-throwing it.
 *
 * @param {!function()} fn The code to guard.
 */
export function exceptionGuard(fn) {
  try {
    fn();
  } catch (e) {
    // Re-throw exception when it's safe.
    setTimeout(function() {
      // It used to be that "throw e" would result in a good console error with
      // relevant context, but as of Chrome 39, you just get the firebase.js
      // file/line number where we re-throw it, which is useless. So we log
      // e.stack explicitly.
      var stack = e.stack || '';
      warn('Exception was thrown by user callback.', stack);
      throw e;
    }, Math.floor(0));
  }
};

export function setTimeoutNonBlocking(fn, time) {
  var timeout = setTimeout(fn, time);
  if (typeof timeout === 'object' && timeout['unref']) {
    timeout['unref']();
  }
  return timeout;
};
