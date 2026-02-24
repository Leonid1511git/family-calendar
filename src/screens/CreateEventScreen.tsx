import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Switch,
  Platform,
  Alert,
  Keyboard,
  Modal,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format, addHours, addMinutes, isPast, setHours, setMinutes, endOfDay, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { useEvents } from '../context/EventsContext';
import { useAuth } from '../context/AuthContext';
import VoiceInputButton from '../components/voice/VoiceInputButton';
import { CalendarPageLoader } from '../components';
import { EventColor, RecurrenceRule, ParsedVoiceData, ReminderTime, Participant } from '../types';
import { REMINDER_OPTIONS } from '../services/notificationService';
import { DEFAULT_PARTICIPANTS } from '../constants/participants';
import { settingsStorage } from '../database';

const STEP_MINUTES = 15;
const roundTo15Min = (d: Date): Date => {
  const out = new Date(d);
  const m = out.getMinutes();
  out.setMinutes(Math.floor(m / STEP_MINUTES) * STEP_MINUTES, 0, 0);
  return out;
};

const RECURRENCE_OPTIONS = [
  { label: 'Не повторяется', value: null },
  { label: 'Каждый день', value: { frequency: 'daily', interval: 1 } as RecurrenceRule },
  { label: 'Каждую неделю', value: { frequency: 'weekly', interval: 1 } as RecurrenceRule },
  { label: 'Каждый месяц', value: { frequency: 'monthly', interval: 1 } as RecurrenceRule },
];

