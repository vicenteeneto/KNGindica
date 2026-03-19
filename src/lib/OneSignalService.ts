import { supabase } from './supabase';

declare global {
  interface Window {
    OneSignal: any;
  }
}

export const initOneSignal = async (userId: string | undefined) => {
  if (typeof window === 'undefined') return;

  const OneSignal = window.OneSignal || [];

  OneSignal.push(function() {
    OneSignal.init({
      appId: "YOUR_ONESIGNAL_APP_ID", // TODO: Replace with user's ID
      safari_web_id: "web.onesignal.auto.69a66d0c-611a-4d4b-97e3-0c1fc9940714",
      notifyButton: {
        enable: false,
      },
      allowLocalhostAsSecureOrigin: true,
    });

    if (userId) {
      OneSignal.setExternalUserId(userId);
      
      OneSignal.on('subscriptionChange', async (isSubscribed: boolean) => {
        if (isSubscribed) {
          const deviceState = await OneSignal.getDeviceState();
          if (deviceState && deviceState.userId) {
            await supabase
              .from('profiles')
              .update({ 
                onesignal_id: deviceState.userId,
                push_token: deviceState.pushToken 
              })
              .eq('id', userId);
          }
        }
      });
    }
  });
};

export const requestNotificationPermission = () => {
    if (typeof window === 'undefined') return;
    const OneSignal = window.OneSignal || [];
    OneSignal.push(function() {
        OneSignal.showNativePrompt();
    });
};
