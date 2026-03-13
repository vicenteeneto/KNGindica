import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';

// IMPORTANT: Replace this with your actual Public VAPID Key
// You can generate one using the 'web-push' library or online tools
const VAPID_PUBLIC_KEY = 'BEO-Placeholder-Key-Replace-This-With-Your-Actual-Vapid-Key';

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const getSubscription = useCallback(async (registration: ServiceWorkerRegistration) => {
    try {
      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub);
      return sub;
    } catch (err) {
      console.error('Error getting subscription:', err);
      return null;
    }
  }, []);

  const saveSubscription = useCallback(async (sub: PushSubscription) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_push_subscriptions')
        .upsert({
          user_id: user.id,
          subscription: sub.toJSON(),
          device_info: navigator.userAgent,
          active: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, subscription' }); // Requires a unique index on (user_id, subscription) or just handling it by endpoint

      if (error) throw error;
      console.log('Subscription saved to database');
    } catch (err) {
      console.error('Error saving subscription:', err);
    }
  }, [user]);

  const subscribeUser = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push messaging is not supported');
      return;
    }

    setLoading(true);
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        throw new Error('Permission not granted for notifications');
      }

      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      setSubscription(sub);
      await saveSubscription(sub);
    } catch (err) {
      console.error('Error subscribing user:', err);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeUser = async () => {
    if (!subscription) return;

    setLoading(true);
    try {
      await subscription.unsubscribe();
      if (user) {
        await supabase
          .from('user_push_subscriptions')
          .delete()
          .match({ user_id: user.id, 'subscription->endpoint': subscription.endpoint });
      }
      setSubscription(null);
    } catch (err) {
      console.error('Error unsubscribing user:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);
          getSubscription(registration);
        })
        .catch(err => {
          console.error('Service Worker registration failed:', err);
        });
    }
  }, [getSubscription]);

  return {
    permission,
    subscription,
    subscribeUser,
    unsubscribeUser,
    loading
  };
}
