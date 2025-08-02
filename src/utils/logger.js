/**
 * Simple Logger
 */
export class Logger {
  constructor(name) {
    this.name = name;
  }

  info(...args) {
    console.log(`[${new Date().toLocaleTimeString()}] [${this.name}] INFO:`, ...args);
  }

  error(...args) {
    console.error(`[${new Date().toLocaleTimeString()}] [${this.name}] ERROR:`, ...args);
  }

  warn(...args) {
    console.warn(`[${new Date().toLocaleTimeString()}] [${this.name}] WARN:`, ...args);
  }

  debug(...args) {
    if (process.env.DEBUG) {
      console.log(`[${new Date().toLocaleTimeString()}] [${this.name}] DEBUG:`, ...args);
    }
  }
}