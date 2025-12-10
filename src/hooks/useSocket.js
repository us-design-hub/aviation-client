'use client';

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

/**
 * Custom hook for Socket.IO connection
 * - Automatically connects when user is logged in
 * - Handles authentication
 * - Manages connection state
 * - Provides methods to subscribe to events
 */
export function useSocket() {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    // Get user info from localStorage
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      return; // Don't connect if not logged in
    }

    const user = JSON.parse(userStr);

    // Determine Socket.IO URL dynamically (client-side)
    const SOCKET_URL = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1'
      ? 'http://localhost:4000'
      : process.env.NEXT_PUBLIC_API_URL;

    if (!SOCKET_URL) {
      console.error('❌ CRITICAL: NEXT_PUBLIC_API_URL is not set for Socket.IO connection!');
      return;
    }

    console.log('🔗 Socket.IO URL:', SOCKET_URL);
    console.log('🌐 Hostname:', window.location.hostname);

    // Initialize Socket.IO connection
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('✅ Socket.IO connected:', socket.id);
      setIsConnected(true);
      setConnectionError(null);

      // Authenticate with user ID
      socket.emit('authenticate', { userId: user.id });
    });

    socket.on('authenticated', (data) => {
      if (data.success) {
        console.log('✅ Socket.IO authenticated for user:', data.userId);
      } else {
        console.error('❌ Socket.IO authentication failed:', data.message);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('reconnect_error', (error) => {
      console.error('❌ Socket.IO reconnection error:', error.message);
    });

    socket.on('reconnect_failed', () => {
      console.error('❌ Socket.IO reconnection failed after maximum attempts');
      setConnectionError('Failed to reconnect after multiple attempts');
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        console.log('🔌 Disconnecting Socket.IO');
        socket.disconnect();
      }
    };
  }, []);

  /**
   * Subscribe to a specific event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} - Unsubscribe function
   */
  const on = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
      
      // Return unsubscribe function
      return () => {
        if (socketRef.current) {
          socketRef.current.off(event, callback);
        }
      };
    }
    return () => {};
  };

  /**
   * Emit an event to the server
   * @param {string} event - Event name
   * @param {any} data - Data to send
   */
  const emit = (event, data) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('⚠️ Socket not connected, cannot emit event:', event);
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    on,
    emit,
  };
}

