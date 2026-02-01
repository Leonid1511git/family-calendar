import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeType } from '../types';
import { lightTheme } from '../constants/light';
import { darkTheme } from '../constants/dark';

type ThemeContextType = {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  isDark: boolean;
  colors: typeof lightTheme;
  EventColors: Record<import('../types').EventColor, string>;
  CategoryColors: Record<string, string>;
  Spacing: typeof import('../constants/light').Spacing;
  BorderRadius: typeof import('../constants/light').BorderRadius;
  FontSize: typeof import('../constants/light').FontSize;
  FontWeight: typeof import('../constants/light').FontWeight;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@family_calendar_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeType>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme) {
        setThemeState(savedTheme as ThemeType);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const setTheme = async (newTheme: ThemeType) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      setThemeState(newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const isDark = theme === 'system' 
    ? systemColorScheme === 'dark' 
    : theme === 'dark';

  const colors = isDark ? darkTheme : lightTheme;
  const { EventColors, CategoryColors, Spacing, BorderRadius, FontSize, FontWeight } = isDark 
    ? require('../constants/dark') 
    : require('../constants/light');

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider 
      value={{ 
        theme, 
        setTheme, 
        isDark, 
        colors, 
        EventColors, 
        CategoryColors,
        Spacing,
        BorderRadius,
        FontSize,
        FontWeight,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
