import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import api from "./api";

/**
 * Initialise push notifications for the currently logged-in user.
 *
 * - Only runs on native (Android / iOS). No-op on web.
 * - Requests permission, registers with FCM/APNs, and sends the device token
 *   to the backend so the server can dispatch push notifications when the app
 *   is backgrounded or closed.
 *
 * Call this once after the user successfully logs in.
 */
export async function initPushNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  // Request permission (Android 13+ and iOS require explicit permission)
  const permResult = await PushNotifications.requestPermissions();
  if (permResult.receive !== "granted") return;

  // Register with FCM (Android) or APNs (iOS)
  await PushNotifications.register();

  // On successful registration, send the token to the backend
  PushNotifications.addListener("registration", async (token) => {
    const platform = Capacitor.getPlatform() === "ios" ? "apns" : "fcm";
    try {
      await api.post("/users/me/push-token", { token: token.value, platform });
    } catch {
      // Non-critical — the user can still use the app; they just won't get push notifications
    }
  });

  // Log registration errors (not thrown — push is non-critical)
  PushNotifications.addListener("registrationError", (err) => {
    console.warn("Push notification registration error:", err.error);
  });
}
