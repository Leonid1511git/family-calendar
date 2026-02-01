# Готовность авторизации

## Что проверено

### 1. Firebase Auth в React Native (Expo SDK 53)
- **Проблема:** Ошибка «Component auth has not been registered yet» — в Expo SDK 53 Metro по умолчанию включает `unstable_enablePackageExports: true`, из‑за чего разрешение модулей Firebase Auth (CommonJS) ломается и компонент Auth не регистрируется.
- **Решение (главное):** В `metro.config.js` отключить новое разрешение экспортов и добавить поддержку `.cjs`:
  - `config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'cjs'];`
  - `config.resolver.unstable_enablePackageExports = false;`
- **Дополнительно:** Auth инициализируется с задержкой 2.5 с и persistence в AsyncStorage; при старте вызывается `ensureAuthInit()` и `await getAuthAsync()` перед показом главного экрана.
- **Файлы:** `metro.config.js` (обязательно), `src/services/firebase.ts`, `App.tsx`.

### 2. Вход через Telegram
- **Цепочка:** Deep link с `tgAuthResult` → `parseTelegramAuthUrl(url)` → `login(userData)` → `getTelegramCustomToken` (Cloud Function) → `signInWithCustomToken(getAuth(), customToken)` → сохранение user/group в state и AsyncStorage.
- **Условие:** У payload должны быть `hash` и `authDate` (приходят из Telegram Login).
- **Перед signIn:** В `login()` всегда вызывается `await getAuthAsync()`, затем `getAuth()` — исключается использование Auth до инициализации.
- **Файлы:** `src/context/AuthContext.tsx`, `src/utils/telegramAuth.ts`, Cloud Function `getTelegramCustomToken`.

### 3. Выход
- В `logout()` перед `firebaseSignOut(getAuth())` вызывается `await getAuthAsync()`.
- Очищаются AsyncStorage (USER_STORAGE_KEY, GROUP_STORAGE_KEY) и state (user, group).

### 4. Ошибки входа
- При любой ошибке в `login()` вызывается `setLastLoginError(msg)`.
- На экране входа в блоке «Диагностика входа» выводится «Ошибка входа: …» при наличии `lastLoginError`.

### 5. Cloud Function getTelegramCustomToken
- Требует у сервисного аккаунта **App Engine default** (`PROJECT_ID@appspot.gserviceaccount.com`) роль **Service Account Token Creator** (см. `CUSTOM_TOKEN_IAM.md`).
- В теле функции не передаются в Firestore поля со значением `undefined` (избегаем ошибки Firestore).
- Ошибки оборачиваются в `HttpsError`, чтобы клиент получал осмысленное сообщение.

## Что нужно для успешного входа

1. **Роль IAM:** У `family-calendar-22abd@appspot.gserviceaccount.com` должна быть роль **Service Account Token Creator** (в Google Cloud Console → IAM).
2. **Задержка при старте:** Экран «Загрузка…» показывается до готовности Auth (~2.5 с + 300 мс), затем показывается экран входа — к этому моменту Auth уже инициализирован.
3. **Домен в BotFather:** Домен для Telegram Login Widget должен совпадать с тем, с которого открывается страница входа (например, `https://family-calendar-22abd.web.app`).

## Предупреждения в логах (не блокируют вход)

- **expo-notifications / Expo Go:** Push-уведомления в Expo Go (SDK 53+) не поддерживаются — нужен development build. На сам вход через Telegram не влияет.
- Раньше могло появляться предупреждение Firebase Auth про AsyncStorage — после перехода на `initializeAuth` с `getReactNativePersistence(ReactNativeAsyncStorage)` оно не должно появляться.
