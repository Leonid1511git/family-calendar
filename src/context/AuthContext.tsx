import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { groupsStorage, usersStorage } from '../database';
import { Group, User } from '../types';
import { signInWithCustomToken, signOut as firebaseSignOut } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { createGroupInFirestore, joinGroupInFirestore, createUserInFirestore, updateUserInFirestore, getGroupFromFirestore, firebaseApp, getAuthAsync, getAuth } from '../services/firebase';
import { parseTelegramAuthUrl, isTelegramAuthCallbackUrl, type TelegramAuthPayload } from '../utils/telegramAuth';

type AuthContextType = {
  user: User | null;
  group: Group | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (userData: Omit<User, 'id' | 'createdAt'>) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  switchGroup: (groupId: string) => Promise<void>;
  /** Последняя полученная по deep link ссылка (для диагностики входа через Telegram) */
  lastRedirectUrl: string | null;
  /** Удалось ли распарсить lastRedirectUrl как callback Telegram */
  lastRedirectParseOk: boolean | null;
  /** Текст последней ошибки входа (Cloud Function / Firebase) */
  lastLoginError: string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = '@family_calendar_user';
const GROUP_STORAGE_KEY = '@family_calendar_group';
const DEFAULT_GROUP_ID = 'default-family-group';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRedirectUrl, setLastRedirectUrl] = useState<string | null>(null);
  const [lastRedirectParseOk, setLastRedirectParseOk] = useState<boolean | null>(null);
  const [lastLoginError, setLastLoginError] = useState<string | null>(null);

  useEffect(() => {
    loadAuthData();
  }, []);

  const loadAuthData = async () => {
    try {
      // Load from AsyncStorage
      const [userJson, groupJson] = await Promise.all([
        AsyncStorage.getItem(USER_STORAGE_KEY),
        AsyncStorage.getItem(GROUP_STORAGE_KEY),
      ]);

      if (userJson) {
        const parsedUser = JSON.parse(userJson);
        setUser({
          ...parsedUser,
          createdAt: new Date(parsedUser.createdAt),
        });
      }

      if (groupJson) {
        const parsedGroup = JSON.parse(groupJson);
        setGroup({
          ...parsedGroup,
          createdAt: new Date(parsedGroup.createdAt),
        });
      }
    } catch (error) {
      console.error('Error loading auth data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /** Используется только в fallback-входе (без hash Telegram). При входе через Telegram группу «Семья» выдаёт Cloud Function (одна на всех — default-family). */
  const createDefaultGroup = async (userId: string): Promise<Group> => {
    try {
      // #region agent log
      __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:63',message:'createDefaultGroup started',data:{userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      // Проверяем, есть ли уже локальная дефолтная группа «Семья»
      const allGroups = await groupsStorage.getAll();
      const existingGroup = allGroups.find(g => g.isDefault && g.name === 'Семья');

      if (existingGroup) {
        // #region agent log
        __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:70',message:'Existing default group found',data:{groupId:existingGroup.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        return existingGroup;
      }

      // #region agent log
      __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:75',message:'Creating new default group',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      // Create default group
      const now = new Date();
      const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const defaultGroup: Group = {
        id: groupId,
        name: 'Семья',
        createdBy: userId,
        createdAt: now,
        members: [],
        isDefault: true,
      };

      await groupsStorage.add(defaultGroup);
      
      // #region agent log
      __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:92',message:'Group added to storage',data:{groupId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      // Try to sync with Firestore (non-blocking)
      createGroupInFirestore({
        name: 'Семья',
        createdBy: userId,
        isDefault: true,
      }).then((remoteGroupId) => {
        // Update group with remote ID
        groupsStorage.update(groupId, { id: remoteGroupId }).catch(err => {
          console.log('Failed to update group with remote ID:', err);
        });
      }).catch((error) => {
        console.log('Firestore sync failed, will retry later:', error);
      });

      // #region agent log
      __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:105',message:'createDefaultGroup completed',data:{groupId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      return defaultGroup;
    } catch (error) {
      // #region agent log
      __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:108',message:'createDefaultGroup error',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      console.error('Error creating default group:', error);
      throw error;
    }
  };

  const login = async (userData: Omit<User, 'id' | 'createdAt'>) => {
    setLastLoginError(null);
    try {
      const payload = userData as TelegramAuthPayload;
      const hasTelegramVerify = payload.hash != null && payload.authDate != null;

      // Вход через Cloud Function: верификация hash и запись пользователя в Firestore (для бота)
      if (hasTelegramVerify) {
        let step = '';
        try {
          step = 'getToken';
          const functions = getFunctions(firebaseApp);
          const getToken = httpsCallable<
            { id: string; hash: string; auth_date: string; first_name?: string; last_name?: string; username?: string; photo_url?: string },
            { customToken: string; user: { id: string; telegramId: string; firstName: string; lastName?: string; username?: string; avatarUrl?: string; currentGroupId: string; role: string } }
          >(functions, 'getTelegramCustomToken');
          const result = await getToken({
            id: payload.telegramId,
            hash: payload.hash,
            auth_date: payload.authDate,
            first_name: payload.firstName,
            last_name: payload.lastName,
            username: payload.username,
            photo_url: payload.avatarUrl,
          });
          const { customToken, user: serverUser } = result.data;
          step = 'getAuthAsync';
          await getAuthAsync();
          step = 'signInWithCustomToken';
          await signInWithCustomToken(getAuth(), customToken);
          const now = new Date();
          const localUser: User = {
            id: serverUser.id,
            telegramId: serverUser.telegramId,
            firstName: serverUser.firstName,
            lastName: serverUser.lastName,
            username: serverUser.username,
            avatarUrl: serverUser.avatarUrl,
            currentGroupId: serverUser.currentGroupId,
            role: (serverUser.role as 'admin' | 'member') || 'admin',
            createdAt: now,
          };
          const existingLocal = await usersStorage.findByTelegramId(localUser.telegramId);
          if (existingLocal) {
            await usersStorage.update(existingLocal.id, localUser);
          } else {
            await usersStorage.add(localUser);
          }
          setUser(localUser);
          await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(localUser));
          const userGroup = await getGroupFromFirestore(localUser.currentGroupId);
          if (userGroup) {
            const groupForApp: Group = {
              id: userGroup.id,
              name: userGroup.name,
              createdBy: userGroup.createdBy,
              createdAt: userGroup.createdAt,
              members: userGroup.members.map((m) => ({ userId: m.userId, role: m.role as 'admin' | 'member', joinedAt: m.joinedAt })),
              isDefault: userGroup.isDefault,
            };
            const existingGroup = await groupsStorage.getById(groupForApp.id);
            if (!existingGroup) await groupsStorage.add(groupForApp);
            setGroup(groupForApp);
            await AsyncStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(groupForApp));
          }
          return;
        } catch (telegramErr: unknown) {
          const stepInfo = step ? ` (at step: ${step})` : '';
          console.error('Login failed' + stepInfo + ':', telegramErr);
          throw telegramErr;
        }
      }

      // #region agent log
      __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:109',message:'login started',data:{telegramId:userData.telegramId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      // Fallback: нет hash от Telegram (офлайн/тест). В продакшене пользователи входят через Telegram и получают дефолтную группу «Семья» из Cloud Function.
      const existingUser = await usersStorage.findByTelegramId(userData.telegramId);
      
      // #region agent log
      __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:115',message:'existingUser check',data:{exists:!!existingUser},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      let localUser: User;
      if (existingUser) {
        // #region agent log
        __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:120',message:'Updating existing user',data:{userId:existingUser.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        
        // Update existing user
        const updatedUser = {
          ...existingUser,
          ...userData,
        };
        await usersStorage.update(existingUser.id, updatedUser);
        localUser = updatedUser;
        
        // Sync user to Firestore (non-blocking) - важно для работы бота!
        updateUserInFirestore(localUser.id, {
          telegramId: localUser.telegramId,
          username: localUser.username,
          firstName: localUser.firstName,
          lastName: localUser.lastName,
          avatarUrl: localUser.avatarUrl,
          currentGroupId: localUser.currentGroupId,
        }).catch((error) => {
          console.log('Firestore user update failed, will retry later:', error);
        });
      } else {
        // #region agent log
        __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:130',message:'Creating new user - creating default group',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        
        // Create new user first (we need userId for group creation)
        const now = new Date();
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create default group
        const defaultGroup = await createDefaultGroup(userId);
        
        // #region agent log
        __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:140',message:'Default group created',data:{groupId:defaultGroup.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        
        localUser = {
          id: userId,
          telegramId: userData.telegramId,
          username: userData.username,
          firstName: userData.firstName,
          lastName: userData.lastName,
          avatarUrl: userData.avatarUrl,
          currentGroupId: defaultGroup.id,
          role: 'admin',
          createdAt: now,
        };

        // #region agent log
        __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:152',message:'Adding user to storage',data:{userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        
        await usersStorage.add(localUser);
        
        // Sync user to Firestore (non-blocking) - важно для работы бота!
        createUserInFirestore({
          id: localUser.id,
          telegramId: localUser.telegramId,
          username: localUser.username,
          firstName: localUser.firstName,
          lastName: localUser.lastName,
          avatarUrl: localUser.avatarUrl,
          currentGroupId: localUser.currentGroupId,
          role: localUser.role,
        }).catch((error) => {
          console.log('Firestore user sync failed, will retry later:', error);
        });
      }

      // #region agent log
      __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:157',message:'Setting user state',data:{userId:localUser.id,groupId:localUser.currentGroupId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      
      setUser(localUser);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(localUser));

      // Load group
      // #region agent log
      __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:163',message:'Loading group',data:{groupId:localUser.currentGroupId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      
      const userGroup = await groupsStorage.findById(localUser.currentGroupId);
      
      // #region agent log
      __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:166',message:'Group loaded',data:{found:!!userGroup},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      
      if (userGroup) {
        setGroup(userGroup);
        await AsyncStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(userGroup));
      } else {
        console.warn('Group not found for user:', localUser.currentGroupId);
      }
      
      // #region agent log
      __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:174',message:'login completed',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
    } catch (error: unknown) {
      const rawMsg = error instanceof Error ? error.message : String(error);
      const isConfigNotFound =
        rawMsg.includes('configuration-not-found') ||
        (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'auth/configuration-not-found');
      const msg = isConfigNotFound
        ? 'Firebase Auth не настроен. В консоли Firebase откройте Authentication → нажмите «Начать» и включите хотя бы один способ входа (например Email/Пароль). Подробнее: FIREBASE_AUTH_CONFIG.md.'
        : rawMsg;
      setLastLoginError(msg);
      // #region agent log
      __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:177',message:'login error',data:{error:rawMsg,isConfigNotFound},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      console.error('Error saving user:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      try {
        await getAuthAsync();
        await firebaseSignOut(getAuth());
      } catch (_) { /* ignore if not signed in */ }
      await AsyncStorage.multiRemove([USER_STORAGE_KEY, GROUP_STORAGE_KEY]);
      setUser(null);
      setGroup(null);
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    try {
      if (!user) return;
      
      const updatedUser = { ...user, ...updates };
      await usersStorage.update(user.id, updatedUser);
      setUser(updatedUser);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const switchGroup = async (groupId: string) => {
    try {
      if (!user) return;

      await updateUser({ currentGroupId: groupId });

      // Load new group
      const userGroup = await groupsStorage.findById(groupId);
      if (userGroup) {
        setGroup(userGroup);
        await AsyncStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(userGroup));
      }
    } catch (error) {
      console.error('Error switching group:', error);
      throw error;
    }
  };

  // Обработка возврата из браузера по deep link (когда вход прошёл во внешнем браузере)
  useEffect(() => {
    const handleUrl = (url: string) => {
      if (!url) return;
      const userData = parseTelegramAuthUrl(url);
      const isCallback = !!userData;
      setLastRedirectUrl(url);
      setLastRedirectParseOk(isCallback);
      if (!isCallback) return;
      if (userData) login(userData).catch((e) => console.error('Deep link login failed:', e));
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    // На Android URL иногда приходит с задержкой — проверяем ещё раз
    const t = setTimeout(() => {
      Linking.getInitialURL().then((url) => {
        if (url) handleUrl(url);
      });
    }, 600);
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => {
      clearTimeout(t);
      sub.remove();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        group,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        updateUser,
        switchGroup,
        lastRedirectUrl,
        lastRedirectParseOk,
        lastLoginError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
