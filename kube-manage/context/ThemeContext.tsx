import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import React, { useEffect, useState } from 'react';

const THEME_KEY = 'app_theme';

export type ThemeMode = 'dark' | 'light';

export type AppColors = {
  bg: string;
  bgCard: string;
  bgSecondary: string;
  bgSidebar: string;
  bgTopBar: string;
  bgInput: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  accent: string;
  accentGreen: string;
  accentYellow: string;
  accentRed: string;
  accentOrange: string;
  accentPurple: string;
  accentPink: string;
  navActive: string;
  navText: string;
  navTextMuted: string;
  navAccent: string;
  eventWarningBg: string;
  placeholder: string;
};

export const darkColors: AppColors = {
  bg: '#0A0E1A',
  bgCard: '#162033',
  bgSecondary: '#0D1219',
  bgSidebar: '#050814',
  bgTopBar: '#0D1219',
  bgInput: '#162033',
  text: '#FFFFFF',
  textSecondary: '#8B92A8',
  textMuted: '#5C6578',
  border: '#1E2B42',
  accent: '#00D9FF',
  accentGreen: '#00FF88',
  accentYellow: '#FFB800',
  accentRed: '#FF5757',
  accentOrange: '#FF9F43',
  accentPurple: '#AA66FF',
  accentPink: '#FF6B9D',
  navActive: '#162033',
  navText: '#FFFFFF',
  navTextMuted: '#8B92A8',
  navAccent: '#00D9FF',
  eventWarningBg: '#1A1520',
  placeholder: '#444444',
};

export const lightColors: AppColors = {
  bg: '#f2f3f4',
  bgCard: '#FFFFFF',
  bgSecondary: '#edeff3',
  bgSidebar: '#fafafa',
  bgTopBar: '#FFFFFF',
  bgInput: '#F8FAFF',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#28b0b0',
  // border: '#c7ebfe',
  border: '#b2ecf5',
  // accent: '#2563EB',
  accent: '#00D9FF',
  accentGreen: '#10B981',
  accentYellow: '#F59E0B',
  accentRed: '#EF4444',
  accentOrange: '#F97316',
  accentPurple: '#8B5CF6',
  accentPink: '#EC4899',
  // navActive: '#2D4A8A',
  navActive: '#162033',
  navText: '#F1F5F9',
  navTextMuted: '#091e3c',
  // navAccent: '#60A5FA',
  navAccent: '#00D9FF',
  eventWarningBg: '#FFFBEB',
  placeholder: '#94A3B8',
};

export const [ThemeContext, useTheme] = createContextHook(() => {
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark') setMode(stored);
    });
  }, []);

  const toggleTheme = () => {
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(THEME_KEY, next);
      return next;
    });
  };

  const colors = mode === 'dark' ? darkColors : lightColors;
  const isDark = mode === 'dark';

  return { mode, colors, isDark, toggleTheme };
});
