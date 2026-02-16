import NetInfo from '@react-native-community/netinfo';
import { eventsStorage, syncQueueStorage, SyncQueueItem } from '../database';
import { 
  createEventInFirestore, 
  updateEventInFirestore, 
  deleteEventFromFirestore,
  toTimestamp,
} from './firebase';
import { EventColor } from '../types';

export type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

class SyncService {
  private syncStatus: SyncStatus = 'synced';
  private listeners: ((status: SyncStatus) => void)[] = [];
  private isOnline: boolean = true;
  private unsubscribeNetInfo: (() => void) | null = null;

  constructor() {
    this.initNetworkListener();
  }

  private initNetworkListener() {
    this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      if (!wasOnline && this.isOnline) {
        // Back online - trigger sync
        this.syncPendingChanges();
      }
      
      this.updateStatus(this.isOnline ? this.syncStatus : 'offline');
    });
  }

  private updateStatus(status: SyncStatus) {
    this.syncStatus = status;
    this.listeners.forEach(listener => listener(status));
  }

  public subscribe(listener: (status: SyncStatus) => void) {
    this.listeners.push(listener);
    listener(this.syncStatus);
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public getStatus(): SyncStatus {
    return this.syncStatus;
  }

  public isNetworkOnline(): boolean {
    return this.isOnline;
  }

  /** Сразу пишет событие в Firestore (при создании). Возвращает remoteId или null при ошибке. */
  public async createEventImmediate(recordId: string, data: any): Promise<string | null> {
    if (!this.isOnline) return null;
    try {
      const eventData = {
        ...data,
        startDate: toTimestamp(data.startDate),
        endDate: toTimestamp(data.endDate),
        recurrence: this.serializeRecurrence(data.recurrence),
      };
      const remoteId = await createEventInFirestore(eventData);
      const event = await eventsStorage.getById(recordId);
      if (event) {
        await eventsStorage.update(recordId, { remoteId, isSynced: true });
      }
      return remoteId;
    } catch (err) {
      console.error('createEventImmediate failed:', err);
      return null;
    }
  }

  /** Сразу удаляет событие из Firestore по remoteId. Возвращает true при успехе, false при ошибке. */
  public async deleteEventImmediate(remoteId: string): Promise<boolean> {
    if (!this.isOnline || !remoteId) return false;
    try {
      await deleteEventFromFirestore(remoteId);
      return true;
    } catch (err) {
      console.error('deleteEventImmediate failed:', err);
      return false;
    }
  }

  // Add operation to sync queue
  public async queueOperation(
    operation: 'create' | 'update' | 'delete',
    tableName: string,
    recordId: string,
    data: any
  ) {
    const item: SyncQueueItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: operation,
      entityType: tableName as 'event' | 'group' | 'user',
      entityId: recordId,
      data,
      timestamp: new Date(),
      retryCount: 0,
    };

    await syncQueueStorage.add(item);

    if (this.isOnline) {
      this.syncPendingChanges();
    }
  }

  // Sync pending changes
  public async syncPendingChanges() {
    if (!this.isOnline) {
      this.updateStatus('offline');
      return;
    }

    this.updateStatus('syncing');

    try {
      const pendingItems = await syncQueueStorage.getAll();
      const itemsToSync = pendingItems.filter(item => item.retryCount < 5);

      for (const item of itemsToSync) {
        try {
          await this.processSyncItem(item);
          await syncQueueStorage.remove(item.id);
        } catch (error) {
          console.error('Sync item failed:', item.entityType, item.type, item.entityId, error);
          await syncQueueStorage.update(item.id, { retryCount: item.retryCount + 1 });
        }
      }

      this.updateStatus('synced');
    } catch (error) {
      console.error('Sync failed:', error);
      this.updateStatus('error');
    }
  }

  private async processSyncItem(item: SyncQueueItem) {
    const data = item.data;

    switch (item.entityType) {
      case 'event':
        await this.syncEvent(item.type, item.entityId, data);
        break;
      case 'group':
        await this.syncGroup(item.type, item.entityId, data);
        break;
      case 'user':
        await this.syncUser(item.type, item.entityId, data);
        break;
    }
  }

  /** Сериализует recurrence для Firestore (вложенные Date не поддерживаются). */
  private serializeRecurrence(recurrence: any): any {
    if (recurrence == null) return undefined;
    const out = { ...recurrence };
    if (out.endDate instanceof Date) out.endDate = out.endDate.getTime();
    if (typeof out.endDate === 'object' && out.endDate?.toMillis) out.endDate = out.endDate.toMillis();
    return out;
  }

  private async syncEvent(
    operation: string, 
    recordId: string, 
    data: any
  ) {
    const eventData = {
      ...data,
      startDate: toTimestamp(data.startDate),
      endDate: toTimestamp(data.endDate),
      recurrence: this.serializeRecurrence(data.recurrence),
    };

    switch (operation) {
      case 'create':
        const remoteId = await createEventInFirestore(eventData);
        // Update local record with remote ID
        const event = await eventsStorage.getById(recordId);
        if (event) {
          await eventsStorage.update(recordId, {
            remoteId,
            isSynced: true,
          });
        }
        break;
      case 'update':
        if (data.remoteId) {
          await updateEventInFirestore(data.remoteId, eventData);
          const updatedEvent = await eventsStorage.getById(recordId);
          if (updatedEvent) {
            await eventsStorage.update(recordId, {
              isSynced: true,
            });
          }
        }
        break;
      case 'delete':
        if (data.remoteId) {
          await deleteEventFromFirestore(data.remoteId);
        }
        break;
    }
  }

  private async syncGroup(operation: string, recordId: string, data: any) {
    // Implement group sync logic
    console.log('Syncing group:', operation, recordId);
  }

  private async syncUser(operation: string, recordId: string, data: any) {
    // Implement user sync logic
    console.log('Syncing user:', operation, recordId);
  }

  /** Парсит recurrence из Firestore: хранится как объект (recurrence) или строка (recurrenceRule). */
  private parseRecurrence(remoteEvent: any): any {
    if (remoteEvent.recurrence != null && typeof remoteEvent.recurrence === 'object') {
      return remoteEvent.recurrence;
    }
    if (typeof remoteEvent.recurrenceRule === 'string') {
      try {
        return JSON.parse(remoteEvent.recurrenceRule);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  private toDate(v: any): Date {
    if (v == null) return new Date();
    if (typeof v?.toMillis === 'function') return new Date(v.toMillis());
    if (typeof v === 'number') return new Date(v);
    if (v instanceof Date) return v;
    return new Date(v);
  }

  // Pull changes from Firestore (не воскрешаем локально удалённые события)
  public async pullChanges(groupId: string, remoteEvents: any[]) {
    const allEvents = await eventsStorage.getAll();
    const localEventsInGroup = allEvents.filter(e => e.groupId === groupId);
    const localEventsNonDeleted = localEventsInGroup.filter(e => !e.isDeleted);

    for (const remoteEvent of remoteEvents) {
      try {
        const existingEvent = localEventsInGroup.find(e => e.remoteId === remoteEvent.id);
        if (existingEvent?.isDeleted) {
          continue;
        }
        const existingNonDeleted = localEventsNonDeleted.find(e => e.remoteId === remoteEvent.id);
        const recurrence = this.parseRecurrence(remoteEvent);

        if (existingNonDeleted) {
          const remoteUpdatedAt = this.toDate(remoteEvent.updatedAt).getTime();
          const localUpdatedAt = existingNonDeleted.updatedAt.getTime();
          if (remoteUpdatedAt > localUpdatedAt) {
            await eventsStorage.update(existingNonDeleted.id, {
              title: remoteEvent.title,
              description: remoteEvent.description ?? undefined,
              startDate: this.toDate(remoteEvent.startDate),
              endDate: this.toDate(remoteEvent.endDate),
              allDay: remoteEvent.allDay,
              location: remoteEvent.location ?? undefined,
              color: (remoteEvent.color as EventColor) ?? 'blue',
              type: remoteEvent.type,
              recurrence,
              isDeleted: remoteEvent.isDeleted ?? false,
              isSynced: true,
              updatedAt: new Date(remoteUpdatedAt),
            });
          }
        } else if (!existingEvent) {
          // Может быть только что созданное локально событие, ещё без remoteId (подписка сработала раньше update).
          const remoteStart = this.toDate(remoteEvent.startDate).getTime();
          const recentCutoff = Date.now() - 120000; // 2 минуты
          const localWithoutRemote = localEventsInGroup.find(
            (e) =>
              !e.remoteId &&
              e.startDate.getTime() === remoteStart &&
              e.title === (remoteEvent.title ?? '') &&
              e.createdAt.getTime() >= recentCutoff
          );
          if (localWithoutRemote) {
            await eventsStorage.update(localWithoutRemote.id, {
              remoteId: remoteEvent.id,
              isSynced: true,
              updatedAt: this.toDate(remoteEvent.updatedAt ?? new Date()),
            });
          } else {
            const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const now = new Date();
            const newEvent = {
              id: eventId,
              title: remoteEvent.title ?? '',
              description: remoteEvent.description ?? undefined,
              startDate: this.toDate(remoteEvent.startDate),
              endDate: this.toDate(remoteEvent.endDate),
              allDay: remoteEvent.allDay ?? false,
              location: remoteEvent.location ?? undefined,
              color: (remoteEvent.color as EventColor) ?? 'blue',
              participants: Array.isArray(remoteEvent.participants) ? remoteEvent.participants : [],
              type: remoteEvent.type,
              recurrence,
              groupId: remoteEvent.groupId ?? groupId,
              createdBy: remoteEvent.createdBy ?? '',
              createdAt: this.toDate(remoteEvent.createdAt ?? now),
              updatedAt: this.toDate(remoteEvent.updatedAt ?? now),
              isDeleted: remoteEvent.isDeleted ?? false,
              isSynced: true,
              remoteId: remoteEvent.id,
            };
            await eventsStorage.add(newEvent as any);
          }
        }
      } catch (err) {
        console.warn('pullChanges: skip event', remoteEvent?.id, err);
      }
    }
  }

  public destroy() {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
    }
  }
}

export const syncService = new SyncService();
export default syncService;
