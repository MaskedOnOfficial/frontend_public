import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { App } from '@capacitor/app';

/**
 * Initialize native Capacitor plugins when running on a mobile device.
 * On web this is a no-op.
 */
export async function initCapacitor(navigate: (path: string) => void) {
  if (!Capacitor.isNativePlatform()) return;

  // ── Status Bar ──
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#030712' });
  } catch {
    // Ignore — plugin may not be available on all platforms
  }

  // ── Splash Screen ──
  try {
    await SplashScreen.hide();
  } catch {
    // Auto-hidden by config
  }

  // ── Keyboard ──
  try {
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-visible');
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-visible');
    });
  } catch {
    // Not available on this platform
  }

  // ── Back Button (Android) ──
  // Modals/lightboxes dispatch a custom event before history.back() so
  // the React layer can close the top-most overlay instead of navigating.
  App.addListener('backButton', ({ canGoBack }) => {
    // Let any open modal/lightbox handle the back button first
    const consumed = window.dispatchEvent(new CustomEvent('capacitor:backButton', { cancelable: true }));
    // If the event was NOT cancelled, a modal consumed it
    if (!consumed) return;

    if (canGoBack) {
      window.history.back();
    } else {
      App.exitApp();
    }
  });

  // ── Deep Links ──
  // Whitelist allowed path prefixes to prevent open-redirect attacks
  const ALLOWED_DEEP_LINK_PREFIXES = [
    '/parties/', '/profile/', '/feed', '/auth/',
    '/dashboard', '/settings', '/notifications',
    '/search', '/create-party',
  ];

  App.addListener('appUrlOpen', ({ url }) => {
    let path = '';
    try {
      const parsed = new URL(url);
      path = parsed.pathname + parsed.search;
    } catch {
      path = url.replace(/^maskon:\/\//, '/').replace(/^https?:\/\/[^/]+/, '');
    }
    // Only navigate to known app routes
    if (path && path !== '/' && ALLOWED_DEEP_LINK_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      navigate(path);
    }
  });
}

/**
 * Update the native status bar style to match the current app theme.
 * Call this when the user toggles dark/light mode.
 */
export async function setNativeTheme(theme: 'dark' | 'light') {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#030712' : '#F8FAFC' });
  } catch {
    // no-op
  }
}

/**
 * Returns true when running inside a native Capacitor shell (Android/iOS).
 */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Returns the current platform: 'ios' | 'android' | 'web'
 */
export function getPlatform(): string {
  return Capacitor.getPlatform();
}
