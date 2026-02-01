# Установка Firebase CLI

## Проблема
`firebase: command not found` - Firebase CLI не установлен

## Решение

### Вариант 1: Установка через npm (рекомендуется)

```bash
npm install -g firebase-tools
```

### Вариант 2: Установка через Homebrew (macOS)

```bash
brew install firebase-cli
```

### Вариант 3: Установка через npx (без глобальной установки)

Можно использовать `npx firebase-tools` вместо `firebase`:

```bash
npx firebase-tools functions:config:set telegram.bot_token="8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4"
```

## После установки

### 1. Войдите в Firebase

```bash
firebase login
```

Или через браузер:
```bash
firebase login --no-localhost
```

### 2. Инициализируйте проект (если еще не инициализирован)

```bash
firebase init
```

Выберите:
- ✅ Functions
- ✅ Firestore

### 3. Выберите существующий проект или создайте новый

## Проверка установки

```bash
firebase --version
```

Должна быть версия (например: `13.0.0`)

## Альтернатива: Использование npx

Если не хотите устанавливать глобально, используйте `npx`:

```bash
# Вместо: firebase functions:config:set
npx firebase-tools functions:config:set telegram.bot_token="8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4"

# Вместо: firebase deploy
npx firebase-tools deploy --only functions:telegramWebhook
```

## Полная последовательность с npx

```bash
# 1. Установка зависимостей functions
cd functions
npm install
cd ..

# 2. Настройка токена (через npx)
npx firebase-tools functions:config:set telegram.bot_token="8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4"

# 3. Сборка
cd functions
npm run build
cd ..

# 4. Деплой (через npx)
npx firebase-tools deploy --only functions:telegramWebhook
```


