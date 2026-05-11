import axios from "axios";

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    // No response = network/connection problem
    if (!error.response) {
      return "No internet connection. Please check your connection and try again.";
    }

    const status = error.response.status;

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

    // For other 4xx errors, the server message is usually user-friendly (e.g. "Username already taken")
    const maybeMessage = error.response.data?.error?.message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
  }

  return fallback;
}
