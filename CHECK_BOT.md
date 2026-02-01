# Диагностика проблем с Telegram ботом

## Проверка 1: Настроен ли webhook?

Проверьте статус webhook:

```bash
curl "https://api.telegram.org/bot8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4/getWebhookInfo"
```

**Ожидаемый результат:**
- `url` должен быть установлен на ваш Cloud Function URL
- `pending_update_count` должен быть 0 или небольшим числом

**Если webhook не настроен:**
1. Задеплойте функцию (см. ниже)
2. Установите webhook командой из `DEPLOY_FUNCTIONS.md`

## Проверка 2: Задеплоена ли Cloud Function?

```bash
firebase functions:list
```

Должна быть функция `telegramWebhook`.

**Если функции нет:**
1. Перейдите в папку `functions`
2. Установите зависимости: `npm install`
3. Настройте токен: `firebase functions:config:set telegram.bot_token="8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4"`
4. Задеплойте: `firebase deploy --only functions:telegramWebhook`

## Проверка 3: Есть ли ошибки в логах?

```bash
firebase functions:log --only telegramWebhook
```

Ищите ошибки типа:
- `TELEGRAM_BOT_TOKEN not configured`
- `Error processing Telegram message`
- `Error sending Telegram message`

## Проверка 4: Правильно ли настроен токен?

Токен должен быть установлен в Firebase Config:

```bash
firebase functions:config:get
```

Должно быть:
```
telegram: { bot_token: '8505904119:...' }
```

**Если токена нет:**
```bash
firebase functions:config:set telegram.bot_token="8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4"
```

## Проверка 5: Тестирование функции вручную

Можно протестировать функцию локально:

```bash
cd functions
npm run serve
```

Затем используйте ngrok для туннеля:
```bash
ngrok http 5001
```

И установите webhook на ngrok URL.

## Быстрое решение

Если ничего не работает, выполните по порядку:

1. **Установите зависимости:**
   ```bash
   cd functions
   npm install
   ```

2. **Настройте токен:**
   ```bash
   firebase functions:config:set telegram.bot_token="8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4"
   ```

3. **Соберите проект:**
   ```bash
   npm run build
   ```

4. **Задеплойте функцию:**
   ```bash
   firebase deploy --only functions:telegramWebhook
   ```

5. **Получите URL функции** из вывода деплоя (например: `https://us-central1-xxx.cloudfunctions.net/telegramWebhook`)

6. **Установите webhook:**
   ```bash
   curl -X POST "https://api.telegram.org/bot8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://<YOUR-REGION>-<YOUR-PROJECT-ID>.cloudfunctions.net/telegramWebhook"}'
   ```

7. **Проверьте webhook:**
   ```bash
   curl "https://api.telegram.org/bot8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4/getWebhookInfo"
   ```

8. **Отправьте тестовое сообщение боту** в Telegram

9. **Проверьте логи:**
   ```bash
   firebase functions:log --only telegramWebhook
   ```

## Частые проблемы

### Проблема: "TELEGRAM_BOT_TOKEN not configured"
**Решение:** Настройте токен через `firebase functions:config:set`

### Проблема: Webhook возвращает 404
**Решение:** Убедитесь, что функция задеплоена и URL правильный

### Проблема: Бот не отвечает, но ошибок нет
**Решение:** Проверьте, что пользователь авторизован в приложении и имеет группу

### Проблема: "User not found"
**Решение:** Пользователь должен сначала войти в приложение через Telegram авторизацию

