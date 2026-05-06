export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

const AUTH_SYNC_KEY = "auth-sync-event";
const AUTH_CHANNEL_NAME = "auth-sync";

export function notifyAuthChanged() {
  const payload = String(Date.now());

  try {
    localStorage.setItem(AUTH_SYNC_KEY, payload);
  } catch {
    // ignore storage errors
  }

  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
    channel.postMessage(payload);
    channel.close();
  }
}

export function subscribeToAuthChanges(onChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === AUTH_SYNC_KEY) {
      onChange();
    }
  };

  window.addEventListener("storage", handleStorage);

  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
    channel.onmessage = () => onChange();
  }

  return () => {
    window.removeEventListener("storage", handleStorage);
    channel?.close();
  };
}

// Redirect to login with a toast notification
export function redirectToLogin(toast?: (options: { title: string; description: string; variant: string }) => void) {
  if (toast) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
  }
  setTimeout(() => {
    window.location.href = "/api/login";
  }, 500);
}
