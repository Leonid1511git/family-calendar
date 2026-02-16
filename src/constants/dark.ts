import { EventColor } from '../types';

export const darkTheme = {
  // Background
  background: '#1C1C1E',
  surface: '#2C2C2E',
  surfaceVariant: '#3A3A3C',
  
  // Text
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textTertiary: '#6E6E6E',
  textInverse: '#1A1A1A',
  
  // Border
  border: '#3A3A3C',
  borderLight: '#2C2C2E',
  
  // Primary
  primary: '#0A84FF',
  primaryLight: '#1C4A7A',
  
  // Status
  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
  info: '#5E5CE6',
  /** Цвет для выходных и праздников в календаре */
  red: '#FF6B6B',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(255, 255, 255, 0.1)',
  
  // Calendar
  calendarBackground: '#1C1C1E',
  calendarText: '#FFFFFF',
  calendarToday: '#0A84FF',
  calendarSelected: '#0A84FF',
  calendarDot: '#0A84FF',
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
