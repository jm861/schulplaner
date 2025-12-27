/**
 * Haptics Integration
 * Optional haptic feedback for Capacitor/Mobile
 */

/**
 * Trigger haptic feedback
 * Falls back to no-op if not available
 */
export async function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') {
  try {
    // Check if Capacitor is available
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      // Dynamic import with error handling - module might not be installed
      // Using string literal to avoid TypeScript checking at build time
      try {
        const modulePath = '@capacitor/haptics';
        const HapticsModule = await (eval(`import('${modulePath}')`) as Promise<any>).catch(() => null);
        if (!HapticsModule) return;
        
        const { Haptics } = HapticsModule;
        
        switch (type) {
          case 'light':
            await Haptics.impact({ style: 'LIGHT' });
            break;
          case 'medium':
            await Haptics.impact({ style: 'MEDIUM' });
            break;
          case 'heavy':
            await Haptics.impact({ style: 'HEAVY' });
            break;
          case 'success':
            await Haptics.notification({ type: 'SUCCESS' });
            break;
          case 'warning':
            await Haptics.notification({ type: 'WARNING' });
            break;
          case 'error':
            await Haptics.notification({ type: 'ERROR' });
            break;
        }
      } catch (importError) {
        // Module not available, silently fail
        console.debug('Haptics module not available');
      }
    }
  } catch (error) {
    // Haptics not available, silently fail
    console.debug('Haptics not available:', error);
  }
}

/**
 * Check if haptics are available
 */
export function isHapticsAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).Capacitor;
}

