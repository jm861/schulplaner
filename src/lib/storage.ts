export const isBrowser = () => typeof window !== "undefined";

// Check if localStorage is available (mobile browsers sometimes block it)
function isLocalStorageAvailable(): boolean {
  if (!isBrowser()) return false;
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

export function readJSON<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  if (!isLocalStorageAvailable()) {
    console.warn('[storage] localStorage not available');
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error('[storage] Error reading from localStorage:', error);
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): boolean {
  if (!isBrowser()) return false;
  if (!isLocalStorageAvailable()) {
    console.warn('[storage] localStorage not available, cannot write');
    return false;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    // Verify write on mobile (some mobile browsers have async localStorage)
    const verify = window.localStorage.getItem(key);
    if (verify === null && value !== null) {
      console.warn('[storage] Write verification failed, retrying...');
      // Retry once
      window.localStorage.setItem(key, JSON.stringify(value));
    }
    return true;
  } catch (error) {
    console.error('[storage] Error writing to localStorage:', error);
    // Check if it's a quota error
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('[storage] localStorage quota exceeded');
    }
    return false;
  }
}

