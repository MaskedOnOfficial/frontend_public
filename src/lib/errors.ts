import axios from "axios";

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    // No response = network/connection problem
    if (!error.response) {
      return "No internet connection. Please check your connection and try again.";
    }

    const status = error.response.status;

    // Always prefer the server's own message when it's user-friendly (e.g. "Invalid email or password")
    const maybeMessage = error.response.data?.error?.message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage.trim();
    }

    if (status === 401) {
      return "Your session has expired. Please sign in again.";
    }

    if (status === 403) {
      return "You don't have permission to do this.";
    }

    if (status === 429) {
      return "Too many attempts. Please wait a moment and try again.";
    }

    if (status >= 500) {
      return "We're having trouble connecting to the server. Please try again in a moment.";
    }
  }

  return fallback;
}
