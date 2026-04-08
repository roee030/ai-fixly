import * as Sentry from '@sentry/react-native';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: string | number | boolean | undefined;
}

class Logger {
  private addBreadcrumb(level: LogLevel, message: string, context?: LogContext) {
    Sentry.addBreadcrumb({
      message,
      level: level === 'debug' ? 'debug' : level === 'warn' ? 'warning' : level,
      data: context,
      timestamp: Date.now() / 1000,
    });
  }

  debug(message: string, context?: LogContext) {
    if (__DEV__) console.log(`[DEBUG] ${message}`, context || '');
    this.addBreadcrumb('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    if (__DEV__) console.log(`[INFO] ${message}`, context || '');
    this.addBreadcrumb('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    if (__DEV__) console.warn(`[WARN] ${message}`, context || '');
    this.addBreadcrumb('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext) {
    if (__DEV__) console.error(`[ERROR] ${message}`, error, context || '');
    this.addBreadcrumb('error', message, context);
    if (error) {
      Sentry.captureException(error, { extra: context });
    }
  }
}

export const logger = new Logger();
