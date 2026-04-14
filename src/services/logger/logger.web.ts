type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Web logger — console-only, no Sentry integration.
 * @sentry/react-native does not work on web.
 */
class WebLogger {
  debug(message: string, context?: LogContext) {
    if (__DEV__) console.log(`[DEBUG] ${message}`, context || '');
  }

  info(message: string, context?: LogContext) {
    if (__DEV__) console.log(`[INFO] ${message}`, context || '');
  }

  warn(message: string, context?: LogContext) {
    if (__DEV__) console.warn(`[WARN] ${message}`, context || '');
  }

  error(message: string, error?: Error, _context?: LogContext) {
    console.error(`[ERROR] ${message}`, error || '');
  }
}

export const logger = new WebLogger();
