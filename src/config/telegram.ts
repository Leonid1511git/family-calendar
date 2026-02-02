// Telegram Bot Configuration
// EAS Build: переменные подставляются в app.config.js → extra.telegram (Constants.expoConfig.extra.telegram).
// Локальная разработка: .env с EXPO_PUBLIC_TELEGRAM_BOT_TOKEN или extra из app.config.js.

import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra as { telegram?: { botToken?: string; botName?: string; authProxyUrl?: string } })?.telegram;

const BOT_TOKEN =
  extra?.botToken?.trim() ||
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_TELEGRAM_BOT_TOKEN) ||
  '';
const BOT_NAME =
  extra?.botName?.trim() ||
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_TELEGRAM_BOT_NAME) ||
  'FamilyCalendarApp_bot';
const AUTH_PROXY_URL =
  extra?.authProxyUrl?.trim() ||
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_TELEGRAM_AUTH_PROXY_URL) ||
  'https://family-calendar-22abd.web.app';

export const TELEGRAM_CONFIG = {
  BOT_TOKEN,
  BOT_NAME,
  AUTH_PROXY_URL,
};

export const isTelegramConfigured = (): boolean => {
  return (
    TELEGRAM_CONFIG.BOT_TOKEN.length > 0 &&
    TELEGRAM_CONFIG.BOT_NAME.length > 0
  );
};
