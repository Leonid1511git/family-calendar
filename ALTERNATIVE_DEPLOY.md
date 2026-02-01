# Альтернативные способы деплоя Telegram бота (без Blaze плана)

## Проблема
Firebase Cloud Functions требуют Blaze (pay-as-you-go) план для деплоя.

## Решения

### Вариант 1: Локальный сервер + ngrok (для тестирования)

1. **Установите ngrok:**
   ```bash
   brew install ngrok
   # или скачайте с https://ngrok.com/
   ```

2. **Запустите локальный сервер:**
   ```bash
   cd functions
   npm install
   npm run serve
   ```

3. **В другом терминале запустите ngrok:**
   ```bash
   ngrok http 5001
   ```

4. **Скопируйте HTTPS URL из ngrok** (например: `https://abc123.ngrok.io`)

5. **Установите webhook:**
   ```bash
   curl -X POST "https://api.telegram.org/bot8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://abc123.ngrok.io/telegramWebhook"}'
   ```

**Недостаток:** ngrok URL меняется при каждом перезапуске (в бесплатной версии).

### Вариант 2: Vercel (бесплатно)

Создайте простой API endpoint на Vercel.

### Вариант 3: Railway (бесплатно с ограничениями)

Деплой Node.js приложения на Railway.

### Вариант 4: Обновить до Blaze плана (рекомендуется для production)

Blaze план имеет бесплатный лимит:
- 2 миллиона вызовов функций в месяц бесплатно
- 400,000 GB-секунд вычислений бесплатно
- 200,000 GB-секунд времени выполнения бесплатно

Для MVP этого более чем достаточно.

## Рекомендация

Для быстрого тестирования используйте **Вариант 1 (ngrok)**.

Для production обновите проект до **Blaze плана** - он бесплатный в пределах лимитов, которых хватит для MVP.


