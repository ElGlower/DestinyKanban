<script>
  // Props
  let { 
    show = $bindable(false), 
    project = null, 
    onSave 
  } = $props();

  let urlInput = $state("");
  let errorMessage = $state("");

  // Sync state when project changes or modal opens
  $effect(() => {
    if (show && project) {
      urlInput = project.googleDocUrl || "";
      errorMessage = "";
    }
  });

  function handleSave(e) {
    if (e) e.preventDefault();
    const cleanUrl = urlInput.trim();

    // Basic validation
    if (cleanUrl) {
      if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
        errorMessage = "Error: El enlace debe comenzar con http:// o https://";
        return;
      }
      if (!cleanUrl.includes("docs.google.com")) {
        errorMessage = "Aviso: No parece ser un enlace estándar de Google Docs, pero lo guardaremos igualmente.";
      }
    }

    onSave(cleanUrl);
    show = false;
  }

  function handleUnlink() {
    urlInput = "";
    onSave("");
    show = false;
  }
</script>

{#if show}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="modal-backdrop" onclick={() => show = false} role="presentation">
    <div class="modal neumorphic-modal" onclick={(e) => e.stopPropagation()} role="presentation">
      <div class="modal-header">
        <h2>
          <svg class="svg-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; display: inline-block; vertical-align: middle;">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>CONECTAR GOOGLE DOCS
        </h2>
        <button class="btn-text" onclick={() => show = false}>[CERRAR]</button>
      </div>

      <form class="modal-form" onsubmit={handleSave}>
        <div class="modal-body">
          <p class="section-desc">
            Vincula un documento de Google Docs a este proyecto para tener tus notas, tareas de diseño u objetivos del servidor al alcance de un clic.
          </p>

          {#if project}
            <div class="project-indicator neumorphic-well">
              <span class="indicator-label">PROYECTO:</span>
              <span class="indicator-name">{project.name}</span>
            </div>
          {/if}

          <div class="form-group">
            <label for="doc-url">ENLACE DEL DOCUMENTO (URL)</label>
            <input 
              id="doc-url" 
              type="url" 
              bind:value={urlInput} 
              placeholder="https://docs.google.com/document/d/..." 
              class="form-control"
              autocomplete="off"
              required={false}
            />
          </div>

          {#if errorMessage}
            <span class="error-text">{errorMessage}</span>
          {/if}

          <div class="helper-box">
            <span class="helper-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;">
                <path d="M9 18h6"></path>
                <path d="M10 22h4"></path>
                <path d="M15.09 14c.18-.08.37-.17.54-.27 1.83-1.12 2.37-3.5 1.2-5.33A5.02 5.02 0 0 0 12 6a5.02 5.02 0 0 0-4.83 2.4c-1.17 1.83-.63 4.21 1.2 5.33.17.1.36.19.54.27v1c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2v-1z"></path>
              </svg>
            </span>
            <div class="helper-content">
              <span>¿No tienes un documento todavía?</span>
              <a 
                href="https://docs.new" 
                target="_blank" 
                rel="noopener noreferrer" 
                class="shortcut-link"
              >
                Crear nuevo Google Doc al instante (docs.new) &nearr;
              </a>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          {#if project?.googleDocUrl}
            <button 
              type="button" 
              class="btn btn-danger" 
              onclick={handleUnlink}
            >
              DESVINCULAR DOC
            </button>
          {/if}
          <div style="flex-grow: 1;"></div>
          <button type="button" class="btn btn-secondary" onclick={() => show = false}>
            CANCELAR
          </button>
          <button type="submit" class="btn btn-primary">
            GUARDAR ENLACE
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style src="./GoogleDocModal.css"></style>
