import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThemeColors {
  bg: string;
  card: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  inputBg: string;
  success: string;
  error: string;
  warning: string;
  tabBar: string;
  tabBarBorder: string;
}

const DARK: ThemeColors = {
  bg: '#0F1A14',
  card: '#1A2A20',
  border: '#2A3A30',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  accent: '#22C55E',
  accentLight: 'rgba(34,197,94,0.12)',
  accentDark: '#16A34A',
  inputBg: '#1A2A20',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  tabBar: '#1A2A20',
  tabBarBorder: '#2A3A30',
};

const LIGHT: ThemeColors = {
  bg: '#F8FAF9',
  card: '#FFFFFF',
  border: '#E8ECE9',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  accent: '#22C55E',
  accentLight: 'rgba(34,197,94,0.08)',
  accentDark: '#16A34A',
  inputBg: '#F3F4F6',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E8ECE9',
};

type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  colors: LIGHT,
  toggleTheme: () => {},
  isDark: false,
});

const STORAGE_KEY = '@jjsimex_theme';

export function ThemeProvider({ children }: { children: any }) {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(v => {
      if (v === 'light' || v === 'dark') setMode(v);
    }).catch(() => {});
  }, []);

  function toggleTheme() {
    const next = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }

  const colors = mode === 'dark' ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ mode, colors, toggleTheme, isDark: mode === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
