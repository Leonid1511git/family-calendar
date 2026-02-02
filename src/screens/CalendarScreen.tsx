import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
// Month view removed - only week and day views
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, addDays, subDays, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView, PanGestureHandler, ScrollView as GHScrollView } from 'react-native-gesture-handler';

import { useTheme } from '../context/ThemeContext';
import { useEvents } from '../context/EventsContext';
import { useAuth } from '../context/AuthContext';
import { CalendarViewMode } from '../types';
import { DEFAULT_PARTICIPANTS } from '../constants/participants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CalendarScreen() {
  const navigation = useNavigation();
  const { colors, isDark, EventColors, Spacing, BorderRadius, FontSize, FontWeight } = useTheme();
  const { events, getEventsForDate, getEventsForDateRange, syncStatus } = useEvents();
  const { group, user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, 1 = next week, -1 = previous week
  const translateX = useRef(new Animated.Value(0)).current;
  const weekFlatListRef = useRef<FlatList>(null);

  // Get events for the selected date
  const selectedDateEvents = events.filter(event => 
    isSameDay(new Date(event.startDate), selectedDate) && !event.isDeleted
  );

  // Get events for week view - show 3 days initially, but allow scrolling to Sunday
  const today = new Date();
  const todayDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Calculate start day based on week offset
  const baseDate = addWeeks(today, weekOffset);
  const baseDayOfWeek = baseDate.getDay();
  
  // Calculate which 3 days to show initially
  let weekStartDay: Date;
  if (baseDayOfWeek === 0) {
    // Sunday: show пт, сб, вс (Friday, Saturday, Sunday)
    weekStartDay = subDays(baseDate, 2);
  } else if (baseDayOfWeek === 6) {
    // Saturday: show пт, сб, вс (Friday, Saturday, Sunday)
    weekStartDay = subDays(baseDate, 1);
  } else if (baseDayOfWeek === 5) {
    // Friday: show пт, сб, вс (Friday, Saturday, Sunday)
    weekStartDay = baseDate;
  } else {
    // Monday-Thursday: show today and next 2 days
    weekStartDay = baseDate;
  }
  
  // Calculate end day - always Sunday of the week
  const daysUntilSunday = baseDayOfWeek === 0 ? 0 : 7 - baseDayOfWeek;
  const weekEnd = addDays(baseDate, daysUntilSunday);
  
  // Show all days from start to Sunday (but start scroll at the 3-day view)
  const weekDays = eachDayOfInterval({ start: weekStartDay, end: weekEnd });
  
  // Filter events for current week - check if event date is within week range
  const weekEvents = events.filter(event => {
    if (event.isDeleted) return false;
    const eventDate = new Date(event.startDate);
    const eventDay = startOfDay(eventDate);
    const weekStartDayDate = startOfDay(weekStartDay);
    const weekEndDayDate = startOfDay(weekEnd);
    return eventDay >= weekStartDayDate && eventDay <= weekEndDayDate;
  });

  // Get date range text for header
  const getDateRangeText = () => {
    if (viewMode === 'week') {
      // Use the same logic as weekDays calculation
      const baseDateForText = addWeeks(new Date(), weekOffset);
      const baseDayOfWeekForText = baseDateForText.getDay();
      let weekStartDayForText: Date;
      if (baseDayOfWeekForText === 0) {
        weekStartDayForText = subDays(baseDateForText, 2);
      } else if (baseDayOfWeekForText === 6) {
        weekStartDayForText = subDays(baseDateForText, 1);
      } else if (baseDayOfWeekForText === 5) {
        weekStartDayForText = baseDateForText;
      } else {
        weekStartDayForText = baseDateForText;
      }
      // Show range from start to Sunday
      const daysUntilSundayForText = baseDayOfWeekForText === 0 ? 0 : 7 - baseDayOfWeekForText;
      const weekEndForText = addDays(baseDateForText, daysUntilSundayForText);
      return `${format(weekStartDayForText, 'd MMM', { locale: ru })} - ${format(weekEndForText, 'd MMM', { locale: ru })}`;
    } else {
      return format(selectedDate, 'd MMMM yyyy', { locale: ru });
    }
  };

  const navigateToToday = () => {
    setSelectedDate(new Date());
    setWeekOffset(0); // Reset to current week
  };

  const navigateToCreateEvent = () => {
    navigation.navigate('CreateEvent' as never, { date: selectedDate } as never);
  };


  const navigateToEventDetails = (eventId: string) => {
    navigation.navigate('EventDetails' as never, { eventId } as never);
  };

  // Handle swipe gestures
  const handleSwipe = (direction: 'left' | 'right') => {
    if (viewMode === 'week') {
      if (direction === 'left') {
        setWeekOffset(prev => prev + 1); // Next week
      } else {
        setWeekOffset(prev => prev - 1); // Previous week
      }
    } else if (viewMode === 'day') {
      if (direction === 'left') {
        setSelectedDate(addDays(selectedDate, 1));
      } else {
        setSelectedDate(subDays(selectedDate, 1));
      }
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 50;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50) {
          handleSwipe('right');
        } else if (gestureState.dx < -50) {
          handleSwipe('left');
        }
      },
    })
  ).current;

  // Sync status icon
  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'synced':
        return <Ionicons name="cloud-done" size={20} color={colors.success} />;
      case 'syncing':
        return <Ionicons name="cloud-upload" size={20} color={colors.warning} />;
      case 'error':
        return <Ionicons name="cloud-offline" size={20} color={colors.error} />;
      case 'offline':
        return <Ionicons name="cloud-offline" size={20} color={colors.textTertiary} />;
      default:
        return null;
    }
  };

  const renderEventItem = (event: any) => {
    const eventColor = EventColors[event.color];
    const startTime = format(new Date(event.startDate), 'HH:mm');
    const endTime = format(new Date(event.endDate), 'HH:mm');

    return (
      <TouchableOpacity
        key={event.id}
        style={[styles.eventItem, { backgroundColor: colors.surface }]}
        onPress={() => navigateToEventDetails(event.id)}
      >
        <View style={[styles.eventColorIndicator, { backgroundColor: eventColor }]} />
        <View style={styles.eventContent}>
          <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
            {event.title}
          </Text>
          {!event.allDay && (
            <Text style={[styles.eventTime, { color: colors.textSecondary }]}>
              {startTime} - {endTime}
            </Text>
          )}
          {event.allDay && (
            <Text style={[styles.eventTime, { color: colors.textSecondary }]}>
              Весь день
            </Text>
          )}
          {event.participants && event.participants.length > 0 && (
            <View style={styles.eventParticipants}>
              {event.participants.slice(0, 3).map((participant: any) => (
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
        </View>
      </TouchableOpacity>
    );
  };

  // Scroll to start of week on mount or when week changes
  useEffect(() => {
    if (viewMode === 'week' && weekFlatListRef.current) {
      setTimeout(() => {
        weekFlatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      }, 100);
    }
  }, [viewMode, weekOffset]);

  const renderWeekView = () => {
    // Get events for each day
    const getDayEvents = (day: Date) => {
      return events.filter(e => {
        if (e.isDeleted) return false;
        const eventDate = startOfDay(new Date(e.startDate));
        const dayDate = startOfDay(day);
        return eventDate.getTime() === dayDate.getTime();
      });
    };

    // Render event card for week view
    const renderEventCard = (event: any) => {
      const eventColor = EventColors[event.color];
      const startTime = format(new Date(event.startDate), 'HH:mm');
      const endTime = format(new Date(event.endDate), 'HH:mm');

      return (
        <TouchableOpacity
          key={event.id}
          style={[styles.weekEventCard, { backgroundColor: colors.surface, borderLeftColor: eventColor }]}
          onPress={() => navigateToEventDetails(event.id)}
        >
          <Text style={[styles.weekEventTitle, { color: colors.text }]} numberOfLines={1}>
            {event.title}
          </Text>
          {!event.allDay && (
            <Text style={[styles.weekEventTime, { color: colors.textSecondary }]}>
              {startTime} - {endTime}
            </Text>
          )}
          {event.allDay && (
            <Text style={[styles.weekEventTime, { color: colors.textSecondary }]}>
              Весь день
            </Text>
          )}
          {event.participants && event.participants.length > 0 && (
            <View style={styles.weekEventParticipants}>
              {event.participants.slice(0, 3).map((participant: any) => (
                <View
                  key={participant.id}
                  style={[
                    styles.weekParticipantAvatar,
                    { backgroundColor: participant.color + '20' }
                  ]}
                >
                  <Text style={styles.weekParticipantEmoji}>{participant.avatar}</Text>
                </View>
              ))}
              {event.participants.length > 3 && (
                <Text style={[styles.weekParticipantMore, { color: colors.textTertiary }]}>
                  +{event.participants.length - 3}
                </Text>
              )}
            </View>
          )}
        </TouchableOpacity>
      );
    };

    const dayColumnWidth = SCREEN_WIDTH / 3;
    const totalContentWidth = weekDays.length * dayColumnWidth;
    // #region agent log
    __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CalendarScreen.tsx:renderWeekView',message:'week FlatList data',data:{weekDaysLength:weekDays.length,dayColumnWidth,SCREEN_WIDTH,totalContentWidth,canScroll:totalContentWidth>SCREEN_WIDTH},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    const renderDayColumn = ({ item: day, index }: { item: Date; index: number }) => {
      const dayEvents = getDayEvents(day);
      const hasEvents = dayEvents.length > 0;
      return (
        <View style={[styles.weekDayColumn, { width: dayColumnWidth }]}>
          <View style={styles.weekDayHeader}>
            <Text style={[styles.weekDayName, { color: colors.textSecondary }]}>
              {format(day, 'EEE', { locale: ru })}
            </Text>
            <Text style={[styles.weekDayNumber, { color: colors.text }]}>
              {format(day, 'd')}
            </Text>
            <View style={styles.eventDotContainer}>
              {hasEvents && (
                <View style={[styles.eventDot, { backgroundColor: colors.primary }]} />
              )}
            </View>
          </View>
          <GHScrollView
            style={styles.weekDayEvents}
            contentContainerStyle={styles.weekDayEventsContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            horizontal={false}
          >
            {dayEvents.length === 0 ? (
              <View style={styles.weekEmptyState}>
                <Text style={[styles.weekEmptyStateText, { color: colors.textTertiary }]}>
                  Нет событий
                </Text>
              </View>
            ) : (
              dayEvents.map(renderEventCard)
            )}
          </GHScrollView>
        </View>
      );
    };

    return (
      <View style={styles.weekViewContainer}>
        <FlatList
          ref={weekFlatListRef}
          data={weekDays}
          keyExtractor={(_, index) => String(index)}
          renderItem={renderDayColumn}
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.weekScrollContent}
          style={styles.weekScrollView}
          getItemLayout={(_: any, index: number) => ({
            length: dayColumnWidth,
            offset: dayColumnWidth * index,
            index,
          })}
          onScrollBeginDrag={() => {
            // #region agent log
            __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CalendarScreen.tsx:FlatList.onScrollBeginDrag',message:'horizontal scroll started',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
            // #endregion
          }}
          onScroll={(e) => {
            const x = e.nativeEvent.contentOffset.x;
            // #region agent log
            __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CalendarScreen.tsx:FlatList.onScroll',message:'scroll offset',data:{contentOffsetX:x},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
            // #endregion
          }}
          scrollEventThrottle={200}
        />
      </View>
    );
  };

  const renderDayView = () => {
    return (
      <View style={styles.dayViewContainer} {...panResponder.panHandlers}>
        <View style={[styles.dayHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => handleSwipe('right')}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.dayHeaderText, { color: colors.text }]}>
            {format(selectedDate, 'EEEE, d MMMM', { locale: ru })}
          </Text>
          <TouchableOpacity onPress={() => handleSwipe('left')}>
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.dayEventsList}>
          {selectedDateEvents.length === 0 ? (
            <View style={styles.emptyState} {...panResponder.panHandlers}>
              <Text style={[styles.emptyStateText, { color: colors.textTertiary }]}>
                Нет событий на этот день
              </Text>
              <TouchableOpacity
                style={[styles.addEventButton, { backgroundColor: colors.primary }]}
                onPress={navigateToCreateEvent}
              >
                <Text style={styles.addEventButtonText}>Добавить событие</Text>
              </TouchableOpacity>
            </View>
          ) : (
            selectedDateEvents.map(renderEventItem)
          )}
        </ScrollView>
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.md,
    },
    headerLeft: {
      flex: 1,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    headerTitle: {
      fontSize: FontSize.xl,
      fontWeight: FontWeight.bold,
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
    },
    addButton: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.round,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    viewModeContainer: {
      flexDirection: 'row',
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.md,
      gap: Spacing.sm,
    },
    viewModeButton: {
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.surface,
    },
    viewModeButtonActive: {
      backgroundColor: colors.primary,
    },
    viewModeButtonText: {
      fontSize: FontSize.sm,
      color: colors.text,
    },
    viewModeButtonTextActive: {
      color: '#FFFFFF',
    },
    calendarContainer: {
      paddingHorizontal: Spacing.md,
    },
    calendar: {
      borderRadius: BorderRadius.lg,
    },
    eventsSection: {
      flex: 1,
      marginTop: Spacing.md,
    },
    eventsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.md,
    },
    eventsTitle: {
      fontSize: FontSize.lg,
      fontWeight: FontWeight.semibold,
      color: colors.text,
    },
    eventsCount: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
    },
    eventsList: {
      flex: 1,
      paddingHorizontal: Spacing.md,
    },
    eventItem: {
      flexDirection: 'row',
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.md,
      overflow: 'hidden',
    },
    eventColorIndicator: {
      width: 4,
    },
    eventContent: {
      flex: 1,
      padding: Spacing.md,
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
    eventParticipants: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginTop: Spacing.xs,
    },
    participantAvatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    participantEmoji: {
      fontSize: 14,
    },
    participantMore: {
      fontSize: FontSize.xs,
      marginLeft: Spacing.xs,
    },
    navigationButtons: {
      flexDirection: 'row',
      gap: Spacing.xs,
    },
    navButton: {
      width: 32,
      height: 32,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTextContainer: {
      marginLeft: Spacing.md,
    },
    todayButton: {
      fontSize: FontSize.xs,
      marginTop: Spacing.xs,
    },
    calendarContent: {
      flex: 1,
    },
    bottomNav: {
      flexDirection: 'row',
      paddingVertical: Spacing.sm,
    },
    bottomNavButton: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.sm,
    },
    bottomNavButtonActive: {
      // Active state handled by icon/text color
    },
    bottomNavText: {
      fontSize: FontSize.xs,
    },
    emptyState: {
      flex: 1,
      minHeight: 200,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.xxl,
    },
    emptyStateText: {
      fontSize: FontSize.md,
      marginBottom: Spacing.lg,
    },
    addEventButton: {
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.lg,
    },
    addEventButtonText: {
      color: '#FFFFFF',
      fontSize: FontSize.md,
      fontWeight: FontWeight.semibold,
    },
    weekViewContainer: {
      flex: 1,
    },
    weekScrollView: {
      flex: 1,
    },
    weekScrollContent: {
      paddingVertical: Spacing.md,
    },
    weekDayColumn: {
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    weekDayHeader: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      height: 60,
      minHeight: 60,
    },
    weekDayName: {
      fontSize: FontSize.xs,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    weekDayNumber: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.semibold,
    },
    eventDotContainer: {
      height: 4,
      marginTop: Spacing.xs,
      justifyContent: 'center',
      alignItems: 'center',
    },
    eventDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
    },
    weekDayEvents: {
      flex: 1,
    },
    weekDayEventsContent: {
      padding: Spacing.sm,
      gap: Spacing.sm,
    },
    weekEventCard: {
      padding: Spacing.sm,
      borderRadius: BorderRadius.md,
      borderLeftWidth: 3,
      marginBottom: Spacing.xs,
    },
    weekEventTitle: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.medium,
      marginBottom: Spacing.xs,
    },
    weekEventTime: {
      fontSize: FontSize.xs,
      marginBottom: Spacing.xs,
    },
    weekEventParticipants: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginTop: Spacing.xs,
    },
    weekParticipantAvatar: {
      width: 18,
      height: 18,
      borderRadius: 9,
      justifyContent: 'center',
      alignItems: 'center',
    },
    weekParticipantEmoji: {
      fontSize: 10,
    },
    weekParticipantMore: {
      fontSize: FontSize.xs,
      marginLeft: Spacing.xs,
    },
    weekEmptyState: {
      flex: 1,
      padding: Spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    weekEmptyStateText: {
      fontSize: FontSize.xs,
      color: colors.textTertiary,
    },
    dayViewContainer: {
      flex: 1,
    },
    dayHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderBottomWidth: 1,
    },
    dayHeaderText: {
      fontSize: FontSize.lg,
      fontWeight: FontWeight.semibold,
      textTransform: 'capitalize',
    },
    dayEventsList: {
      flex: 1,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.md,
    },
  });

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Header with navigation */}
      <View style={[styles.header, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={[styles.navButton, { borderColor: colors.border }]}
              onPress={() => handleSwipe('right')}
            >
              <Ionicons name="chevron-back" size={16} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navButton, { borderColor: colors.border }]}
              onPress={() => handleSwipe('left')}
            >
              <Ionicons name="chevron-forward" size={16} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{getDateRangeText()}</Text>
            <TouchableOpacity onPress={navigateToToday}>
              <Text style={[styles.todayButton, { color: colors.textSecondary }]}>Сегодня</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.headerRight}>
          {getSyncIcon()}
          <TouchableOpacity style={styles.addButton} onPress={navigateToCreateEvent}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Calendar Content */}
      <View style={styles.calendarContent}>
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
      </View>


      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { borderTopColor: colors.border, borderTopWidth: 1, backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[
            styles.bottomNavButton,
            viewMode === 'week' && styles.bottomNavButtonActive
          ]}
          onPress={() => setViewMode('week')}
        >
          <Ionicons 
            name="list" 
            size={20} 
            color={viewMode === 'week' ? colors.primary : colors.textTertiary} 
          />
          <Text style={[
            styles.bottomNavText,
            { color: viewMode === 'week' ? colors.primary : colors.textTertiary }
          ]}>
            Неделя
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.bottomNavButton,
            viewMode === 'day' && styles.bottomNavButtonActive
          ]}
          onPress={() => setViewMode('day')}
        >
          <Ionicons 
            name="time" 
            size={20} 
            color={viewMode === 'day' ? colors.primary : colors.textTertiary} 
          />
          <Text style={[
            styles.bottomNavText,
            { color: viewMode === 'day' ? colors.primary : colors.textTertiary }
          ]}>
            День
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
