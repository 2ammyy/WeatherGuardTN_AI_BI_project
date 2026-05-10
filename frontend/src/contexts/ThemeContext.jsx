import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

const LIGHT = {
  name: 'light',
  isDark: false,
  bg: '#f8fafc',
  bgCard: '#ffffff',
  bgHeader: '#ffffff',
  bgSidebar: '#ffffff',
  bgInput: '#ffffff',
  bgHover: '#f1f5f9',
  bgMuted: '#f1f5f9',
  bgTag: '#f8fafc',
  navbarBg: '#ffffff',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  textDisabled: '#cbd5e1',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  accent: '#16a34a',
  accentBg: '#f0fdf4',
  accentBorder: '#bbf7d0',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  dangerBorder: '#fecaca',
  dangerText: '#dc2626',
  warningBg: 'rgba(249,115,22,0.1)',
  warningText: '#ea580c',
  shadow: '0 1px 3px rgba(0,0,0,0.04)',
  shadowCard: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  shadowModal: '0 25px 50px -12px rgba(0,0,0,0.15)',
  mapOverlay: 'rgba(255,255,255,0.92)',
  popupBg: '#ffffff',
  popupBorder: '#e2e8f0',
  scrollbar: '#e2e8f0',
  scrollbarHover: '#cbd5e1',
};

const DARK = {
  name: 'dark',
  isDark: true,
  bg: '#020617',
  bgCard: '#0f172a',
  bgHeader: '#0b1120',
  bgSidebar: '#0f172a',
  bgInput: '#1e293b',
  bgHover: '#1e293b',
  bgMuted: '#1e293b',
  bgTag: '#1e293b',
  navbarBg: 'rgba(11,17,32,0.95)',
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textDisabled: '#475569',
  border: '#1e293b',
  borderLight: '#1e293b',
  accent: '#1D9E75',
  accentBg: 'rgba(29,158,117,0.1)',
  accentBorder: 'rgba(29,158,117,0.3)',
  danger: '#ef4444',
  dangerBg: 'rgba(239,68,68,0.1)',
  dangerBorder: 'rgba(239,68,68,0.3)',
  dangerText: '#f87171',
  warningBg: 'rgba(249,115,22,0.1)',
  warningText: '#fb923c',
  shadow: '0 1px 3px rgba(0,0,0,0.2)',
  shadowCard: '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
  shadowModal: '0 25px 50px -12px rgba(0,0,0,0.5)',
  mapOverlay: 'rgba(15,23,42,0.95)',
  popupBg: '#0f172a',
  popupBorder: '#1e293b',
  scrollbar: '#334155',
  scrollbarHover: '#475569',
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.body.style.background = theme === 'dark' ? '#020617' : '#f8fafc';
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const t = theme === 'dark' ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, t }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
