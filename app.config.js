// Подставляем переменные EAS в extra при сборке (EAS задаёт env перед запуском).
// В приложении читаем через Constants.expoConfig?.extra?.telegram.
const base = require('./app.json');

module.exports = {
  expo: {
    ...base.expo,
    extra: {
      ...base.expo.extra,
      telegram: {
        botToken: process.env.EXPO_PUBLIC_TELEGRAM_BOT_TOKEN || '',
        botName: process.env.EXPO_PUBLIC_TELEGRAM_BOT_NAME || 'FamilyCalendarApp_bot',
        authProxyUrl: process.env.EXPO_PUBLIC_TELEGRAM_AUTH_PROXY_URL || 'https://family-calendar-22abd.web.app',
      },
    },
  },
};
