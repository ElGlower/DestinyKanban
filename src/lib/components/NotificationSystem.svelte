<script>
  import { notifications, dismissNotification } from '../stores.js';

  const ICONS = {
    success: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info:    `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  };
</script>

<div class="notif-container" aria-live="polite" aria-label="Notificaciones">
  {#each $notifications as notif (notif.id)}
    <div
      class="notif notif-{notif.type}"
      role="alert"
    >
      <span class="notif-icon" aria-hidden="true">{@html ICONS[notif.type] ?? ICONS.info}</span>
      <span class="notif-msg">{notif.message}</span>
      <button
        class="notif-close"
        onclick={() => dismissNotification(notif.id)}
        aria-label="Cerrar notificación"
        title="Cerrar"
      >
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  {/each}
</div>

<style>
  .notif-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 99999;
    pointer-events: none;
    max-width: 360px;
    width: calc(100vw - 40px);
  }

  .notif {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 0.82rem;
    font-family: var(--font-family, monospace);
    letter-spacing: 0.4px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    pointer-events: all;
    border-left: 3px solid transparent;
    animation: notifSlideIn 0.22s cubic-bezier(0.22, 1, 0.36, 1) both;
    will-change: transform, opacity;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  @keyframes notifSlideIn {
    from {
      opacity: 0;
      transform: translateX(30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .notif-success {
    background: rgba(30, 40, 30, 0.92);
    border-left-color: #a6e3a1;
    color: #a6e3a1;
  }
  .notif-error {
    background: rgba(40, 20, 20, 0.92);
    border-left-color: #f38ba8;
    color: #f38ba8;
  }
  .notif-warning {
    background: rgba(40, 35, 15, 0.92);
    border-left-color: #f9e2af;
    color: #f9e2af;
  }
  .notif-info {
    background: rgba(20, 25, 45, 0.92);
    border-left-color: #89b4fa;
    color: #89b4fa;
  }

  .notif-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  .notif-msg {
    flex: 1;
    line-height: 1.4;
    word-break: break-word;
  }

  .notif-close {
    background: none;
    border: none;
    cursor: pointer;
    padding: 2px;
    color: inherit;
    opacity: 0.6;
    display: flex;
    align-items: center;
    border-radius: 4px;
    transition: opacity 0.15s;
    flex-shrink: 0;
  }
  .notif-close:hover {
    opacity: 1;
  }
</style>
