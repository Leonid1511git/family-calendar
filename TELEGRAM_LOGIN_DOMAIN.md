# Устранение ошибки «Bot domain invalid» при входе через Telegram

**Если при входе через Telegram появляется «Bot domain invalid»** — домен вашего прокси не указан в BotFather или указан неверно. Нужно один раз настроить его по шагам ниже.

Telegram Login Widget принимает только **HTTPS-домен**, указанный в BotFather. В приложении используется прокси на вашем домене.

## Шаги

### 1. Развернуть Hosting и узнать URL

```bash
firebase deploy --only hosting
```

В конце будет указан URL, например: **https://family-calendar-22abd.web.app**

### 2. Указать домен в BotFather

1. Откройте [@BotFather](https://t.me/botfather) в Telegram.
2. Отправьте команду **/setdomain**.
3. Выберите вашего бота.
4. Укажите домен **без** `https://` и без слэша в конце, например:
   - `family-calendar-22abd.web.app`

### 3. Проверить конфиг приложения

В `src/config/telegram.ts` поле **AUTH_PROXY_URL** должно совпадать с URL Hosting:

```ts
AUTH_PROXY_URL: 'https://family-calendar-22abd.web.app',
```

После этого вход через Telegram должен работать без ошибки «Bot domain invalid».
