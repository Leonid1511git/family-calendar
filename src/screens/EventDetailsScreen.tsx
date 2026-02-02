import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { format, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { useEvents } from '../context/EventsContext';
import { useAuth } from '../context/AuthContext';
import { Toast } from '../components/Toast';
import { CalendarPageLoader } from '../components';
import { DEFAULT_PARTICIPANTS } from '../constants/participants';

export default function EventDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors, isDark, EventColors, Spacing, BorderRadius, FontSize, FontWeight } = useTheme();
  const { events, deleteEvent } = useEvents();
  const { user } = useAuth();

  const { eventId } = route.params as { eventId: string };
  const event = events.find(e => (e.id === eventId || e.parentEventId === eventId) && !e.isDeleted);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Handle case when event is deleted or not found
  useEffect(() => {
    if (!event && !isDeleting) {
      // Event was deleted or not found, navigate back
      navigation.goBack();
    }
  }, [event, isDeleting, navigation]);

  // Стили объявляем до раннего return, иначе при !event обращение к styles.container даёт undefined
  const baseStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });

  // Early return if event is not found (will be handled by useEffect)
  if (!event) {
    return (
      <View style={[baseStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textSecondary }}>Событие не найдено</Text>
      </View>
    );
  }

  // Safe to access event properties after null check
  const eventColor = EventColors[event.color];
  const isOwner = event.createdBy === user?.id;
  const isRecurring = event.type === 'recurring';

  const handleDelete = async (deleteSeries: boolean = false) => {
    if (!event) return;

    setIsDeleting(true);
    const eventIdToDelete = event.id;

    try {
      await deleteEvent(eventIdToDelete, deleteSeries);
      setShowDeleteModal(false);
      setShowToast(true);
      // Сразу возвращаемся на предыдущий экран (календарь) — состояние вью сохраняется
      navigation.goBack();
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось удалить событие');
      setIsDeleting(false);
    }
  };

  const showDeleteOptions = () => {
    if (isRecurring) {
      setShowDeleteModal(true);
    } else {
      Alert.alert(
        'Удалить событие?',
        'Вы уверены, что хотите удалить это событие?',
        [
          { text: 'Отмена', style: 'cancel' },
          { 
            text: 'Удалить', 
            style: 'destructive',
            onPress: () => handleDelete(false)
          },
        ]
      );
    }
  };

  const handleEdit = () => {
    if (!event) return;
    navigation.navigate('EditEvent' as never, { eventId: event.id } as never);
  };

  const formatDateTime = () => {
    if (!event) return '';
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);

    if (event.allDay) {
      if (isSameDay(start, end)) {
        return format(start, 'd MMMM yyyy', { locale: ru });
      }
      return `${format(start, 'd MMM', { locale: ru })} - ${format(end, 'd MMM yyyy', { locale: ru })}`;
    }

    if (isSameDay(start, end)) {
      return `${format(start, 'd MMMM yyyy', { locale: ru })}\n${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
    }
    return `${format(start, 'd MMM HH:mm', { locale: ru })} - ${format(end, 'd MMM HH:mm', { locale: ru })}`;
  };

  const getRecurrenceText = () => {
    if (!event || !event.recurrence) return null;
    
    const { frequency, interval } = event.recurrence;
    if (interval === 1) {
      switch (frequency) {
        case 'daily': return 'Каждый день';
        case 'weekly': return 'Каждую неделю';
        case 'monthly': return 'Каждый месяц';
        case 'yearly': return 'Каждый год';
      }
    }
    return `Каждые ${interval} ${frequency === 'daily' ? 'дня' : frequency === 'weekly' ? 'недели' : 'месяца'}`;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: Spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: Spacing.lg,
    },
    colorIndicator: {
      width: 6,
      height: '100%',
      minHeight: 60,
      borderRadius: 3,
      marginRight: Spacing.md,
    },
    headerContent: {
      flex: 1,
    },
    title: {
      fontSize: FontSize.xxl,
      fontWeight: FontWeight.bold,
      color: colors.text,
      marginBottom: Spacing.sm,
    },
    metaContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    metaBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.md,
      gap: Spacing.xs,
    },
    metaText: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
    },
    section: {
      marginBottom: Spacing.lg,
    },
    sectionTitle: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.medium,
      color: colors.textSecondary,
      marginBottom: Spacing.sm,
      textTransform: 'uppercase',
    },
    infoCard: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    infoIcon: {
      width: 36,
      height: 36,
      borderRadius: BorderRadius.round,
      backgroundColor: colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
    },
    infoContent: {
      flex: 1,
    },
    infoLabel: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
      marginBottom: Spacing.xs,
    },
    infoValue: {
      fontSize: FontSize.md,
      color: colors.text,
    },
    descriptionCard: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    descriptionText: {
      fontSize: FontSize.md,
      color: colors.text,
      lineHeight: 22,
    },
    actionsContainer: {
      flexDirection: 'row',
      gap: Spacing.md,
      marginTop: Spacing.lg,
      marginBottom: Spacing.xl,
    },
    editButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
      gap: Spacing.sm,
    },
    editButtonText: {
      color: '#FFFFFF',
      fontSize: FontSize.md,
      fontWeight: FontWeight.semibold,
    },
    deleteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.error + '20',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.lg,
      gap: Spacing.sm,
    },
    deleteButtonText: {
      color: colors.error,
      fontSize: FontSize.md,
      fontWeight: FontWeight.semibold,
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.lg,
    },
    modalContent: {
      backgroundColor: colors.background,
      borderRadius: BorderRadius.xl,
      padding: Spacing.lg,
      width: '100%',
      maxWidth: 320,
    },
    modalTitle: {
      fontSize: FontSize.lg,
      fontWeight: FontWeight.bold,
      color: colors.text,
      marginBottom: Spacing.sm,
      textAlign: 'center',
    },
    modalText: {
      fontSize: FontSize.md,
      color: colors.textSecondary,
      marginBottom: Spacing.lg,
      textAlign: 'center',
    },
    modalButton: {
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.sm,
      alignItems: 'center',
    },
    modalButtonPrimary: {
      backgroundColor: colors.error,
    },
    modalButtonSecondary: {
      backgroundColor: colors.error + '80',
    },
    modalButtonCancel: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalButtonText: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.semibold,
      color: '#FFFFFF',
    },
    modalButtonTextCancel: {
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
      fontWeight: FontWeight.medium,
    },
  });

  // Additional safety check before rendering
  if (!event) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {isDeleting && <CalendarPageLoader fullScreen />}
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.colorIndicator, { backgroundColor: eventColor }]} />
          <View style={styles.headerContent}>
            <Text style={styles.title}>{event.title}</Text>
            <View style={styles.metaContainer}>
              {isRecurring && (
                <View style={styles.metaBadge}>
                  <Ionicons name="repeat" size={14} color={colors.textSecondary} />
                  <Text style={styles.metaText}>Повторяется</Text>
                </View>
              )}
              {event.allDay && (
                <View style={styles.metaBadge}>
                  <Ionicons name="sunny-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.metaText}>Весь день</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Date & Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Когда</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Дата и время</Text>
                <Text style={styles.infoValue}>{formatDateTime()}</Text>
              </View>
            </View>
            
            {event.recurrence && (
              <View style={[styles.infoRow, { marginTop: Spacing.md }]}>
                <View style={styles.infoIcon}>
                  <Ionicons name="repeat" size={18} color={colors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Повторение</Text>
                  <Text style={styles.infoValue}>{getRecurrenceText()}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Participants */}
        {event.participants && event.participants.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Участники</Text>
            <View style={styles.participantsContainer}>
              {event.participants.map((participant) => (
                <View
                  key={participant.id}
                  style={[
                    styles.participantTag,
                    { backgroundColor: participant.color + '20', borderColor: participant.color }
                  ]}
                >
                  <View style={[
                    styles.participantAvatarSmall,
                    { backgroundColor: participant.color }
                  ]}>
                    <Text style={styles.participantEmojiSmall}>{participant.avatar}</Text>
                  </View>
                  <Text style={[styles.participantName, { color: participant.color }]}>
                    {participant.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Location */}
        {event.location && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Где</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="location-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Место</Text>
                  <Text style={styles.infoValue}>{event.location}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Description */}
        {event.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Описание</Text>
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionText}>{event.description}</Text>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Ionicons name="create-outline" size={20} color="#FFFFFF" />
            <Text style={styles.editButtonText}>Редактировать</Text>
          </TouchableOpacity>
          
          {isOwner && (
            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={showDeleteOptions}
              disabled={isDeleting}
            >
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <Text style={styles.deleteButtonText}>Удалить</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Delete Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Удалить событие?</Text>
            <Text style={styles.modalText}>
              Это повторяющееся событие. Что вы хотите удалить?
            </Text>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={() => handleDelete(true)}
              disabled={isDeleting}
            >
              <Text style={styles.modalButtonText}>Все в серии</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={() => handleDelete(false)}
              disabled={isDeleting}
            >
              <Text style={styles.modalButtonText}>Только это</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              <Text style={[styles.modalButtonText, styles.modalButtonTextCancel]}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast
        message="Событие удалено"
        visible={showToast}
        onHide={() => setShowToast(false)}
        duration={3000}
      />
    </View>
  );
}
