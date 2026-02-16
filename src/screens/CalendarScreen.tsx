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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, addDays, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView, PanGestureHandler, ScrollView as GHScrollView, State } from 'react-native-gesture-handler';

import { useTheme } from '../context/ThemeContext';
import { useEvents } from '../context/EventsContext';
import { useAuth } from '../context/AuthContext';
import { settingsStorage } from '../database';
import { CalendarViewMode, Event } from '../types';
import { DEFAULT_PARTICIPANTS } from '../constants/participants';
import { isNonWorkingDay } from '../utils/productionCalendar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CalendarScreen() {
  const navigation = useNavigation();
  const { colors, isDark, EventColors, Spacing, BorderRadius, FontSize, FontWeight } = useTheme();
  const { events, getEventsForDate, getEventsForDateRange, syncStatus } = useEvents();
  const { group, user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, 1 = next week, -1 = previous week
  const translateX = useRef(new Animated.Value(0)).current;
  const weekFlatListRef = useRef<FlatList>(null);
  const weekScrollState = useRef({ contentWidth: 0, layoutWidth: 0 });
  const [expandedEvents, setExpandedEvents] = useState<Event[]>([]);

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

  // Month view: текущий отображаемый месяц
  const displayMonth = addMonths(new Date(today.getFullYear(), today.getMonth(), 1), monthOffset);
  const monthGridStart = startOfWeek(startOfMonth(displayMonth), { weekStartsOn: 1 });
  const monthGridEnd = endOfWeek(endOfMonth(displayMonth), { weekStartsOn: 1 });
  const allMonthGridDays = eachDayOfInterval({ start: monthGridStart, end: monthGridEnd });
  const monthStart = startOfMonth(displayMonth);
  const monthEnd = endOfMonth(displayMonth);
  // Показываем только те недели, в которых есть хотя бы один день текущего месяца
  const monthGridDays = (() => {
    const weeks: Date[][] = [];
    for (let i = 0; i < allMonthGridDays.length; i += 7) {
      const chunk = allMonthGridDays.slice(i, i + 7);
      if (chunk.length === 0) continue;
      const weekStart = startOfDay(chunk[0]);
      const weekEnd = startOfDay(chunk[chunk.length - 1]);
      const overlapsMonth = weekStart <= monthEnd && weekEnd >= monthStart;
      if (overlapsMonth) weeks.push(chunk);
    }
    return weeks.flat();
  })();

  // Загрузка «развёрнутых» событий (с повторениями) для видимого диапазона
  useEffect(() => {
    let cancelled = false;
    if (viewMode === 'month') {
      getEventsForDateRange(monthGridStart, monthGridEnd).then((list) => {
        if (!cancelled) setExpandedEvents(list);
      });
    } else if (viewMode === 'week') {
      getEventsForDateRange(weekStartDay, weekEnd).then((list) => {
        if (!cancelled) setExpandedEvents(list);
      });
    } else {
      getEventsForDate(selectedDate).then((list) => {
        if (!cancelled) setExpandedEvents(list);
      });
    }
    return () => { cancelled = true; };
  }, [viewMode, monthOffset, weekOffset, selectedDate, events, getEventsForDate, getEventsForDateRange, monthGridStart, monthGridEnd, weekStartDay, weekEnd]);

  // События выбранного дня (в day view expandedEvents уже загружены для selectedDate)
  const selectedDateEvents = viewMode === 'day' ? expandedEvents : [];

  // Get date range text for header
  const getDateRangeText = () => {
    if (viewMode === 'month') {
      return format(displayMonth, 'LLLL yyyy', { locale: ru });
    }
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
    setMonthOffset(0);
    setWeekOffset(0);
  };

  const navigateToCreateEvent = (date?: Date, defaultTime19?: boolean) => {
    const d = date ?? selectedDate;
    navigation.navigate('CreateEvent' as never, { date: d, defaultTime19 } as never);
  };

  const isFuture = (d: Date) => startOfDay(d).getTime() > startOfDay(new Date()).getTime();
  const navigateToCreateEventFromMonthDay = (day: Date) => {
    const use19 = isFuture(day);
    navigateToCreateEvent(day, use19);
  };


  const navigateToEventDetails = (eventId: string) => {
    navigation.navigate('EventDetails' as never, { eventId } as never);
  };

  const navigateToEditEvent = (eventId: string) => {
    navigation.navigate('EditEvent' as never, { eventId } as never);
  };

  // Handle swipe gestures
  const handleSwipe = (direction: 'left' | 'right') => {
    if (viewMode === 'month') {
      if (direction === 'left') {
        setMonthOffset(prev => prev + 1);
      } else {
        setMonthOffset(prev => prev - 1);
      }
    } else if (viewMode === 'week') {
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
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 40) {
          handleSwipe('right');
        } else if (gestureState.dx < -40) {
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
        onPress={() => navigateToEventDetails((event as Event).parentEventId || event.id)}
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

  // Загрузить сохранённый вид календаря при монтировании
  useEffect(() => {
    settingsStorage.getDefaultCalendarView().then(setViewMode);
  }, []);

  // Scroll to start of week on mount or when week changes
  useEffect(() => {
    if (viewMode === 'week' && weekFlatListRef.current) {
      setTimeout(() => {
        weekFlatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      }, 100);
    }
  }, [viewMode, weekOffset]);

  const renderWeekView = () => {
    const getDayEvents = (day: Date) => {
      return expandedEvents.filter(e => {
        const eventDate = startOfDay(new Date(e.startDate));
        const dayDate = startOfDay(day);
        return eventDate.getTime() === dayDate.getTime();
      });
    };

    const renderEventCard = (event: any) => {
      const eventColor = EventColors[event.color];
      const startTime = format(new Date(event.startDate), 'HH:mm');
      const endTime = format(new Date(event.endDate), 'HH:mm');
      const eventIdForDetails = (event as Event).parentEventId || event.id;

      return (
        <TouchableOpacity
          key={event.id}
          style={[styles.weekEventCard, { backgroundColor: colors.surface, borderLeftColor: eventColor }]}
          onPress={() => navigateToEventDetails(eventIdForDetails)}
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
            <Text style={[styles.weekDayName, { color: isNonWorkingDay(day) ? colors.red : colors.textSecondary }]}>
              {format(day, 'EEE', { locale: ru })}
            </Text>
            <Text style={[styles.weekDayNumber, { color: isNonWorkingDay(day) ? colors.red : colors.text }]}>
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

    const atLeftEdge = (offset: number) => offset <= 20;
    const atRightEdge = (offset: number) => {
      const { contentWidth, layoutWidth } = weekScrollState.current;
      return layoutWidth > 0 && contentWidth > layoutWidth && offset >= contentWidth - layoutWidth - 20;
    };
    return (
      <View style={[styles.weekViewContainer, viewMode === 'week' && panResponder.panHandlers]}>
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
          onContentSizeChange={(w) => { weekScrollState.current.contentWidth = w; }}
          onLayout={(e) => { weekScrollState.current.layoutWidth = e.nativeEvent.layout.width; }}
          onScrollEndDrag={(e) => {
            const { contentOffset, velocity } = e.nativeEvent;
            const offsetX = contentOffset.x;
            if (atLeftEdge(offsetX) && velocity.x > 0.5) {
              setWeekOffset((prev) => prev - 1);
            } else if (atRightEdge(offsetX) && velocity.x < -0.5) {
              setWeekOffset((prev) => prev + 1);
            }
          }}
          scrollEventThrottle={200}
        />
      </View>
    );
  };

  const MONTH_EVENT_TITLE_LEN = 7; // минимум 6–7 символов влезает в бабл
  const renderMonthView = () => {
    const getDayEvents = (day: Date) =>
      expandedEvents.filter(e => {
        const eventDay = startOfDay(new Date(e.startDate));
        return eventDay.getTime() === startOfDay(day).getTime();
      });
    const truncate = (s: string) =>
      s.length <= MONTH_EVENT_TITLE_LEN ? s : s.slice(0, MONTH_EVENT_TITLE_LEN) + '…';
    const weekDaysLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const cellWidth = SCREEN_WIDTH / 7;
    const rows = [] as Date[][];
    for (let i = 0; i < monthGridDays.length; i += 7) {
      rows.push(monthGridDays.slice(i, i + 7));
    }
    return (
      <View style={styles.monthViewContainer} {...panResponder.panHandlers}>
        <View style={[styles.monthGridColumn, { borderColor: colors.border }]}>
          <View style={[styles.monthGridHeaderRow, { borderColor: colors.border }]}>
            {weekDaysLabels.map((label) => (
              <View key={label} style={[styles.monthCellHeader, { width: cellWidth, borderColor: colors.border }]}>
                <Text style={[styles.monthCellHeaderText, { color: colors.textSecondary }]}>{label}</Text>
              </View>
            ))}
          </View>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={[styles.monthGridDataRow, { borderColor: colors.border }]}>
              {row.map((day) => {
                const dayEvents = getDayEvents(day);
                const inMonth = isSameMonth(day, displayMonth);
                const isTodayCell = isToday(day);
                return (
                  <TouchableOpacity
                    key={day.getTime()}
                    style={[
                      styles.monthCell,
                      { width: cellWidth, backgroundColor: inMonth ? colors.background : colors.surface, borderColor: colors.border },
                      isTodayCell && { backgroundColor: colors.primary + '18' },
                    ]}
                    onPress={() => navigateToCreateEventFromMonthDay(day)}
                  >
                  <Text
                    style={[
                      styles.monthCellDayNum,
                      !inMonth && { color: colors.textTertiary },
                      inMonth && { color: isNonWorkingDay(day) ? colors.red : (isTodayCell ? colors.primary : colors.text) },
                      isTodayCell && { fontWeight: FontWeight.bold },
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                    <View style={styles.monthCellEvents}>
                      {dayEvents.slice(0, 3).map((ev) => (
                        <TouchableOpacity
                          key={ev.id}
                          style={[
                            styles.monthEventBubble,
                            { backgroundColor: (EventColors[ev.color] || colors.primary) + '40', borderLeftColor: EventColors[ev.color] || colors.primary },
                          ]}
                          onPress={() => navigateToEventDetails((ev as Event).parentEventId || ev.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.monthEventBubbleText, { color: colors.text }]} numberOfLines={1}>
                            {truncate(ev.title)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      {dayEvents.length > 3 && (
                        <Text style={[styles.monthEventMore, { color: colors.textTertiary }]}>+{dayEvents.length - 3}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    );
  };

  const dayPanRef = useRef(null);
  const dayScrollRef = useRef(null);
  const renderDayView = () => {
    return (
      <PanGestureHandler
        ref={dayPanRef}
        simultaneousHandlers={dayScrollRef}
        activeOffsetX={[-30, 30]}
        failOffsetY={[-20, 20]}
        onHandlerStateChange={(e) => {
          const { state, translationX } = e.nativeEvent;
          if (state === State.END) {
            if (translationX > 35) handleSwipe('right');
            else if (translationX < -35) handleSwipe('left');
          }
        }}
      >
        <View style={styles.dayViewContainer}>
          <View style={[styles.dayHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => handleSwipe('right')}>
              <Ionicons name="chevron-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.dayHeaderText, { color: isNonWorkingDay(selectedDate) ? colors.red : (isToday(selectedDate) ? colors.primary : colors.text) }]}>
              {format(selectedDate, 'EEEE, d MMMM', { locale: ru })}
            </Text>
            <TouchableOpacity onPress={() => handleSwipe('left')}>
              <Ionicons name="chevron-forward" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <GHScrollView ref={dayScrollRef} style={styles.dayEventsList}>
            {selectedDateEvents.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: colors.textTertiary }]}>
                  Нет событий на этот день
                </Text>
                <TouchableOpacity
                  style={[styles.addEventButton, { backgroundColor: colors.primary }]}
                  onPress={() => navigateToCreateEvent()}
                >
                  <Text style={styles.addEventButtonText}>Добавить событие</Text>
                </TouchableOpacity>
              </View>
            ) : (
              selectedDateEvents.map(renderEventItem)
            )}
          </GHScrollView>
        </View>
      </PanGestureHandler>
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
    monthViewContainer: {
      flex: 1,
      paddingHorizontal: 0,
      width: '100%',
    },
    monthGridColumn: {
      flex: 1,
      borderWidth: 1,
      borderRadius: BorderRadius.md,
      overflow: 'hidden',
      width: '100%',
    },
    monthGridHeaderRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
    },
    monthGridDataRow: {
      flex: 1,
      flexDirection: 'row',
      borderBottomWidth: 1,
      minHeight: 48,
    },
    monthCellHeader: {
      paddingVertical: Spacing.xs,
      alignItems: 'center',
      justifyContent: 'center',
      borderRightWidth: 1,
    },
    monthCellHeaderText: {
      fontSize: FontSize.xs,
      fontWeight: FontWeight.medium,
    },
    monthCell: {
      flex: 1,
      paddingVertical: 2,
      paddingHorizontal: 2,
      borderRightWidth: 1,
      minHeight: 44,
    },
    monthCellDayNum: {
      fontSize: FontSize.xs,
      marginBottom: 2,
    },
    monthCellEvents: {
      gap: 2,
    },
    monthEventBubble: {
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      borderLeftWidth: 2,
    },
    monthEventBubbleText: {
      fontSize: 10,
      maxWidth: '100%',
    },
    monthEventMore: {
      fontSize: 9,
      marginTop: 1,
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
          <TouchableOpacity style={styles.addButton} onPress={() => navigateToCreateEvent()}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Calendar Content */}
      <View style={styles.calendarContent}>
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
      </View>


      {/* Bottom Navigation: Месяц | Неделя | День */}
      <View style={[styles.bottomNav, { borderTopColor: colors.border, borderTopWidth: 1, backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[
            styles.bottomNavButton,
            viewMode === 'month' && styles.bottomNavButtonActive
          ]}
          onPress={() => setViewMode('month')}
        >
          <Ionicons
            name="calendar"
            size={20}
            color={viewMode === 'month' ? colors.primary : colors.textTertiary}
          />
          <Text style={[
            styles.bottomNavText,
            { color: viewMode === 'month' ? colors.primary : colors.textTertiary }
          ]}>
            Месяц
          </Text>
        </TouchableOpacity>
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
