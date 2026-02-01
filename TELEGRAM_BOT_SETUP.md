# Настройка Telegram бота для создания событий

## Возможности

Бот позволяет создавать события через текстовые сообщения в естественном языке:

- `Баня 15го в 18` - создаст событие "Баня" 15 числа текущего месяца в 18:00
- `Театр суббота 19:00` - создаст событие "Театр" в ближайшую субботу в 19:00
- `ДР Игоря завтра в 15` - создаст событие "ДР Игоря" завтра в 15:00
- `Командировка с 21 по 15 февраля` - создаст событие "Командировка" с 21 по 15 февраля

## Архитектура

### Frontend (уже реализовано)

1. **Парсер сообщений** (`src/utils/telegramParser.ts`)
   - Парсит естественный язык с помощью `chrono-node`
   - Извлекает название, дату, время
   - Определяет длительность события

### Backend (нужно реализовать)

1. **Cloud Function для обработки webhook от Telegram**
   - Принимает сообщения от Telegram Bot API
   - Парсит текст сообщения
   - Создает событие в Firestore
   - Отправляет подтверждение пользователю

## Настройка Cloud Function

### Шаг 1: Создайте Cloud Function

Создайте файл `functions/src/telegramBot.ts`:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import { parseTelegramMessage, formatEventMessage } from '../utils/telegramParser';

const TELEGRAM_BOT_TOKEN = functions.config().telegram.bot_token || process.env.TELEGRAM_BOT_TOKEN;

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
    date: number;
  };
}

/**
 * Webhook для обработки сообщений от Telegram
 */
export const telegramWebhook = functions.https.onRequest(async (req, res) => {
  // Telegram требует ответа в течение 10 секунд
  res.status(200).send('OK');

  const update: TelegramUpdate = req.body;

  // Обрабатываем только текстовые сообщения
  if (!update.message || !update.message.text) {
    return;
  }

  const message = update.message;
  const telegramUserId = message.from.id.toString();
  const text = message.text.trim();

  // Игнорируем команды (начинаются с /)
  if (text.startsWith('/')) {
    return;
  }

  try {
    // Парсим сообщение
    const eventData = parseTelegramMessage(text);

    if (!eventData) {
      await sendTelegramMessage(message.chat.id, '❌ Не удалось распознать событие. Попробуйте еще раз.');
      return;
    }

    // Находим пользователя по Telegram ID
    const db = admin.firestore();
    const usersSnapshot = await db.collection('users')
      .where('telegramId', '==', telegramUserId)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      await sendTelegramMessage(
        message.chat.id,
        '❌ Пользователь не найден. Пожалуйста, сначала войдите в приложение.'
      );
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;
    const groupId = userData.currentGroupId || userData.groupId;

    if (!groupId) {
      await sendTelegramMessage(
        message.chat.id,
        '❌ Группа не найдена. Пожалуйста, создайте группу в приложении.'
      );
      return;
    }

    // Создаем событие
    const eventRef = db.collection('events').doc();
    const eventId = eventRef.id;

    const event = {
      id: eventId,
      title: eventData.title,
      description: eventData.description,
      startDate: admin.firestore.Timestamp.fromDate(eventData.startDate),
      endDate: admin.firestore.Timestamp.fromDate(eventData.endDate),
      allDay: eventData.allDay,
      color: 'blue', // По умолчанию
      type: 'single',
      createdBy: userId,
      groupId: groupId,
      participants: [],
      reminderTime: 4320, // 3 дня по умолчанию
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      isDeleted: false,
      isSynced: true,
      remoteId: eventId,
    };

    await eventRef.set(event);

    // Планируем уведомление
    if (!eventData.allDay && eventData.startDate > new Date()) {
      const reminderMinutes = 4320; // 3 дня
      const triggerDate = new Date(eventData.startDate.getTime() - reminderMinutes * 60 * 1000);
      
      if (triggerDate > new Date()) {
        // Получаем Telegram IDs участников группы
        const groupMembersSnapshot = await db.collection('groups')
          .doc(groupId)
          .collection('members')
          .get();

        const telegramIds: string[] = [];
        for (const memberDoc of groupMembersSnapshot.docs) {
          const memberUserId = memberDoc.id;
          const memberUserDoc = await db.collection('users').doc(memberUserId).get();
          if (memberUserDoc.exists()) {
            const memberData = memberUserDoc.data();
            if (memberData?.telegramId) {
              telegramIds.push(memberData.telegramId);
            }
          }
        }

        if (telegramIds.length > 0) {
          await db.collection('scheduled_notifications').add({
            eventId: eventId,
            eventTitle: eventData.title,
            eventDate: admin.firestore.Timestamp.fromDate(eventData.startDate),
            reminderTime: reminderMinutes,
            triggerDate: admin.firestore.Timestamp.fromDate(triggerDate),
            telegramUserIds: telegramIds,
            groupId: groupId,
            status: 'pending',
            createdAt: admin.firestore.Timestamp.now(),
          });
        }
      }
    }

    // Отправляем подтверждение
    const confirmationMessage = `✅ Событие создано!\n\n${formatEventMessage(eventData)}`;
    await sendTelegramMessage(message.chat.id, confirmationMessage);

  } catch (error) {
    console.error('Error processing Telegram message:', error);
    await sendTelegramMessage(
      message.chat.id,
      '❌ Произошла ошибка при создании события. Попробуйте еще раз.'
    );
  }
});

