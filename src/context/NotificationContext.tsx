import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { API_BASE } from '../config';

interface NotificationContextType {
  unreadCount: number;
  subscribeToPush: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  subscribeToPush: async () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!token) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const connectWs = () => {
      // Need to establish connection, ensure token middleware handles ?token= query param on WS
      const wsUrl = API_BASE.replace('http://', 'ws://').replace('https://', 'wss://').replace('/api', '') + `/ws/notifications/?token=${token}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_notification') {
            const notif = data.notification;
            toast.info(notif.title, {
              description: notif.message,
              action: notif.link ? {
                label: 'View',
                onClick: () => window.open(notif.link, '_blank')
              } : undefined
            });
            setUnreadCount(prev => prev + 1);
          }
        } catch (e) {
          console.error("Failed to parse notification", e);
        }
      };

      ws.onclose = () => {
        setTimeout(() => {
          if (token) connectWs();
        }, 5000);
      };
    };

    connectWs();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [token]);

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error('Push notifications are not supported by your browser.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Notification permission denied.');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!publicVapidKey) {
          console.error("VITE_VAPID_PUBLIC_KEY is not defined in env");
          toast.error("VAPID public key missing. Check env.");
          return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });

      const response = await fetch(`${API_BASE}/workspace/notifications/subscribe/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(subscription)
      });
      
      if (!response.ok) throw new Error("Failed to subscribe");

      toast.success('Successfully subscribed to notifications!');
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Failed to subscribe to push notifications.');
    }
  };

  return (
    <NotificationContext.Provider value={{ unreadCount, subscribeToPush }}>
      {children}
    </NotificationContext.Provider>
  );
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
