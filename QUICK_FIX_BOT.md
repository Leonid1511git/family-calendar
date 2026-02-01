# Быстрое решение: Бот не реагирует на сообщения

## Пошаговая диагностика

### Шаг 1: Проверьте webhook

Выполните в терминале:

```bash
curl "https://api.telegram.org/bot8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4/getWebhookInfo"
```

**Если webhook НЕ настроен:**
- Вы увидите `"url": ""` или ошибку
- Перейдите к Шагу 2

**Если webhook настроен:**
- Проверьте, что URL указывает на вашу Cloud Function
- Перейдите к Шагу 4

### Шаг 2: Установите зависимости и настройте токен

```bash
# Перейдите в папку functions
cd functions

# Установите зависимости
npm install

# Настройте токен бота
firebase functions:config:set telegram.bot_token="8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4"

# Вернитесь в корень проекта
cd ..
```

### Шаг 3: Соберите и задеплойте функцию

```bash
# Соберите проект
cd functions
npm run build

# Задеплойте функцию
firebase deploy --only functions:telegramWebhook
```

**Важно:** После деплоя скопируйте URL функции из вывода. Он будет выглядеть так:
```
https://us-central1-<project-id>.cloudfunctions.net/telegramWebhook
```

### Шаг 4: Настройте webhook

Замените `<YOUR-FUNCTION-URL>` на URL из Шага 3:

```bash
curl -X POST "https://api.telegram.org/bot8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://<YOUR-FUNCTION-URL>"}'
```

**Пример:**
```bash
curl -X POST "https://api.telegram.org/bot8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://us-central1-your-project.cloudfunctions.net/telegramWebhook"}'
```

### Шаг 5: Проверьте webhook снова

```bash
curl "https://api.telegram.org/bot8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4/getWebhookInfo"
```

Должно быть:
- `"url": "https://..."` - ваш URL функции
- `"pending_update_count": 0` или небольшое число

### Шаг 6: Проверьте логи

```bash
firebase functions:log --only telegramWebhook
```

Ищите ошибки или сообщения о полученных обновлениях.

### Шаг 7: Протестируйте бота

1. Откройте Telegram
2. Найдите вашего бота: `@FamilyCalendarApp_bot`
3. Отправьте `/start`
4. Отправьте: `Баня 15го в 18`

## Частые проблемы и решения

### Проблема: "TELEGRAM_BOT_TOKEN not configured"

**Решение:**
```bash
firebase functions:config:set telegram.bot_token="8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4"
firebase deploy --only functions:telegramWebhook
```

### Проблема: Webhook возвращает 404

**Решение:**
1. Убедитесь, что функция задеплоена: `firebase functions:list`
2. Проверьте правильность URL
3. Убедитесь, что регион правильный (обычно `us-central1`)

### Проблема: Бот не отвечает, но ошибок нет

**Решение:**
1. Проверьте, что пользователь авторизован в приложении
2. Убедитесь, что у пользователя есть группа
3. Проверьте логи: `firebase functions:log --only telegramWebhook`

### Проблема: "User not found"

**Решение:**
Пользователь должен сначала войти в приложение через Telegram авторизацию. Бот работает только для авторизованных пользователей.

## Все команды в одном месте

```bash
# 1. Установка зависимостей
cd functions && npm install && cd ..

# 2. Настройка токена
firebase functions:config:set telegram.bot_token="8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4"

# 3. Сборка
cd functions && npm run build && cd ..

# 4. Деплой
firebase deploy --only functions:telegramWebhook

# 5. Настройка webhook (замените URL на ваш)
curl -X POST "https://api.telegram.org/bot8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://<YOUR-REGION>-<YOUR-PROJECT-ID>.cloudfunctions.net/telegramWebhook"}'

# 6. Проверка webhook
curl "https://api.telegram.org/bot8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4/getWebhookInfo"

# 7. Просмотр логов
firebase functions:log --only telegramWebhook
```

