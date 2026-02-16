import { initializeApp } from '@firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth as getFirebaseAuth, Auth } from '@firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  onSnapshot,
  Timestamp,
  writeBatch,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration для проекта family-calendar-22abd (должен совпадать с Cloud Functions)
const firebaseConfig = {
  apiKey: "AIzaSyA6a57xVlpppr-my0SA--TSLxRk1_T1BeM",
  authDomain: "family-calendar-22abd.firebaseapp.com",
  projectId: "family-calendar-22abd",
  storageBucket: "family-calendar-22abd.firebasestorage.app",
  messagingSenderId: "1066648490877",
  appId: "1:1066648490877:web:911cd2c40158074c8ab214",
};

const app = initializeApp(firebaseConfig);
export const firebaseApp = app;

// В React Native Auth нужно инициализировать с задержкой, иначе "Component auth has not been registered yet".
let _auth: Auth | null = null;
let _authPromise: Promise<Auth> | null = null;

const AUTH_INIT_DELAY_MS = 2500;

function doInitAuth(): Promise<Auth> {
  if (_auth) return Promise.resolve(_auth);
  return new Promise<Auth>((resolve, reject) => {
    setTimeout(() => {
      try {
        _auth = initializeAuth(app, {
          persistence: getReactNativePersistence(ReactNativeAsyncStorage),
        });
        resolve(_auth);
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'auth/already-initialized') {
          _auth = getFirebaseAuth(app);
          resolve(_auth);
        } else {
          reject(err);
        }
      }
    }, AUTH_INIT_DELAY_MS);
  });
}

/** Вызовите при старте приложения (напр. в App.tsx), чтобы к моменту входа Auth был готов. */
export function ensureAuthInit(): void {
  if (!_authPromise) _authPromise = doInitAuth();
}

/** Дождаться готовности Auth, затем вернуть экземпляр. Перед signIn/signOut обязательно await. */
export function getAuthAsync(): Promise<Auth> {
  if (_auth) return Promise.resolve(_auth);
  if (!_authPromise) _authPromise = doInitAuth();
  return _authPromise;
}

export function getAuth(): Auth {
  if (_auth) return _auth;
  throw new Error('Auth not ready. Call await getAuthAsync() before using auth.');
}

export const db = getFirestore(app);

// Collection references
export const groupsRef = collection(db, 'groups');
export const eventsRef = collection(db, 'events');
export const usersRef = collection(db, 'users');

// Helper to convert Date to Firestore Timestamp
export const toTimestamp = (date: Date | number): Timestamp => {
  if (typeof date === 'number') {
    return Timestamp.fromMillis(date);
  }
  return Timestamp.fromDate(date);
};

// Helper to convert Firestore Timestamp to milliseconds
export const fromTimestamp = (timestamp: Timestamp): number => {
  return timestamp.toMillis();
};

