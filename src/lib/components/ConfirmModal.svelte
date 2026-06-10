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

<style src="./ConfirmModal.css"></style>
