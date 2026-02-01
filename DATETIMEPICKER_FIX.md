# Исправление DateTimePicker для Expo Go

## Текущая ситуация

Компонент `@react-native-community/datetimepicker` временно отключен, чтобы приложение запускалось в Expo Go. Кнопки выбора даты/времени работают, но пикеры не отображаются.

## Решение: Правильная установка пакета

Для работы DateTimePicker в Expo Go нужно установить пакет через `expo install` (не через `npm install`):

```bash
# 1. Установите пакет через expo install
npx expo install @react-native-community/datetimepicker

# 2. Полная очистка кэша
rm -rf node_modules
rm -rf .expo
npm install

# 3. Перезапуск с очисткой кэша
npx expo start --clear
```

## После установки

1. Раскомментируйте импорт в `src/screens/CreateEventScreen.tsx`:
   ```typescript
   import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
   ```

2. Раскомментируйте компоненты DateTimePicker в конце файла (строки ~560-595)

3. Удалите временный тип `type DateTimePickerEvent = any;`

## Альтернатива: Development Build

Если пакет все еще не работает в Expo Go, используйте development build:

```bash
npx expo install expo-dev-client
eas build --profile development --platform android
```

## Примечание

`@react-native-community/datetimepicker` требует нативной сборки и может не работать в стандартном Expo Go. Для полной функциональности рекомендуется использовать development build.

