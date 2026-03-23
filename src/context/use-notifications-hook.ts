import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth-hook";
import io, { Socket } from "socket.io-client";

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
  const [socket, setSocket] = useState<Socket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!user) {
      setIsConnected(false);
      setUnreadCount(0);
      return;
    }

    // Get token from localStorage (set during auth)
    const token = localStorage.getItem("auth_token");
    if (!token) {
      return;
    }

    console.log("📱 Connecting to notification WebSocket...");

    // Determine WebSocket URL based on environment
    const wsUrl = window.location.hostname === "localhost"
      ? "ws://localhost:5000"
      : `wss://${window.location.host}`;

    const newSocket = io(wsUrl, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // Connection event
    newSocket.on("connect", () => {
      console.log("✓ WebSocket connected");
      setIsConnected(true);
      setSocketError(null);
    });

    // Disconnect event
    newSocket.on("disconnect", () => {
      console.log("✗ WebSocket disconnected");
      setIsConnected(false);
    });

    // New notification event
    newSocket.on("notification:new", (notif: FrontendNotification) => {
      console.log("🔔 New notification:", notif);
      setNotification(notif);
      // Increment unread count
      setUnreadCount((prev) => prev + 1);
    });

    // Unread count update
    newSocket.on("notification:unread-count", (data: { count: number }) => {
      console.log("📊 Unread count:", data.count);
      setUnreadCount(data.count);
    });

    // Error event
    newSocket.on("error", (err: string) => {
      console.error("🔴 WebSocket error:", err);
      setSocketError(err);
    });

    setSocket(newSocket);

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
