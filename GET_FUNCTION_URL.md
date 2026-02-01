# Как получить URL функции

## Способ 1: Из вывода деплоя

После выполнения `npx firebase-tools deploy --only functions:telegramWebhook` в выводе будет:

```
✔  functions[telegramWebhook(us-central1)]: Successful create operation.
Function URL (telegramWebhook): https://us-central1-family-calendar-22abd.cloudfunctions.net/telegramWebhook
```

**Скопируйте URL из строки `Function URL`**

## Способ 2: Через Firebase Console

1. Перейдите в [Firebase Console → Functions](https://console.firebase.google.com/project/family-calendar-22abd/functions)
2. Найдите функцию `telegramWebhook`
3. Нажмите на неё
4. Скопируйте URL из раздела "Trigger URL"

## Способ 3: Через команду

```bash
npx firebase-tools functions:list
```

Найдите функцию `telegramWebhook` и скопируйте её URL.

## Формат URL

URL будет выглядеть так:
```
https://us-central1-family-calendar-22abd.cloudfunctions.net/telegramWebhook
```

Или:
```
https://<region>-<project-id>.cloudfunctions.net/telegramWebhook
```

Где:
- `<region>` - обычно `us-central1` или другой регион
- `<project-id>` - ваш project ID (`family-calendar-22abd`)

## После получения URL

Используйте его в команде установки webhook:

```bash
curl -X POST "https://api.telegram.org/bot8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://us-central1-family-calendar-22abd.cloudfunctions.net/telegramWebhook"}'
```

Замените URL на ваш реальный!


