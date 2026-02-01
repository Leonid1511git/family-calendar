import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { eventsStorage, settingsStorage } from '../database';
import { Event, EventColor, RecurrenceRule, ParsedVoiceData, Participant } from '../types';
import { addDays, addWeeks, addMonths, isBefore, isAfter, startOfDay, format } from 'date-fns';
import { syncService } from '../services/syncService';
import { notificationService } from '../services/notificationService';
import { subscribeToGroupEvents } from '../services/firebase';
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
};

const EventsContext = createContext<EventsContextType | undefined>(undefined);

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

  // Reload events when group changes
  useEffect(() => {
    if (group) {
      loadEvents();
    }
  }, [group?.id]);

  // Подписка на события группы в Firestore (события из бота попадают в календарь).
  // Подписываемся на оба id (group.id и user.currentGroupId), если различаются.
  useEffect(() => {
    const ids = [...new Set([group?.id, user?.currentGroupId].filter(Boolean))] as string[];
    if (ids.length === 0) return;

    const unsubscribes = ids.map((groupId) =>
      subscribeToGroupEvents(groupId, (firestoreEvents) => {
        syncService
          .pullChanges(groupId, firestoreEvents)
          .then(() => loadEvents())
          .catch((err) => console.error('Pull/sync events from Firestore failed:', err));
      })
    );

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [group?.id, user?.currentGroupId, loadEvents]);

  const loadEvents = useCallback(async () => {
    try {
      const allEvents = await eventsStorage.getAll();
      // Показываем события и по group.id (локальный), и по user.currentGroupId (Firestore),
      // чтобы не терять локальные события и видеть события от бота.
      const groupIds = [group?.id, user?.currentGroupId].filter(Boolean) as string[];
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

    // Schedule Telegram notification - only if event is in the future
    if (!eventData.allDay && eventData.startDate > new Date()) {
      // Use reminderTime from eventData or default to 4320 (3 days)
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

    // Queue for sync
    await syncService.queueOperation('create', 'events', newEvent.id, {
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
    });

    // Notify group members (Telegram); учитываем настройку «уведомлять о своих действиях»
    if (user && group) {
      const notifyOwnActions = await settingsStorage.getNotifyOwnActions();
      await notificationService.notifyGroupMembers(
        group.id,
        user.id,
        user.firstName,
        eventData.title,
        newEvent.id,
        { senderTelegramId: user.telegramId, notifyOwnActions }
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

    // Notify group members (Telegram) об изменении события — только реально изменившиеся поля
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
      await notificationService.notifyEventUpdated(
        updatedEvent.groupId || group.id,
        user.id,
        user.firstName,
        event.title,
        id,
        { senderTelegramId: user.telegramId, notifyOwnActions, changeDetails: Object.keys(changeDetails).length > 0 ? changeDetails : undefined }
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

    if (event.type === 'recurring' && deleteSeries && event.remoteId) {
      // Delete entire series
      await eventsStorage.update(id, {
        isDeleted: true,
        isSynced: false,
        updatedAt: new Date(),
      });

      await syncService.queueOperation('delete', 'events', id, {
        remoteId: event.remoteId,
      });
    } else {
      // Delete single instance
      await eventsStorage.update(id, {
        isDeleted: true,
        isSynced: false,
        updatedAt: new Date(),
      });

      await syncService.queueOperation('delete', 'events', id, {
        remoteId: event.remoteId,
      });
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

  const getEventsForDate = useCallback(async (date: Date): Promise<Event[]> => {
    const startOfDayTime = startOfDay(date).getTime();
    const endOfDayTime = startOfDayTime + 24 * 60 * 60 * 1000;
    
    const allEvents = await eventsStorage.getAll();
    const groupIds = [group?.id, user?.currentGroupId].filter(Boolean) as string[];
    
    return allEvents
      .filter(event => {
        if (event.isDeleted || (groupIds.length > 0 && !groupIds.includes(event.groupId))) return false;
        const eventStart = event.startDate.getTime();
        return eventStart >= startOfDayTime && eventStart < endOfDayTime;
      });
  }, [user, group]);

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

  const syncPendingChanges = useCallback(async () => {
    await syncService.syncPendingChanges();
    await loadEvents();
  }, []);

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
