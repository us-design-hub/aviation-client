'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useSocket() {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socketUrl =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:4000'
        : process.env.NEXT_PUBLIC_API_URL;

    if (!socketUrl) {
      console.error('Socket URL is not configured');
      return;
    }

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      socket.emit('authenticate', { token });
    });

    socket.on('authenticated', (data) => {
      if (!data.success) {
        setConnectionError(data.message || 'Socket authentication failed');
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      setConnectionError(error.message);
      setIsConnected(false);
    });

    socket.on('reconnect', () => {
      setIsConnected(true);
      setConnectionError(null);
      socket.emit('authenticate', { token });
    });

    socket.on('reconnect_failed', () => {
      setConnectionError('Failed to reconnect after multiple attempts');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, []);

  const on = useCallback((event, callback) => {
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on(event, callback);
    return () => socket.off(event, callback);
  }, []);

  const emit = useCallback((event, data) => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit(event, data);
    }
  }, []);

  return {
    isConnected,
    connectionError,
    on,
    emit,
  };
}
