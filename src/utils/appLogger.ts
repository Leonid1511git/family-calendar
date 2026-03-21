/**
 * Буфер логов приложения для экспорта (кнопка «Скачать логи» в настройках).
 * Перехватывает console.log/warn/error и сохраняет последние MAX_ENTRIES записей.
 */

const MAX_ENTRIES = 3000;
const LOG_LEVELS = ['log', 'warn', 'error'] as const;

type LogEntry = { ts: string; level: string; args: unknown[] };
const buffer: LogEntry[] = [];
let originalConsole: { log: typeof console.log; warn: typeof console.warn; error: typeof console.error } | null = null;

function formatArg(x: unknown): string {
  if (x === null) return 'null';
  if (x === undefined) return 'undefined';
  if (typeof x === 'object' && x !== null && typeof (x as Error).message === 'string') {
    const e = x as Error;
    return `${e.name}: ${e.message}${e.stack ? '\n' + e.stack : ''}`;
  }
  if (typeof x === 'object') return JSON.stringify(x);
  return String(x);
}

function capture(level: string, args: unknown[]) {
  const ts = new Date().toISOString();
  buffer.push({ ts, level, args });
  if (buffer.length > MAX_ENTRIES) buffer.shift();
  originalConsole?.[level as keyof typeof originalConsole]?.apply(console, args);
}

/**
 * Вызвать при старте приложения (например в App.tsx), чтобы начать собирать логи.
 */
export function initAppLogger(): void {
  if (originalConsole) return;
  originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };
  console.log = (...args: unknown[]) => capture('log', args);
  console.warn = (...args: unknown[]) => capture('warn', args);
  console.error = (...args: unknown[]) => capture('error', args);
}

/**
 * Возвращает собранные логи в виде одной строки для сохранения в файл.
 */
export function getLogsAsText(): string {
  const header = [
    'Family Calendar — экспорт логов',
    `Дата экспорта: ${new Date().toISOString()}`,
    `Записей в буфере: ${buffer.length}`,
    '---',
    '',
  ].join('\n');
  const lines = buffer.map((e) => {
    const msg = e.args.map(formatArg).join(' ');
    return `${e.ts} [${e.level.toUpperCase()}] ${msg}`;
  });
  return header + lines.join('\n');
}

/**
 * Возвращает записи буфера в структурированном виде для отображения в UI.
 */
export function getLogsAsArray(): { ts: string; level: string; msg: string }[] {
  return buffer.map((e) => ({
    ts: e.ts,
    level: e.level,
    msg: e.args.map(formatArg).join(' '),
  }));
}

/**
 * Очистить буфер (опционально).
 */
export function clearLogs(): void {
  buffer.length = 0;
}
