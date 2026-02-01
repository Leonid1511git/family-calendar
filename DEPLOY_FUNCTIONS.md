# Деплой Cloud Functions для Telegram бота

## Шаг 1: Установка зависимостей

```bash
cd functions
npm install
```

## Шаг 2: Настройка токена бота

### Используйте Firebase Secrets (рекомендуется)

```bash
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
# Введите токен при запросе: 8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4
```

**Важно:** После установки секрета нужно обновить функцию, чтобы она имела доступ к секрету:

```bash
firebase deploy --only functions:telegramWebhook
```

### Альтернатива: Локальные переменные окружения (только для разработки)

Создайте файл `.env` в папке `functions`:
```
TELEGRAM_BOT_TOKEN=8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4
```

И используйте `dotenv` в коде (не рекомендуется для production).

## Шаг 3: Компиляция TypeScript

```bash
cd functions
npm run build
```

## Шаг 4: Деплой функции

```bash
# Из корня проекта
firebase deploy --only functions:telegramWebhook
```

Или деплой всех функций:
```bash
firebase deploy --only functions
```

## Шаг 5: Настройка webhook

После деплоя получите URL вашей функции:

```
https://<region>-<project-id>.cloudfunctions.net/telegramWebhook
```

Установите webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://<region>-<project-id>.cloudfunctions.net/telegramWebhook"}'
```

Или через браузер:
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://<region>-<project-id>.cloudfunctions.net/telegramWebhook
```

## Шаг 6: Проверка webhook

Проверьте статус webhook:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

## Локальная разработка

Для локальной разработки используйте эмулятор:

```bash
cd functions
npm run serve
```

Затем используйте ngrok или другой туннель для тестирования webhook:

```bash
ngrok http 5001
```

И установите webhook на ngrok URL:
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://<ngrok-url>.ngrok.io/telegramWebhook"}'
```

## Проверка работы

1. Откройте Telegram и найдите вашего бота
2. Отправьте команду `/start` или `/help`
3. Отправьте сообщение: `Баня 15го в 18`
4. Должно прийти подтверждение о создании события

## Troubleshooting

### Функция не отвечает
- Проверьте логи: `firebase functions:log`
- Убедитесь, что токен настроен правильно
- Проверьте права доступа к Firestore

### Webhook не работает
- Проверьте URL webhook: `curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"`
- Убедитесь, что функция задеплоена
- Проверьте, что функция возвращает 200 OK

### События не создаются
- Проверьте, что пользователь авторизован в приложении
- Убедитесь, что у пользователя есть группа
- Проверьте логи функции на ошибки

## Структура проекта

```
functions/
├── src/
│   ├── index.ts              # Основная Cloud Function
│   └── utils/
│       └── telegramParser.ts # Парсер сообщений
├── package.json
├── tsconfig.json
└── .gitignore
```

## Команды

- `npm run build` - компиляция TypeScript
- `npm run serve` - запуск эмулятора
- `npm run deploy` - деплой функций
- `npm run logs` - просмотр логов

