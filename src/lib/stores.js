import { writable, derived } from 'svelte/store';

// ── Notification System ─────────────────────────────────────────────────────
// Each notification: { id, type: 'info'|'success'|'warning'|'error', message, timestamp }
export const notifications = writable([]);

let _notifId = 0;

/**
 * Push a notification toast. Auto-removes after `duration` ms (default 4s).
 * @param {string} message
 * @param {'info'|'success'|'warning'|'error'} type
 * @param {number} duration  ms before auto-dismiss (0 = persistent)
 */
export function notify(message, type = 'info', duration = 4000) {
  const id = ++_notifId;
  notifications.update(n => [...n, { id, type, message, timestamp: Date.now() }]);
  if (duration > 0) {
    setTimeout(() => dismissNotification(id), duration);
  }
  return id;
}

export function dismissNotification(id) {
  notifications.update(n => n.filter(x => x.id !== id));
}

// ── Sync / Cloud Status ──────────────────────────────────────────────────────
// 'idle' | 'syncing' | 'error'
export const syncStatus = writable('idle');
