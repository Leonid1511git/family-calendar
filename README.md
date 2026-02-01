# Family Calendar - Семейный календарь v2.0

Мобильное приложение для ведения семейных планов и событий с офлайн-режимом, голосовым вводом и синхронизацией.

## 🚀 Ключевые возможности

### 1. Голосовой ввод
- Нажмите кнопку микрофона и говорите естественно
- Автоматическое распознавание дат и времени через `chrono-node`
- Примеры фраз:
  - "Встреча с клиентом завтра в 15:00"
  - "День рождения мамы 15 марта"
  - "Забрать детей из школы через 2 часа"

### 2. Offline-First
- Все данные хранятся локально в AsyncStorage
- Работа без интернета
- Автоматическая синхронизация при появлении сети
- Индикатор статуса синхронизации в шапке

### 3. Группы и безопасность
- Firestore структура с правами доступа
- Только члены группы видят события
- Роли: admin (может редактировать все) и member (только свои)
- По умолчанию группа "Семья"

### 4. Push-уведомления (FCM)
- Уведомления при создании события другим членом группы
- Напоминания за N времени до события (15 мин - 3 дня)
- Deeplink: тап по пушу открывает конкретное событие

### 5. Календарь
- 3 режима: Месяц / Неделя / День
- Горизонтальный свайп для переключения
- 5 цветов категорий
- Поддержка повторяющихся событий

## 🛠 Технологии

- **React Native + Expo SDK 54**
- **TypeScript**
- **AsyncStorage** - локальное хранилище
- **Firebase Firestore** - облачная синхронизация
- **chrono-node** - парсинг естественных дат
- **expo-speech** - голосовой ввод
- **expo-notifications** - push-уведомления

## 📱 Установка

### 1. Клонирование и установка

```bash
cd family-calendar-v2
npm install
```

### 2. Настройка Firebase

1. Создайте проект в [Firebase Console](https://console.firebase.google.com/)
2. Добавьте Android и iOS приложения
3. Скачайте `google-services.json` (Android) и `GoogleService-Info.plist` (iOS)
4. Поместите файлы в:
   - Android: `android/app/google-services.json` (уже на месте)
   - iOS: `ios/GoogleService-Info.plist`
5. Обновите `firebaseConfig` в `src/services/firebase.ts`

### 3. Настройка Expo

```bash
# Установите Expo CLI
npm install -g expo-cli

# Установите EAS CLI
npm install -g eas-cli

# Войдите в Expo
eas login
```

### 4. Запуск

```bash
# Development mode (с очисткой кэша)
npx expo start --clear

# Android
npm run android

# iOS (требуется macOS + Xcode)
npm run ios
```

**Важно:** При первом запуске или после изменений используйте `npx expo start --clear` для очистки кэша Metro bundler.

## 📦 Сборка

### Preview APK (для тестирования)

```bash
eas build --profile preview --platform android
```

### Production

```bash
# Android
eas build --profile production --platform android

# iOS
eas build --profile production --platform ios
```

## 🗂 Структура проекта

```
src/
├── components/
│   └── voice/
│       └── VoiceInputButton.tsx    # Голосовой ввод с анимацией
├── database/
│   └── index.ts                     # AsyncStorage операции
├── screens/
│   ├── AuthScreen.tsx               # Авторизация
│   ├── CalendarScreen.tsx           # Календарь (месяц/неделя/день)
│   ├── CreateEventScreen.tsx        # Создание события
│   ├── EventDetailsScreen.tsx       # Детали события
│   ├── EventsListScreen.tsx         # Список событий
│   └── SettingsScreen.tsx           # Настройки
├── services/
│   ├── firebase.ts                  # Firestore операции
│   ├── syncService.ts               # Синхронизация
│   └── notificationService.ts       # Push-уведомления
├── context/
│   ├── ThemeContext.tsx             # Темы (light/dark)
│   ├── AuthContext.tsx              # Авторизация
│   └── EventsContext.tsx            # События
├── constants/
│   ├── light.ts                     # Светлая тема
│   └── dark.ts                      # Тёмная тема
└── types/
    └── index.ts                     # TypeScript типы
```

## 🔧 Настройка для Production

### 1. Firebase Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Groups
    match /groups/{groupId} {
      allow read: if request.auth != null && 
        exists(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid));
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        get(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Group members
    match /groups/{groupId}/members/{userId} {
      allow read: if request.auth != null && 
        exists(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid));
      allow write: if request.auth != null && 
        (request.auth.uid == userId || 
         get(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid)).data.role == 'admin');
    }
    
    // Events
    match /events/{eventId} {
      allow read: if request.auth != null && 
        exists(/databases/$(database)/documents/groups/$(resource.data.groupId)/members/$(request.auth.uid));
      allow create: if request.auth != null && 
        exists(/databases/$(database)/documents/groups/$(request.resource.data.groupId)/members/$(request.auth.uid));
      allow update: if request.auth != null && 
        (resource.data.createdBy == request.auth.uid || 
         get(/databases/$(database)/documents/groups/$(resource.data.groupId)/members/$(request.auth.uid)).data.role == 'admin');
      allow delete: if request.auth != null && 
        (resource.data.createdBy == request.auth.uid || 
         get(/databases/$(database)/documents/groups/$(resource.data.groupId)/members/$(request.auth.uid)).data.role == 'admin');
    }
    
    // Users
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 2. Firebase Cloud Functions для Push-уведомлений

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.sendEventNotification = functions.firestore
  .document('events/{eventId}')
  .onCreate(async (snap, context) => {
    const event = snap.data();
    const groupId = event.groupId;
    const creatorId = event.createdBy;
    
    // Get group members
    const membersSnapshot = await admin.firestore()
      .collection('groups')
      .doc(groupId)
      .collection('members')
      .get();
    
    const tokens = [];
    
    for (const memberDoc of membersSnapshot.docs) {
      if (memberDoc.id === creatorId) continue;
      
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(memberDoc.id)
        .get();
      
      if (userDoc.exists && userDoc.data().fcmToken) {
        tokens.push(userDoc.data().fcmToken);
      }
    }
    
    if (tokens.length === 0) return;
    
    // Get creator name
    const creatorDoc = await admin.firestore()
      .collection('users')
      .doc(creatorId)
      .get();
    
    const creatorName = creatorDoc.exists 
      ? creatorDoc.data().firstName 
      : 'Кто-то';
    
    // Send notifications
    const message = {
      notification: {
        title: 'Новое событие',
        body: `${creatorName} добавил: ${event.title}`,
      },
      data: {
        eventId: context.params.eventId,
        groupId: groupId,
        type: 'new_event',
      },
      tokens: tokens,
    };
    
    await admin.messaging().sendMulticast(message);
  });
```

## 📝 Лицензия

MIT
