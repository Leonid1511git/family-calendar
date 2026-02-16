import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Spacing, BorderRadius, FontSize, FontWeight } from '../constants/theme';
import { ThemeType } from '../types';
import { settingsStorage } from '../database';
import { CalendarViewMode } from '../types';

export default function SettingsScreen() {
  const { theme, setTheme, isDark, colors } = useTheme();
  const { user, logout, group } = useAuth();

  const [notifications, setNotifications] = useState({
    eventCreated: true,
    eventUpdated: true,
    eventDeleted: true,
    reminders: true,
  });
  const [notifyOwnActions, setNotifyOwnActions] = useState(true);
  const [reminderTime, setReminderTime] = useState(4320); // 3 days default
  const [defaultCalendarView, setDefaultCalendarView] = useState<CalendarViewMode>('month');

  useEffect(() => {
    settingsStorage.getNotifyOwnActions().then(setNotifyOwnActions);
    settingsStorage.getDefaultCalendarView().then(setDefaultCalendarView);
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Выйти из аккаунта?',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Выйти', 
          style: 'destructive',
          onPress: async () => {
            await logout();
          }
        },
      ]
    );
  };

  const themeOptions: { value: ThemeType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: 'light', label: 'Светлая', icon: 'sunny-outline' },
    { value: 'dark', label: 'Тёмная', icon: 'moon-outline' },
    { value: 'system', label: 'Системная', icon: 'phone-portrait-outline' },
  ];

  const reminderOptions = [
    { value: 15, label: '15 мин' },
    { value: 60, label: '1 час' },
    { value: 180, label: '3 часа' },
    { value: 720, label: '12 часов' },
    { value: 1440, label: '1 день' },
    { value: 4320, label: '3 дня' },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: Spacing.md,
    },
    header: {
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.md,
    },
    headerTitle: {
      fontSize: FontSize.xxl,
      fontWeight: FontWeight.bold,
      color: colors.text,
    },
    section: {
      marginBottom: Spacing.lg,
    },
    sectionHint: {
      fontSize: FontSize.xs,
      marginTop: Spacing.xs,
      marginLeft: Spacing.md,
    },
    sectionTitle: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.medium,
      color: colors.textSecondary,
      marginBottom: Spacing.sm,
      marginLeft: Spacing.md,
      textTransform: 'uppercase',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    profileSection: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
    },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: BorderRadius.round,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.md,
    },
    avatarText: {
      fontSize: FontSize.xxl,
      color: '#FFFFFF',
      fontWeight: FontWeight.bold,
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: FontSize.lg,
      fontWeight: FontWeight.semibold,
      color: colors.text,
      marginBottom: Spacing.xs,
    },
    profileMeta: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingItemLast: {
      borderBottomWidth: 0,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    settingLeftWrap: {
      flex: 1,
      minWidth: 0,
    },
    settingTextBlock: {
      flex: 1,
      minWidth: 0,
    },
    settingIcon: {
      width: 32,
      height: 32,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
    },
    settingText: {
      fontSize: FontSize.md,
      color: colors.text,
    },
    settingValue: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
      marginTop: Spacing.xs,
    },
    themeOptions: {
      flexDirection: 'row',
      padding: Spacing.md,
      gap: Spacing.md,
    },
    themeOption: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
      padding: Spacing.sm,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
      backgroundColor: colors.surfaceVariant,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    themeOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    themeOptionText: {
      fontSize: FontSize.xs,
      color: colors.text,
      marginTop: Spacing.sm,
    },
    themeOptionTextActive: {
      color: colors.primary,
      fontWeight: FontWeight.medium,
    },
    reminderOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: Spacing.md,
      gap: Spacing.sm,
    },
    reminderOption: {
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.surfaceVariant,
      borderWidth: 1,
      borderColor: colors.border,
    },
    reminderOptionActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    reminderOptionText: {
      fontSize: FontSize.sm,
      color: colors.text,
    },
    reminderOptionTextActive: {
      color: '#FFFFFF',
      fontWeight: FontWeight.medium,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.error + '15',
      padding: Spacing.md,
      borderRadius: BorderRadius.lg,
      marginTop: Spacing.lg,
      marginBottom: Spacing.xl,
      gap: Spacing.sm,
    },
    logoutButtonText: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.semibold,
      color: colors.error,
    },
    versionText: {
      textAlign: 'center',
      fontSize: FontSize.sm,
      color: colors.textTertiary,
      marginBottom: Spacing.xl,
    },
  });

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Настройки</Text>
        </View>

        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Профиль</Text>
          <View style={styles.card}>
            <View style={styles.profileSection}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.firstName?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {user?.firstName} {user?.lastName}
                </Text>
                <Text style={styles.profileMeta}>
                  {user?.username ? `@${user.username}` : user?.telegramId}
                </Text>
                <Text style={[styles.profileMeta, { marginTop: Spacing.xs }]}>
                  Группа: {group?.name}
                </Text>
                <Text style={[styles.profileMeta, { marginTop: Spacing.xs, fontSize: 12 }]}>
                  ID группы: {group?.id ?? '—'}
                </Text>
                {user?.currentGroupId && user.currentGroupId !== group?.id && (
                  <Text style={[styles.profileMeta, { marginTop: 2, fontSize: 11, color: colors.warning }]}>
                    currentGroupId: {user.currentGroupId}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Theme Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Тема оформления</Text>
          <View style={styles.themeOptions}>
            {themeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.themeOption,
                  theme === option.value && styles.themeOptionActive,
                ]}
                onPress={() => setTheme(option.value)}
              >
                <Ionicons
                  name={option.icon}
                  size={24}
                  color={theme === option.value ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.themeOptionText,
                    theme === option.value && styles.themeOptionTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Default calendar view */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Календарь</Text>
          <View style={styles.themeOptions}>
            {[
              { value: 'month' as CalendarViewMode, label: 'Месяц', icon: 'calendar' as const },
              { value: 'week' as CalendarViewMode, label: 'Неделя', icon: 'list' as const },
              { value: 'day' as CalendarViewMode, label: 'День', icon: 'time' as const },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.themeOption,
                  defaultCalendarView === option.value && styles.themeOptionActive,
                ]}
                onPress={() => {
                  setDefaultCalendarView(option.value);
                  settingsStorage.setDefaultCalendarView(option.value);
                }}
              >
                <Ionicons
                  name={option.icon}
                  size={24}
                  color={defaultCalendarView === option.value ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.themeOptionText,
                    defaultCalendarView === option.value && styles.themeOptionTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Начальный вид при открытии календаря
          </Text>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Уведомления</Text>
          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                </View>
                <Text style={styles.settingText}>Новые события</Text>
              </View>
              <Switch
                value={notifications.eventCreated}
                onValueChange={(v) => setNotifications(p => ({ ...p, eventCreated: v }))}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                </View>
                <Text style={styles.settingText}>Изменения событий</Text>
              </View>
              <Switch
                value={notifications.eventUpdated}
                onValueChange={(v) => setNotifications(p => ({ ...p, eventUpdated: v }))}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="trash-outline" size={18} color={colors.primary} />
                </View>
                <Text style={styles.settingText}>Удаление событий</Text>
              </View>
              <Switch
                value={notifications.eventDeleted}
                onValueChange={(v) => setNotifications(p => ({ ...p, eventDeleted: v }))}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={styles.settingItem}>
              <View style={[styles.settingLeft, styles.settingLeftWrap]}>
                <View style={styles.settingIcon}>
                  <Ionicons name="person-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.settingTextBlock}>
                  <Text style={styles.settingText}>Уведомлять о своих действиях</Text>
                  <Text style={styles.settingValue} numberOfLines={2}>В Telegram — о создании, изменении и удалении событий</Text>
                </View>
              </View>
              <Switch
                value={notifyOwnActions}
                onValueChange={(v) => {
                  setNotifyOwnActions(v);
                  settingsStorage.setNotifyOwnActions(v);
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={[styles.settingItem, styles.settingItemLast]}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="time-outline" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.settingText}>Напоминания</Text>
                  <Text style={styles.settingValue}>
                    {reminderOptions.find(o => o.value === reminderTime)?.label || 'За 1 час'}
                  </Text>
                </View>
              </View>
              <Switch
                value={notifications.reminders}
                onValueChange={(v) => setNotifications(p => ({ ...p, reminders: v }))}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Reminder Time Options */}
        {notifications.reminders && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Время напоминания</Text>
            <View style={styles.reminderOptions}>
              {reminderOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.reminderOption,
                    reminderTime === option.value && styles.reminderOptionActive,
                  ]}
                  onPress={() => setReminderTime(option.value)}
                >
                  <Text
                    style={[
                      styles.reminderOptionText,
                      reminderTime === option.value && styles.reminderOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>О приложении</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => Linking.openURL('https://t.me/FamilyCalendarApp_bot')}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="logo-telegram" size={18} color={colors.primary} />
                </View>
                <Text style={styles.settingText}>Бот в Telegram</Text>
              </View>
              <Text style={styles.settingValue}>@FamilyCalendarApp_bot</Text>
            </TouchableOpacity>
            <View style={[styles.settingItem, styles.settingItemLast]}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                </View>
                <Text style={styles.settingText}>Версия</Text>
              </View>
              <Text style={styles.settingValue}>1.0.0</Text>
            </View>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutButtonText}>Выйти из аккаунта</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>
          Family Calendar © 2024
        </Text>
      </ScrollView>
    </View>
  );
}
