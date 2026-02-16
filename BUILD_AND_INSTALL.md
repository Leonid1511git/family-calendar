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

## Android: локальная сборка APK (без EAS)

Если бесплатный лимит EAS закончился, APK можно собрать **локально** — лимиты не тратятся.

### Что нужно

- **Node.js** и зависимости проекта: `npm install`
- **Java 17** (рекомендуется для React Native / Expo)
- **Android SDK** — можно поставить только **Command Line Tools** (без Android Studio), см. ниже.

#### SDK без Android Studio (только command line tools)

1. Скачайте [Command Line Tools](https://developer.android.com/studio#command-tools) для macOS (раздел "Command line tools only").
2. Создайте каталог и распакуйте архив:
   ```bash
   mkdir -p ~/Android/Sdk/cmdline-tools
   unzip ~/Downloads/commandlinetools-mac-*.zip -d ~/Android/Sdk/cmdline-tools
   mv ~/Android/Sdk/cmdline-tools/cmdline-tools ~/Android/Sdk/cmdline-tools/latest
   ```
3. Установите нужные пакеты (версии должны совпадать с проектом: compileSdk 36, buildTools 36.0.0):
   ```bash
   ~/Android/Sdk/cmdline-tools/latest/bin/sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0" "ndk;27.1.12297006"
   ```
4. Укажите путь к SDK в проекте: в файле `android/local.properties` должна быть строка:
   ```text
   sdk.dir=/Users/ВАШ_ЛОГИН/Android/Sdk
   ```
   (подставьте свой путь; на macOS с логином `leo-yudenkov` это `/Users/leo-yudenkov/Android/Sdk`.)

После этого сборка `./gradlew assembleRelease` будет использовать этот SDK. Android Studio ставить не обязательно.

### Команды

1. Перейти в папку проекта и при необходимости обновить нативную папку `android`:
   ```bash
   cd /Users/leo-yudenkov/Documents/family-calendar-v2
   npx expo prebuild --platform android
   ```
   (если папка `android/` уже есть и вы её не меняли вручную, этот шаг можно пропустить.)

2. Собрать **release** APK (подходит для установки на свои устройства):
   ```bash
   cd android
   ./gradlew assembleRelease
   cd ..
   ```
   Готовый файл:  
   `android/app/build/outputs/apk/release/app-release.apk`

3. Либо собрать **debug** APK (для быстрых тестов):
   ```bash
   cd android
   ./gradlew assembleDebug
   cd ..
   ```
   Файл: `android/app/build/outputs/apk/debug/app-debug.apk`

4. Установить APK на телефон (через USB или скопировав файл).

**Примечание:** release-сборка сейчас подписана debug-ключом (удобно для внутренней установки). Для публикации в Google Play нужен свой keystore и настройка подписи в `android/app/build.gradle` (signingConfigs.release).

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
| APK через EAS     | `npx eas-cli build --profile preview --platform android` |
| APK локально (без EAS) | `cd android && ./gradlew assembleRelease` → файл в `android/app/build/outputs/apk/release/app-release.apk` |
| iOS (TestFlight)  | `npx eas-cli build --profile production --platform ios` |
| Отправить в TestFlight | после сборки: `npx eas-cli submit --platform ios` |

---

## Если нужны переменные окружения (токены и т.д.)

Они задаются в [expo.dev](https://expo.dev) → проект → Settings → Environment variables (или в `eas.json` в секции `environment` для профиля). Для сборки с GitHub убедитесь, что переменные настроены для нужного профиля (preview / production).
