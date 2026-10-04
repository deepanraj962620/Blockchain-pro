import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

// Preset color themes. Each theme defines the full set of CSS variables
// needed to style the entire app consistently.
export const THEMES = {
  green: {
    name: 'Green',
    primary: '#10b981',
    hover: '#059669',
    soft: '#f0fdf4',
    activeBg: '#ecfdf5',
    border: '#bbf7d0',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  },
  blue: {
    name: 'Blue',
    primary: '#3b82f6',
    hover: '#2563eb',
    soft: '#eff6ff',
    activeBg: '#eff6ff',
    border: '#bfdbfe',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  },
  purple: {
    name: 'Purple',
    primary: '#8b5cf6',
    hover: '#7c3aed',
    soft: '#f5f3ff',
    activeBg: '#f5f3ff',
    border: '#ddd6fe',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
  },
  orange: {
    name: 'Orange',
    primary: '#f59e0b',
    hover: '#d97706',
    soft: '#fffbeb',
    activeBg: '#fffbeb',
    border: '#fde68a',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  },
  red: {
    name: 'Red',
    primary: '#ef4444',
    hover: '#dc2626',
    soft: '#fef2f2',
    activeBg: '#fef2f2',
    border: '#fecaca',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  },
  pink: {
    name: 'Pink',
    primary: '#ec4899',
    hover: '#db2777',
    soft: '#fdf2f8',
    activeBg: '#fdf2f8',
    border: '#fbcfe8',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
  },
  cyan: {
    name: 'Cyan',
    primary: '#06b6d4',
    hover: '#0891b2',
    soft: '#ecfeff',
    activeBg: '#ecfeff',
    border: '#a5f3fc',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  },
};

// Generate a full theme object from a single primary color (for custom picker)
const buildThemeFromColor = (primary) => {
  // Simple helper to convert hex to rgb
  const hexToRgb = (hex) => {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const int = parseInt(full, 16);
    return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
  };

  const lerp = (a, b, t) => Math.round(a + (b - a) * t);
  const mix = (c1, c2, t) => {
    const a = hexToRgb(c1);
    const b = hexToRgb(c2);
    return `#${[lerp(a.r, b.r, t), lerp(a.g, b.g, t), lerp(a.b, b.b, t)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
  };

  const rgb = hexToRgb(primary);
  const soft = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`;
  const activeBg = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`;
  const border = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`;
  const hover = mix(primary, '#000000', 0.2);

  return {
    name: 'Custom',
    primary,
    hover,
    soft,
    activeBg,
    border,
    gradient: `linear-gradient(135deg, ${primary} 0%, ${hover} 100%)`,
  };
};

export const ThemeProvider = ({ children }) => {
  const [primaryColor, setPrimaryColor] = useState(() => {
    return localStorage.getItem('appThemeColor') || THEMES.green.primary;
  });

  // Apply CSS variables whenever the color changes
  useEffect(() => {
    const theme = buildThemeFromColor(primaryColor);
    const root = document.documentElement;
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--primary-hover', theme.hover);
    root.style.setProperty('--primary-soft', theme.soft);
    root.style.setProperty('--primary-active-bg', theme.activeBg);
    root.style.setProperty('--primary-border', theme.border);
    root.style.setProperty('--primary-gradient', theme.gradient);
    localStorage.setItem('appThemeColor', primaryColor);
  }, [primaryColor]);

  const setTheme = useCallback((color) => {
    setPrimaryColor(color);
  }, []);

  return (
    <ThemeContext.Provider value={{ primaryColor, setTheme, THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
