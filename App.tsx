import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';

import { ThemeProvider, AuthProvider, EventsProvider } from './src/context';
import { ensureAuthInit, getAuthAsync } from './src/services/firebase';
import AppNavigator from './src/navigation/AppNavigator';
import { useTheme } from './src/context/ThemeContext';

// Minimalist Calendar Icon Component using React Native Views
const CalendarIcon = ({ color = '#007AFF', size = 120 }: { color?: string; size?: number }) => {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: size * 0.7,
        height: size * 0.6,
        borderWidth: 3,
        borderColor: color,
        borderRadius: 8,
        overflow: 'hidden',
      }}>
        {/* Calendar header */}
        <View style={{
          width: '100%',
          height: '25%',
          backgroundColor: color,
          borderTopLeftRadius: 5,
          borderTopRightRadius: 5,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: 'white', marginHorizontal: 4 }} />
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: 'white', marginHorizontal: 4 }} />
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: 'white', marginHorizontal: 4 }} />
        </View>
        
        {/* Calendar grid */}
        <View style={{ flex: 1, position: 'relative' }}>
          {/* Grid lines */}
          <View style={{ position: 'absolute', top: '33%', left: 0, right: 0, height: 2, backgroundColor: color }} />
          <View style={{ position: 'absolute', top: '66%', left: 0, right: 0, height: 2, backgroundColor: color }} />
          <View style={{ position: 'absolute', left: '25%', top: 0, bottom: 0, width: 2, backgroundColor: color }} />
          <View style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, backgroundColor: color }} />
          <View style={{ position: 'absolute', left: '75%', top: 0, bottom: 0, width: 2, backgroundColor: color }} />
          
          {/* Highlighted day */}
          <View style={{
            position: 'absolute',
            left: '25%',
            top: '33%',
            width: '25%',
            height: '33%',
            backgroundColor: color,
            opacity: 0.2,
            borderRadius: 4,
          }} />
        </View>
      </View>
    </View>
  );
};

// Deep linking configuration (exp:// для Expo Go, familycalendar:// для билда)
const linking: any = {
  prefixes: ['familycalendar://', 'exp://', 'https://familycalendar.app'],
  config: {
    screens: {
      AuthCallback: 'auth',
      Main: {
        screens: {
          Calendar: {
            screens: {
              CalendarMain: 'calendar',
              EventDetails: 'event/:eventId',
              CreateEvent: 'event/create',
            },
          },
          Events: 'events',
          Settings: 'settings',
        },
      },
    },
  },
};

function AppContent() {
  const { colors, isDark } = useTheme();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      ensureAuthInit();
      await getAuthAsync();
      await new Promise(resolve => setTimeout(resolve, 300));
      setIsReady(true);
    } catch (error) {
      console.error('Error initializing app:', error);
      setIsReady(true);
    }
  };

  if (!isReady) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <CalendarIcon color={colors.primary} />
        <ActivityIndicator size="large" color={colors.primary} style={styles.loadingIndicator} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Загрузка...
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <EventsProvider>
              <AppContent />
            </EventsProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIndicator: {
    marginTop: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});
