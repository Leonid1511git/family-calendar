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
          console.error('Sync item failed:', error);
          // Update retry count
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

  private async syncEvent(
    operation: string, 
    recordId: string, 
    data: any
  ) {
    const eventData = {
      ...data,
      startDate: toTimestamp(data.startDate),
      endDate: toTimestamp(data.endDate),
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

  // Pull changes from Firestore (не воскрешаем локально удалённые события)
  public async pullChanges(groupId: string, remoteEvents: any[]) {
    const allEvents = await eventsStorage.getAll();
    const localEventsInGroup = allEvents.filter(e => e.groupId === groupId);
    const localEventsNonDeleted = localEventsInGroup.filter(e => !e.isDeleted);

    for (const remoteEvent of remoteEvents) {
      const existingEvent = localEventsInGroup.find(e => e.remoteId === remoteEvent.id);
      if (existingEvent?.isDeleted) {
        // Локально удалённое — не перезаписываем, удаление имеет приоритет
        continue;
      }
      const existingNonDeleted = localEventsNonDeleted.find(e => e.remoteId === remoteEvent.id);

      if (existingNonDeleted) {
        // Update existing
        const remoteUpdatedAt = remoteEvent.updatedAt?.toMillis?.() || remoteEvent.updatedAt || 0;
        const localUpdatedAt = existingNonDeleted.updatedAt.getTime();
        if (remoteUpdatedAt > localUpdatedAt) {
          await eventsStorage.update(existingNonDeleted.id, {
            title: remoteEvent.title,
            description: remoteEvent.description || undefined,
            startDate: new Date(remoteEvent.startDate?.toMillis?.() || remoteEvent.startDate),
            endDate: new Date(remoteEvent.endDate?.toMillis?.() || remoteEvent.endDate),
            allDay: remoteEvent.allDay,
            location: remoteEvent.location || undefined,
            color: remoteEvent.color as EventColor,
            type: remoteEvent.type,
            recurrence: remoteEvent.recurrenceRule ? JSON.parse(remoteEvent.recurrenceRule) : undefined,
            isDeleted: remoteEvent.isDeleted || false,
            isSynced: true,
            updatedAt: new Date(remoteUpdatedAt),
          });
        }
      } else if (!existingEvent) {
        // Create new
        const now = new Date();
        const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const newEvent = {
          id: eventId,
          title: remoteEvent.title,
          description: remoteEvent.description || undefined,
          startDate: new Date(remoteEvent.startDate?.toMillis?.() || remoteEvent.startDate),
          endDate: new Date(remoteEvent.endDate?.toMillis?.() || remoteEvent.endDate),
          allDay: remoteEvent.allDay,
          location: remoteEvent.location || undefined,
          color: remoteEvent.color as EventColor,
          participants: remoteEvent.participants || [],
          type: remoteEvent.type,
          recurrence: remoteEvent.recurrenceRule ? JSON.parse(remoteEvent.recurrenceRule) : undefined,
          groupId: remoteEvent.groupId,
          createdBy: remoteEvent.createdBy,
          createdAt: new Date(remoteEvent.createdAt?.toMillis?.() || remoteEvent.createdAt || now),
          updatedAt: new Date(remoteEvent.updatedAt?.toMillis?.() || remoteEvent.updatedAt || now),
          isDeleted: remoteEvent.isDeleted || false,
          isSynced: true,
          remoteId: remoteEvent.id,
        };

        await eventsStorage.add(newEvent as any);
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
