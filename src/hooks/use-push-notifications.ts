import { useState, useEffect, useCallback } from 'react';

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    setIsSupported('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window);
    
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      throw new Error('Notifications are not supported in this browser');
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const subscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Workers are not supported');
    }

    if (permission !== 'granted') {
      const perm = await requestPermission();
      if (perm !== 'granted') {
        throw new Error('Notification permission denied');
      }
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        setSubscription(existingSubscription);
        return existingSubscription;
      }
      
      // For now, we'll use local notifications (no push server required)
      // In the future, you can add VAPID keys for web push
      // Note: Without VAPID key, some browsers may not allow subscription
      try {
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          // applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) // Add if you want web push
        });

        setSubscription(sub);
        
        // Store subscription in localStorage for now
        // In production, send to your backend
        const subscriptionData = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')!))),
            auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')!))),
          },
        };
        localStorage.setItem('push-subscription', JSON.stringify(subscriptionData));
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[push] Subscription successful:', subscriptionData);
        }

        return sub;
      } catch (pushError: any) {
        // If push subscription fails (e.g., no VAPID key), we can still use local notifications
        if (process.env.NODE_ENV === 'development') {
          console.warn('[push] Push subscription failed, using local notifications only:', pushError);
        }
        // Still allow local notifications to work
        setSubscription(null);
        return null;
      }
    } catch (error) {
      console.error('[push] Subscription failed:', error);
      throw error;
    }
  }, [permission, requestPermission]);

  const unsubscribe = useCallback(async () => {
    if (subscription) {
      await subscription.unsubscribe();
      setSubscription(null);
      localStorage.removeItem('push-subscription');
    }
  }, [subscription]);

  const sendLocalNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (permission !== 'granted') {
      console.warn('[push] Notification permission not granted');
      return;
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          ...options,
        });
      });
    } else {
      new Notification(title, {
        icon: '/favicon.ico',
        ...options,
      });
    }
  }, [permission]);

  return {
    isSupported,
    permission,
    subscription,
    requestPermission,
    subscribe,
    unsubscribe,
    sendLocalNotification,
  };
}