export default function CreateEventScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors, isDark, EventColors, Spacing, BorderRadius, FontSize, FontWeight } = useTheme();
  const { addEvent } = useEvents();
  const { group, user } = useAuth();

  const initialDate = (route.params as any)?.date || new Date();
  const voiceData: ParsedVoiceData | undefined = (route.params as any)?.voiceData;
  const defaultTime19 = (route.params as any)?.defaultTime19 === true;

  // При создании из month view на дату в будущем (строго после сегодня) — 19:00–20:00. Иначе — следующий час.
  const getDefaultStartDate = () => {
    if (voiceData?.startDate) return voiceData.startDate;
    const selectedDayStart = startOfDay(initialDate);
    const todayStart = startOfDay(new Date());
    if (defaultTime19 && selectedDayStart.getTime() > todayStart.getTime()) {
      const start = new Date(selectedDayStart);
      start.setHours(19, 0, 0, 0);
      return start;
    }
    const now = new Date();
    const nextHour = addHours(new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0), 1);
    const start = new Date(initialDate);
    start.setHours(nextHour.getHours(), 0, 0, 0);
    start.setSeconds(0, 0);
    if (isPast(start)) {
      return nextHour;
    }
    return start;
  };

  const defaultStartDate = getDefaultStartDate();
  const defaultEndDate = voiceData?.endDate || addHours(defaultStartDate, 1);

  const [title, setTitle] = useState(voiceData?.title || '');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [allDay, setAllDay] = useState(false);
  const [selectedColor, setSelectedColor] = useState<EventColor>('blue');
  const [selectedParticipants, setSelectedParticipants] = useState<Participant[]>([]);
  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(null);
  const [reminderTime, setReminderTime] = useState<ReminderTime>(4320); // предвыбор из настроек подставится в useEffect
  const [duration, setDuration] = useState<number>(60); // Duration in minutes, default 1 hour
  
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showRecurrencePicker, setShowRecurrencePicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Предвыбор напоминания из настроек (значение «по умолчанию для новых событий»)
  useEffect(() => {
    settingsStorage.getDefaultReminderTime().then((defaultMinutes) => {
      setReminderTime(defaultMinutes as ReminderTime);
    });
  }, []);

  // Update endDate when startDate or duration changes
  useEffect(() => {
    if (allDay) {
      setEndDate(endOfDay(startDate));
    } else {
      const newEndDate = addMinutes(startDate, duration);
      setEndDate(newEndDate);
    }
  }, [startDate, duration, allDay]);

  // Apply voice data when received
  useEffect(() => {
    if (voiceData) {
      if (voiceData.title) setTitle(voiceData.title);
      if (voiceData.startDate) {
        setStartDate(voiceData.startDate);
        if (voiceData.duration) {
          setDuration(voiceData.duration);
        }
      }
      if (voiceData.endDate) {
        setEndDate(voiceData.endDate);
        // Calculate duration from start and end dates
        if (voiceData.startDate) {
          const durationMs = voiceData.endDate.getTime() - voiceData.startDate.getTime();
          const durationMins = Math.round(durationMs / (1000 * 60));
          setDuration(durationMins);
        }
      }
    }
  }, [voiceData]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Ошибка', 'Введите название события');
      return;
    }
    if (!group || !user) {
      Alert.alert('Ошибка', 'Необходимо авторизоваться');
      return;
    }

    // Validate that start date is not in the past
    if (!allDay && isPast(startDate)) {
      Alert.alert('Ошибка', 'Нельзя создать событие в прошлом. Пожалуйста, выберите время в будущем.');
      return;
    }

    // Validate that end date is after start date
    if (endDate <= startDate) {
      Alert.alert('Ошибка', 'Время окончания должно быть позже времени начала');
      return;
    }

    setIsSaving(true);
    try {
      await addEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        startDate,
        endDate,
        allDay,
        location: location.trim() || undefined,
        color: selectedColor,
        participants: selectedParticipants,
        type: recurrence ? 'recurring' : 'single',
        createdBy: user.id,
        groupId: group.id,
        recurrence: recurrence || undefined,
        reminderTime: reminderTime,
      });

      // Close screen immediately
      navigation.goBack();
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось создать событие');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleParticipant = (participant: Participant) => {
    setSelectedParticipants(prev => {
      const exists = prev.find(p => p.id === participant.id);
      if (exists) {
        return prev.filter(p => p.id !== participant.id);
      } else {
        return [...prev, participant];
      }
    });
  };

  const onStartDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
    }
    if (selectedDate && event.type !== 'dismissed') {
      const newDate = new Date(selectedDate);
      newDate.setHours(startDate.getHours(), startDate.getMinutes());
      setStartDate(newDate);
      // EndDate will be updated automatically via useEffect
      if (Platform.OS === 'ios') {
        setShowStartDatePicker(false);
      }
    }
  };

  const onStartTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
    }
    if (selectedTime && event.type !== 'dismissed') {
      const newDate = new Date(startDate);
      newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setStartDate(roundTo15Min(newDate));
      if (Platform.OS === 'ios') {
        setShowStartTimePicker(false);
      }
    }
  };

  const onEndDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
    }
    if (selectedDate && event.type !== 'dismissed') {
      const newDate = new Date(selectedDate);
      newDate.setHours(endDate.getHours(), endDate.getMinutes());
      setEndDate(newDate);
      if (Platform.OS === 'ios') {
        setShowEndDatePicker(false);
      }
    }
  };

  const onEndTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndTimePicker(false);
    }
    if (selectedTime && event.type !== 'dismissed') {
      const newDate = new Date(endDate);
      newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setEndDate(roundTo15Min(newDate));
      if (Platform.OS === 'ios') {
        setShowEndTimePicker(false);
      }
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: Spacing.md,
      flexGrow: 1,
    },
    voiceContainer: {
      alignItems: 'center',
      paddingVertical: Spacing.lg,
      marginBottom: Spacing.md,
    },
    inputGroup: {
      marginBottom: Spacing.md,
    },
    inputGroupCompact: {
      flex: 1,
    },
    dateTimeRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    dateTimeButtonCompact: {
      backgroundColor: colors.surface,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.sm,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 44,
      justifyContent: 'center',
    },
    dateTimeValueCompact: {
      fontSize: FontSize.sm,
      color: colors.text,
      fontWeight: FontWeight.medium,
    },
    timeRowWithArrows: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    timeArrowButton: {
      width: 36,
      height: 44,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    label: {
      fontSize: FontSize.xs,
      fontWeight: FontWeight.medium,
      color: colors.textSecondary,
      marginBottom: Spacing.xs,
      textTransform: 'uppercase',
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.lg,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      fontSize: FontSize.md,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 44,
    },
    switchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 44,
    },
    switchLabel: {
      fontSize: FontSize.md,
      color: colors.text,
    },
    dateTimeContainer: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    dateTimeButton: {
      flex: 1,
      backgroundColor: colors.surface,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    dateTimeLabel: {
      fontSize: FontSize.xs,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    dateTimeValue: {
      fontSize: FontSize.sm,
      color: colors.text,
      fontWeight: FontWeight.medium,
    },
    colorContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.md,
    },
    colorOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
      borderWidth: 2,
      borderColor: 'transparent',
      backgroundColor: colors.surface,
      gap: Spacing.sm,
    },
    colorOptionSelected: {
      borderColor: colors.primary,
    },
    colorDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
    },
    colorLabel: {
      fontSize: FontSize.sm,
      color: colors.text,
    },
    participantsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    participantTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    participantTagSelected: {
      borderWidth: 2,
    },
    participantAvatarSmall: {
      width: 20,
      height: 20,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    participantEmojiSmall: {
      fontSize: 12,
    },
    participantName: {
      fontSize: FontSize.sm,
      color: colors.text,
    },
    pickerButton: {
      backgroundColor: colors.surface,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 44,
    },
    pickerText: {
      fontSize: FontSize.md,
      color: colors.text,
    },
    pickerOptionsScroll: {
      marginTop: Spacing.sm,
      maxHeight: 300,
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    pickerOptions: {
      paddingBottom: Spacing.sm,
    },
    pickerOption: {
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    pickerOptionSelected: {
      backgroundColor: colors.primaryLight,
    },
    pickerOptionText: {
      fontSize: FontSize.md,
      color: colors.text,
    },
    pickerOptionTextSelected: {
      color: colors.primary,
      fontWeight: FontWeight.medium,
    },
    saveButton: {
      backgroundColor: colors.primary,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
      marginTop: Spacing.md,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontSize: FontSize.md,
      fontWeight: FontWeight.semibold,
    },
  });

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {isSaving && <CalendarPageLoader fullScreen />}
      
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.scrollContent}>
        {/* Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Название</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Название события"
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        {/* All Day Switch */}
        <View style={styles.inputGroup}>
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Весь день</Text>
            <Switch
              value={allDay}
              onValueChange={setAllDay}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Start & End Date/Time — одна строка */}
        <View style={styles.dateTimeRow}>
          <View style={styles.inputGroupCompact}>
            <Text style={styles.label}>Начало</Text>
            <TouchableOpacity
              style={styles.dateTimeButtonCompact}
              onPress={() => { Keyboard.dismiss(); setShowStartDatePicker(true); }}
            >
              <Text style={styles.dateTimeValueCompact}>{format(startDate, 'dd.MM.yy')}</Text>
            </TouchableOpacity>
            {!allDay && (
              <View style={styles.timeRowWithArrows}>
                <TouchableOpacity
                  style={[styles.timeArrowButton, { borderColor: colors.border }]}
                  onPress={() => { Keyboard.dismiss(); setStartDate(addMinutes(roundTo15Min(startDate), -STEP_MINUTES)); }}
                >
                  <Ionicons name="chevron-back" size={18} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dateTimeButtonCompact}
                  onPress={() => { Keyboard.dismiss(); setShowStartTimePicker(true); }}
                >
                  <Text style={styles.dateTimeValueCompact}>{format(roundTo15Min(startDate), 'HH:mm')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.timeArrowButton, { borderColor: colors.border }]}
                  onPress={() => { Keyboard.dismiss(); setStartDate(addMinutes(roundTo15Min(startDate), STEP_MINUTES)); }}
                >
                  <Ionicons name="chevron-forward" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>
            )}
          </View>
          <View style={styles.inputGroupCompact}>
            <Text style={styles.label}>Окончание</Text>
            <TouchableOpacity
              style={styles.dateTimeButtonCompact}
              onPress={() => { Keyboard.dismiss(); setShowEndDatePicker(true); }}
            >
              <Text style={styles.dateTimeValueCompact}>{format(endDate, 'dd.MM.yy')}</Text>
            </TouchableOpacity>
            {!allDay && (
              <View style={styles.timeRowWithArrows}>
                <TouchableOpacity
                  style={[styles.timeArrowButton, { borderColor: colors.border }]}
                  onPress={() => { Keyboard.dismiss(); setEndDate(addMinutes(roundTo15Min(endDate), -STEP_MINUTES)); }}
                >
                  <Ionicons name="chevron-back" size={18} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dateTimeButtonCompact}
                  onPress={() => { Keyboard.dismiss(); setShowEndTimePicker(true); }}
                >
                  <Text style={styles.dateTimeValueCompact}>{format(roundTo15Min(endDate), 'HH:mm')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.timeArrowButton, { borderColor: colors.border }]}
                  onPress={() => { Keyboard.dismiss(); setEndDate(addMinutes(roundTo15Min(endDate), STEP_MINUTES)); }}
                >
                  <Ionicons name="chevron-forward" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Duration */}
        {!allDay && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Продолжительность</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => { Keyboard.dismiss(); setShowDurationPicker(!showDurationPicker); }}
            >
              <Text style={styles.pickerText}>
                {duration === 15 ? '15 минут' :
                 duration === 30 ? '30 минут' :
                 duration === 60 ? '1 час' :
                 duration === 90 ? '1.5 часа' :
                 duration === 120 ? '2 часа' :
                 duration === 180 ? '3 часа' :
                 duration === 240 ? '4 часа' :
                 `${Math.floor(duration / 60)} ч ${duration % 60} мин`}
              </Text>
              <Ionicons
                name={showDurationPicker ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            
            {showDurationPicker && (
              <View style={styles.pickerOptions}>
                {[15, 30, 60, 90, 120, 180, 240].map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    style={[
                      styles.pickerOption,
                      duration === mins && styles.pickerOptionSelected,
                    ]}
                    onPress={() => {
                      Keyboard.dismiss();
                      setDuration(mins);
                      setShowDurationPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        duration === mins && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {mins === 15 ? '15 минут' :
                       mins === 30 ? '30 минут' :
                       mins === 60 ? '1 час' :
                       mins === 90 ? '1.5 часа' :
                       mins === 120 ? '2 часа' :
                       mins === 180 ? '3 часа' :
                       mins === 240 ? '4 часа' :
                       `${Math.floor(mins / 60)} ч ${mins % 60} мин`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Participants */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Участники</Text>
          <View style={styles.participantsContainer}>
            {DEFAULT_PARTICIPANTS.map((participant) => {
              const isSelected = selectedParticipants.find(p => p.id === participant.id);
              return (
                <TouchableOpacity
                  key={participant.id}
                  style={[
                    styles.participantTag,
                    isSelected && styles.participantTagSelected,
                    isSelected && { backgroundColor: participant.color + '20', borderColor: participant.color }
                  ]}
                  onPress={() => { Keyboard.dismiss(); toggleParticipant(participant); }}
                >
                  <View style={[
                    styles.participantAvatarSmall,
                    { backgroundColor: isSelected ? participant.color : participant.color + '20' }
                  ]}>
                    <Text style={styles.participantEmojiSmall}>{participant.avatar}</Text>
                  </View>
                  <Text style={[
                    styles.participantName,
                    isSelected && { color: participant.color, fontWeight: FontWeight.semibold }
                  ]}>
                    {participant.name}
                  </Text>
                  {isSelected && (
                    <Ionicons name="close" size={16} color={participant.color} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Recurrence */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Повторение</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => { Keyboard.dismiss(); setShowRecurrencePicker(!showRecurrencePicker); }}
          >
            <Text style={styles.pickerText}>
              {RECURRENCE_OPTIONS.find(o => 
                JSON.stringify(o.value) === JSON.stringify(recurrence)
              )?.label || 'Не повторяется'}
            </Text>
            <Ionicons
              name={showRecurrencePicker ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          
          {showRecurrencePicker && (
            <View style={styles.pickerOptions}>
              {RECURRENCE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.label}
                  style={[
                    styles.pickerOption,
                    JSON.stringify(recurrence) === JSON.stringify(option.value) && 
                      styles.pickerOptionSelected,
                  ]}
                  onPress={() => {
                    Keyboard.dismiss();
                    setRecurrence(option.value);
                    setShowRecurrencePicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      JSON.stringify(recurrence) === JSON.stringify(option.value) && 
                        styles.pickerOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Reminder */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Напоминание</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => { Keyboard.dismiss(); setShowReminderPicker(!showReminderPicker); }}
          >
            <Text style={styles.pickerText}>
              {REMINDER_OPTIONS.find(o => o.value === reminderTime)?.label || 'За 3 дня'}
            </Text>
            <Ionicons
              name={showReminderPicker ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          
          {showReminderPicker && (
            <ScrollView
              style={styles.pickerOptionsScroll}
              contentContainerStyle={styles.pickerOptions}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {REMINDER_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.pickerOption,
                    reminderTime === option.value && styles.pickerOptionSelected,
                  ]}
                  onPress={() => {
                    Keyboard.dismiss();
                    setReminderTime(option.value);
                    setShowReminderPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      reminderTime === option.value && styles.pickerOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, !title.trim() && styles.saveButtonDisabled]}
          onPress={() => { Keyboard.dismiss(); handleSave(); }}
          disabled={!title.trim()}
        >
          <Text style={styles.saveButtonText}>Создать событие</Text>
        </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>

      {/* Date/Time Pickers — на iOS в Modal с кнопкой «Готово», иначе пикер может не реагировать */}
      {Platform.OS === 'ios' ? (
        <>
          {(showStartDatePicker || showStartTimePicker || showEndDatePicker || showEndTimePicker) && (
            <Modal
              visible
              transparent
              animationType="slide"
              presentationStyle="formSheet"
              onRequestClose={() => {
                setShowStartDatePicker(false);
                setShowStartTimePicker(false);
                setShowEndDatePicker(false);
                setShowEndTimePicker(false);
              }}
            >
              <TouchableOpacity
                style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}
                activeOpacity={1}
                onPress={() => {
                  setShowStartDatePicker(false);
                  setShowStartTimePicker(false);
                  setShowEndDatePicker(false);
                  setShowEndTimePicker(false);
                }}
              >
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => {
                    setShowStartDatePicker(false);
                    setShowStartTimePicker(false);
                    setShowEndDatePicker(false);
                    setShowEndTimePicker(false);
                  }}
                  style={{ backgroundColor: colors.background, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 12 }}>
                    <Text style={{ fontSize: 17, color: colors.primary, fontWeight: '600' }}>Готово</Text>
                  </View>
                  {showStartDatePicker && (
                    <DateTimePicker
                      value={startDate}
                      mode="date"
                      display="spinner"
                      onChange={onStartDateChange}
                      locale="ru-RU"
                      minimumDate={allDay ? undefined : new Date()}
                    />
                  )}
                  {showStartTimePicker && (
                    <DateTimePicker
                      value={startDate}
                      mode="time"
                      display="spinner"
                      onChange={onStartTimeChange}
                      locale="ru-RU"
                    />
                  )}
                  {showEndDatePicker && (
                    <DateTimePicker
                      value={endDate}
                      mode="date"
                      display="spinner"
                      onChange={onEndDateChange}
                      locale="ru-RU"
                      minimumDate={startDate}
                    />
                  )}
                  {showEndTimePicker && (
                    <DateTimePicker
                      value={endDate}
                      mode="time"
                      display="spinner"
                      onChange={onEndTimeChange}
                      locale="ru-RU"
                    />
                  )}
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>
          )}
        </>
      ) : (
        <>
          {showStartDatePicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display="default"
              onChange={onStartDateChange}
              locale="ru-RU"
              minimumDate={allDay ? undefined : new Date()}
            />
          )}
          {showStartTimePicker && (
            <DateTimePicker value={startDate} mode="time" display="default" onChange={onStartTimeChange} locale="ru-RU" />
          )}
          {showEndDatePicker && (
            <DateTimePicker value={endDate} mode="date" display="default" onChange={onEndDateChange} locale="ru-RU" minimumDate={startDate} />
          )}
          {showEndTimePicker && (
            <DateTimePicker value={endDate} mode="time" display="default" onChange={onEndTimeChange} locale="ru-RU" />
          )}
        </>
      )}
    </View>
  );
}
