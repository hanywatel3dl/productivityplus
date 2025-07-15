// Notification Manager with Service Worker support
export class NotificationManager {
  private static instance: NotificationManager;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  private constructor() {}

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  async initialize(): Promise<void> {
    // Check if Service Workers are supported in this environment
    if (!('serviceWorker' in navigator)) {
      console.info('Service Workers are not supported in this environment');
      return;
    }

    try {
      // Register service worker for background notifications
      this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully');
    } catch (error) {
      // Gracefully handle environments that don't support Service Workers (like StackBlitz)
      console.info('Service Worker registration skipped - not supported in this environment');
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.info('Notifications are not supported in this environment');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  async sendHabitsToServiceWorker(habits: any[]): Promise<void> {
    if (!this.serviceWorkerRegistration || !this.serviceWorkerRegistration.active) {
      console.info('Service Worker not available for habit updates');
      return;
    }

    this.serviceWorkerRegistration.active.postMessage({
      type: 'UPDATE_HABITS',
      habits
    });
  }

  async scheduleNotification(title: string, body: string, delay: number): Promise<void> {
    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      console.info('Notification permission not granted');
      return;
    }

    // For environments without Service Worker support, use simple setTimeout
    if (!this.serviceWorkerRegistration) {
      setTimeout(() => {
        new Notification(title, { body });
      }, delay);
      return;
    }

    // Use Service Worker for more reliable background notifications
    if (this.serviceWorkerRegistration.active) {
      this.serviceWorkerRegistration.active.postMessage({
        type: 'SCHEDULE_NOTIFICATION',
        title,
        body,
        delay
      });
    }
  }

  async showNotification(title: string, body: string): Promise<void> {
    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      console.info('Notification permission not granted');
      return;
    }

    new Notification(title, { body });
  }
}

// Initialize the notification manager
const notificationManager = NotificationManager.getInstance();

// Auto-initialize when the module is imported
notificationManager.initialize().catch(() => {
  // Silently handle initialization errors
});

export default notificationManager;

// Export convenience functions for backward compatibility
export const registerServiceWorker = () => notificationManager.initialize();
export const requestNotificationPermission = () => notificationManager.requestPermission();
export const sendHabitsToServiceWorker = (habits: any[]) => notificationManager.sendHabitsToServiceWorker(habits);