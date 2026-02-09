# Сборка и установка приложения (APK и TestFlight)

## Подготовка

1. **Закоммитить и запушить изменения** (если ещё не сделано):
   ```bash
   cd /Users/leo-yudenkov/Documents/family-calendar-v2
   git add .
   git commit -m "Общая группа default-family для всех пользователей"
   git push
   ```

2. **Убедиться, что установлен EAS CLI** (если ещё нет):
   ```bash
   npm install -g eas-cli
   ```

3. **Войти в Expo** (если не залогинены):
   ```bash
   npx eas-cli login
   ```

---

## Android: сборка APK

1. Перейти в папку проекта:
   ```bash
   cd /Users/leo-yudenkov/Documents/family-calendar-v2
   ```

2. Запустить сборку APK (профиль `preview` — внутренняя установка, тип apk):
   ```bash
   npx eas-cli build --profile preview --platform android
   ```
   или:
   ```bash
   npm run build:apk
   ```

3. Дождаться окончания сборки в терминале (или открыть ссылку из вывода в браузере — Expo dashboard).

4. Скачать APK:
   - в терминале появится ссылка на сборку, или
   - зайти на [expo.dev](https://expo.dev) → ваш проект → Builds → выбрать последнюю сборку Android → скачать APK.

5. Установить APK на устройство (перекинуть файл и открыть, или скачать по ссылке с телефона).

---

## iOS: сборка для TestFlight

1. Перейти в папку проекта:
   ```bash
   cd /Users/leo-yudenkov/Documents/family-calendar-v2
   ```

2. Сборка для реального устройства (профиль для загрузки в App Store / TestFlight):
   ```bash
   npx eas-cli build --profile production --platform ios
   ```
   Для внутренней установки без TestFlight (только на свои устройства):
   ```bash
   npx eas-cli build --profile preview-device --platform ios
   ```

3. Дождаться окончания сборки (на серверах Expo).

4. Загрузить сборку в TestFlight (один из способов).

   **Вариант A — через EAS Submit (после успешной сборки):**
   ```bash
   npx eas-cli submit --platform ios
   ```
   Команда предложит выбрать последнюю сборку и (при необходимости) запросит данные Apple ID / App Store Connect.

   **Вариант B — вручную в App Store Connect:**
   - Зайти в [App Store Connect](https://appstoreconnect.apple.com) → ваше приложение → TestFlight.
   - Скачать собранный `.ipa` из [expo.dev](https://expo.dev) → проект → Builds → последняя iOS-сборка.
   - Загрузить `.ipa` через Transporter (macOS) или в разделе TestFlight (если доступно).

5. В App Store Connect дождаться обработки сборки, затем добавить тестировщиков в TestFlight — они получат приглашение и установят приложение через TestFlight.

---

## Кратко по командам

| Цель              | Команда |
|-------------------|--------|
| APK (Android)     | `cd /Users/leo-yudenkov/Documents/family-calendar-v2` затем `npx eas-cli build --profile preview --platform android` |
| iOS (TestFlight)  | `cd /Users/leo-yudenkov/Documents/family-calendar-v2` затем `npx eas-cli build --profile production --platform ios` |
| Отправить в TestFlight | после сборки: `npx eas-cli submit --platform ios` |

---

## Если нужны переменные окружения (токены и т.д.)

Они задаются в [expo.dev](https://expo.dev) → проект → Settings → Environment variables (или в `eas.json` в секции `environment` для профиля). Для сборки с GitHub убедитесь, что переменные настроены для нужного профиля (preview / production).
