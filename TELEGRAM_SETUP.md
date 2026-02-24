# Настройка Telegram бота

## Шаг 1: Получение токена бота

1. Откройте Telegram и найдите [@BotFather](https://t.me/BotFather)
2. Отправьте команду `/newbot`
3. Следуйте инструкциям:
   - Введите имя бота (например: "Family Calendar Bot")
   - Введите username бота (например: "my_family_calendar_bot")
4. BotFather отправит вам токен вида: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

## Шаг 2: Настройка токена в приложении

### Вариант 1: Прямая вставка (для разработки)

1. Откройте файл `src/config/telegram.ts`
2. Замените `YOUR_BOT_TOKEN_HERE` на ваш токен
3. Замените `YOUR_BOT_NAME_HERE` на имя вашего бота (без @)

Пример:
```typescript
export const TELEGRAM_CONFIG = {
  BOT_TOKEN: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
  BOT_NAME: 'my_family_calendar_bot',
};
```

**✅ Токен уже вставлен в файл `src/config/telegram.ts`**

## Шаг 3: Настройка авторизации через Telegram

Авторизация через Telegram Login Widget уже настроена в `AuthScreen.tsx`.

**Как это работает:**
1. Пользователь нажимает "Войти через Telegram"
2. Открывается Telegram Login Widget
3. После авторизации возвращаются данные пользователя (id, имя, username)
4. Пользователь автоматически создается/обновляется в базе данных
5. Пользователь присоединяется к группе "Семья"

**Важно:**
- Для production рекомендуется добавить проверку `hash` для безопасности
- Текущая реализация работает для MVP, но для production нужен backend для проверки hash

### Вариант 2: Через переменные окружения (рекомендуется для production)

1. Создайте файл `.env.calendar` в корне проекта (скопируйте из `.env.calendar.example`; в этом проекте используется именно он, чтобы не путать с env-файлами соседних проектов):
```
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_BOT_NAME=my_family_calendar_bot
```

2. Обновите `src/config/telegram.ts`:
```typescript
export const TELEGRAM_CONFIG = {
  BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE',
  BOT_NAME: process.env.TELEGRAM_BOT_NAME || 'YOUR_BOT_NAME_HERE',
};
```

## Шаг 4: Настройка токена в Cloud Functions (для уведомлений)

Для отправки уведомлений через Telegram нужен токен в Cloud Functions:

### Вариант 1: Через Firebase Config

```bash
firebase functions:config:set telegram.bot_token="YOUR_BOT_TOKEN"
```

Затем в Cloud Function:
```typescript
const functions = require('firebase-functions');
const TELEGRAM_BOT_TOKEN = functions.config().telegram.bot_token;
```

### Вариант 2: Через переменные окружения (Firebase Functions v2+)

```bash
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
# Введите токен при запросе
```

Затем в Cloud Function:
```typescript
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
```

## Шаг 5: Проверка настройки

После настройки токена проверьте:

1. **В приложении:**
   - Функция `isTelegramConfigured()` вернет `true`
   - Авторизация через Telegram будет работать

2. **В Cloud Functions:**
   - Уведомления будут отправляться через Telegram Bot API

## Безопасность

⚠️ **ВАЖНО:**
- НИКОГДА не коммитьте файл `src/config/telegram.ts` с реальным токеном в git
- Файл уже добавлен в `.gitignore`
- Используйте `.env.calendar` (в корне этого проекта) или секреты Firebase для production
- Храните токены в секретах Firebase для Cloud Functions

## Что дальше?

1. Настройте Cloud Functions (см. `TELEGRAM_NOTIFICATIONS.md`)
2. Протестируйте отправку уведомлений
3. Настройте авторизацию через Telegram (если нужно)

