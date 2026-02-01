import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import * as chrono from 'chrono-node';
import { ru } from 'date-fns/locale';
import { parse, format, addMinutes, addHours, addDays, startOfDay } from 'date-fns';

import { useTheme } from '../../context/ThemeContext';
import { Spacing, BorderRadius, FontSize, FontWeight } from '../../constants/theme';

interface ParsedEventData {
  title: string;
  startDate?: Date;
  endDate?: Date;
  duration?: number; // in minutes
}

interface VoiceInputButtonProps {
  onParsedData: (data: ParsedEventData) => void;
  disabled?: boolean;
}

export default function VoiceInputButton({ onParsedData, disabled }: VoiceInputButtonProps) {
  const { colors } = useTheme();
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [manualText, setManualText] = useState('');
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isListening) {
      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
      
      // Fade in/out effect
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0.6,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Reset animations
      pulseAnim.setValue(1);
      opacityAnim.setValue(1);
    }
  }, [isListening]);

  const requestAudioPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting audio permission:', error);
      return false;
    }
  };

  const startListening = async () => {
    if (disabled) return;
    
    const hasPermission = await requestAudioPermission();
    if (!hasPermission) {
      console.log('Audio permission not granted');
      return;
    }

    setIsListening(true);
    setRecognizedText('');

    try {
      // Check if speech recognition is available
      const isAvailable = await Speech.isSpeakingAsync();
      
      // Start speech recognition
      Speech.speak(' ', {
        onDone: () => {
          // This is a workaround - expo-speech doesn't have built-in recognition
          // In production, you'd use expo-speech-recognition or similar
          simulateSpeechRecognition();
        },
      });
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setIsListening(false);
    }
  };

  // Simulated speech recognition for demo
  // In production, replace with actual speech-to-text library like @react-native-voice/voice
  const simulateSpeechRecognition = () => {
    // Show text input modal instead of trying to use speech recognition
    // In production, use: @react-native-voice/voice
    setIsListening(false);
    setShowTextInput(true);
  };

  const handleManualTextSubmit = () => {
    if (manualText.trim()) {
      setRecognizedText(manualText);
      processRecognizedText(manualText);
      setManualText('');
      setShowTextInput(false);
    }
  };

  const stopListening = () => {
    setIsListening(false);
    Speech.stop();
  };

  const processRecognizedText = (text: string) => {
    setIsProcessing(true);
    
    try {
      // Parse date using chrono-node with Russian locale
      const parsedResults = chrono.ru.parse(text, new Date(), { forwardDate: true });
      
      let parsedData: ParsedEventData = {
        title: text.trim(),
      };

      if (parsedResults.length > 0) {
        const result = parsedResults[0];
        const startDate = result.start.date();
        
        // Extract title - remove the date/time part from text
        let title = text;
        if (result.index !== undefined) {
          const beforeDate = text.substring(0, result.index).trim();
          const afterDate = text.substring(result.index + result.text.length).trim();
          title = (beforeDate || afterDate || text).trim();
        }
        
        // If title is empty after removing date, use original text
        if (!title || title.length === 0) {
          title = text.trim();
        }
        
        parsedData = {
          title: title,
          startDate: startDate,
        };

        // Check for end date
        if (result.end) {
          parsedData.endDate = result.end.date();
          const durationMs = parsedData.endDate.getTime() - startDate.getTime();
          parsedData.duration = Math.round(durationMs / (1000 * 60)); // Convert to minutes
        } else {
          // Check for duration in text (e.g., "на 2 часа", "на 30 минут")
          const durationMatch = text.match(/на\s+(\d+)\s*(час|ч|часа|часов|мин|минут|минуты|минуту)/i);
          if (durationMatch) {
            const amount = parseInt(durationMatch[1]);
            const unit = durationMatch[2].toLowerCase();
            
            if (unit.startsWith('ч') || unit.includes('час')) {
              parsedData.endDate = addHours(startDate, amount);
              parsedData.duration = amount * 60;
            } else if (unit.startsWith('мин')) {
              parsedData.endDate = addMinutes(startDate, amount);
              parsedData.duration = amount;
            } else {
              // Default: assume hours
              parsedData.endDate = addHours(startDate, amount);
              parsedData.duration = amount * 60;
            }
          } else {
            // Default duration: 1 hour
            parsedData.endDate = addHours(startDate, 1);
            parsedData.duration = 60;
          }
        }
      } else {
        // No date found - just use text as title
        parsedData.title = text.trim();
      }

      onParsedData(parsedData);
    } catch (error) {
      console.error('Error parsing text:', error);
      // If parsing fails, return full text as title
      onParsedData({ title: text.trim() });
    } finally {
      setIsProcessing(false);
      setIsListening(false);
    }
  };

  const cancelListening = () => {
    stopListening();
    setRecognizedText('');
  };

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
    },
    buttonContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    pulseRing: {
      position: 'absolute',
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary + '40',
    },
    button: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    buttonDisabled: {
      backgroundColor: colors.textTertiary,
      shadowOpacity: 0,
    },
    listeningButton: {
      backgroundColor: colors.error,
      shadowColor: colors.error,
    },
    statusContainer: {
      marginTop: Spacing.md,
      alignItems: 'center',
    },
    statusText: {
      fontSize: FontSize.md,
      color: colors.textSecondary,
      fontWeight: FontWeight.medium,
    },
    recognizedText: {
      fontSize: FontSize.sm,
      color: colors.textTertiary,
      marginTop: Spacing.sm,
      maxWidth: 250,
      textAlign: 'center',
    },
    cancelButton: {
      marginTop: Spacing.md,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelText: {
      fontSize: FontSize.sm,
      color: colors.error,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: BorderRadius.xl,
      borderTopRightRadius: BorderRadius.xl,
      padding: Spacing.lg,
      paddingBottom: Spacing.xl,
    },
    modalTitle: {
      fontSize: FontSize.lg,
      fontWeight: FontWeight.bold,
      color: colors.text,
      marginBottom: Spacing.md,
    },
    textInput: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      fontSize: FontSize.md,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 100,
      textAlignVertical: 'top',
      marginBottom: Spacing.md,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: Spacing.md,
    },
    modalButton: {
      flex: 1,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
    },
    modalButtonCancel: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalButtonSubmit: {
      backgroundColor: colors.primary,
    },
    modalButtonText: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.semibold,
      color: '#FFFFFF',
    },
    modalButtonTextCancel: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.semibold,
      color: colors.text,
    },
  });

  if (isListening) {
    return (
      <View style={styles.container}>
        <View style={styles.buttonContainer}>
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: pulseAnim }],
                opacity: opacityAnim,
              },
            ]}
          />
          <TouchableOpacity
            style={[styles.button, styles.listeningButton]}
            onPress={stopListening}
          >
            <Ionicons name="mic" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>Слушаю...</Text>
          {recognizedText.length > 0 && (
            <Text style={styles.recognizedText} numberOfLines={2}>
              "{recognizedText}"
            </Text>
          )}
          {isProcessing && <ActivityIndicator style={{ marginTop: Spacing.sm }} color={colors.primary} />}
        </View>
        
        <TouchableOpacity style={styles.cancelButton} onPress={cancelListening}>
          <Text style={styles.cancelText}>Отмена</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={startListening}
        disabled={disabled}
      >
        <Ionicons name="mic-outline" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Text Input Modal */}
      <Modal
        visible={showTextInput}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowTextInput(false);
          setManualText('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Введите текст события</Text>
            <TextInput
              style={styles.textInput}
              value={manualText}
              onChangeText={setManualText}
              placeholder="Например: Встреча завтра в 15:00"
              placeholderTextColor={colors.textTertiary}
              multiline
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowTextInput(false);
                  setManualText('');
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit]}
                onPress={handleManualTextSubmit}
                disabled={!manualText.trim()}
              >
                <Text style={styles.modalButtonText}>Готово</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
