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
      const { Haptics } = await import('@capacitor/haptics');
      
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

