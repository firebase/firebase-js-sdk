import '../../src/platform_browser/browser_init';

/**
 * This will include all of the test files and compile them as needed
 * 
 * Taken from karma-webpack source:
 * https://github.com/webpack-contrib/karma-webpack#alternative-usage
 */
var testsContext = (require as any).context('..', true, /.test$/);
testsContext.keys().forEach(testsContext);
