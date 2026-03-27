import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth-hook";
import io from "socket.io-client";

const WS_URL = (import.meta.env.VITE_WS_URL as string | undefined)?.trim();

interface FrontendNotification {
  id: string;
  type: string;
  title: string;
  body?: string;
  reference_id?: string;
  reference_type?: string;
}

/**
 * Hook for real-time notifications via WebSocket
 * Automatically connects when user is logged in and disconnects on logout
 */
export function useNotifications() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notification, setNotification] = useState<FrontendNotification | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!user) {
      setIsConnected(false);
      setUnreadCount(0);
      return;
    }

    // Get token from localStorage (set during auth)
    const token = localStorage.getItem("access_token") || localStorage.getItem("auth_token");
    if (!token) {
      return;
    }

    // Prefer explicit env var in production; fallback keeps local development simple.
    const wsUrl =
      WS_URL ||
      (window.location.hostname === "localhost"
        ? "ws://localhost:5000"
        : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`);

    const newSocket = io(wsUrl, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // Connection event
    newSocket.on("connect", () => {
      setIsConnected(true);
      setSocketError(null);
    });

    // Disconnect event
    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    // New notification event
    newSocket.on("notification:new", (notif: FrontendNotification) => {
      setNotification(notif);
      // Increment unread count
      setUnreadCount((prev) => prev + 1);
    });

    // Unread count update
    newSocket.on("notification:unread-count", (data: { count: number }) => {
      setUnreadCount(data.count);
    });

    // Error event
    newSocket.on("error", (err: string) => {
      setSocketError(err);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  // Function to manually update unread count (for when user marks notifications as read)
  const updateUnreadCount = useCallback((count: number) => {
    setUnreadCount(count);
  }, []);

  return {
    unreadCount,
    notification,
    isConnected,
    socketError,
    updateUnreadCount,
  };
}
