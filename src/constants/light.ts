import { EventColor } from '../types';

export const lightTheme = {
  // Background
  background: '#FFFFFF',
  surface: '#F5F5F5',
  surfaceVariant: '#E8E8E8',
  
  // Text
  text: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textInverse: '#FFFFFF',
  
  // Border
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  
  // Primary
  primary: '#007AFF',
  primaryLight: '#E5F1FF',
  
  // Status
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#5856D6',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.1)',
  
  // Calendar
  calendarBackground: '#FFFFFF',
  calendarText: '#1A1A1A',
  calendarToday: '#007AFF',
  calendarSelected: '#007AFF',
  calendarDot: '#007AFF',
};

export const EventColors: Record<EventColor, string> = {
  red: '#FF6B6B',
  teal: '#4ECDC4',
  blue: '#45B7D1',
  orange: '#FFA07A',
  green: '#98D8C8',
  yellow: '#FFD93D',
  purple: '#C084FC',
  gray: '#9CA3AF',
};

export const CategoryColors = {
  personal: '#FF6B6B',
  work: '#4ECDC4',
  family: '#45B7D1',
  health: '#98D8C8',
  other: '#FFA07A',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  round: 9999,
};

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};