/**
 * Отправляет сообщение в Telegram
 */
async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  try {
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
      }
    );
  } catch (error) {
    console.error('Error sending Telegram message:', error);
  }
}
```

### Шаг 2: Настройте webhook

После деплоя Cloud Function, настройте webhook для бота:

```bash
# Получите URL вашей Cloud Function
# Например: https://us-central1-your-project.cloudfunctions.net/telegramWebhook

# Установите webhook
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://us-central1-your-project.cloudfunctions.net/telegramWebhook"}'
```

### Шаг 3: Скопируйте утилиту парсера

Скопируйте файл `src/utils/telegramParser.ts` в `functions/src/utils/telegramParser.ts` и установите зависимости:

```bash
cd functions
npm install chrono-node date-fns
```

### Шаг 4: Настройте права доступа

Убедитесь, что Cloud Function имеет права на:
- Чтение/запись в Firestore
- Доступ к переменным окружения с токеном бота

## Примеры использования

1. **Простое событие:**
   ```
   Баня 15го в 18
   ```
   → Создаст событие "Баня" 15 числа в 18:00

2. **С указанием дня недели:**
   ```
   Театр суббота 19:00
   ```
   → Создаст событие "Театр" в ближайшую субботу в 19:00

3. **С относительной датой:**
   ```
   ДР Игоря завтра в 15
   ```
   → Создаст событие "ДР Игоря" завтра в 15:00

4. **Период:**
   ```
   Командировка с 21 по 15 февраля
   ```
   → Создаст событие "Командировка" с 21 по 15 февраля

## Обработка ошибок

- Если пользователь не найден → отправляется сообщение с просьбой войти в приложение
- Если группа не найдена → отправляется сообщение с просьбой создать группу
- Если не удалось распарсить → отправляется сообщение с просьбой попробовать еще раз
- При любой ошибке → отправляется общее сообщение об ошибке

## Безопасность

1. **Проверка webhook:**
   - Telegram отправляет секретный токен в заголовке
   - Проверяйте токен перед обработкой запроса

2. **Валидация пользователя:**
   - Проверяйте, что пользователь существует в базе
   - Проверяйте, что у пользователя есть группа

3. **Ограничения:**
   - Обрабатывайте только текстовые сообщения
   - Игнорируйте команды (начинаются с /)

