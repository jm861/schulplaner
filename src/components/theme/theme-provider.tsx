'use client';

import { useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const root = document.documentElement;
    
    // Get theme preference from localStorage or default to 'system'
    const getStoredTheme = (): Theme => {
      try {
        const stored = localStorage.getItem('schulplaner:theme') as Theme | null;
        return stored && ['light', 'dark', 'system'].includes(stored) ? stored : 'system';
      } catch {
        return 'system';
      }
    };
    
    // Determine actual theme (system, light, or dark)
    const getActualTheme = (): 'light' | 'dark' => {
      const storedTheme = getStoredTheme();
      if (storedTheme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return storedTheme;
    };
    
    // Apply theme
    const applyTheme = () => {
      const theme = getActualTheme();
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
      root.style.colorScheme = theme;
      
      // Force a reflow to ensure the class is applied
      void root.offsetHeight;
      
      // Debug log
      console.log('[Theme] Applied theme:', theme, 'Class:', root.classList.contains('dark') ? 'dark' : 'light');
    };
    
    // Apply initial theme
    applyTheme();
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const storedTheme = getStoredTheme();
      if (storedTheme === 'system') {
        applyTheme();
      }
    };
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }
    
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}

// Hook to get and set theme
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem('schulplaner:theme') as Theme | null;
      setThemeState(stored && ['light', 'dark', 'system'].includes(stored) ? stored : 'system');
    } catch {
      setThemeState('system');
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    try {
      localStorage.setItem('schulplaner:theme', newTheme);
      setThemeState(newTheme);
      
      const root = document.documentElement;
      let actualTheme: 'light' | 'dark';
      
      if (newTheme === 'system') {
        actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        actualTheme = newTheme;
      }
      
      // Force remove all theme classes first
      root.classList.remove('light', 'dark');
      
      // Add the new theme class
      root.classList.add(actualTheme);
      root.style.colorScheme = actualTheme;
      
      // Force a reflow to ensure the class is applied
      void root.offsetHeight;
      
      // Debug log
      console.log('[Theme] Set theme:', newTheme, '→', actualTheme, 'Class:', root.classList.contains('dark') ? 'dark' : 'light');
    } catch (error) {
      console.error('[Theme] Error setting theme:', error);
    }
  };

  return { theme: mounted ? theme : 'system', setTheme };
}

