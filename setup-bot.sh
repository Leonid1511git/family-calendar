#!/bin/bash

# Скрипт для настройки Telegram бота

BOT_TOKEN="8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4"

echo "🤖 Настройка Telegram бота..."
echo ""

# Проверка 1: Установлены ли зависимости
echo "📦 Проверка зависимостей..."
if [ ! -d "functions/node_modules" ]; then
    echo "   Установка зависимостей..."
    cd functions
    npm install
    cd ..
else
    echo "   ✅ Зависимости установлены"
fi

# Проверка 2: Настроен ли токен
echo ""
echo "🔑 Проверка токена..."
TOKEN_CONFIG=$(firebase functions:config:get 2>/dev/null | grep -o '"bot_token":"[^"]*"' || echo "")
if [ -z "$TOKEN_CONFIG" ]; then
    echo "   Настройка токена..."
    firebase functions:config:set telegram.bot_token="$BOT_TOKEN"
    echo "   ✅ Токен настроен"
else
    echo "   ✅ Токен уже настроен"
fi

# Проверка 3: Сборка проекта
echo ""
echo "🔨 Сборка проекта..."
cd functions
npm run build
cd ..
echo "   ✅ Проект собран"

# Проверка 4: Деплой функции
echo ""
echo "🚀 Деплой функции..."
echo "   Это может занять несколько минут..."
firebase deploy --only functions:telegramWebhook

# Получение URL функции
echo ""
echo "📋 Получение URL функции..."
FUNCTION_URL=$(firebase functions:list 2>/dev/null | grep telegramWebhook | awk '{print $2}' || echo "")

if [ -z "$FUNCTION_URL" ]; then
    echo "   ⚠️  Не удалось получить URL автоматически"
    echo "   Пожалуйста, найдите URL в выводе деплоя выше"
    echo "   Формат: https://<region>-<project-id>.cloudfunctions.net/telegramWebhook"
    read -p "   Введите URL функции: " FUNCTION_URL
fi

# Настройка webhook
echo ""
echo "🔗 Настройка webhook..."
if [ ! -z "$FUNCTION_URL" ]; then
    curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
        -H "Content-Type: application/json" \
        -d "{\"url\": \"$FUNCTION_URL\"}"
    echo ""
    echo "   ✅ Webhook настроен"
else
    echo "   ⚠️  Не удалось настроить webhook автоматически"
    echo "   Выполните вручную:"
    echo "   curl -X POST \"https://api.telegram.org/bot$BOT_TOKEN/setWebhook\" \\"
    echo "       -H \"Content-Type: application/json\" \\"
    echo "       -d '{\"url\": \"<YOUR-FUNCTION-URL>\"}'"
fi

# Проверка webhook
echo ""
echo "✅ Проверка webhook..."
curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo" | python3 -m json.tool 2>/dev/null || \
curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo"

echo ""
echo "🎉 Настройка завершена!"
echo ""
echo "📝 Следующие шаги:"
echo "   1. Откройте Telegram и найдите вашего бота"
echo "   2. Отправьте команду /start"
echo "   3. Отправьте сообщение: Баня 15го в 18"
echo "   4. Проверьте логи: firebase functions:log --only telegramWebhook"

