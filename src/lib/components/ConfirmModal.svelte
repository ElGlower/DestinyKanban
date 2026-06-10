<script>
  // Props
  let { 
    show = $bindable(false), 
    title = "CONFIRMAR ELIMINACIÓN", 
    message = "", 
    confirmText = "ELIMINAR TABLERO", 
    cancelText = "CANCELAR", 
    matchText = "", // If provided, user must type this exact text to confirm
    onConfirm 
  } = $props();

  let userInput = $state("");

  $effect(() => {
    if (show) {
      userInput = "";
    }
  });

  const isValid = $derived(!matchText || userInput.trim() === matchText.trim());

  function handleConfirm() {
    if (!isValid) return;
    onConfirm();
    show = false;
  }
</script>

{#if show}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="modal-backdrop" onclick={() => show = false} role="presentation">
    <div class="modal neumorphic-modal" onclick={(e) => e.stopPropagation()} role="presentation">
      <div class="modal-header">
        <h2>{title}</h2>
        <button class="btn-text" onclick={() => show = false}>[CERRAR]</button>
      </div>

      <div class="modal-body">
        <p class="warning-icon">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px;">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>ADVERTENCIA
        </p>
        <p class="message">{message}</p>

        {#if matchText}
          <div class="match-input-group">
            <label for="match-input">
              Escribe <strong>{matchText}</strong> para confirmar:
            </label>
            <input 
              id="match-input"
              type="text" 
              bind:value={userInput} 
              placeholder={matchText}
              class="form-control"
              autocomplete="off"
            />
          </div>
        {/if}
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick={() => show = false}>
          {cancelText}
        </button>
        <button 
          class="btn btn-danger" 
          onclick={handleConfirm}
          disabled={!isValid}
        >
          {confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
.modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.85);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 300; /* High z-index to be on top of everything */
    font-family: var(--font-family, 'JetBrains Mono', monospace);
  }

  .modal {
    background-color: #121212;
    border: 1px solid #1e1e1e;
    width: 90%;
    max-width: 460px;
    padding: 25px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .neumorphic-modal {
    box-shadow: 
      -5px -5px 15px rgba(255, 255, 255, 0.02),
      5px 5px 15px rgba(0, 0, 0, 0.6);
    border-radius: 12px;
    border: 1px solid #282828;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #1e1e1e;
    padding-bottom: 12px;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.1rem;
    letter-spacing: 0.5px;
    color: #e0e0e0;
    font-family: var(--title-font-family, 'Outfit', sans-serif);
    font-weight: bold;
  }

  .modal-body {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .warning-icon {
    margin: 0;
    color: #ff8888;
    font-size: 0.95rem;
    font-weight: bold;
    letter-spacing: 0.5px;
  }

  .message {
    color: #888888;
    font-size: 0.85rem;
    line-height: 1.5;
    margin: 0;
  }

  .match-input-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 5px;
  }

  .match-input-group label {
    font-size: 0.75rem;
    color: #888888;
  }

  .match-input-group strong {
    color: #e0e0e0;
  }

  .form-control {
    background-color: #1e1e1e;
    border: 1px solid #282828;
    color: #e0e0e0;
    font-family: inherit;
    padding: 10px;
    font-size: 0.85rem;
    outline: none;
    width: 100%;
    box-sizing: border-box;
    border-radius: 4px;
    box-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.5);
  }

  .form-control:focus {
    border-color: #505050;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    border-top: 1px solid #1e1e1e;
    padding-top: 15px;
  }

  .btn {
    background-color: #1e1e1e;
    border: 1px solid #282828;
    color: #e0e0e0;
    font-family: inherit;
    padding: 8px 16px;
    font-size: 0.85rem;
    font-weight: bold;
    cursor: pointer;
    border-radius: 4px;
    outline: none;
    box-shadow: 
      -2px -2px 6px rgba(255, 255, 255, 0.01),
      2px 2px 6px rgba(0, 0, 0, 0.3);
  }

  .btn:hover {
    background-color: #242424;
    border-color: #404040;
  }

  .btn:active {
    box-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.4);
  }

  .btn-danger {
    background-color: #3a1e1e;
    border-color: #772222;
    color: #ff8888;
  }

  .btn-danger:hover:not(:disabled) {
    background-color: #772222;
    color: #ffffff;
    border-color: #aa3333;
  }

  .btn-danger:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
  }

  .btn-secondary {
    color: #888888;
    border-color: #282828;
  }

  .btn-text {
    background: none;
    border: none;
    color: #888888;
    font-family: inherit;
    cursor: pointer;
    padding: 0;
  }

  .btn-text:hover {
    color: #e0e0e0;
  }
</style>
