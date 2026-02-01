# Инициализация Firebase проекта

## Проблема
`Error: No currently active project` - Firebase проект не инициализирован

## Решение

### Шаг 1: Войдите в Firebase

```bash
npx firebase-tools login
```

Или если установлен глобально:
```bash
firebase login
```

### Шаг 2: Инициализируйте проект

```bash
npx firebase-tools init
```

Или:
```bash
firebase init
```

**Выберите:**
- ✅ **Functions** - для Cloud Functions
- ✅ **Firestore** - для базы данных
- ❌ Остальное можно пропустить

### Шаг 3: Выберите проект

**Вариант A: Существующий проект**
- Выберите существующий проект из списка
- Или создайте новый через Firebase Console

**Вариант B: Создать новый проект**
1. Перейдите в [Firebase Console](https://console.firebase.google.com/)
2. Нажмите "Add project"
3. Следуйте инструкциям
4. После создания вернитесь к `firebase init` и выберите новый проект

### Шаг 4: Настройте Functions

При инициализации Functions:
- **Language:** TypeScript
- **Use ESLint:** Yes (или No, по желанию)
- **Install dependencies:** Yes

### Шаг 5: Настройте Firestore

При инициализации Firestore:
- **Firestore Rules file:** `firestore.rules` (уже существует)
- **Firestore indexes file:** `firestore.indexes.json` (уже существует)

## После инициализации

### Проверьте, что проект выбран

```bash
npx firebase-tools projects:list
```

Должен быть активный проект (помечен звездочкой `*`)

### Если проект не активен

```bash
npx firebase-tools use <project-id>
```

Или:
```bash
firebase use <project-id>
```

## Быстрая команда для выбора проекта

Если проект уже существует, просто выберите его:

```bash
# Список проектов
npx firebase-tools projects:list

# Выбор проекта
npx firebase-tools use <project-id>
```

## Полная последовательность

```bash
# 1. Вход в Firebase
npx firebase-tools login

# 2. Инициализация (выберите Functions и Firestore)
npx firebase-tools init

# 3. Проверка активного проекта
npx firebase-tools projects:list

# 4. Если нужно выбрать проект вручную
npx firebase-tools use <project-id>

# 5. Теперь можно деплоить
npx firebase-tools deploy --only functions:telegramWebhook
```

## Важно

- Если у вас уже есть проект Firebase, просто выберите его при `init`
- Если проекта нет, создайте его в [Firebase Console](https://console.firebase.google.com/)
- После инициализации будет создан файл `.firebaserc` с настройками проекта


