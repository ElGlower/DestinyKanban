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

<style src="./ProjectSelector.css"></style>
