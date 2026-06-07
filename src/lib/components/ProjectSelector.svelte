<script>
  import DiscordVoiceWidget from "./DiscordVoiceWidget.svelte";
  // Props
  let { 
    projects = [], 
    onSelectProject, 
    onCreateProject,
    onOpenConfig,
    onOpenTheme,
    onBack,
    onTriggerDelete,
    onTriggerLinkDoc,
    currentUser = "",
    useMinecraftSkin = false,
    canCreateTeam = false,
    isAdmin = false,
    onOpenAdminPanel
  } = $props();

  function getAvatarColor(name) {
    if (!name) return '#505050';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      '#f5c2e7', // Pink (Mocha)
      '#cba6f7', // Mauve
      '#f38ba8', // Red
      '#fab387', // Peach
      '#f9e2af', // Yellow
      '#a6e3a1', // Green
      '#94e2d5', // Teal
      '#89b4fa', // Blue
      '#b4befe'  // Lavender
    ];
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  let newProjectName = $state("");
  let newProjectCategory = $state("propio");
  let newProjectGoogleDoc = $state("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    
    const id = newProjectName.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    onCreateProject({
      id: id + "-" + Date.now(),
      name: newProjectName.trim(),
      category: newProjectCategory,
      googleDocUrl: newProjectGoogleDoc.trim(),
      owner: currentUser
    });

    newProjectName = "";
    newProjectGoogleDoc = "";
  }

  let ownProjects = $derived(projects.filter(p => p.category === "propio" && (!p.owner || p.owner === currentUser)));
  let teamProjects = $derived(projects.filter(p => p.category === "equipo_destinyowner"));
</script>

