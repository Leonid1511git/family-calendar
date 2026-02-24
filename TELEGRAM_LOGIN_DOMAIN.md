# Устранение ошибки «Bot domain invalid» при входе через Telegram

**Если при входе через Telegram появляется «Bot domain invalid»** — домен вашего прокси не указан в BotFather или указан неверно. Нужно один раз настроить его по шагам ниже.

Telegram Login Widget принимает только **HTTPS-домен**, указанный в BotFather. В приложении используется прокси на вашем домене.

## Важно: откуда берётся домен

В приложении в Telegram передаётся домен из **AUTH_PROXY_URL** (параметр `origin`). Он должен **точно совпадать** с доменом, указанным в BotFather (без `https://`, без слэша в конце). Если в новой сборке изменились переменные EAS или дефолтный URL — в BotFather должен быть именно тот домен, который реально подставляется в приложении.

## Шаги

### 1. Развернуть Hosting и узнать URL

```bash
firebase deploy --only hosting
```

В конце будет указан URL, например: **https://family-calendar-22abd.web.app**

После любых правок в папке `public/` (в т.ч. `telegram-login.html`) нужно снова выполнить `firebase deploy --only hosting`.

### 2. Указать домен в BotFather

1. Откройте [@BotFather](https://t.me/botfather) в Telegram.
2. Отправьте команду **/setdomain**.
3. Выберите **того бота**, токен которого используется в приложении (EXPO_PUBLIC_TELEGRAM_BOT_TOKEN).
4. Укажите домен **без** `https://` и без слэша в конце, например:
   - `family-calendar-22abd.web.app`

Регистр и лишние символы важны: домен должен совпадать с хостом из AUTH_PROXY_URL.

### 3. Проверить конфиг приложения

В приложении **AUTH_PROXY_URL** должен совпадать с URL Hosting (дефолт в коде: `https://family-calendar-22abd.web.app`). В EAS Build переменная `EXPO_PUBLIC_TELEGRAM_AUTH_PROXY_URL` переопределяет его — если она задана, в BotFather должен быть указан домен именно из неё.

Если AUTH_PROXY_URL пустой или не https — приложение покажет ошибку «Не настроен домен входа» до открытия браузера.

После этого вход через Telegram должен работать без ошибки «Bot domain invalid».
