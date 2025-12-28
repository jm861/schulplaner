/**
 * Theme Provider using next-themes
 * Handles Light/Dark/System theme switching with proper SSR support
 */

'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ReactNode } from 'react';

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
      storageKey="schulplaner:theme"
    >
      {children}
    </NextThemesProvider>
  );
}

// Re-export useTheme hook from next-themes
export { useTheme } from 'next-themes';
