/**
 * Structured JSON logger for the AutoCobro API.
 * Writes to stderr for errors and stdout for info-level events,
 * always in a machine-readable JSON format so log aggregators
 * (Railway, Vercel, Datadog, etc.) can parse them easily.
 */

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  [key: string]: unknown;
}

function write(level: LogLevel, message: string, meta: Record<string, unknown> = {}): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };

  const line = JSON.stringify(entry);

  if (level === 'error') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => write('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write('error', message, meta),

  /**
   * Specialised helper for Gemini / AI errors.
   * Captures the full error stack alongside request context.
   */
  geminiError: (
    message: string,
    error: unknown,
    context: {
      endpoint: string;
      storeId?: string;
      deviceKey?: string;
      [key: string]: unknown;
    }
  ) => {
    const err = error instanceof Error ? error : new Error(String(error));
    write('error', message, {
      service: 'gemini',
      endpoint: context.endpoint,
      storeId: context.storeId,
      deviceKey: context.deviceKey,
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
      },
      ...context,
    });
  },
};
