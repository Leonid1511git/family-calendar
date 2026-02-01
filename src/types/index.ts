// User types
export interface User {
  id: string;
  telegramId: string;
  username?: string;
  firstName: string;
  lastName?: string;
  avatarUrl?: string;
  /** Текущая группа пользователя. В текущей версии все попадают в дефолтную «Семья»; в будущем — выбор своей группы / приглашения. */
  currentGroupId: string;
  role: 'admin' | 'member';
  createdAt: Date;
}

// Group types (расширяемо: создание своей группы, приглашения — см. GROUPS_ARCHITECTURE.md)
export interface Group {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Date;
  members: GroupMember[];
  isDefault: boolean;
}

export interface GroupMember {
  userId: string;
  role: 'admin' | 'member';
  joinedAt: Date;
}

// Participant types
export interface Participant {
  id: string;
  name: string;
  avatar: string; // Emoji or image URL
  color: string; // Hex color for avatar background
}

// Event types
export type EventType = 'single' | 'recurring';
export type EventColor = 'red' | 'teal' | 'blue' | 'orange' | 'green' | 'yellow' | 'purple' | 'gray';

export interface Event {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location?: string;
  color: EventColor;
  type: EventType;
  createdBy: string;
  groupId: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  remoteId?: string;
  isSynced: boolean;
  
  // Participants (tags)
  participants: Participant[];
  
  // For recurring events
  recurrence?: RecurrenceRule;
  parentEventId?: string;
  
  // Reminder settings
  reminderTime?: ReminderTime;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: Date;
  count?: number;
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc.
}

// Notification types
export type ReminderTime = 15 | 60 | 180 | 720 | 1440 | 4320;

export interface NotificationSettings {
  eventCreated: boolean;
  eventUpdated: boolean;
  eventDeleted: boolean;
  reminders: boolean;
  reminderTime: ReminderTime;
  /** Уведомлять о своих действиях в Telegram (создание/изменение/удаление событий). Для тестирования. */
  notifyOwnActions?: boolean;
}

// Theme types
export type ThemeType = 'light' | 'dark' | 'system';

// Sync types
export type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  AuthCallback: {
    id?: string;
    user_id?: string;
    hash?: string;
    auth_date?: string;
    first_name?: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
  };
  Main: undefined;
};

export type MainTabParamList = {
  Calendar: undefined;
  Events: undefined;
  Settings: undefined;
};

export type CalendarStackParamList = {
  CalendarMain: undefined;
  EventDetails: { eventId: string };
  CreateEvent: { date?: Date; voiceData?: ParsedVoiceData };
  EditEvent: { eventId: string };
};

// Voice input types
export interface ParsedVoiceData {
  title: string;
  startDate?: Date;
  endDate?: Date;
  duration?: number;
}

// Calendar view types
export type CalendarViewMode = 'week' | 'day';
