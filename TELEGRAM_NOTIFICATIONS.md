# Интеграция Telegram уведомлений

## Что сделано (Frontend)

### 1. Замена локальных push-уведомлений на Telegram
- ✅ Удалена зависимость от `expo-notifications` для напоминаний о событиях
- ✅ Напоминания теперь планируются через Firestore (`scheduled_notifications`)
- ✅ Cloud Function будет отправлять уведомления через Telegram Bot API

### 2. Структура данных в Firestore

#### Коллекция `scheduled_notifications`
Документы для запланированных напоминаний о событиях:

```typescript
{
  eventId: string;              // ID события
  eventTitle: string;            // Название события
  eventDate: Timestamp;         // Дата и время начала события
  reminderTime: number;         // За сколько минут до события (15, 60, 180, 720, 1440, 4320)
  triggerDate: Timestamp;        // Когда отправить уведомление (eventDate - reminderTime)
  telegramUserIds: string[];    // Массив Telegram user IDs для отправки
  groupId: string;              // ID группы
  status: 'pending' | 'sent' | 'cancelled';
  createdAt: Timestamp;
}
```

#### Коллекция `telegram_notifications`
Документы для немедленных уведомлений (новое событие, обновление):

```typescript
{
  telegramUserIds: string[];    // Массив Telegram user IDs
  title: string;                 // Заголовок уведомления
  message: string;               // Текст сообщения
  data: {                        // Дополнительные данные
    eventId: string;
    groupId: string;
    type: 'new_event' | 'event_updated' | 'event_deleted';
    senderId: string;
  };
  status: 'pending' | 'sent' | 'failed';
  createdAt: Timestamp;
}
```

### 3. API функции

#### `scheduleTelegramNotification(data)`
Планирует напоминание о событии в Firestore.

#### `cancelTelegramNotifications(eventId)`
Отменяет все запланированные уведомления для события.

#### `getGroupTelegramIds(groupId)`
Получает массив Telegram user IDs всех участников группы.

## Что нужно сделать (Backend)

### 1. Cloud Function для запланированных напоминаний

Создайте Cloud Function, которая:
1. Слушает коллекцию `scheduled_notifications`
2. Находит документы с `status === 'pending'` и `triggerDate <= now()`
3. Отправляет уведомления через Telegram Bot API
4. Обновляет `status` на `'sent'`

**Пример структуры:**

```typescript
// functions/src/telegramReminders.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

const TELEGRAM_BOT_TOKEN = 'YOUR_BOT_TOKEN';

export const sendScheduledReminders = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    
    // Найти все pending уведомления, которые нужно отправить
    const notificationsRef = db.collection('scheduled_notifications');
    const snapshot = await notificationsRef
      .where('status', '==', 'pending')
      .where('triggerDate', '<=', now)
      .get();
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Отправить уведомление каждому пользователю
      for (const telegramId of data.telegramUserIds) {
        try {
          const message = `🔔 Напоминание: ${data.eventTitle}\n` +
            `📅 ${formatDate(data.eventDate.toDate())}\n` +
            `⏰ Начало через ${formatReminderTime(data.reminderTime)}`;
          
          await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              chat_id: telegramId,
              text: message,
              parse_mode: 'HTML',
            }
          );
        } catch (error) {
          console.error(`Failed to send to ${telegramId}:`, error);
        }
      }
      
      // Обновить статус
      await doc.ref.update({ status: 'sent' });
    }
  });
```

### 2. Cloud Function для немедленных уведомлений

Создайте Cloud Function, которая:
1. Слушает коллекцию `telegram_notifications`
2. Находит документы с `status === 'pending'`
3. Отправляет уведомления через Telegram Bot API
4. Обновляет `status` на `'sent'` или `'failed'`

**Пример структуры:**

```typescript
// functions/src/telegramNotifications.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

const TELEGRAM_BOT_TOKEN = 'YOUR_BOT_TOKEN';

export const sendTelegramNotifications = functions.firestore
  .document('telegram_notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    
    if (data.status !== 'pending') return;
    
    const message = `${data.title}\n${data.message}`;
    
    // Отправить каждому пользователю
    const results = await Promise.allSettled(
      data.telegramUserIds.map(async (telegramId: string) => {
        try {
          await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              chat_id: telegramId,
              text: message,
              parse_mode: 'HTML',
            }
          );
          return { telegramId, success: true };
        } catch (error) {
          console.error(`Failed to send to ${telegramId}:`, error);
          return { telegramId, success: false };
        }
      })
    );
    
    // Обновить статус
    const allSuccess = results.every(r => r.status === 'fulfilled' && r.value.success);
    await snap.ref.update({
      status: allSuccess ? 'sent' : 'failed',
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
```

### 3. Настройка Telegram бота

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Получите токен бота
3. Добавьте токен в переменные окружения Cloud Functions:
   ```bash
   firebase functions:config:set telegram.bot_token="YOUR_BOT_TOKEN"
   ```

### 4. Индексы Firestore

Создайте индексы для эффективных запросов:

```json
{
  "indexes": [
    {
      "collectionGroup": "scheduled_notifications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "triggerDate", "order": "ASCENDING" }
      ]
    }
  ]
}
```

## Преимущества подхода

1. ✅ Единый канал коммуникации (Telegram)
2. ✅ Не нужно настраивать push-уведомления для iOS/Android
3. ✅ Работает даже если приложение закрыто
4. ✅ Можно добавить кнопки действий в сообщениях
5. ✅ Централизованное управление уведомлениями через Firestore

## Следующие шаги

1. Создать Telegram бота
2. Настроить Cloud Functions
3. Протестировать отправку уведомлений
4. (Опционально) Добавить кнопки действий в сообщениях
5. (Опционально) Добавить настройки уведомлений в приложении

