# Локальный сервер для Telegram бота (без Blaze плана)

## Быстрый старт

### Шаг 1: Установите ngrok

```bash
brew install ngrok
```

Или скачайте с [ngrok.com](https://ngrok.com/)

### Шаг 2: Скачайте serviceAccountKey.json

1. Перейдите в [Firebase Console](https://console.firebase.google.com/project/family-calendar-22abd/settings/serviceaccounts/adminsdk)
2. Нажмите "Generate new private key"
3. Сохраните файл как `serviceAccountKey.json` в корне проекта (рядом с `functions/`)

**⚠️ ВАЖНО:** Добавьте `serviceAccountKey.json` в `.gitignore`!

### Шаг 3: Установите зависимости

```bash
cd functions
npm install
npm run build
cd ..
```

### Шаг 4: Запустите локальный сервер

```bash
cd functions
node server.js
```

Сервер запустится на порту 3000.

### Шаг 5: Запустите ngrok (в другом терминале)

```bash
ngrok http 3000
```

Скопируйте HTTPS URL (например: `https://abc123.ngrok.io`)

### Шаг 6: Установите webhook

```bash
curl -X POST "https://api.telegram.org/bot8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://abc123.ngrok.io/telegramWebhook"}'
```

Замените `abc123.ngrok.io` на ваш ngrok URL.

### Шаг 7: Протестируйте

1. Откройте Telegram
2. Найдите бота: `@FamilyCalendarApp_bot`
3. Отправьте: `Баня 15го в 18`

## Важно

- **ngrok бесплатный план:** URL меняется при каждом перезапуске
- **ngrok платный план:** Можно зафиксировать URL
- **Для production:** Обновите проект до Blaze плана и используйте Cloud Functions

## Альтернатива: Обновить до Blaze плана

Blaze план имеет щедрый бесплатный лимит:
- 2 миллиона вызовов функций в месяц бесплатно
- Для MVP этого более чем достаточно

Обновите проект: https://console.firebase.google.com/project/family-calendar-22abd/usage/details


