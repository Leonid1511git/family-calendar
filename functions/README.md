# Cloud Functions для Telegram бота

## Быстрый старт

### 1. Установите зависимости

```bash
npm install
```

### 2. Настройте токен бота

```bash
firebase functions:config:set telegram.bot_token="8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4"
```

### 3. Соберите проект

```bash
npm run build
```

### 4. Задеплойте функцию

```bash
firebase deploy --only functions:telegramWebhook
```

### 5. Настройте webhook

После деплоя получите URL функции из консоли Firebase и установите webhook:

```bash
curl -X POST "https://api.telegram.org/bot8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://<region>-<project-id>.cloudfunctions.net/telegramWebhook"}'
```

## Структура

- `src/index.ts` - основная Cloud Function для обработки сообщений
- `src/utils/telegramParser.ts` - парсер естественного языка

## Команды

- `npm run build` - компиляция TypeScript
- `npm run serve` - запуск локального эмулятора
- `npm run deploy` - деплой функций
- `npm run logs` - просмотр логов

## Подробная документация

См. `../DEPLOY_FUNCTIONS.md` для полной инструкции.

