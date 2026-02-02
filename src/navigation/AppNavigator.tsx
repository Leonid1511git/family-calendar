import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { CalendarPageLoader } from '../components';

// Screens
import AuthScreen from '../screens/AuthScreen';
import AuthCallbackScreen from '../screens/AuthCallbackScreen';
import CalendarScreen from '../screens/CalendarScreen';
import EventsListScreen from '../screens/EventsListScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CreateEventScreen from '../screens/CreateEventScreen';
import EventDetailsScreen from '../screens/EventDetailsScreen';
import EditEventScreen from '../screens/EditEventScreen';

import { RootStackParamList, MainTabParamList } from '../types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const CalendarStack = createNativeStackNavigator();

function CalendarStackNavigator() {
  const { colors } = useTheme();

  return (
    <CalendarStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          color: colors.text,
        },
      }}
    >
      <CalendarStack.Screen
        name="CalendarMain"
        component={CalendarScreen}
        options={{ title: 'Календарь' }}
      />
      <CalendarStack.Screen
        name="CreateEvent"
        component={CreateEventScreen}
        options={{ title: 'Новое событие' }}
      />
      <CalendarStack.Screen
        name="EventDetails"
        component={EventDetailsScreen}
        options={{ title: 'Событие' }}
      />
      <CalendarStack.Screen
        name="EditEvent"
        component={EditEventScreen}
        options={{ title: 'Редактировать событие' }}
      />
    </CalendarStack.Navigator>
  );
}

function MainTabNavigator() {
  const { colors } = useTheme();

  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'calendar';

          if (route.name === 'Calendar') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Events') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        headerShown: false,
      })}
    >
      <MainTab.Screen
        name="Calendar"
        component={CalendarStackNavigator}
        options={{ title: 'Календарь' }}
      />
      <MainTab.Screen
        name="Events"
        component={EventsListScreen}
        options={{ title: 'События' }}
      />
      <MainTab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Настройки' }}
      />
    </MainTab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.loaderScreen, { backgroundColor: colors.background }]}>
        <CalendarPageLoader />
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <RootStack.Screen name="Auth" component={AuthScreen} />
          <RootStack.Screen
            name="AuthCallback"
            component={AuthCallbackScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : (
        <RootStack.Screen name="Main" component={MainTabNavigator} />
      )}
    </RootStack.Navigator>
  );
}

const styles = StyleSheet.create({
  loaderScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