// Firestore operations for users
export const createUserInFirestore = async (userData: any) => {
  const userRef = doc(usersRef, userData.id);
  await setDoc(userRef, {
    ...userData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return userRef.id;
};

export const updateUserInFirestore = async (userId: string, userData: any) => {
  const userRef = doc(usersRef, userId);
  await updateDoc(userRef, {
    ...userData,
    updatedAt: Timestamp.now(),
  });
};

// Firestore operations for events
export const createEventInFirestore = async (eventData: any) => {
  const eventRef = doc(eventsRef);
  await setDoc(eventRef, {
    ...eventData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return eventRef.id;
};

export const updateEventInFirestore = async (eventId: string, eventData: any) => {
  const eventRef = doc(db, 'events', eventId);
  await updateDoc(eventRef, {
    ...eventData,
    updatedAt: Timestamp.now(),
  });
};

export const deleteEventFromFirestore = async (eventId: string) => {
  const eventRef = doc(db, 'events', eventId);
  await deleteDoc(eventRef);
};

// Group operations
export const createGroupInFirestore = async (groupData: any) => {
  const groupRef = doc(groupsRef);
  await setDoc(groupRef, {
    ...groupData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return groupRef.id;
};

export const joinGroupInFirestore = async (groupId: string, userId: string, role: string = 'member') => {
  const memberRef = doc(db, 'groups', groupId, 'members', userId);
  await setDoc(memberRef, {
    role,
    joinedAt: Timestamp.now(),
  });
};

export const getGroupMembers = async (groupId: string) => {
  const membersRef = collection(db, 'groups', groupId, 'members');
  const snapshot = await getDocs(membersRef);
  return snapshot.docs.map(doc => ({
    userId: doc.id,
    ...doc.data(),
  }));
};

/** Загружает группу из Firestore по id (для входа через getTelegramCustomToken). */
export const getGroupFromFirestore = async (groupId: string): Promise<{
  id: string;
  name: string;
  createdBy: string;
  createdAt: Date;
  members: { userId: string; role: string; joinedAt: Date }[];
  isDefault: boolean;
} | null> => {
  const groupRef = doc(db, 'groups', groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) return null;
  const data = groupSnap.data();
  const membersRef = collection(db, 'groups', groupId, 'members');
  const membersSnap = await getDocs(membersRef);
  const members = membersSnap.docs.map((d) => {
    const ddata = d.data();
    return {
      userId: d.id,
      role: (ddata.role as string) || 'member',
      joinedAt: ddata.joinedAt?.toMillis ? new Date(ddata.joinedAt.toMillis()) : new Date(),
    };
  });
  return {
    id: groupSnap.id,
    name: (data?.name as string) || 'Семья',
    createdBy: (data?.createdBy as string) || '',
    createdAt: data?.createdAt?.toMillis ? new Date(data.createdAt.toMillis()) : new Date(),
    members,
    isDefault: !!(data?.isDefault),
  };
};

const groupEventsQuery = (groupId: string) => query(
  eventsRef,
  where('groupId', '==', groupId),
  where('isDeleted', '==', false),
  orderBy('startDate', 'asc')
);

/** Загружает все события группы из Firestore (для восстановления после переустановки). */
export const getGroupEventsFromFirestore = async (groupId: string): Promise<any[]> => {
  const snapshot = await getDocs(groupEventsQuery(groupId));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// Subscribe to group events
export const subscribeToGroupEvents = (groupId: string, callback: (events: any[]) => void) => {
  return onSnapshot(groupEventsQuery(groupId), (snapshot) => {
    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(events);
  });
};

// Subscribe to group changes
export const subscribeToGroup = (groupId: string, callback: (group: any) => void) => {
  const groupRef = doc(db, 'groups', groupId);
  return onSnapshot(groupRef, (doc) => {
    if (doc.exists()) {
      callback({
        id: doc.id,
        ...doc.data(),
      });
    }
  });
};

// Telegram notifications collection
export const scheduledNotificationsRef = collection(db, 'scheduled_notifications');

// Schedule a Telegram notification for event reminder
export const scheduleTelegramNotification = async (data: {
  eventId: string;
  eventTitle: string;
  eventDate: Date;
  reminderTime: number; // minutes before event
  triggerDate: Date; // when to send notification
  telegramUserIds: string[]; // array of Telegram user IDs to notify
  groupId: string;
}) => {
  const notificationRef = doc(scheduledNotificationsRef);
  await setDoc(notificationRef, {
    ...data,
    eventDate: toTimestamp(data.eventDate),
    triggerDate: toTimestamp(data.triggerDate),
    status: 'pending',
    createdAt: Timestamp.now(),
  });
  return notificationRef.id;
};

// Cancel scheduled Telegram notifications for an event
export const cancelTelegramNotifications = async (eventId: string) => {
  const q = query(
    scheduledNotificationsRef,
    where('eventId', '==', eventId),
    where('status', '==', 'pending')
  );
  
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      status: 'cancelled',
      updatedAt: Timestamp.now(),
    });
  });
  
  await batch.commit();
};

// Get Telegram user IDs for group members
export const getGroupTelegramIds = async (groupId: string): Promise<string[]> => {
  try {
    const members = await getGroupMembers(groupId);
    const userIds = members.map(m => m.userId);
    
    // Get users' Telegram IDs
    const telegramIds: string[] = [];
    for (const userId of userIds) {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.telegramId) {
          telegramIds.push(userData.telegramId);
        }
      }
    }
    
    return telegramIds;
  } catch (error) {
    console.error('Error getting group Telegram IDs:', error);
    return [];
  }
};

export default app;
