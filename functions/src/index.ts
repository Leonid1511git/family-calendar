import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import axios from 'axios';
import { parseTelegramMessage, formatEventMessage } from './utils/telegramParser';

// Инициализация Firebase Admin
admin.initializeApp();

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
 * Получает токен бота
 * 
 * ВАЖНО: Для production используйте Firebase Secrets (требует Blaze план):
 * firebase functions:secrets:set TELEGRAM_BOT_TOKEN
 * 
 * Для MVP временно используем хардкод (НЕ БЕЗОПАСНО для production!)
 */
function getBotToken(): string {
  // Сначала пытаемся получить из переменных окружения (Firebase Secrets)
  const envToken = process.env.TELEGRAM_BOT_TOKEN;
  if (envToken) {
    return envToken;
  }
  
  // Временное решение для MVP (хардкод токена)
  // TODO: Перейти на Firebase Secrets после обновления до Blaze плана
  const hardcodedToken = '8505904119:AAFh3Usvvaa78XuNVTaSqLEz3-YHhhE95s4';
  
  console.warn('⚠️  WARNING: Using hardcoded bot token. For production, use Firebase Secrets!');
  
  return hardcodedToken;
}

/**
 * Проверяет подпись данных Telegram Login Widget.
 * data_check_string = все поля кроме hash, отсортированные по ключу, key=value через \n.
 * secret_key = SHA256(bot_token), expected_hash = HMAC-SHA256(data_check_string, secret_key).
 */
function verifyTelegramAuthHash(params: {
  id: string;
  hash: string;
  auth_date: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}): boolean {
  const botToken = getBotToken();
  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const sortedKeys = Object.keys(params)
    .filter((k) => k !== 'hash')
    .sort();
  const dataCheckString = sortedKeys
    .map((k) => `${k}=${(params as Record<string, string>)[k]}`)
    .join('\n');
  const expectedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
  return expectedHash === params.hash;
}

/** Фиксированный id дефолтной группы «Семья». Все новые пользователи попадают в неё. В будущих версиях — создание своей группы и приглашения. */
const DEFAULT_GROUP_ID = 'default-family';

/**
 * Возвращает custom token для входа через Firebase Auth и создаёт/обновляет пользователя в Firestore.
 * Вызывается из приложения после успешного Telegram Login; верифицирует hash и пишет в users (admin SDK).
 * Все новые пользователи добавляются в одну дефолтную группу «Семья» (id: default-family).
 * Бот потом ищет пользователя по telegramId в коллекции users.
 */
