import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { eventsStorage, settingsStorage } from '../database';
import { Event, EventColor, RecurrenceRule, ParsedVoiceData, Participant } from '../types';
import { addDays, addWeeks, addMonths, isBefore, isAfter, startOfDay, endOfDay, format } from 'date-fns';
import { syncService } from '../services/syncService';
import { notificationService } from '../services/notificationService';
import { subscribeToGroupEvents, getGroupEventsFromFirestore, getAuthAsync } from '../services/firebase';
import { useAuth } from './AuthContext';

type EventsContextType = {
  events: Event[];
  isLoading: boolean;
  syncStatus: import('../services/syncService').SyncStatus;
  addEvent: (eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'isSynced' | 'remoteId'>) => Promise<Event>;
  updateEvent: (id: string, updates: Partial<Event>) => Promise<void>;
  deleteEvent: (id: string, deleteSeries?: boolean) => Promise<void>;
  getEventById: (id: string) => Promise<Event | null>;
  getEventsForDate: (date: Date) => Promise<Event[]>;
  getEventsForDateRange: (startDate: Date, endDate: Date) => Promise<Event[]>;
  syncPendingChanges: () => Promise<void>;
  /** Принудительно стянуть все события группы из Firestore (для восстановления после переустановки). */
  forcePullFromServer: () => Promise<void>;
};

const EventsContext = createContext<EventsContextType | undefined>(undefined);

/** Должен совпадать с AuthContext: одна группа «Семья» на всех. Используется, когда group ещё не в state (например после переустановки на iOS). */
const DEFAULT_GROUP_ID = 'default-family';

const LOG_TAG = '[EventsSync]';

// Generate recurring event instances
function generateRecurringInstances(event: Event, startDate: Date, endDate: Date): Event[] {
  if (!event.recurrence || event.type !== 'recurring') {
    return [event];
  }

  const instances: Event[] = [];
  const { frequency, interval, endDate: recurrenceEnd, count, daysOfWeek } = event.recurrence;
  
  let currentDate = new Date(event.startDate);
  let instanceCount = 0;

  while (true) {
    if (count && instanceCount >= count) break;
    if (recurrenceEnd && isAfter(currentDate, recurrenceEnd)) break;
    if (isAfter(currentDate, endDate)) break;

    if (!isBefore(currentDate, startDate)) {
      if (daysOfWeek && daysOfWeek.length > 0) {
        if (!daysOfWeek.includes(currentDate.getDay())) {
          currentDate = getNextDate(currentDate, frequency, interval);
          continue;
        }
      }

      const duration = event.endDate.getTime() - event.startDate.getTime();
      instances.push({
        ...event,
        id: `${event.id}-instance-${instanceCount}`,
        startDate: new Date(currentDate),
        endDate: new Date(currentDate.getTime() + duration),
        parentEventId: event.id,
      });
    }

    instanceCount++;
    currentDate = getNextDate(currentDate, frequency, interval);
  }

  return instances;
}

