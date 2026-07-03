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
        <button class="btn-text" onclick={() => show = false}><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
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

<style>
.modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 250;
    font-family: var(--font-family, 'JetBrains Mono', monospace);
  }

  .modal {
    background-color: #121212;
    border: 1px solid #1e1e1e;
    width: 90%;
    max-width: 500px;
    padding: 25px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .neumorphic-modal {
    box-shadow: 
      -5px -5px 15px rgba(255, 255, 255, 0.02),
      5px 5px 15px rgba(0, 0, 0, 0.5);
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
    font-size: 1.15rem;
    letter-spacing: 0.5px;
    color: #e0e0e0;
    font-family: var(--title-font-family, 'Outfit', sans-serif);
    font-weight: bold;
  }

  .modal-form {
    display: flex;
    flex-direction: column;
    gap: 15px;
    margin: 0;
  }

  .modal-body {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .section-desc {
    color: #888888;
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.5;
  }

  .project-indicator {
    display: flex;
    align-items: center;
    gap: 10px;
    background-color: #1a1a1a;
    border: 1px solid #262626;
    padding: 8px 12px;
    border-radius: 6px;
    box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.45);
  }

  .indicator-label {
    font-size: 0.72rem;
    font-weight: bold;
    color: #505050;
  }

  .indicator-name {
    font-size: 0.8rem;
    color: #e0e0e0;
    font-weight: bold;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .form-group label {
    font-size: 0.75rem;
    color: #888888;
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

  .error-text {
    color: #ff8888;
    font-size: 0.75rem;
    margin-top: -8px;
  }

  .helper-box {
    display: flex;
    gap: 10px;
    background-color: #161616;
    border: 1px dashed #282828;
    padding: 12px;
    border-radius: 6px;
  }

  .helper-icon {
    font-size: 1.1rem;
  }

  .helper-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.75rem;
    color: #888888;
    line-height: 1.4;
  }

  .shortcut-link {
    color: #e0e0e0;
    text-decoration: underline;
    font-weight: bold;
  }

  .shortcut-link:hover {
    color: #ffffff;
  }

  .modal-footer {
    display: flex;
    gap: 12px;
    border-top: 1px solid #1e1e1e;
    padding-top: 15px;
    margin-top: 5px;
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

  .btn-primary {
    background-color: #505050;
    border-color: #505050;
    color: #121212;
  }

  .btn-primary:hover {
    background-color: #e0e0e0;
    border-color: #e0e0e0;
  }

  .btn-secondary {
    color: #888888;
    border-color: #282828;
  }

  .btn-danger {
    background-color: #3a1e1e;
    border-color: #772222;
    color: #ff8888;
  }

  .btn-danger:hover {
    background-color: #772222;
    color: #ffffff;
    border-color: #aa3333;
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
