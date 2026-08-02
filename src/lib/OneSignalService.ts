import { supabase } from './supabase';

/**
 * Integração com o OneSignal Web SDK v16.
 *
 * O projeto tinha dois sistemas de push concorrentes (OneSignal + Web Push/VAPID
 * próprio), ambos com chaves placeholder. Ficou só o OneSignal, que não exige
 * backend para disparar notificações. O Web Push próprio foi removido.
 *
 * O SDK é carregado por <script> no index.html e responde pela fila global
 * OneSignalDeferred. Sem VITE_ONESIGNAL_APP_ID configurado, tudo vira no-op —
 * o app funciona normalmente, apenas sem push.
 */

declare global {
  interface Window {
    OneSignalDeferred?: Array<(oneSignal: any) => void | Promise<void>>;
  }
}

const APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID as string | undefined;

export const isPushConfigured = (): boolean => !!APP_ID;

const enqueue = (fn: (oneSignal: any) => void | Promise<void>) => {
  if (typeof window === 'undefined' || !APP_ID) return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(fn);
};

let initialized = false;

/** Inicializa o SDK e associa a inscrição ao usuário logado. */
export const initOneSignal = (userId: string | undefined) => {
  if (!userId) return;

  enqueue(async (OneSignal) => {
    try {
      if (!initialized) {
        await OneSignal.init({
          appId: APP_ID,
          allowLocalhostAsSecureOrigin: true,
        });
        initialized = true;
      }

      // Vincula o dispositivo ao usuário para permitir envio por external id.
      await OneSignal.login(userId);

      const persistSubscription = async () => {
        const subscriptionId = OneSignal.User?.PushSubscription?.id;
        if (!subscriptionId) return;
        await supabase
          .from('profiles')
          .update({ onesignal_id: subscriptionId })
          .eq('id', userId);
      };

      await persistSubscription();
      OneSignal.User?.PushSubscription?.addEventListener?.('change', persistSubscription);
    } catch (err) {
      console.error('Falha ao inicializar OneSignal:', err);
    }
  });
};

/** Abre o prompt nativo de permissão de notificações. */
export const requestNotificationPermission = () => {
  enqueue(async (OneSignal) => {
    try {
      await OneSignal.Notifications.requestPermission();
    } catch (err) {
      console.error('Falha ao solicitar permissão de push:', err);
    }
  });
};

/** Permissão atual do navegador, sem depender do SDK ter carregado. */
export const getPushPermission = (): NotificationPermission => {
  if (typeof Notification === 'undefined') return 'denied';
  return Notification.permission;
};
