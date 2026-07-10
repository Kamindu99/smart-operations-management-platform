import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import type { Notification } from '../types';

let socketInstance: Socket | null = null;

export const useSocket = () => {
  const { token, addNotification } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    if (!socketInstance) {
      socketInstance = io('/', {
        auth: { token },
        transports: ['websocket', 'polling'],
      });
    }

    socketRef.current = socketInstance;
    const socket = socketInstance;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('notification', (notif: Notification) => {
      addNotification(notif);
    });

    socket.on('task:updated', () => {
      // dispatch to refresh tasks if needed
      window.dispatchEvent(new CustomEvent('somp:task:updated'));
    });

    socket.on('project:updated', () => {
      window.dispatchEvent(new CustomEvent('somp:project:updated'));
    });

    return () => {
      socket.off('notification');
      socket.off('task:updated');
      socket.off('project:updated');
    };
  }, [token, addNotification]);

  return socketRef.current;
};
