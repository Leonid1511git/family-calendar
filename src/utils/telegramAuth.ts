import { User } from '../types';

/** Формат tgAuthResult: base64-encoded JSON с полями id, hash, auth_date, first_name и т.д. */
interface TgAuthResult {
  id?: number;
  hash?: string;
  auth_date?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

/** Декодирует base64 в строку (работает в React Native, где atob может отсутствовать). */
function base64Decode(str: string): string {
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
  if (typeof globalThis !== 'undefined' && typeof globalThis.atob === 'function') {
    return globalThis.atob(normalized);
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let i = 0;
  while (i < normalized.length) {
    const a = chars.indexOf(normalized[i++]);
    const b = chars.indexOf(normalized[i++]);
    const c = chars.indexOf(normalized[i++]);
    const d = chars.indexOf(normalized[i++]);
    output += String.fromCharCode((a << 2) | (b >> 4));
    if (c !== 64) output += String.fromCharCode(((b & 15) << 4) | (c >> 2));
    if (d !== 64) output += String.fromCharCode(((c & 3) << 6) | d);
  }
  return output;
}

/** Результат парсинга callback Telegram Login (для входа и для верификации на сервере). */
export type TelegramAuthPayload = Omit<User, 'id' | 'createdAt'> & {
  /** Подпись для проверки на бэкенде (обязательна для getTelegramCustomToken). */
  hash?: string;
  /** Unix timestamp авторизации (обязателен для верификации). */
  authDate?: string;
};

/**
 * Парсит URL callback от Telegram Login.
 * Поддерживает: query/hash с id, hash, auth_date; и формат tgAuthResult=base64(JSON).
 * Поля hash и authDate нужны для вызова getTelegramCustomToken (верификация на сервере).
 */
export function parseTelegramAuthUrl(url: string): TelegramAuthPayload | null {
  if (!url || typeof url !== 'string') return null;
  try {
    const hashStart = url.indexOf('#');
    const queryStart = url.indexOf('?');
    let queryString = '';
    if (queryStart >= 0) {
      const qEnd = hashStart >= 0 ? hashStart : url.length;
      queryString = url.slice(queryStart + 1, qEnd);
    }
    if (!queryString && hashStart >= 0) {
      queryString = url.slice(hashStart + 1);
    }
    if (!queryString) return null;
    const params = new URLSearchParams(queryString);

    // Формат tgAuthResult: Telegram иногда возвращает данные как base64(JSON)
    const tgAuthResult = params.get('tgAuthResult');
    if (tgAuthResult) {
      const decoded = base64Decode(tgAuthResult);
      const data: TgAuthResult = JSON.parse(decoded);
      const id = data.id != null ? String(data.id) : '';
      const hash = data.hash;
      const authDate = data.auth_date != null ? String(data.auth_date) : '';
      if (!id || !hash || !authDate) return null;
      return {
        telegramId: id,
        firstName: data.first_name || 'Пользователь',
        lastName: data.last_name || undefined,
        username: data.username || undefined,
        avatarUrl: data.photo_url || undefined,
        hash,
        authDate,
      };
    }

    const q: Record<string, string> = {};
    params.forEach((value, key) => {
      q[key] = value;
    });
    const id = q.id || q.user_id;
    const hash = q.hash;
    const authDate = q.auth_date;
    if (!id || !hash || !authDate) return null;
    return {
      telegramId: id,
      firstName: q.first_name || 'Пользователь',
      lastName: q.last_name || undefined,
      username: q.username || undefined,
      avatarUrl: q.photo_url || undefined,
      hash,
      authDate,
    };
  } catch {
    return null;
  }
}

export function isTelegramAuthCallbackUrl(url: string): boolean {
  if (!url || !url.includes('auth')) return false;
  return parseTelegramAuthUrl(url) !== null;
}