function getNextDate(date: Date, frequency: string, interval: number): Date {
  switch (frequency) {
    case 'daily':
      return addDays(date, interval);
    case 'weekly':
      return addWeeks(date, interval);
    case 'monthly':
      return addMonths(date, interval);
    default:
      return addDays(date, interval);
  }
}

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<import('../services/syncService').SyncStatus>('synced');
  const { user, group } = useAuth();

  // loadEvents объявлен до useEffect-ов, которые его используют.
  const loadEvents = useCallback(async () => {
    try {
      const allEvents = await eventsStorage.getAll();
      // Показываем события и по group.id (локальный), и по user.currentGroupId (Firestore).
      // На iOS group может быть null при наличии user — используем DEFAULT_GROUP_ID.
      const fromState = [group?.id, user?.currentGroupId].filter(Boolean) as string[];
      const groupIds = fromState.length > 0 ? fromState : (user ? [DEFAULT_GROUP_ID] : []);
      const filteredEvents = allEvents
        .filter(e => !e.isDeleted && groupIds.length > 0 && groupIds.includes(e.groupId))
        .map(e => ({
          ...e,
          startDate: new Date(e.startDate),
          endDate: new Date(e.endDate),
          createdAt: new Date(e.createdAt),
          updatedAt: new Date(e.updatedAt),
        }));
      setEvents(filteredEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setIsLoading(false);
    }
  }, [group?.id, user?.currentGroupId]);

  useEffect(() => {
    loadEvents();

    // Subscribe to sync status
    const unsubscribe = syncService.subscribe((status) => {
      setSyncStatus(status);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Загрузка событий при появлении группы: сначала подтягиваем из Firestore (восстановление после переустановки),
  // затем подписка на обновления в реальном времени.
  // FIX: ждём готовности Firebase Auth перед Firestore-запросами (iOS race condition).
  // FIX: loadEvents убран из deps — он зависит от тех же group?.id / user?.currentGroupId.
  useEffect(() => {
    const fromState = [group?.id, user?.currentGroupId].filter(Boolean) as string[];
    const ids = [...new Set(fromState.length > 0 ? fromState : (user ? [DEFAULT_GROUP_ID] : []))] as string[];
    if (ids.length === 0) {
      loadEvents();
      return;
    }
    console.log(LOG_TAG, 'Initial pull: groupIds', ids, 'group?.id', group?.id, 'user?.currentGroupId', user?.currentGroupId);

    let cancelled = false;
    const unsubscribeFns: (() => void)[] = [];
    const delays = [0, 2000, 5000];

    const runInitialPull = async () => {
      for (const groupId of ids) {
        if (cancelled) return;
        let success = false;
        for (let attempt = 0; attempt < delays.length; attempt++) {
          if (cancelled) return;
          if (attempt > 0) {
            console.log(LOG_TAG, 'Retry attempt', attempt + 1, 'groupId', groupId);
            await new Promise<void>((r) => setTimeout(r, delays[attempt]));
          }
          try {
            // Ждём готовности Firebase Auth — на iOS Auth инициализируется с задержкой,
            // и Firestore-запросы до этого момента падают с permission-denied.
            const auth = await getAuthAsync();
            console.log(LOG_TAG, 'auth.currentUser uid:', auth.currentUser?.uid ?? 'null — нет Firebase-сессии');
            if (cancelled) return;
            const firestoreEvents = await getGroupEventsFromFirestore(groupId);
            if (cancelled) return;
            console.log(LOG_TAG, 'getGroupEventsFromFirestore ok', groupId, 'count', firestoreEvents?.length ?? 0);
            await syncService.pullChanges(groupId, firestoreEvents);
            if (cancelled) return;
            console.log(LOG_TAG, 'Initial pull done', groupId);
            success = true;
            break;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
            console.warn(LOG_TAG, 'Initial load events failed', { groupId, attempt: attempt + 1, error: msg, code });
          }
        }
        if (!cancelled) await loadEvents();
        if (success) return;
      }
    };
    runInitialPull();

    // Подписки устанавливаем после готовности Auth, чтобы onSnapshot не падал с permission-denied.
    getAuthAsync()
      .then(() => {
        if (cancelled) return;
        const unsubs = ids.map((groupId) =>
          subscribeToGroupEvents(
            groupId,
            (firestoreEvents) => {
              syncService
                .pullChanges(groupId, firestoreEvents)
                .then(() => loadEvents())
                .catch((err) => console.warn(LOG_TAG, 'Subscription pull failed', groupId, err));
            },
            (err) => console.warn(LOG_TAG, 'Subscription error', groupId, err),
          )
        );
        unsubs.forEach((u) => unsubscribeFns.push(u));
      })
      .catch((err) => console.warn(LOG_TAG, 'getAuthAsync failed for subscriptions', err));

    return () => {
      cancelled = true;
      unsubscribeFns.forEach((unsub) => unsub());
    };
  }, [group?.id, user?.currentGroupId]);

  const addEvent = useCallback(async (
    eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'isSynced' | 'remoteId'>
  ): Promise<Event> => {
    const now = new Date();
    const id = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newEvent: Event = {
      id,
      title: eventData.title,
      description: eventData.description,
      startDate: eventData.startDate,
      endDate: eventData.endDate,
      allDay: eventData.allDay,
      location: eventData.location,
      color: eventData.color,
      type: eventData.type,
      recurrence: eventData.recurrence,
      participants: eventData.participants || [],
      reminderTime: eventData.reminderTime,
      groupId: eventData.groupId,
      createdBy: eventData.createdBy,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      isSynced: false,
    };

    await eventsStorage.add(newEvent);
    await loadEvents();

    const syncPayload = {
      title: eventData.title,
      description: eventData.description,
      startDate: eventData.startDate.getTime(),
      endDate: eventData.endDate.getTime(),
      allDay: eventData.allDay,
      location: eventData.location,
      color: eventData.color,
      type: eventData.type,
      recurrence: eventData.recurrence,
      groupId: eventData.groupId,
      createdBy: eventData.createdBy,
      isDeleted: false,
    };

    // Сначала пробуем сразу записать в Firestore (при наличии сети)
    const remoteId = await syncService.createEventImmediate(newEvent.id, syncPayload);
    if (remoteId == null) {
      // Не получилось — кладём в очередь на повтор
      await syncService.queueOperation('create', 'events', newEvent.id, syncPayload);
    }

    // Schedule Telegram notification - only if event is in the future
    if (!eventData.allDay && eventData.startDate > new Date()) {
      const reminderMinutes = eventData.reminderTime || 4320;
      const triggerDate = new Date(eventData.startDate.getTime() - reminderMinutes * 60 * 1000);
      if (triggerDate > new Date()) {
        const eventGroupId = eventData.groupId || group?.id || user?.currentGroupId || '';
        if (eventGroupId) {
          await notificationService.scheduleEventReminder(
            newEvent.id,
            eventData.title,
            eventData.startDate,
            reminderMinutes,
            eventGroupId
          );
        }
      }
    }

    // Notify group members (Telegram); учитываем настройку «уведомлять о своих действиях»
    if (user && group) {
      const notifyOwnActions = await settingsStorage.getNotifyOwnActions();
      const start = eventData.startDate instanceof Date ? eventData.startDate : new Date(eventData.startDate);
      const end = eventData.endDate instanceof Date ? eventData.endDate : new Date(eventData.endDate);
      const eventDateTime = eventData.allDay
        ? format(start, 'dd.MM.yyyy')
        : `${format(start, 'dd.MM.yyyy')}, ${format(start, 'HH:mm')}${start.getTime() !== end.getTime() ? `–${format(end, 'HH:mm')}` : ''}`;
      await notificationService.notifyGroupMembers(
        group.id,
        user.id,
        user.firstName,
        eventData.title,
        newEvent.id,
        { senderTelegramId: user.telegramId, notifyOwnActions, eventDateTime }
      );
    }

    return newEvent;
  }, [user, group]);

  const updateEvent = useCallback(async (id: string, updates: Partial<Event>) => {
    const event = await eventsStorage.getById(id);
    if (!event) return;

    const updatedEvent = {
      ...event,
      ...updates,
      updatedAt: new Date(),
      isSynced: false,
    };

    await eventsStorage.update(id, updatedEvent);
    await loadEvents();

    // Update Telegram notification - only if event is in the future
    if (updates.startDate || updates.title || updates.reminderTime) {
      await notificationService.cancelEventNotifications(id);
      const eventStartDate = updates.startDate || event.startDate;
      if (!updatedEvent.allDay && eventStartDate > new Date()) {
        // Use reminderTime from updates, existing event, or default to 4320 (3 days)
        const reminderMinutes = updates.reminderTime || event.reminderTime || 4320;
        const triggerDate = new Date(eventStartDate.getTime() - reminderMinutes * 60 * 1000);
        if (triggerDate > new Date()) {
          const eventGroupId = updatedEvent.groupId || group?.id || user?.currentGroupId || '';
          if (eventGroupId) {
            await notificationService.scheduleEventReminder(
              id,
              updates.title || event.title,
              eventStartDate,
              reminderMinutes,
              eventGroupId
            );
          }
        }
      }
    }

    // Notify group members (Telegram) об изменении события — только реально изменившиеся поля; дату события показываем всегда
    if (user && group) {
      const notifyOwnActions = await settingsStorage.getNotifyOwnActions();
      const changeDetails: { newTitle?: string; newTime?: string } = {};
      const oldStart = event.startDate instanceof Date ? event.startDate : new Date(event.startDate);
      const oldEnd = event.endDate instanceof Date ? event.endDate : new Date(event.endDate);
      const newStart = updates.startDate ?? updatedEvent.startDate;
      const newEnd = updates.endDate ?? updatedEvent.endDate;
      const titleChanged = updates.title !== undefined && updates.title !== event.title;
      const timeChanged = (updates.startDate !== undefined || updates.endDate !== undefined) &&
        (newStart.getTime() !== oldStart.getTime() || newEnd.getTime() !== oldEnd.getTime());
      if (titleChanged) changeDetails.newTitle = updates.title;
      if (timeChanged) {
        changeDetails.newTime = updatedEvent.allDay
          ? format(newStart, 'dd.MM.yyyy')
          : format(newStart, 'HH:mm');
      }
      const start = updatedEvent.startDate instanceof Date ? updatedEvent.startDate : new Date(updatedEvent.startDate);
      const end = updatedEvent.endDate instanceof Date ? updatedEvent.endDate : new Date(updatedEvent.endDate);
      const eventDateTime = updatedEvent.allDay
        ? format(start, 'dd.MM.yyyy')
        : `${format(start, 'dd.MM.yyyy')}, ${format(start, 'HH:mm')}${start.getTime() !== end.getTime() ? `–${format(end, 'HH:mm')}` : ''}`;
      await notificationService.notifyEventUpdated(
        updatedEvent.groupId || group.id,
        user.id,
        user.firstName,
        event.title,
        id,
        { senderTelegramId: user.telegramId, notifyOwnActions, changeDetails: Object.keys(changeDetails).length > 0 ? changeDetails : undefined, eventDateTime }
      );
    }

    // Queue for sync
    await syncService.queueOperation('update', 'events', id, {
      remoteId: event.remoteId,
      title: updates.title || event.title,
      description: updates.description !== undefined ? updates.description : event.description,
      startDate: (updates.startDate || event.startDate).getTime(),
      endDate: (updates.endDate || event.endDate).getTime(),
      allDay: updates.allDay !== undefined ? updates.allDay : event.allDay,
      location: updates.location !== undefined ? updates.location : event.location,
      color: updates.color || event.color,
      type: updates.type || event.type,
      recurrence: updates.recurrence !== undefined ? updates.recurrence : event.recurrence,
    });
  }, [user, group]);

  const deleteEvent = useCallback(async (id: string, deleteSeries: boolean = false) => {
    const event = await eventsStorage.getById(id);
    if (!event) return;

    // Notify group members (Telegram) об удалении события (с датой и временем)
    if (user && group) {
      const notifyOwnActions = await settingsStorage.getNotifyOwnActions();
      const start = event.startDate instanceof Date ? event.startDate : new Date(event.startDate);
      const end = event.endDate instanceof Date ? event.endDate : new Date(event.endDate);
      const eventDateTime = event.allDay
        ? format(start, 'dd.MM.yyyy')
        : `${format(start, 'dd.MM.yyyy')}, ${format(start, 'HH:mm')}${start.getTime() !== end.getTime() ? `–${format(end, 'HH:mm')}` : ''}`;
      await notificationService.notifyEventDeleted(
        event.groupId || group.id,
        user.id,
        user.firstName,
        event.title,
        id,
        { senderTelegramId: user.telegramId, notifyOwnActions, eventDateTime }
      );
    }

    const queueDelete = () =>
      syncService.queueOperation('delete', 'events', id, { remoteId: event.remoteId });

    if (event.type === 'recurring' && deleteSeries && event.remoteId) {
      await eventsStorage.update(id, {
        isDeleted: true,
        isSynced: false,
        updatedAt: new Date(),
      });
      const deleted = await syncService.deleteEventImmediate(event.remoteId);
      if (!deleted) await queueDelete();
    } else {
      await eventsStorage.update(id, {
        isDeleted: true,
        isSynced: false,
        updatedAt: new Date(),
      });
      if (event.remoteId) {
        const deleted = await syncService.deleteEventImmediate(event.remoteId);
        if (!deleted) await queueDelete();
      }
    }

    // Reload events immediately to update UI
    await loadEvents();

    // Cancel notifications
    await notificationService.cancelEventNotifications(id);
  }, [loadEvents, user, group]);

  const getEventById = useCallback(async (id: string): Promise<Event | null> => {
    try {
      const event = await eventsStorage.getById(id);
      if (!event || event.isDeleted) return null;
      
      return {
        ...event,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate),
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt),
      };
    } catch {
      return null;
    }
  }, []);

  const getEventsForDateRange = useCallback(async (startDate: Date, endDate: Date): Promise<Event[]> => {
    const allEvents = await eventsStorage.getAll();
    const groupIds = [group?.id, user?.currentGroupId].filter(Boolean) as string[];
    const filteredEvents = allEvents.filter(e => !e.isDeleted && groupIds.length > 0 && groupIds.includes(e.groupId));

    const result: Event[] = [];
    
    filteredEvents.forEach((event: Event) => {
      if (event.type === 'recurring' && event.recurrence) {
        const instances = generateRecurringInstances(event, startDate, endDate);
        result.push(...instances);
      } else {
        const eventStart = new Date(event.startDate);
        if (eventStart >= startDate && eventStart <= endDate) {
          result.push(event);
        }
      }
    });

    return result.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [user, group]);

  const getEventsForDate = useCallback(async (date: Date): Promise<Event[]> => {
    return getEventsForDateRange(startOfDay(date), endOfDay(date));
  }, [getEventsForDateRange]);

  const syncPendingChanges = useCallback(async () => {
    await syncService.syncPendingChanges();
    await loadEvents();
  }, []);

  const forcePullFromServer = useCallback(async () => {
    const fromState = [group?.id, user?.currentGroupId].filter(Boolean) as string[];
    const ids = [...new Set(fromState.length > 0 ? fromState : (user ? [DEFAULT_GROUP_ID] : []))] as string[];
    if (ids.length === 0) {
      console.warn(LOG_TAG, 'forcePullFromServer: no group ids, user?', !!user);
      return;
    }
    console.log(LOG_TAG, 'forcePullFromServer start', ids);
    await getAuthAsync();
    for (const groupId of ids) {
      const maxAttempts = 3;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          if (attempt > 0) {
            await new Promise((r) => setTimeout(r, 1500 * attempt));
          }
          const firestoreEvents = await getGroupEventsFromFirestore(groupId);
          console.log(LOG_TAG, 'forcePull getGroupEventsFromFirestore', groupId, 'count', firestoreEvents?.length ?? 0);
          await syncService.pullChanges(groupId, firestoreEvents);
          await loadEvents();
          console.log(LOG_TAG, 'forcePullFromServer done', groupId);
          return;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(LOG_TAG, 'forcePull failed', { groupId, attempt: attempt + 1, error: msg });
          if (attempt === maxAttempts - 1) throw err;
        }
      }
    }
  }, [group?.id, user?.currentGroupId, loadEvents]);

  return (
    <EventsContext.Provider
      value={{
        events,
        isLoading,
        syncStatus,
        addEvent,
        updateEvent,
        deleteEvent,
        getEventById,
        getEventsForDate,
        getEventsForDateRange,
        syncPendingChanges,
        forcePullFromServer,
      }}
    >
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventsContext);
  if (context === undefined) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return context;
}
