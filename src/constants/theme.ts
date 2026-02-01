import { EventColor } from '../types';

export const Colors = {
  light: {
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
  },
  dark: {
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
    
    // Overlay
    overlay: 'rgba(0, 0, 0, 0.7)',
    overlayLight: 'rgba(255, 255, 255, 0.1)',
  },
};

export const EventColors: Record<EventColor, { light: string; dark: string }> = {
  blue: { light: '#007AFF', dark: '#0A84FF' },
  green: { light: '#34C759', dark: '#30D158' },
  red: { light: '#FF3B30', dark: '#FF453A' },
  yellow: { light: '#FFCC00', dark: '#FFD60A' },
  purple: { light: '#AF52DE', dark: '#BF5AF2' },
  orange: { light: '#FF9500', dark: '#FF9F0A' },
  pink: { light: '#FF2D55', dark: '#FF375F' },
  gray: { light: '#8E8E93', dark: '#8E8E93' },
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
