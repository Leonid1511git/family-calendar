# Критическое исправление ошибки "PlatformConstants could not be found"

## Проблема
Ошибка "PlatformConstants could not be found" указывает на несовместимость версий React Native с Expo SDK 54.

## Решение

### Вариант 1: Использовать expo install (РЕКОМЕНДУЕТСЯ)

Expo управляет версиями зависимостей автоматически. Выполните:

```bash
# Удалите node_modules и package-lock.json
rm -rf node_modules package-lock.json

# Установите правильные версии через expo install
npx expo install react-native react

# Переустановите все зависимости
npm install

# Запустите с очисткой кэша
npx expo start --clear
```

### Вариант 2: Удалить проблемные пакеты

Если проблема сохраняется, временно удалите пакеты, которые могут требовать нативной сборки:

```bash
npm uninstall react-native-calendars react-native-reanimated
```

Затем перезапустите проект.

### Вариант 3: Использовать Development Build

Если нужны нативные модули, используйте development build вместо Expo Go:

```bash
npx expo install expo-dev-client
eas build --profile development --platform android
```

## Текущие изменения

1. ✅ Временно отключен `react-native-calendars` в CalendarScreen
2. ✅ Изменена версия React Native на 0.76.5
3. ✅ Удален `react-native-vector-icons` (не используется)

## Следующие шаги

1. Выполните `npx expo install react-native react` для установки правильных версий
2. Переустановите зависимости: `npm install`
3. Запустите: `npx expo start --clear`

Если проблема сохраняется, используйте Development Build.