<div class="selector-container">
  <!-- Top Header bar -->
  <header class="selector-header">
    <div class="header-left">
      <button class="btn btn-secondary btn-back" onclick={onBack} title="Cerrar Sesión">
        &lt;- SALIR
      </button>
      <div class="brand">
        <span class="brand-brackets">[</span>
        <span class="brand-title">DestinyKanban</span>
        <span class="brand-brackets">]</span>
        <span class="brand-sub">:: ACCESO</span>
      </div>
    </div>

    <DiscordVoiceWidget />
    
    <div class="header-right">
      <!-- User Profile (Minecraft or initial-based avatar) -->
      <div class="user-profile-card neumorphic-well">
        {#if useMinecraftSkin}
          <img 
            src={currentUser ? `https://mc-heads.net/avatar/${currentUser}/32` : 'https://mc-heads.net/avatar/Steve/32'} 
            alt={currentUser} 
            class="user-avatar" 
          />
        {:else}
          <div class="user-avatar-initial" style="background-color: {getAvatarColor(currentUser)};">
            {currentUser ? currentUser.charAt(0).toUpperCase() : '?'}
          </div>
        {/if}
        <span class="user-name">{currentUser.toUpperCase()}</span>
      </div>

      <button class="btn btn-theme" onclick={onOpenTheme} title="Personalizar Interfaz">
        <span class="theme-icon">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.02106 19.1652 5.09353 19.3976 5.05193 19.624L4.81818 20.9C4.74242 21.3129 5.09633 21.6881 5.50901 21.6149L6.82857 21.3813C7.05041 21.342 7.27643 21.4116 7.43954 21.5714C8.7562 22.8624 10.4571 23 12 22Z"></path>
            <circle cx="7.5" cy="10.5" r="1.2" fill="currentColor"></circle>
            <circle cx="11.5" cy="7.5" r="1.2" fill="currentColor"></circle>
            <circle cx="16.5" cy="9.5" r="1.2" fill="currentColor"></circle>
            <circle cx="15.5" cy="14.5" r="1.2" fill="currentColor"></circle>
          </svg>
        </span> <span class="btn-text-label">PERSONALIZAR</span>
      </button>

      <button class="btn btn-settings" onclick={onOpenConfig} title="Configuración Global">
        <span class="settings-icon">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </span> <span class="btn-text-label">AJUSTES GLOBALES</span>
      </button>

      {#if isAdmin}
        <button class="btn btn-admin" onclick={onOpenAdminPanel} title="Panel" style="display: inline-flex; align-items: center; gap: 4px;">
          <span class="admin-icon" style="display: inline-flex; align-items: center;">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </span>
          <span class="btn-text-label">PANEL</span>
        </button>
      {/if}
    </div>
  </header>

  <!-- Main grid/sidebar layout -->
  <div class="selector-layout">
    
    <div class="projects-panels-container">
      
      <!-- Category 1: Proyectos Propios -->
      <section class="category-panel">
        <div class="panel-header">
          <span class="panel-badge">[PROPIOS]</span>
          <h2>PROYECTOS PERSONALES</h2>
        </div>
        
        <div class="projects-grid">
          {#each ownProjects as project}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="project-card neumorphic-card" onclick={() => onSelectProject(project)}>
              <div class="card-inner">
                <div class="card-top">
                  <span class="card-tag">TABLERO PROPIO</span>
                  {#if project.googleDocUrl}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <span 
                      class="card-doc-badge active" 
                      onclick={(e) => { e.stopPropagation(); window.open(project.googleDocUrl, '_blank'); }} 
                      title="Abrir Google Doc en nueva pestaña"
                    >
                      <svg class="svg-inline-doc" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 3px; display: inline-block; vertical-align: middle;">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                      </svg>DOC
                    </span>
                  {:else}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <span 
                      class="card-doc-badge add-doc" 
                      onclick={(e) => { e.stopPropagation(); onTriggerLinkDoc(project); }} 
                      title="Vincular Google Doc"
                    >
                      <svg class="svg-inline-doc" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 3px; display: inline-block; vertical-align: middle;">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>DOC
                    </span>
                  {/if}
                </div>
                <span class="card-name">{project.name}</span>
                <div class="card-footer">
                  <span class="card-id">ID: {project.id.split('-')[0]}</span>
                  <div class="card-btn-group">
                    {#if isAdmin || !project.owner || project.owner === currentUser.toLowerCase()}
                      <button class="btn-card-danger" onclick={(e) => { e.stopPropagation(); onTriggerDelete(project); }} title="Eliminar tablero">
                        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 3px; display: inline-block; vertical-align: middle;">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>ELIM
                      </button>
                    {/if}
                    <span class="card-arrow">ENTRAR -&gt;</span>
                  </div>
                </div>
              </div>
            </div>
          {:else}
            <div class="empty-state">
              <span class="empty-icon">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block;">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
              </span>
              <span>SIN PROYECTOS PROPIOS</span>
            </div>
          {/each}
        </div>
      </section>

      <!-- Category 2: Equipo DestinyOwner -->
      <section class="category-panel">
        <div class="panel-header">
          <span class="panel-badge team-badge">[EQUIPO]</span>
          <h2>TABLEROS DESTINYOWNER</h2>
        </div>
        
        <div class="projects-grid">
          {#each teamProjects as project}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="project-card team-card neumorphic-card" onclick={() => onSelectProject(project)}>
              <div class="card-inner">
                <div class="card-top">
                  <span class="card-tag">DESTINYOWNER TEAM</span>
                  {#if project.googleDocUrl}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <span 
                      class="card-doc-badge active" 
                      onclick={(e) => { e.stopPropagation(); window.open(project.googleDocUrl, '_blank'); }} 
                      title="Abrir Google Doc en nueva pestaña"
                    >
                      <svg class="svg-inline-doc" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 3px; display: inline-block; vertical-align: middle;">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                      </svg>DOC
                    </span>
                  {:else}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <span 
                      class="card-doc-badge add-doc" 
                      onclick={(e) => { e.stopPropagation(); onTriggerLinkDoc(project); }} 
                      title="Vincular Google Doc"
                    >
                      <svg class="svg-inline-doc" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 3px; display: inline-block; vertical-align: middle;">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>DOC
                    </span>
                  {/if}
                </div>
                <span class="card-name">{project.name}</span>
                <div class="card-footer">
                  <span class="card-id">ID: {project.id.split('-')[0]}</span>
                  <div class="card-btn-group">
                    {#if isAdmin}
                      <button class="btn-card-danger" onclick={(e) => { e.stopPropagation(); onTriggerDelete(project); }} title="Eliminar tablero (Admin)">
                        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 3px; display: inline-block; vertical-align: middle;">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>ELIM
                      </button>
                    {:else}
                      <span class="card-locked" title="Tablero protegido, solo el admin puede eliminarlo">
                        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 3px; display: inline-block; vertical-align: middle;">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>EQUIPO
                      </span>
                    {/if}
                    <span class="card-arrow">ENTRAR -&gt;</span>
                  </div>
                </div>
              </div>
            </div>
          {:else}
            <div class="empty-state">
              <span class="empty-icon">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block;">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </span>
              <span>SIN PROYECTOS DE EQUIPO</span>
            </div>
          {/each}
        </div>
      </section>

    </div>

    <!-- Create Project Panel -->
    <aside class="create-project-panel neumorphic-panel">
      <h2 class="panel-title">NUEVO TABLERO</h2>
      <p class="panel-desc">Tablero Kanban.</p>
      
      <form class="create-form" onsubmit={handleSubmit}>
        <div class="form-group">
          <label for="project-name">NOMBRE DEL PROYECTO</label>
          <input
            id="project-name"
            type="text"
            bind:value={newProjectName}
            placeholder="Nombre del Proyecto.."
            required
            class="form-control neumorphic-input"
            autocomplete="off"
          />
        </div>

        <div class="form-group">
          <label for="project-category">ASIGNACIÓN / GRUPO</label>
          <select id="project-category" bind:value={newProjectCategory} class="form-control neumorphic-input">
            <option value="propio">PROYECTO PROPIO</option>
            <option value="equipo_destinyowner" disabled={!canCreateTeam}>
              EQUIPO DESTINYOWNER {!canCreateTeam ? ' (RESTRINGIDO)' : ''}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label for="project-doc">ENLACE GOOGLE DOCS (OPCIONAL)</label>
          <input
            id="project-doc"
            type="url"
            bind:value={newProjectGoogleDoc}
            placeholder="https://docs.google.com/document/..."
            class="form-control neumorphic-input"
            autocomplete="off"
          />
        </div>

        <button type="submit" class="btn btn-primary btn-block btn-neumorphic">
          CREAR TABLERO
        </button>
      </form>
    </aside>

  </div>
</div>

<style>
  .selector-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    box-sizing: border-box;
    font-family: var(--font-family, 'JetBrains Mono', monospace);
  }

  .selector-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #282828;
    padding-bottom: 18px;
    margin-bottom: 25px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .brand {
    font-size: 1.4rem;
    font-weight: bold;
    letter-spacing: 0.5px;
    font-family: var(--title-font-family, 'Outfit', sans-serif);
  }

  .brand-brackets {
    color: #505050;
  }

  .brand-title {
    color: #e0e0e0;
  }

  .brand-sub {
    font-size: 0.95rem;
    color: #888888;
    font-weight: normal;
  }

  /* User profile header card */
  .user-profile-card {
    display: flex;
    align-items: center;
    gap: 10px;
    background-color: #121212;
    border: 1px solid #262626;
    padding: 6px 12px;
    border-radius: 6px;
    box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.45);
  }

  .user-avatar {
    width: 20px;
    height: 20px;
    border-radius: 3px;
    image-rendering: pixelated;
  }

  .user-avatar-initial {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 0.72rem;
    font-weight: 900;
    color: #11111b;
    font-family: var(--title-font-family, 'Outfit', sans-serif);
    user-select: none;
  }

  .user-name {
    font-size: 0.72rem;
    font-weight: bold;
    color: #e0e0e0;
    letter-spacing: 0.5px;
  }

  /* Layout */
  .selector-layout {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 30px;
    flex: 1;
    min-height: 0;
  }

  .projects-panels-container {
    display: flex;
    flex-direction: column;
    gap: 30px;
    overflow-y: auto;
    padding-right: 15px;
  }

  .category-panel {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .panel-badge {
    background-color: #1e1e1e;
    border: 1px solid #333333;
    color: #888888;
    padding: 2px 6px;
    font-size: 0.7rem;
    font-weight: bold;
    border-radius: 3px;
  }

  .team-badge {
    border-color: #505050;
    color: #e0e0e0;
  }

  .panel-header h2 {
    font-family: var(--title-font-family, 'Outfit', sans-serif);
    font-size: 1.05rem;
    font-weight: bold;
    letter-spacing: 0.5px;
    margin: 0;
    color: #e0e0e0;
  }

  .projects-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 20px;
  }

  /* Neumorphic Extruded Cards */
  .project-card {
    background: #1e1e1e;
    border: 1px solid #282828;
    border-radius: 8px;
    padding: 0;
    color: #e0e0e0;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    box-shadow: 
      -4px -4px 10px rgba(255, 255, 255, 0.01);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .project-card:hover {
    transform: translateY(-2px);
    border-color: #505050;
    box-shadow: 
      -6px -6px 14px rgba(255, 255, 255, 0.015),
      6px 6px 14px rgba(0, 0, 0, 0.5);
  }

  .project-card:active {
    transform: translateY(0);
    box-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.5);
  }

  .card-inner {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .card-doc-badge {
    padding: 1px 6px;
    font-size: 0.62rem;
    font-weight: bold;
    border-radius: 3px;
    transition: all 0.15s ease;
  }

  .card-doc-badge.active {
    background-color: #121212;
    border: 1px solid #505050;
    color: #e0e0e0;
  }

  .card-doc-badge.active:hover {
    background-color: #505050;
    color: #121212;
    border-color: #e0e0e0;
  }

  .card-doc-badge.add-doc {
    background-color: #161616;
    border: 1px dashed #333333;
    color: #505050;
  }

  .card-doc-badge.add-doc:hover {
    border-color: #505050;
    color: #e0e0e0;
    background-color: #1e1e1e;
  }

  .card-tag {
    font-size: 0.7rem;
    color: #505050;
    font-weight: bold;
    letter-spacing: 0.5px;
  }

  .team-card .card-tag {
    color: #888888;
  }

  .card-name {
    font-family: var(--title-font-family, 'Outfit', sans-serif);
    font-size: 1.05rem;
    font-weight: 600;
    color: #e0e0e0;
    line-height: 1.3;
    min-height: 44px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #262626;
    padding-top: 10px;
    margin-top: 5px;
  }

  .card-id {
    font-size: 0.65rem;
    color: #505050;
  }

  .card-btn-group {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .btn-card-danger {
    background: none;
    border: none;
    color: #505050;
    font-family: inherit;
    font-size: 0.7rem;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 3px;
    border: 1px solid transparent;
  }

  .btn-card-danger:hover {
    color: #ff8888;
    border-color: #772222;
    background-color: #3a1e1e;
  }

  .card-locked {
    font-size: 0.7rem;
    color: #89b4fa;
    opacity: 0.6;
    display: inline-flex;
    align-items: center;
    padding: 2px 4px;
    cursor: default;
  }

  .card-arrow {
    font-size: 0.7rem;
    color: #505050;
    font-weight: bold;
  }

  .project-card:hover .card-arrow {
    color: #e0e0e0;
  }

  .empty-state {
    grid-column: 1 / -1;
    border: 1px dashed #333333;
    color: #505050;
    padding: 40px;
    text-align: center;
    font-size: 0.9rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    border-radius: 8px;
    background-color: #161616;
  }

  .empty-icon {
    font-size: 1.5rem;
  }

  /* Sidebar Neumorphic panel */
  .create-project-panel {
    background: #1e1e1e;
    border: 1px solid #282828;
    border-radius: 10px;
    padding: 20px;
    align-self: flex-start;
    display: flex;
    flex-direction: column;
    gap: 18px;
    box-shadow: 
      -4px -4px 10px rgba(255, 255, 255, 0.01),
      4px 4px 10px rgba(0, 0, 0, 0.35);
  }

  .panel-title {
    font-family: var(--title-font-family, 'Outfit', sans-serif);
    font-size: 1.1rem;
    font-weight: bold;
    margin: 0;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #282828;
    padding-bottom: 8px;
    color: #e0e0e0;
  }

  .panel-desc {
    font-size: 0.8rem;
    color: #888888;
    line-height: 1.4;
    margin: 0;
  }

  .create-form {
    display: flex;
    flex-direction: column;
    gap: 15px;
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

  /* Neumorphic Input Sunken */
  .form-control {
    background-color: #121212;
    border: 1px solid #222222;
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

  select.form-control {
    cursor: pointer;
  }

  /* Buttons */
  .btn {
    background-color: #1e1e1e;
    border: 1px solid #282828;
    color: #e0e0e0;
    font-family: inherit;
    padding: 8px 12px;
    font-size: 0.85rem;
    font-weight: bold;
    cursor: pointer;
    outline: none;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    box-shadow: 
      -2px -2px 6px rgba(255, 255, 255, 0.01),
      2px 2px 6px rgba(0, 0, 0, 0.3);
  }

  .btn:hover {
    background-color: #242424;
    border-color: #404040;
  }

  .btn:active {
    box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.5);
  }

  .btn-primary {
    background-color: #505050;
    border-color: #505050;
    color: #121212;
  }

  .btn-primary:hover {
    background-color: #e0e0e0;
    border-color: #e0e0e0;
    color: #121212;
  }

  .btn-secondary {
    color: #888888;
    border-color: #262626;
  }

  .btn-secondary:hover {
    color: #e0e0e0;
    border-color: #505050;
  }

  .btn-back {
    font-size: 0.75rem;
    padding: 6px 10px;
    box-shadow: none;
    background: none;
    border: 1px solid #282828;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .btn-back:hover {
    background-color: #1e1e1e;
    border-color: #505050;
  }

  .btn-block {
    width: 100%;
    justify-content: center;
  }

  .btn-settings {
    background-color: #121212;
    border-color: #333333;
    font-size: 0.8rem;
    padding: 6px 12px;
  }

  .btn-theme, .btn-admin {
    background-color: #1e1e1e;
    border-color: #505050;
    font-size: 0.8rem;
    padding: 6px 12px;
  }

  .settings-icon, .theme-icon, .admin-icon {
    font-size: 0.95rem;
  }

  /* Responsive Styles */
  @media (max-width: 1024px) {
    .selector-header {
      flex-wrap: wrap;
      justify-content: center;
      gap: 15px;
    }
    .header-left, .header-right {
      justify-content: center;
      flex-wrap: wrap;
    }
  }

  @media (max-width: 768px) {
    .selector-layout {
      grid-template-columns: 1fr;
    }
    
    .create-project-panel {
      align-self: stretch;
      order: -1; /* Place the creation panel on top on mobile */
    }

    .btn-text-label {
      display: none; /* Turn buttons into icon-only buttons on small screens */
    }

    .btn {
      padding: 8px 10px;
    }
  }

  @media (max-width: 600px) {
    .selector-header {
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 15px;
    }
    
    .header-left, .header-right {
      justify-content: center;
      width: 100%;
      gap: 10px;
    }

    .brand {
      font-size: 1.2rem;
    }

    .projects-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
