# ⚠️ КРИТИЧЕСКИ ВАЖНО: Версии React и React Native

## ❌ НЕ УСТАНАВЛИВАЙТЕ ВРУЧНУЮ:

- ❌ React 19.x (любая версия)
- ❌ React Native 0.81.x (любая версия)
- ❌ React Native 0.80.x
- ❌ React Native 0.79.x

## ✅ ПРАВИЛЬНЫЕ ВЕРСИИ для Expo SDK 54:

- ✅ React: `18.3.1` (ТОЧНО ЭТА ВЕРСИЯ)
- ✅ React Native: `0.76.5` (или версия, которую установит `expo install`)

## Почему это важно?

Expo SDK 54 **НЕ ПОДДЕРЖИВАЕТ** React 19 и React Native 0.81.5. Эти версии требуют Expo SDK 55 или выше, который может быть недоступен или нестабилен.

## Правильная установка:

```bash
# 1. Убедитесь, что в package.json правильные версии:
#    "react": "18.3.1"
#    "react-native": "0.76.5"

# 2. Установите через expo install (НЕ через npm install напрямую!)
npx expo install react react-native

# 3. Expo автоматически выберет совместимые версии
```

## Если вы случайно изменили версии:

1. Откройте `package.json`
2. Найдите строки с `"react"` и `"react-native"`
3. Измените на:
   ```json
   "react": "18.3.1",
   "react-native": "0.76.5",
   ```
4. Сохраните файл
5. Выполните: `npx expo install react react-native`

## Проверка версий:

После установки проверьте:
```bash
npm list react react-native
```

Должны быть:
- react@18.3.1
- react-native@0.76.5 (или близкая версия 0.76.x)

