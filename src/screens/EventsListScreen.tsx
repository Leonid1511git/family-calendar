import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { format, isToday, isTomorrow, isYesterday, startOfDay, compareDesc } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { useEvents } from '../context/EventsContext';
import { useAuth } from '../context/AuthContext';
import { Spacing, BorderRadius, FontSize, FontWeight, EventColors } from '../constants/theme';
import { Event } from '../types';
import { DEFAULT_PARTICIPANTS } from '../constants/participants';

type FilterType = 'all' | 'upcoming' | 'past';

export default function EventsListScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const { events, getEventsForDateRange } = useEvents();
  const { group } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredEvents = useMemo(() => {
    let result = [...events];

    // Apply filter
    const now = new Date();
    switch (filter) {
      case 'upcoming':
        result = result.filter(e => new Date(e.startDate) >= startOfDay(now));
        break;
      case 'past':
        result = result.filter(e => new Date(e.endDate) < now);
        break;
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(e => 
        e.title.toLowerCase().includes(query) ||
        (e.description?.toLowerCase().includes(query)) ||
        (e.location?.toLowerCase().includes(query))
      );
    }

    // Sort by date (newest first for upcoming, oldest first for past)
    return result.sort((a, b) => {
      const dateA = new Date(a.startDate).getTime();
      const dateB = new Date(b.startDate).getTime();
      return filter === 'past' ? dateB - dateA : dateA - dateB;
    });
  }, [events, filter, searchQuery]);

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Сегодня';
    if (isTomorrow(date)) return 'Завтра';
    if (isYesterday(date)) return 'Вчера';
    return format(date, 'd MMMM yyyy', { locale: ru });
  };

  const navigateToEventDetails = (eventId: string) => {
    navigation.navigate('EventDetails' as never, { eventId } as never);
  };

  const renderEventItem = ({ item: event }: { item: Event }) => {
    const eventColor = isDark ? EventColors[event.color].dark : EventColors[event.color].light;
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    const isPast = endDate < new Date();

    return (
      <TouchableOpacity
        style={[
          styles.eventItem,
          { backgroundColor: colors.surface },
          isPast && { opacity: 0.6 },
        ]}
        onPress={() => navigateToEventDetails(event.id)}
      >
        <View style={[styles.eventColorIndicator, { backgroundColor: eventColor }]} />
        
        <View style={styles.eventDateColumn}>
          <Text style={[styles.eventDay, { color: colors.text }]}>
            {format(startDate, 'd')}
          </Text>
          <Text style={[styles.eventMonth, { color: colors.textSecondary }]}>
            {format(startDate, 'MMM', { locale: ru })}
          </Text>
        </View>

        <View style={styles.eventContent}>
          <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
            {event.title}
          </Text>
          
          {!event.allDay && (
            <Text style={[styles.eventTime, { color: colors.textSecondary }]}>
              {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
            </Text>
          )}
          
          {event.allDay && (
            <Text style={[styles.eventTime, { color: colors.textSecondary }]}>
              Весь день
            </Text>
          )}

          {event.location && (
            <View style={styles.eventLocation}>
              <Ionicons name="location-outline" size={12} color={colors.textTertiary} />
              <Text style={[styles.eventLocationText, { color: colors.textTertiary }]} numberOfLines={1}>
                {event.location}
              </Text>
            </View>
          )}

          {event.participants && event.participants.length > 0 && (
            <View style={styles.eventParticipants}>
              {event.participants.slice(0, 3).map((participant) => (
                <View
                  key={participant.id}
                  style={[
                    styles.participantAvatar,
                    { backgroundColor: participant.color + '20' }
                  ]}
                >
                  <Text style={styles.participantEmoji}>{participant.avatar}</Text>
                </View>
              ))}
              {event.participants.length > 3 && (
                <Text style={[styles.participantMore, { color: colors.textTertiary }]}>
                  +{event.participants.length - 3}
                </Text>
              )}
            </View>
          )}

          {event.type === 'recurring' && (
            <View style={styles.recurringBadge}>
              <Ionicons name="repeat" size={10} color={colors.primary} />
              <Text style={[styles.recurringText, { color: colors.primary }]}>
                Повторяется
              </Text>
            </View>
          )}
        </View>

        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={64} color={colors.textTertiary} />
      <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
        Нет событий
      </Text>
      <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
        {searchQuery 
          ? 'По вашему запросу ничего не найдено'
          : filter === 'upcoming'
          ? 'У вас нет предстоящих событий'
          : filter === 'past'
          ? 'У вас нет прошедших событий'
          : 'Создайте первое событие в календаре'
        }
      </Text>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.md,
    },
    headerTitle: {
      fontSize: FontSize.xxl,
      fontWeight: FontWeight.bold,
      color: colors.text,
      marginBottom: Spacing.xs,
    },
    headerSubtitle: {
      fontSize: FontSize.md,
      color: colors.textSecondary,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      marginHorizontal: Spacing.md,
      marginBottom: Spacing.md,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchIcon: {
      marginRight: Spacing.sm,
    },
    searchInput: {
      flex: 1,
      paddingVertical: Spacing.md,
      fontSize: FontSize.md,
      color: colors.text,
    },
    clearButton: {
      padding: Spacing.xs,
    },
    filterContainer: {
      flexDirection: 'row',
      paddingHorizontal: Spacing.md,
      marginBottom: Spacing.md,
      gap: Spacing.sm,
    },
    filterButton: {
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterButtonText: {
      fontSize: FontSize.sm,
      color: colors.text,
    },
    filterButtonTextActive: {
      color: '#FFFFFF',
      fontWeight: FontWeight.medium,
    },
    list: {
      flex: 1,
      paddingHorizontal: Spacing.md,
    },
    listContent: {
      paddingBottom: Spacing.xl,
    },
    eventItem: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.md,
      overflow: 'hidden',
    },
    eventColorIndicator: {
      width: 4,
      alignSelf: 'stretch',
    },
    eventDateColumn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      minWidth: 60,
    },
    eventDay: {
      fontSize: FontSize.xxl,
      fontWeight: FontWeight.bold,
    },
    eventMonth: {
      fontSize: FontSize.sm,
      textTransform: 'uppercase',
    },
    eventContent: {
      flex: 1,
      paddingVertical: Spacing.md,
      paddingRight: Spacing.md,
    },
    eventTitle: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.medium,
      marginBottom: Spacing.xs,
    },
    eventTime: {
      fontSize: FontSize.sm,
      marginBottom: Spacing.xs,
    },
    eventLocation: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    eventLocationText: {
      fontSize: FontSize.sm,
    },
    recurringBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginTop: Spacing.xs,
    },
    recurringText: {
      fontSize: FontSize.xs,
      fontWeight: FontWeight.medium,
    },
    eventParticipants: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginTop: Spacing.xs,
    },
    participantAvatar: {
      width: 20,
      height: 20,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    participantEmoji: {
      fontSize: 12,
    },
    participantMore: {
      fontSize: FontSize.xs,
      marginLeft: Spacing.xs,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.xxl * 2,
    },
    emptyStateTitle: {
      fontSize: FontSize.xl,
      fontWeight: FontWeight.semibold,
      marginTop: Spacing.lg,
      marginBottom: Spacing.sm,
    },
    emptyStateText: {
      fontSize: FontSize.md,
      textAlign: 'center',
      paddingHorizontal: Spacing.xl,
    },
  });

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>События</Text>
        <Text style={styles.headerSubtitle}>
          {group?.name || 'Все события'} • {filteredEvents.length}
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons 
          name="search" 
          size={20} 
          color={colors.textTertiary}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Поиск событий..."
          placeholderTextColor={colors.textTertiary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        {([
          { key: 'all', label: 'Все' },
          { key: 'upcoming', label: 'Предстоящие' },
          { key: 'past', label: 'Прошедшие' },
        ] as { key: FilterType; label: string }[]).map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.filterButton,
              filter === key && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(key)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === key && styles.filterButtonTextActive,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Events List */}
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={filteredEvents}
        renderItem={renderEventItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
