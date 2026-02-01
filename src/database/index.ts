import AsyncStorage from '@react-native-async-storage/async-storage';
import { Event, Group, User } from '../types';

// Storage keys
const EVENTS_KEY = '@events';
const GROUPS_KEY = '@groups';
const USERS_KEY = '@users';
const SYNC_QUEUE_KEY = '@sync_queue';
const NOTIFY_OWN_ACTIONS_KEY = '@notify_own_actions';

// Sync Queue Item interface
export interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: 'event' | 'group' | 'user';
  entityId: string;
  data: any;
  timestamp: Date;
  retryCount: number;
}

// Events Storage
export const eventsStorage = {
  async getAll(): Promise<Event[]> {
    try {
      const data = await AsyncStorage.getItem(EVENTS_KEY);
      if (!data) return [];
      const events = JSON.parse(data);
      return events.map((e: any) => ({
        ...e,
        startDate: new Date(e.startDate),
        endDate: new Date(e.endDate),
        createdAt: new Date(e.createdAt),
        updatedAt: new Date(e.updatedAt),
        recurrence: e.recurrence ? {
          ...e.recurrence,
          endDate: e.recurrence.endDate ? new Date(e.recurrence.endDate) : undefined,
        } : undefined,
      }));
    } catch (error) {
      console.error('Error loading events:', error);
      return [];
    }
  },

  async save(events: Event[]): Promise<void> {
    try {
      await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    } catch (error) {
      console.error('Error saving events:', error);
      throw error;
    }
  },

  async getById(id: string): Promise<Event | null> {
    const events = await this.getAll();
    return events.find(e => e.id === id) || null;
  },

  async add(event: Event): Promise<void> {
    const events = await this.getAll();
    events.push(event);
    await this.save(events);
  },

  async update(id: string, updates: Partial<Event>): Promise<void> {
    const events = await this.getAll();
    const index = events.findIndex(e => e.id === id);
    if (index !== -1) {
      events[index] = { ...events[index], ...updates, updatedAt: new Date() };
      await this.save(events);
    }
  },

  async delete(id: string): Promise<void> {
    const events = await this.getAll();
    const filtered = events.filter(e => e.id !== id);
    await this.save(filtered);
  },
};

// Groups Storage
export const groupsStorage = {
  async getAll(): Promise<Group[]> {
    try {
      const data = await AsyncStorage.getItem(GROUPS_KEY);
      if (!data) return [];
      const groups = JSON.parse(data);
      return groups.map((g: any) => ({
        ...g,
        createdAt: new Date(g.createdAt),
        members: g.members.map((m: any) => ({
          ...m,
          joinedAt: new Date(m.joinedAt),
        })),
      }));
    } catch (error) {
      console.error('Error loading groups:', error);
      return [];
    }
  },

  async save(groups: Group[]): Promise<void> {
    try {
      await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
    } catch (error) {
      console.error('Error saving groups:', error);
      throw error;
    }
  },

  async getById(id: string): Promise<Group | null> {
    const groups = await this.getAll();
    return groups.find(g => g.id === id) || null;
  },

  findById(id: string): Promise<Group | null> {
    return this.getById(id);
  },

  async add(group: Group): Promise<void> {
    const groups = await this.getAll();
    groups.push(group);
    await this.save(groups);
  },

  async update(id: string, updates: Partial<Group>): Promise<void> {
    const groups = await this.getAll();
    const index = groups.findIndex(g => g.id === id);
    if (index !== -1) {
      groups[index] = { ...groups[index], ...updates };
      await this.save(groups);
    }
  },
};

// Users Storage
export const usersStorage = {
  async getAll(): Promise<User[]> {
    try {
      const data = await AsyncStorage.getItem(USERS_KEY);
      if (!data) return [];
      const users = JSON.parse(data);
      return users.map((u: any) => ({
        ...u,
        createdAt: new Date(u.createdAt),
      }));
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  },

  async save(users: User[]): Promise<void> {
    try {
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch (error) {
      console.error('Error saving users:', error);
      throw error;
    }
  },

  async getById(id: string): Promise<User | null> {
    const users = await this.getAll();
    return users.find(u => u.id === id) || null;
  },

  async findByTelegramId(telegramId: string): Promise<User | null> {
    const users = await this.getAll();
    return users.find(u => u.telegramId === telegramId) || null;
  },

  async add(user: User): Promise<void> {
    const users = await this.getAll();
    users.push(user);
    await this.save(users);
  },

  async update(id: string, updates: Partial<User>): Promise<void> {
    const users = await this.getAll();
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      await this.save(users);
    }
  },
};

// Sync Queue Storage
export const syncQueueStorage = {
  async getAll(): Promise<SyncQueueItem[]> {
    try {
      const data = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      if (!data) return [];
      const items = JSON.parse(data);
      return items.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp),
      }));
    } catch (error) {
      console.error('Error loading sync queue:', error);
      return [];
    }
  },

  async save(items: SyncQueueItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving sync queue:', error);
      throw error;
    }
  },

  async add(item: SyncQueueItem): Promise<void> {
    const items = await this.getAll();
    items.push(item);
    await this.save(items);
  },

  async remove(id: string): Promise<void> {
    const items = await this.getAll();
    const filtered = items.filter(item => item.id !== id);
    await this.save(filtered);
  },

  async update(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
    const items = await this.getAll();
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      await this.save(items);
    }
  },
};

// Notification settings (AsyncStorage)
export const settingsStorage = {
  async getNotifyOwnActions(): Promise<boolean> {
    try {
      const v = await AsyncStorage.getItem(NOTIFY_OWN_ACTIONS_KEY);
      if (v === null) return true; // по умолчанию включено для тестирования
      return v === 'true';
    } catch {
      return true;
    }
  },
  async setNotifyOwnActions(value: boolean): Promise<void> {
    await AsyncStorage.setItem(NOTIFY_OWN_ACTIONS_KEY, value ? 'true' : 'false');
  },
};