export const getTelegramCustomToken = functions.https.onCall(async (data, context) => {
  try {
    const {
      id,
      hash,
      auth_date,
      first_name,
      last_name,
      username,
      photo_url,
    } = data as {
      id: string;
      hash: string;
      auth_date: string;
      first_name?: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
    };

    if (!id || !hash || !auth_date) {
      throw new functions.https.HttpsError('invalid-argument', 'id, hash and auth_date are required');
    }

    const params = {
      id,
      hash,
      auth_date,
      ...(first_name !== undefined && { first_name }),
      ...(last_name !== undefined && { last_name }),
      ...(username !== undefined && { username }),
      ...(photo_url !== undefined && { photo_url }),
    };

    if (!verifyTelegramAuthHash(params)) {
      throw new functions.https.HttpsError('unauthenticated', 'Invalid Telegram auth hash');
    }

    const telegramId = String(id);
    const firebaseUid = `tg_${telegramId}`;
    const db = admin.firestore();

    const userRef = db.collection('users').doc(firebaseUid);
    const userSnap = await userRef.get();

    const now = admin.firestore.Timestamp.now();
    // Firestore не принимает undefined — включаем только заданные поля
    const userData: Record<string, unknown> = {
      telegramId,
      firstName: first_name || 'Пользователь',
      updatedAt: now,
    };
    if (last_name != null && last_name !== '') userData.lastName = last_name;
    if (username != null && username !== '') userData.username = username;
    if (photo_url != null && photo_url !== '') userData.avatarUrl = photo_url;

    let currentGroupId: string;
    let role: string;

    if (!userSnap.exists) {
      // Новый пользователь — добавляем в дефолтную группу «Семья» (одна на всех в текущей версии)
      const defaultGroupRef = db.collection('groups').doc(DEFAULT_GROUP_ID);
      const defaultGroupSnap = await defaultGroupRef.get();

      if (!defaultGroupSnap.exists) {
        await defaultGroupRef.set({
          name: 'Семья',
          createdBy: firebaseUid,
          createdAt: now,
          updatedAt: now,
          isDefault: true,
        });
        await defaultGroupRef.collection('members').doc(firebaseUid).set({
          role: 'admin',
          joinedAt: now,
        });
        role = 'admin';
      } else {
        await defaultGroupRef.collection('members').doc(firebaseUid).set({
          role: 'member',
          joinedAt: now,
        });
        role = 'member';
      }

      currentGroupId = DEFAULT_GROUP_ID;
      await userRef.set({
        ...userData,
        currentGroupId,
        role,
        createdAt: now,
      });
    } else {
      const existing = userSnap.data();
      currentGroupId = (existing?.currentGroupId as string) || DEFAULT_GROUP_ID;
      role = (existing?.role as string) || 'member';
      await userRef.update(userData);
    }

    const customToken = await admin.auth().createCustomToken(firebaseUid);

    return {
      customToken,
      user: {
        id: firebaseUid,
        telegramId,
        firstName: userData.firstName,
        lastName: userData.lastName,
        username: userData.username,
        avatarUrl: userData.avatarUrl,
        currentGroupId,
        role,
      },
    };
  } catch (err: unknown) {
    if (err instanceof functions.https.HttpsError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error('getTelegramCustomToken error:', err);
    throw new functions.https.HttpsError('internal', message);
  }
});

/**
 * Webhook для обработки сообщений от Telegram
 */
// Для использования Firebase Secrets раскомментируйте строку ниже и закомментируйте следующую
// export const telegramWebhook = functions.runWith({
//   secrets: ['TELEGRAM_BOT_TOKEN'],
// }).https.onRequest(async (req, res) => {

// Временная версия без Secrets (для MVP без Blaze плана)
export const telegramWebhook = functions.https.onRequest(async (req, res) => {
  const t0 = Date.now();
  res.status(200).send('OK');

  const body = req.body as Record<string, unknown> | undefined;

  // Прогрев: по запросу с warmup: true делаем одно обращение к Firestore и выходим (для cron/scheduler).
  if (body?.warmup === true) {
    try {
      const db = admin.firestore();
      await db.collection('users').doc('_warmup_').get();
      console.log(`[warmup] Firestore touched in ${Date.now() - t0}ms`);
    } catch (_) {
      // игнорируем ошибки прогрева
    }
    return;
  }

  const update: TelegramUpdate = req.body;

  console.log(`[timing] request received at +${Date.now() - t0}ms`);

  if (!update.message || !update.message.text) {
    console.log('No message or text in update, skipping');
    return;
  }

  const message = update.message;
  const telegramUserId = message.from.id.toString();
  const text = message.text?.trim();
  
  console.log(`Processing message from user ${telegramUserId}: "${text}"`);
  
  // Проверка, что текст существует (уже проверено выше, но для TypeScript)
  if (!text) {
    console.log('Text is empty after trim, skipping');
    return;
  }

  // Обрабатываем команды (начинаются с /)
  if (text.startsWith('/')) {
    console.log(`Processing command: ${text}`);
    if (text === '/start' || text === '/help') {
      console.log('Sending help message');
      await sendTelegramMessage(
        message.chat.id,
        '👋 Привет! Я помогу создать событие в календаре.\n\n' +
        'Просто напишите событие в естественном языке:\n' +
        '• Баня 15го в 18\n' +
        '• Театр суббота 19:00\n' +
        '• ДР Игоря завтра в 15\n' +
        '• Командировка с 21 по 15 февраля'
      );
      console.log('Help message sent');
    }
    return;
  }

  try {
    console.log(`[timing] start parsing +${Date.now() - t0}ms`);
    const eventData = parseTelegramMessage(text);
    console.log(`[timing] parsed +${Date.now() - t0}ms`, eventData ? 'ok' : 'null');

    if (!eventData) {
      console.log('Failed to parse event data');
      await sendTelegramMessage(
        message.chat.id,
        '❌ Не удалось распознать событие. Попробуйте еще раз.\n\n' +
        'Примеры:\n' +
        '• Баня 15го в 18\n' +
        '• Театр суббота 19:00'
      );
      return;
    }

    // Находим пользователя: быстрый путь — документ users с id = tg_{telegramId} (создаётся при входе через Telegram)
    const db = admin.firestore();
    const userDocId = `tg_${telegramUserId}`;
    const tBeforeUser = Date.now();
    const userSnap = await db.collection('users').doc(userDocId).get();
    console.log(`[timing] user doc get took ${Date.now() - tBeforeUser}ms (total +${Date.now() - t0}ms)`);

    if (!userSnap.exists) {
      console.log('User not found (no doc tg_...), sending error message');
      await sendTelegramMessage(
        message.chat.id,
        '❌ Пользователь не найден.\n\n' +
        'Пожалуйста, сначала войдите в приложение и авторизуйтесь через Telegram.'
      );
      return;
    }

    console.log(`[timing] user found +${Date.now() - t0}ms`);
    const userData = userSnap.data()!;
    const userId = userSnap.id;
    const groupId = userData.currentGroupId || userData.groupId;

    if (!groupId) {
      await sendTelegramMessage(
        message.chat.id,
        '❌ Группа не найдена.\n\n' +
        'Пожалуйста, создайте группу в приложении.'
      );
      return;
    }

    // Chrono в Cloud Functions (UTC) парсит "21" как 21:00 UTC. Пользователь имел в виду 21:00 по своему времени.
    // timezoneOffsetMinutes: смещение пользователя в минутах (Москва UTC+3 = 180). Вычитаем, чтобы получить UTC.
    const timezoneOffsetMinutes = (userData.timezoneOffsetMinutes as number | undefined) ?? 180;
    const offsetMs = timezoneOffsetMinutes * 60 * 1000;
    eventData.startDate = new Date(eventData.startDate.getTime() - offsetMs);
    eventData.endDate = new Date(eventData.endDate.getTime() - offsetMs);

    // Создаем событие
    const eventRef = db.collection('events').doc();
    const eventId = eventRef.id;

    const event: Record<string, unknown> = {
      id: eventId,
      title: eventData.title,
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
    if (eventData.description != null && eventData.description !== '') {
      event.description = eventData.description;
    }

    try {
      await eventRef.set(event);
      console.log(`[timing] event written +${Date.now() - t0}ms`);
    } catch (err: any) {
      console.error('Step: eventRef.set failed', err?.message || err);
      throw err;
    }

    // Планируем уведомление (не блокируем подтверждение при ошибке)
    if (!eventData.allDay && eventData.startDate > new Date()) {
      const reminderMinutes = 4320;
      const triggerDate = new Date(eventData.startDate.getTime() - reminderMinutes * 60 * 1000);

      if (triggerDate > new Date()) {
        try {
          const groupMembersSnapshot = await db.collection('groups')
            .doc(groupId)
            .collection('members')
            .get();

          const telegramIds: string[] = [];
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
        } catch (err: any) {
          console.error('Step: scheduled_notifications failed (event already created)', err?.message || err);
        }
      }
    }

    // Отправляем подтверждение: время в отбивке показываем в часовом поясе пользователя (добавляем offset обратно)
    try {
      const displayEventData = {
        ...eventData,
        startDate: new Date(eventData.startDate.getTime() + offsetMs),
        endDate: new Date(eventData.endDate.getTime() + offsetMs),
      };
      const confirmationMessage = `✅ Событие создано!\n\n${formatEventMessage(displayEventData)}`;
      console.log(`[timing] sending confirmation +${Date.now() - t0}ms`);
      await sendTelegramMessage(message.chat.id, confirmationMessage, false);
      console.log(`[timing] done +${Date.now() - t0}ms`);
    } catch (err: any) {
      console.error('Step: sendTelegramMessage confirmation failed', err?.message || err, err?.response?.data);
      throw err;
    }

  } catch (error: any) {
    const errMsg = error?.message ?? String(error);
    const errCode = error?.code ?? error?.response?.data?.description;
    console.error('Error processing Telegram message:', errMsg, errCode, error?.stack);
    await sendTelegramMessage(
      message.chat.id,
      '❌ Произошла ошибка при создании события. Попробуйте еще раз.'
    ).catch(() => {});
  }
});

/**
 * Отправляет сообщение в Telegram.
 * @param useHtml — false для пользовательского текста (название события), чтобы символы <>& не ломали API
 */
async function sendTelegramMessage(chatId: number, text: string, useHtml: boolean = true): Promise<void> {
  try {
    const botToken = getBotToken();
    console.log(`Sending message to chat ${chatId}: ${text.substring(0, 50)}...`);
    const payload: { chat_id: number; text: string; parse_mode?: string } = {
      chat_id: chatId,
      text: text,
    };
    if (useHtml) {
      payload.parse_mode = 'HTML';
    }
    const response = await axios.post(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      payload
    );
    console.log('Message sent successfully:', response.data);
  } catch (error: any) {
    console.error('Error sending Telegram message:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * При создании документа в telegram_notifications отправляем уведомление каждому пользователю в Telegram.
 * Используется для: новое событие, изменение, удаление (из приложения).
 */
export const onTelegramNotificationCreated = functions.firestore
  .document('telegram_notifications/{docId}')
  .onCreate(async (snap, context) => {
    const docId = context.params.docId;
    const data = snap.data();
    const telegramUserIds: string[] = Array.isArray(data?.telegramUserIds) ? data.telegramUserIds : [];
    const title = typeof data?.title === 'string' ? data.title : 'Уведомление';
    const message = typeof data?.message === 'string' ? data.message : '';

    if (telegramUserIds.length === 0) {
      console.log(`[telegram_notifications] ${docId}: no recipients, skip`);
      await snap.ref.update({ status: 'skipped', processedAt: admin.firestore.Timestamp.now() });
      return;
    }

    const fullText = message ? `${title}\n\n${message}` : title;
    let sent = 0;
    const errors: string[] = [];

    for (const uid of telegramUserIds) {
      const chatId = parseInt(uid, 10);
      if (Number.isNaN(chatId)) {
        errors.push(`invalid id: ${uid}`);
        continue;
      }
      try {
        await sendTelegramMessage(chatId, fullText, false);
        sent++;
      } catch (err: any) {
        const msg = err?.response?.data?.description || err?.message || String(err);
        console.error(`[telegram_notifications] ${docId} send to ${chatId} failed:`, msg);
        errors.push(`${chatId}: ${msg}`);
      }
    }

    await snap.ref.update({
      status: sent === telegramUserIds.length ? 'sent' : errors.length === telegramUserIds.length ? 'failed' : 'partial',
      processedAt: admin.firestore.Timestamp.now(),
      sentCount: sent,
      ...(errors.length > 0 && { errors }),
    });
    console.log(`[telegram_notifications] ${docId}: sent ${sent}/${telegramUserIds.length}`);
  });

