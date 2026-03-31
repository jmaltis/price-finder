type LogLevel = 'info' | 'success' | 'warn' | 'error';

const colors = {
  info: '\x1b[36m',
  success: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  reset: '\x1b[0m'
};

function log(level: LogLevel, message: string, ...args: unknown[]) {
  const timestamp = new Date().toISOString();
  const color = colors[level];
  const reset = colors.reset;

  console.log(`${color}[${timestamp}] ${message}${reset}`, ...args);
}

export const logger = {
  info: (message: string, ...args: unknown[]) => log('info', message, ...args),
  success: (message: string, ...args: unknown[]) => log('success', message, ...args),
  warn: (message: string, ...args: unknown[]) => log('warn', message, ...args),
  error: (message: string, ...args: unknown[]) => log('error', message, ...args)
};
