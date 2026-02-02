import {
  db,
  scheduleTelegramNotification,
  cancelTelegramNotifications,
  getGroupTelegramIds,
} from './firebase';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';

export type ReminderTime = 15 | 60 | 180 | 720 | 1440 | 4320; // minutes

export const REMINDER_OPTIONS: { value: ReminderTime; label: string }[] = [
  { value: 15, label: 'За 15 минут' },
  { value: 60, label: 'За 1 час' },
  { value: 180, label: 'За 3 часа' },
  { value: 720, label: 'За 12 часов' },
  { value: 1440, label: 'За 1 день' },
  { value: 4320, label: 'За 3 дня' },
];

class NotificationService {
  // Schedule Telegram notification for event reminder
  async scheduleEventReminder(
    eventId: string,
    eventTitle: string,
    eventDate: Date,
    reminderMinutes: ReminderTime = 60,
    groupId: string,
    telegramUserIds?: string[]
  ): Promise<string | null> {
    const triggerDate = new Date(eventDate.getTime() - reminderMinutes * 60 * 1000);

    if (triggerDate <= new Date()) {
      return null;
    }

    try {
      let userIds = telegramUserIds;
      if (!userIds || userIds.length === 0) {
        userIds = await getGroupTelegramIds(groupId);
      }

      if (userIds.length === 0) {
        return null;
      }

      const notificationId = await scheduleTelegramNotification({
        eventId,
        eventTitle,
        eventDate,
        reminderTime: reminderMinutes,
        triggerDate,
        telegramUserIds: userIds,
        groupId,
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling Telegram reminder:', error);
      return null;
    }
  }

  async cancelEventNotifications(eventId: string) {
    try {
      await cancelTelegramNotifications(eventId);
    } catch (error) {
      console.error('Error cancelling notifications:', error);
    }
  }

  /** options.notifyOwnActions: если false, отправитель не получит уведомление. options.senderTelegramId — Telegram ID отправителя. options.eventDateTime — дата и время события для текста. */
  async notifyGroupMembers(
    groupId: string,
    senderId: string,
    senderName: string,
    eventTitle: string,
    eventId: string,
    options?: { senderTelegramId?: string; notifyOwnActions?: boolean; eventDateTime?: string }
  ) {
    try {
      let telegramIds = await getGroupTelegramIds(groupId);
      if (options?.notifyOwnActions === false && options?.senderTelegramId) {
        telegramIds = telegramIds.filter((id) => id !== options.senderTelegramId);
      }
      if (telegramIds.length === 0) return;

      let message = `${senderName} добавил: ${eventTitle}`;
      if (options?.eventDateTime) message += `\n${options.eventDateTime}`;

      const notificationsRef = collection(db, 'telegram_notifications');
      await setDoc(doc(notificationsRef), {
        telegramUserIds: telegramIds,
        title: 'Новое событие',
        message,
        data: { eventId, groupId, type: 'new_event', senderId },
        createdAt: Timestamp.now(),
        status: 'pending',
      });
    } catch (error) {
      console.error('Error notifying group members via Telegram:', error);
    }
  }

  /** changeDetails: суть изменений для текста уведомления (новое название, новое время). eventDateTime: дата события (всегда показываем). */
  async notifyEventUpdated(
    groupId: string,
    senderId: string,
    senderName: string,
    eventTitle: string,
    eventId: string,
    options?: { senderTelegramId?: string; notifyOwnActions?: boolean; changeDetails?: { newTitle?: string; newTime?: string }; eventDateTime?: string }
  ) {
    try {
      let telegramIds = await getGroupTelegramIds(groupId);
      if (options?.notifyOwnActions === false && options?.senderTelegramId) {
        telegramIds = telegramIds.filter((id) => id !== options.senderTelegramId);
      }
      if (telegramIds.length === 0) return;

      let message = `${senderName} изменил: ${eventTitle}`;
      if (options?.eventDateTime) message += `\nДата: ${options.eventDateTime}`;
      const details = options?.changeDetails;
      if (details?.newTitle) message += `\nНовое название - ${details.newTitle}`;
      if (details?.newTime) message += `\nНовое время - ${details.newTime}`;

      const notificationsRef = collection(db, 'telegram_notifications');
      await setDoc(doc(notificationsRef), {
        telegramUserIds: telegramIds,
        title: 'Событие изменено',
        message,
        data: { eventId, groupId, type: 'event_updated', senderId },
        createdAt: Timestamp.now(),
        status: 'pending',
      });
    } catch (error) {
      console.error('Error notifying event updated via Telegram:', error);
    }
  }

  /** eventDateTime — дата и время удалённого события для текста уведомления. */
  async notifyEventDeleted(
    groupId: string,
    senderId: string,
    senderName: string,
    eventTitle: string,
    eventId: string,
    options?: { senderTelegramId?: string; notifyOwnActions?: boolean; eventDateTime?: string }
  ) {
    try {
      let telegramIds = await getGroupTelegramIds(groupId);
      if (options?.notifyOwnActions === false && options?.senderTelegramId) {
        telegramIds = telegramIds.filter((id) => id !== options.senderTelegramId);
      }
      if (telegramIds.length === 0) return;

      let message = `${senderName} удалил: ${eventTitle}`;
      if (options?.eventDateTime) message += `\nБыло: ${options.eventDateTime}`;

      const notificationsRef = collection(db, 'telegram_notifications');
      await setDoc(doc(notificationsRef), {
        telegramUserIds: telegramIds,
        title: 'Событие удалено',
        message,
        data: { eventId, groupId, type: 'event_deleted', senderId },
        createdAt: Timestamp.now(),
        status: 'pending',
      });
    } catch (error) {
      console.error('Error notifying event deleted via Telegram:', error);
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
