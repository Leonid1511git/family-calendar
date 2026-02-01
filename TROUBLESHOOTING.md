# Устранение ошибки "Failed to download remote update"

## Быстрое решение

1. **Полная очистка проекта:**
   ```bash
   rm -rf node_modules
   rm -rf .expo
   rm -rf android/.gradle
   npm install
   npx expo start --clear
   ```

2. **Очистка кэша на устройстве:**
   - Полностью закройте Expo Go (не просто сверните)
   - Очистите кэш приложения Expo Go в настройках Android
   - Или переустановите Expo Go

3. **Проверьте версию Expo Go:**
   - Убедитесь, что на телефоне установлен Expo Go с поддержкой SDK 54
   - Обновите Expo Go до последней версии из Play Store

4. **Используйте туннель:**
   ```bash
   npx expo start --tunnel
   ```

## Что было исправлено

1. ✅ Удален `runtimeVersion` из `app.json` (не нужен для Expo Go)
2. ✅ Удалена секция `updates` из `app.json`
3. ✅ Удален плагин `expo-build-properties` (требует development build)

## Если проблема сохраняется

### Вариант 1: Использовать Development Build
Если нужны нативные модули, используйте development build вместо Expo Go:
```bash
npx expo install expo-dev-client
eas build --profile development --platform android
```

### Вариант 2: Проверить совместимость плагинов
Некоторые плагины могут требовать development build:
- `expo-build-properties` - требует development build
- `expo-calendar` - должен работать в Expo Go
- `expo-notifications` - должен работать в Expo Go
- `expo-av` - должен работать в Expo Go

### Вариант 3: Минимальный тест
Создайте минимальный проект для проверки:
```bash
npx create-expo-app test-app --template blank-typescript
cd test-app
npx expo start
```

Если минимальный проект работает, проблема в одной из зависимостей вашего проекта.

## Логи для диагностики

Если проблема сохраняется, соберите следующую информацию:
1. Полный вывод `npx expo start --clear`
2. Версия Expo Go на устройстве
3. Версия Node.js (`node -v`)
4. Версия npm (`npm -v`)
5. Версия Expo CLI (`npx expo --version`)

