# Настройка Webhook для Telegram бота

## Проблема
Webhook не настроен: `"url": ""`

## Предварительные требования

### Установка Firebase CLI

Если команда `firebase` не найдена, установите Firebase CLI:

**Вариант 1: Через npm (рекомендуется)**
```bash
npm install -g firebase-tools
```

**Вариант 2: Через npx (без установки)**
Используйте `npx firebase-tools` вместо `firebase` во всех командах ниже.

**После установки:**
```bash
firebase login
```

## Решение (выполните по порядку)

### Шаг 1: Установите зависимости

```bash
cd functions
npm install
cd ..
```

### Шаг 2: Токен бота уже настроен в коде

**Для MVP:** Токен бота уже встроен в код функции (временное решение).

**Для production (после обновления до Blaze плана):**
1. Обновите проект до Blaze плана в [Firebase Console](https://console.firebase.google.com/project/family-calendar-22abd/usage/details)
2. Установите секрет:
   ```bash
   npx firebase-tools functions:secrets:set TELEGRAM_BOT_TOKEN
   ```
3. Раскомментируйте строку с `secrets` в `functions/src/index.ts`
4. Закомментируйте временную версию без secrets

### Шаг 3: Соберите проект

```bash
cd functions
npm run build
cd ..
```

### Шаг 4: Задеплойте функцию

**Если Firebase CLI установлен:**
```bash
firebase deploy --only functions:telegramWebhook
```

**Если используете npx:**
```bash
npx firebase-tools deploy --only functions:telegramWebhook
```

**Важно:** После деплоя в выводе будет URL функции. Он выглядит так:
```
Function URL (telegramWebhook): https://us-central1-<project-id>.cloudfunctions.net/telegramWebhook
```

**Скопируйте этот URL!**

### Шаг 5: Установите webhook

Замените `<YOUR-FUNCTION-URL>` на URL из Шага 4:

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

### Шаг 6: Проверьте webhook

```bash
curl "https://api.telegram.org/bot8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4/getWebhookInfo"
```

Теперь должно быть:
```json
{
  "ok": true,
  "result": {
    "url": "https://...",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

### Шаг 7: Протестируйте бота

1. Откройте Telegram
2. Найдите бота: `@FamilyCalendarApp_bot`
3. Отправьте `/start`
4. Отправьте: `Баня 15го в 18`

## Если что-то пошло не так

### Ошибка: "TELEGRAM_BOT_TOKEN not configured"
Выполните Шаг 2 еще раз и затем задеплойте функцию снова.

### Ошибка: "Function not found"
Убедитесь, что функция задеплоена: `firebase functions:list`

### Webhook не устанавливается
1. Проверьте правильность URL
2. Убедитесь, что функция задеплоена
3. Проверьте, что URL доступен (откройте в браузере)

