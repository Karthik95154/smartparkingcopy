import { Platform } from 'react-native';
import type { LinearGradientProps } from 'expo-linear-gradient';

const tintColorLight = '#4F46E5';   // deeper indigo (premium)
const tintColorDark = '#818CF8';

export const Colors = {
  light: {
    text: '#0F172A',          // richer black
    background: '#F1F5F9',    // softer background
    tint: tintColorLight,
    icon: '#475569',          // improved contrast
    tabIconDefault: '#94A3B8',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#F8FAFC',
    background: '#020617',    // deeper dark (premium feel)
    tint: tintColorDark,
    icon: '#CBD5E1',
    tabIconDefault: '#64748B',
    tabIconSelected: tintColorDark,
  },
};

type GradientColors = LinearGradientProps['colors'];

// ✨ PREMIUM COLOR PALETTE (UPGRADED)
export const Palette = {
  primary: '#4F46E5',      // deeper indigo (less childish)
  secondary: '#DB2777',    // refined pink
  success: '#16A34A',      // richer green
  warning: '#F59E0B',
  danger: '#DC2626',       // deeper red
  info: '#2563EB',         // cleaner blue
  light: '#7a35cf',        // softer light
  
  // 🌈 PREMIUM GRADIENTS (LESS HARSH, MORE SMOOTH)
  gradients: {
    primary: ['#4F46E5', '#7C3AED'] as GradientColors,
    secondary: ['#DB2777', '#F97316'] as GradientColors,
    success: ['#16A34A', '#0891B2'] as GradientColors,
    warm: ['#F59E0B', '#DB2777'] as GradientColors,
    cool: ['#2563EB', '#06B6D4'] as GradientColors,
    dark: ['#0F172A', '#1E293B'] as GradientColors,
  },

  // 🎯 BACKGROUND SYSTEM (MORE PREMIUM)
  bg: {
    light: '#FFFFFF',
    lighter: '#F8FAFC',
    secondary: '#F1F5F9',
  },
  
  // ✍️ TEXT SYSTEM (BETTER HIERARCHY)
  text: {
    primary: '#0F172A',     // strong primary
    secondary: '#475569',   // softer secondary
    tertiary: '#94A3B8',
    light: '#CBD5E1',
  },

  border: '#E2E8F0',
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});