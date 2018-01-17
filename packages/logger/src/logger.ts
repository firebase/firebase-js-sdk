import debugLib from 'debug';

export enum LogLevel {
  DEBUG,
  VERBOSE,
  INFO,
  WARN,
  ERROR
}

export class Logger {
  private __debug;
  private __log;
  private __info;
  private __warn;
  private __error;
  constructor(readonly name) {
    /**
     * Assign the name to each of the logging instances
     */
    const debug = this.__debug = debugLib(`${name}:debug`);
    const log = this.__log = debugLib(`${name}:log`);
    const info = this.__info = debugLib(`${name}:info`);
    const warn = this.__warn = debugLib(`${name}:warn`);
    const error = this.__error = debugLib(`${name}:error`);
    
    /**
     * Route the output log to the proper console stream
     */
    debug.log = console.debug.bind(console);
    log.log = console.log.bind(console);
    info.log = console.info.bind(console);
    warn.log = console.warn.bind(console);
    error.log = console.error.bind(console);
  }
  
  debug(...args) {
    const now = new Date();
    this.__debug(...args);
  }
  error(...args) {
    const now = new Date();
    this.__error(...args, 'fish');
  }
  info(...args) {
    const now = new Date();
    this.__info(...args);
  }
  log(...args) {
    const now = new Date();
    this.__log(...args);
  }
  warn(...args) {
    const now = new Date();
    this.__warn(...args);
  }
}

export function setLogLevel(level: LogLevel) {
  const levelStrings = ['*:error', '*:warn', '*:info', '*:log', '*:debug'];
  const levels = levelStrings.slice(0, (levelStrings.length - level)).join(',');
  debugLib.enable(levels);
}

/**
 * Set default log level
 */
setLogLevel(LogLevel.WARN);
