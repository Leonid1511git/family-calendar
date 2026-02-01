/**
 * Простой HTTP сервер для локального запуска Telegram webhook
 * Используйте с ngrok для тестирования
 */

const express = require('express');
const admin = require('firebase-admin');
const axios = require('axios');
const { parseTelegramMessage, formatEventMessage } = require('./lib/utils/telegramParser');

// Инициализация Firebase Admin
const serviceAccount = require('../serviceAccountKey.json'); // Нужно скачать из Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
app.use(express.json());

const BOT_TOKEN = '8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4';

// Webhook endpoint
app.post('/telegramWebhook', async (req, res) => {
  res.status(200).send('OK');

  const update = req.body;

  if (!update.message || !update.message.text) {
    return;
  }

  const message = update.message;
  const telegramUserId = message.from.id.toString();
  const text = message.text?.trim();

  if (!text) {
    return;
  }

  // Игнорируем команды (начинаются с /)
  if (text.startsWith('/')) {
    if (text === '/start' || text === '/help') {
      await sendTelegramMessage(
        message.chat.id,
        '👋 Привет! Я помогу создать событие в календаре.\n\n' +
        'Просто напишите событие в естественном языке:\n' +
        '• Баня 15го в 18\n' +
        '• Театр суббота 19:00\n' +
        '• ДР Игоря завтра в 15\n' +
        '• Командировка с 21 по 15 февраля'
      );
    }
    return;
  }

  try {
    // Парсим сообщение
    const eventData = parseTelegramMessage(text);

    if (!eventData) {
      await sendTelegramMessage(
        message.chat.id,
        '❌ Не удалось распознать событие. Попробуйте еще раз.\n\n' +
        'Примеры:\n' +
        '• Баня 15го в 18\n' +
        '• Театр суббота 19:00'
      );
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
        '❌ Пользователь не найден.\n\n' +
        'Пожалуйста, сначала войдите в приложение и авторизуйтесь через Telegram.'
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
        '❌ Группа не найдена.\n\n' +
        'Пожалуйста, создайте группу в приложении.'
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
      color: 'blue',
      type: 'single',
      createdBy: userId,
      groupId: groupId,
      participants: [],
      reminderTime: 4320,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      isDeleted: false,
      isSynced: true,
      remoteId: eventId,
    };

    await eventRef.set(event);

    // Планируем уведомление
    if (!eventData.allDay && eventData.startDate > new Date()) {
      const reminderMinutes = 4320;
      const triggerDate = new Date(eventData.startDate.getTime() - reminderMinutes * 60 * 1000);

      if (triggerDate > new Date()) {
        const groupMembersSnapshot = await db.collection('groups')
          .doc(groupId)
          .collection('members')
          .get();

        const telegramIds = [];
        for (const memberDoc of groupMembersSnapshot.docs) {
          const memberUserId = memberDoc.id;
          const memberUserDoc = await db.collection('users').doc(memberUserId).get();
          if (memberUserDoc.exists) {
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

async function sendTelegramMessage(chatId, text) {
  try {
    await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Telegram webhook server running on port ${PORT}`);
  console.log(`Use ngrok to expose: ngrok http ${PORT}`);
});


