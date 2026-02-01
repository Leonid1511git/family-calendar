// Telegram Bot Configuration - EXAMPLE FILE
// Copy this file to telegram.ts and fill in your bot token and name
// DO NOT commit telegram.ts to git!

export const TELEGRAM_CONFIG = {
  BOT_TOKEN: 'YOUR_BOT_TOKEN_HERE',
  BOT_NAME: 'YOUR_BOT_NAME_HERE',
  // HTTPS-домен прокси для входа через Telegram (см. TELEGRAM_LOGIN_DOMAIN.md)
  AUTH_PROXY_URL: 'https://YOUR_PROJECT.web.app',
};

// Проверка, что токен настроен
export const isTelegramConfigured = (): boolean => {
  return (
    TELEGRAM_CONFIG.BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE' &&
    TELEGRAM_CONFIG.BOT_TOKEN.length > 0 &&
    TELEGRAM_CONFIG.BOT_NAME !== 'YOUR_BOT_NAME_HERE' &&
    TELEGRAM_CONFIG.BOT_NAME.length > 0
  );
};

