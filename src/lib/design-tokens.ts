/**
 * Apple-like Design Token System
 * 
 * Defines spacing, colors, typography, shadows, radius, and motion tokens
 * following Apple Human Interface Guidelines principles.
 */

// ============================================================================
// SPACING SCALE (8px base unit)
// ============================================================================
export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
} as const;

// ============================================================================
// BORDER RADIUS (Apple-like rounded corners)
// ============================================================================
export const radius = {
  none: '0',
  sm: '0.5rem',      // 8px - small elements
  md: '0.75rem',     // 12px - buttons, inputs
  lg: '1rem',        // 16px - cards
  xl: '1.5rem',      // 24px - large cards
  '2xl': '2rem',     // 32px - modals, sheets
  '3xl': '2.5rem',   // 40px - hero sections
  full: '9999px',    // pills, avatars
} as const;

// ============================================================================
// SHADOWS (Elevation levels like iOS)
// ============================================================================
export const shadows = {
  // Light mode
  light: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  // Dark mode (subtle, less contrast)
  dark: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
  },
} as const;

// ============================================================================
// ELEVATION LEVELS (iOS-like z-index + shadow system)
// ============================================================================
export const elevation = {
  base: {
    z: 0,
    shadow: 'sm',
  },
  card: {
    z: 1,
    shadow: 'md',
  },
  raised: {
    z: 2,
    shadow: 'lg',
  },
  overlay: {
    z: 10,
    shadow: 'xl',
  },
  modal: {
    z: 50,
    shadow: '2xl',
  },
  toast: {
    z: 100,
    shadow: 'lg',
  },
} as const;

// ============================================================================
// MOTION (Apple-like timing and easing)
// ============================================================================
export const motion = {
  // Durations (ms)
  duration: {
    instant: 90,      // Micro-interactions
    fast: 140,        // Quick transitions
    normal: 200,      // Standard UI transitions
    slow: 260,        // Complex animations
    slower: 400,      // Page transitions
  },
  // Easing curves (CSS cubic-bezier)
  easing: {
    // Standard iOS easing
    standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    // Decelerate (ease-out)
    decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    // Accelerate (ease-in)
    accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
    // Spring-like (for interactive elements)
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    // Linear
    linear: 'linear',
  },
  // Spring configs for Framer Motion
  spring: {
    gentle: { type: 'spring', stiffness: 300, damping: 30 },
    wobbly: { type: 'spring', stiffness: 180, damping: 12 },
    stiff: { type: 'spring', stiffness: 500, damping: 40 },
  },
} as const;

// ============================================================================
// TYPOGRAPHY SCALE (SF Pro Text inspired)
// ============================================================================
export const typography = {
  fontFamily: {
    sans: [
      'SF Pro Text',
      '-apple-system',
      'BlinkMacSystemFont',
      'system-ui',
      'sans-serif',
    ].join(', '),
    mono: [
      'SF Mono',
      'Monaco',
      'Menlo',
      'monospace',
    ].join(', '),
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],    // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }], // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],  // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],   // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// ============================================================================
// COLOR PALETTE (Apple-like grays + accent)
// ============================================================================
export const colors = {
  // Base grays (light mode)
  gray: {
    50: '#fafafa',
    100: '#f5f5f7',
    200: '#e8e8ed',
    300: '#d2d2d7',
    400: '#a1a1a6',
    500: '#86868b',
    600: '#636366',
    700: '#48484a',
    800: '#1d1d1f',
    900: '#000000',
  },
  // Dark mode grays
  dark: {
    50: '#0a0a0a',
    100: '#1d1d1f',
    200: '#2c2c2e',
    300: '#3a3a3c',
    400: '#48484a',
    500: '#636366',
    600: '#8e8e93',
    700: '#a1a1a6',
    800: '#c7c7cc',
    900: '#f5f5f7',
  },
  // Accent (Apple Blue)
  accent: {
    50: '#e3f2fd',
    100: '#bbdefb',
    200: '#90caf9',
    300: '#64b5f6',
    400: '#42a5f5',
    500: '#007aff', // Apple Blue
    600: '#0051d5',
    700: '#003d9e',
    800: '#002d6e',
    900: '#001d3f',
  },
  // Semantic colors
  semantic: {
    success: '#34c759',
    warning: '#ff9500',
    error: '#ff3b30',
    info: '#007aff',
  },
} as const;

// ============================================================================
// BLUR (Glass morphism effects)
// ============================================================================
export const blur = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '16px',
  xl: '24px',
  '2xl': '40px',
} as const;

// ============================================================================
// Z-INDEX SCALE
// ============================================================================
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
} as const;

