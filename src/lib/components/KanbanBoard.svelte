<script>
  import FiltersBar from "./FiltersBar.svelte";
  import TaskCard from "./TaskCard.svelte";
  import TaskModal from "./TaskModal.svelte";
  import DiscordVoiceWidget from "./DiscordVoiceWidget.svelte";
  import { subscribeToBoardPresence } from "../firebase.js";

  // Props
  let { 
    config, 
    systemUsers = [],
    project, 
    tasks = $bindable([]), 
    onBack, 
    saveTasks,
    onUpdateProject,
    onTriggerDelete,
    onTriggerLinkDoc,
    currentUser = "",
    useMinecraftSkin = false,
    onOpenTheme
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

  // Real-time Presence State
  let activeBoardUsers = $state([]);
  let unsubscribePresence = null;

  $effect(() => {
    if (project && project.id) {
      unsubscribePresence = subscribeToBoardPresence(project.id, (users) => {
        // Filter out the current user, so they only see OTHER users
        activeBoardUsers = users.filter(u => u.username.toLowerCase() !== currentUser.toLowerCase());
      });
    }
    return () => {
      if (unsubscribePresence) {
        unsubscribePresence();
      }
    };
  });

  // Filters State
  let filterPhase = $state("All");
  let filterRole = $state("All");
  let filterPriority = $state("All");
  let searchQuery = $state("");

  // Views State
  let activeSubView = $state("kanban"); // "kanban" or "timeline"

  function wipLimit(column) {
    return config.wipLimits?.[column] || 0;
  }

  function isOverWipLimit(column) {
    const limit = wipLimit(column);
    return limit > 0 && (tasksByColumn[column]?.length || 0) > limit;
  }

  function calculateBarPosition(startDateStr, dueDateStr) {
    try {
      const minTime = new Date("2026-06-01T00:00:00").getTime();
      const maxTime = new Date("2026-09-30T23:59:59").getTime();
      const totalDuration = maxTime - minTime;

      const start = new Date(startDateStr + "T00:00:00").getTime();
      const due = new Date(dueDateStr + "T23:59:59").getTime();

      const leftPercent = Math.max(0, Math.min(100, ((start - minTime) / totalDuration) * 100));
      const widthPercent = Math.max(5, Math.min(100 - leftPercent, ((due - start) / totalDuration) * 100));

      return `left: ${leftPercent}%; width: ${widthPercent}%;`;
    } catch (e) {
      return "left: 0%; width: 100%;";
    }
  }

  // Modal State
  let showModal = $state(false);
  let editingTask = $state(null);
  let showHeaderMenu = $state(false);

  // Drag and Drop State
  let draggedTaskId = $state(null);
  let activeDragColumn = $state(null);

  // Mobile responsive active column tab
  let activeMobileColumn = $state("");
  $effect(() => {
    if (!activeMobileColumn && config.columns && config.columns.length > 0) {
      activeMobileColumn = config.columns[0];
    }
  });

  // Embedded Google Doc Live panel state
  let showEmbeddedDoc = $state(false);
  let embedUrl = $derived(() => {
    if (!project.googleDocUrl) return "";
    let url = project.googleDocUrl;
    if (url.includes("docs.google.com/document") && url.includes("/edit")) {
      return url.split("/edit")[0] + "/preview";
    }
    return url;
  });

  // Filtered tasks calculation
  let filteredTasks = $derived(
    tasks.filter(t => {
      const matchPhase = filterPhase === "All" || t.phase === filterPhase;
      const matchRole = filterRole === "All" || t.assignedTo === filterRole;
      const matchPriority = filterPriority === "All" || t.priority === filterPriority;
      const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchPhase && matchRole && matchPriority && matchSearch;
    })
  );

  // Grouping tasks by columns
  let tasksByColumn = $derived(
    config.columns.reduce((acc, col) => {
      acc[col] = filteredTasks.filter(t => t.status === col);
      return acc;
    }, {})
  );

  // Drag & Drop Handlers
  function handleDragStart(event, taskId) {
    draggedTaskId = taskId;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", taskId);
  }

  function handleDragOver(event, column) {
    event.preventDefault();
    activeDragColumn = column;
  }

  function handleDragLeave() {
    activeDragColumn = null;
  }

  async function handleDrop(event, targetStatus) {
    event.preventDefault();
    activeDragColumn = null;
    const taskId = event.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!taskId) return;

    const currentTask = tasks.find(t => t.id === taskId);
    if (currentTask && currentTask.status !== targetStatus) {
      tasks = tasks.map(t => {
        if (t.id === taskId) {
          return { ...t, status: targetStatus };
        }
        return t;
      });
      await saveTasks();
    }

    draggedTaskId = null;
  }

  // Modal Actions
  function openNewTaskModal(defaultStatus = "") {
    editingTask = null;
    showModal = true;
  }

  function openEditTaskModal(task) {
    editingTask = task;
    showModal = true;
  }

  async function handleSubmitTask(formData) {
    if (editingTask) {
      tasks = tasks.map(t => {
        if (t.id === editingTask.id) {
          return {
            ...t,
            ...formData
          };
        }
        return t;
      });
    } else {
      const newTask = {
        id: "task-" + Date.now(),
        ...formData
      };
      tasks = [...tasks, newTask];
    }
    
    editingTask = null;
    await saveTasks();
  }

  async function deleteTask(taskId) {
    if (confirm("¿Estás seguro de que deseas eliminar esta tarea?")) {
      tasks = tasks.filter(t => t.id !== taskId);
      await saveTasks();
      if (showModal && editingTask?.id === taskId) {
        showModal = false;
        editingTask = null;
      }
    }
  }

  function clearFilters() {
    filterPhase = "All";
    filterRole = "All";
    filterPriority = "All";
    searchQuery = "";
  }

  // Google Docs handler
  function handleLinkGoogleDoc() {
    onTriggerLinkDoc(project);
  }
</script>

<div class="board-container">
  <!-- Header -->
  <header class="board-header">
    <div class="header-left">
      <button class="btn btn-secondary btn-back" onclick={onBack} title="Volver al selector de proyectos">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        <span class="btn-text-label">VOLVER</span>
      </button>
      <div class="project-info">
        <span class="project-category">{project.category === 'propio' ? 'Tablero Personal' : 'Tablero de Equipo'}</span>
        <h1 class="project-title" title={project.name}>{project.name}</h1>
      </div>
    </div>

    <div class="header-center">
      <DiscordVoiceWidget />
    </div>
    
    <div class="header-right">
      <!-- Google Doc Integration -->
      <div class="google-doc-actions">
        {#if project.googleDocUrl}
          <a href={project.googleDocUrl} target="_blank" rel="noopener noreferrer" class="btn btn-doc" title="Abrir Google Doc en pestaña externa">
            <svg class="svg-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            <span class="btn-text-label">VER DOCS &nearr;</span>
          </a>
          <button 
            class="btn btn-doc-toggle {showEmbeddedDoc ? 'active' : ''}" 
            onclick={() => showEmbeddedDoc = !showEmbeddedDoc}
            title={showEmbeddedDoc ? 'Ocultar documento lateral' : 'Mostrar documento lateral'}
          >
            <svg class="svg-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
            <span class="btn-text-label">{showEmbeddedDoc ? 'OCULTAR DOC' : 'MOSTRAR DOC'}</span>
          </button>
        {/if}
      </div>

      <!-- Real-time Presence Indicators -->
      {#if activeBoardUsers.length > 0}
        <div class="presence-indicators" title="Otros miembros viendo este tablero">
          {#each activeBoardUsers as user}
            <div class="presence-avatar-wrapper">
              {#if user.useMinecraftSkin}
                <img 
                  src={`https://mc-heads.net/avatar/${user.username}/24`} 
                  alt={user.username} 
                  class="presence-avatar" 
                />
              {:else}
                <div class="presence-avatar-initial" style="background-color: {getAvatarColor(user.username)};">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              {/if}
              <span class="presence-tooltip">{user.username.toUpperCase()} (VIENDO)</span>
            </div>
          {/each}
        </div>
      {/if}

      <!-- User Profile Card -->
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

      <!-- Add Task Button -->
      <button class="btn btn-primary btn-add-global" onclick={() => openNewTaskModal()} title="Crear una nueva tarea en este tablero">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span class="btn-text-label">NUEVA TAREA</span>
      </button>

      <!-- Dropdown Menu Actions Button -->
      <div class="header-menu-container">
        <button class="btn btn-secondary btn-menu" onclick={() => showHeaderMenu = !showHeaderMenu} title="Más acciones de tablero" aria-expanded={showHeaderMenu}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;">
            <circle cx="12" cy="12" r="1.5"></circle>
            <circle cx="12" cy="5" r="1.5"></circle>
            <circle cx="12" cy="19" r="1.5"></circle>
          </svg>
        </button>
        {#if showHeaderMenu}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="menu-dropdown-backdrop" onclick={() => showHeaderMenu = false}></div>
          <div class="menu-dropdown neumorphic-panel">
            <button class="menu-item" onclick={() => { showHeaderMenu = false; onOpenTheme(); }}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.02106 19.1652 5.09353 19.3976 5.05193 19.624L4.81818 20.9C4.74242 21.3129 5.09633 21.6881 5.50901 21.6149L6.82857 21.3813C7.05041 21.342 7.27643 21.4116 7.43954 21.5714C8.7562 22.8624 10.4571 23 12 22Z"></path>
                <circle cx="7.5" cy="10.5" r="1" fill="currentColor"></circle>
                <circle cx="11.5" cy="7.5" r="1" fill="currentColor"></circle>
                <circle cx="16.5" cy="9.5" r="1" fill="currentColor"></circle>
                <circle cx="15.5" cy="14.5" r="1" fill="currentColor"></circle>
              </svg>
              <span>🎨 PERSONALIZAR TEMA</span>
            </button>

            <button class="menu-item" onclick={() => { showHeaderMenu = false; handleLinkGoogleDoc(); }}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
              <span>{project.googleDocUrl ? '🔗 EDITAR ENLACE DOC' : '🔗 VINCULAR GOOGLE DOC'}</span>
            </button>

            <div class="menu-divider"></div>

            <button class="menu-item menu-item-danger" onclick={() => { showHeaderMenu = false; onTriggerDelete(project); }}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>⚠️ ELIMINAR TABLERO</span>
            </button>
          </div>
        {/if}
      </div>
    </div>
  </header>
  
  <!-- Filters -->
  <FiltersBar 
    {config}
    bind:filterPhase={filterPhase}
    bind:filterRole={filterRole}
    bind:filterPriority={filterPriority}
    bind:searchQuery={searchQuery}
    {clearFilters}
  />

  <!-- View Subselector -->
  <div class="board-view-selector">
    <button class="view-sel-btn {activeSubView === 'kanban' ? 'active' : ''}" onclick={() => activeSubView = 'kanban'}>
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; display: inline-block; vertical-align: middle;">
        <rect x="3" y="3" width="7" height="9"></rect>
        <rect x="14" y="3" width="7" height="5"></rect>
        <rect x="14" y="12" width="7" height="9"></rect>
        <rect x="3" y="16" width="7" height="5"></rect>
      </svg>TABLERO KANBAN
    </button>
    <button class="view-sel-btn {activeSubView === 'timeline' ? 'active' : ''}" onclick={() => activeSubView = 'timeline'}>
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; display: inline-block; vertical-align: middle;">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
        <line x1="8" y1="14" x2="16" y2="14"></line>
        <line x1="8" y1="18" x2="12" y2="18"></line>
      </svg>CRONOGRAMA (PLANIFICACIÓN)
    </button>
  </div>

  <!-- Mobile Tabs Selector -->
  {#if activeSubView === 'kanban'}
    <div class="mobile-tabs-bar">
      {#each config.columns as column}
        <button 
          class="mobile-tab-btn {activeMobileColumn === column ? 'active' : ''}"
          onclick={() => activeMobileColumn = column}
        >
          <span class="tab-title">{column.toUpperCase()}</span>
          <span class="tab-count">({tasksByColumn[column]?.length || 0})</span>
        </button>
      {/each}
    </div>
  {/if}

  <div class="board-layout-wrapper {showEmbeddedDoc ? 'split-active' : ''}">
    {#if activeSubView === 'kanban'}
      <!-- Kanban Board -->
      <section class="board">
        {#each config.columns as column}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div 
            class="column {activeDragColumn === column ? 'column-dragover' : ''} {activeMobileColumn === column ? 'mobile-active' : ''}"
            ondragover={(e) => handleDragOver(e, column)}
            ondragleave={handleDragLeave}
            ondrop={(e) => handleDrop(e, column)}
          >
            <div class="column-header {isOverWipLimit(column) ? 'wip-limit-exceeded' : ''}">
              <span class="column-title">{column.toUpperCase()}</span>
              {#if wipLimit(column) > 0}
                <span class="column-count wip-count">
                  [{tasksByColumn[column]?.length || 0}/{wipLimit(column)} WIP]
                </span>
              {:else}
                <span class="column-count">[{tasksByColumn[column]?.length || 0}]</span>
              {/if}
            </div>

            {#if isOverWipLimit(column)}
              <div class="wip-warning-banner" style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; color: #ff8888;">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>LÍMITE WIP EXCEDIDO ({tasksByColumn[column]?.length} > {wipLimit(column)})</span>
              </div>
            {/if}

            <div class="column-body">
              {#each tasksByColumn[column] || [] as task (task.id)}
                <TaskCard 
                  {task}
                  {draggedTaskId}
                  onEdit={openEditTaskModal}
                  onDelete={deleteTask}
                  onDragStart={handleDragStart}
                />
              {:else}
                <div class="column-empty">
                  <span>SIN TAREAS</span>
                </div>
              {/each}
              
              <button class="btn-add-card" onclick={() => openNewTaskModal(column)}>
                + AÑADIR TARJETA
              </button>
            </div>
          </div>
        {/each}
      </section>
    {:else if activeSubView === 'timeline'}
      <!-- Timeline/Chronogram View -->
      <div class="timeline-container neumorphic-panel">
        <div class="timeline-header-row">
          <div class="timeline-header-label">FASE / TAREA</div>
          <div class="timeline-months-grid">
            <span>JUNIO 2026</span>
            <span>JULIO 2026</span>
            <span>AGOSTO 2026</span>
            <span>SEPTIEMBRE 2026</span>
          </div>
        </div>
        <div class="timeline-body">
          {#each config.phases as phase}
            <div class="timeline-phase-group">
              <div class="timeline-phase-name">{phase.toUpperCase()}</div>
              <div class="timeline-phase-tasks">
                {#each filteredTasks.filter(t => t.phase === phase) as task}
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <div class="timeline-task-row" onclick={() => openEditTaskModal(task)}>
                    <div class="timeline-task-info">
                      <span class="t-title">{task.title}</span>
                      <span class="t-meta">@{task.assignedTo} | {task.status.toUpperCase()}</span>
                    </div>
                    <div class="timeline-bar-container">
                      {#if task.startDate && task.dueDate}
                        <!-- Visual date span bar -->
                        <div class="timeline-span-bar {task.status === 'Done' ? 'bar-done' : ''}" style={calculateBarPosition(task.startDate, task.dueDate)}>
                          <span class="bar-date-label">
                            {task.startDate.split('-').reverse().slice(0,2).join('/')} - {task.dueDate.split('-').reverse().slice(0,2).join('/')}
                          </span>
                        </div>
                      {:else}
                        <span class="no-dates-txt" onclick={(e) => { e.stopPropagation(); openEditTaskModal(task); }}>
                          Haz click para asignar fechas
                        </span>
                      {/if}
                    </div>
                  </div>
                {:else}
                  <div style="padding: 10px 18px; font-size: 0.7rem; color: #404040; font-style: italic;">
                    Sin tareas en esta fase.
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Embedded Google Doc Panel -->
    {#if showEmbeddedDoc && project.googleDocUrl}
      <aside class="embedded-doc-panel neumorphic-panel">
        <div class="panel-header-mini">
          <span class="panel-title-mini">
            <svg class="svg-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; display: inline-block; vertical-align: middle;">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>GOOGLE DOCS EN VIVO
          </span>
          <div class="panel-actions-mini">
            <a href={project.googleDocUrl} target="_blank" rel="noopener noreferrer" class="btn btn-mini" title="Abrir en pestaña externa">
              ABRIR FUERA &nearr;
            </a>
            <button class="btn btn-mini btn-close-panel" onclick={() => showEmbeddedDoc = false} title="Ocultar panel">
              [X]
            </button>
          </div>
        </div>
        <div class="iframe-container">
          <iframe 
            src={embedUrl()} 
            class="google-doc-iframe" 
            title="Google Doc"
            frameborder="0"
          ></iframe>
        </div>
      </aside>
    {/if}
  </div>

  <!-- Modal Dialog -->
  <TaskModal 
    bind:showModal={showModal}
    {editingTask}
    {config}
    {systemUsers}
    {currentUser}
    onSubmit={handleSubmitTask}
    onDelete={deleteTask}
  />
</div>

<style>
.board-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    box-sizing: border-box;
    font-family: var(--font-family, 'JetBrains Mono', monospace);
    background: radial-gradient(circle at 50% 0%, rgba(30, 30, 45, 0.6) 0%, transparent 60%);
    padding: 10px;
    border-radius: 12px;
  }

  .board-header {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 16px;
    background: linear-gradient(135deg, rgba(18,18,28,0.92) 0%, rgba(24,24,36,0.88) 100%);
    border: 1px solid rgba(255,255,255,0.07);
    border-bottom: 1px solid rgba(255,255,255,0.05);
    border-radius: 16px;
    padding: 14px 20px;
    margin-bottom: 20px;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: 0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06);
    position: relative;
    overflow: visible;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
    min-width: 0;
  }

  .header-center {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .project-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .project-category {
    font-size: 0.6rem;
    color: #666;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .project-title {
    margin: 0;
    font-family: var(--title-font-family, 'Outfit', sans-serif);
    font-size: 1.4rem;
    font-weight: 800;
    letter-spacing: 0.3px;
    color: #e0e0e0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 280px;
  }

  /* Google Doc buttons */
  .google-doc-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .btn-doc {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.12);
    color: #b0b0b0;
    font-family: inherit;
    padding: 7px 12px;
    font-size: 0.72rem;
    font-weight: 700;
    text-decoration: none;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    transition: all 0.2s ease;
    letter-spacing: 0.5px;
  }

  .btn-doc:hover {
    background: rgba(255,255,255,0.1);
    border-color: rgba(255,255,255,0.2);
    color: #ffffff;
    transform: translateY(-1px);
  }

  .btn-doc-edit {
    background: none;
    border: 1px solid rgba(255,255,255,0.08);
    color: #666;
    font-family: inherit;
    padding: 7px 10px;
    font-size: 0.72rem;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .btn-doc-edit:hover {
    color: #e0e0e0;
    border-color: rgba(255,255,255,0.2);
    background: rgba(255,255,255,0.05);
  }

  .btn-doc-placeholder {
    background: none;
    border: 1px dashed rgba(255,255,255,0.15);
    color: #666;
    font-family: inherit;
    padding: 7px 12px;
    font-size: 0.72rem;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .btn-doc-placeholder:hover {
    border-color: rgba(255,255,255,0.25);
    color: #b0b0b0;
    background: rgba(255,255,255,0.05);
  }

  /* User profile header card */
  .user-profile-card {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    padding: 6px 10px;
    border-radius: 8px;
  }

  .user-avatar {
    width: 22px;
    height: 22px;
    border-radius: 4px;
    image-rendering: pixelated;
  }

  .user-avatar-initial {
    width: 22px;
    height: 22px;
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

  /* Header Action Buttons redesign */
  .btn-back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    color: #888;
    font-size: 0.72rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
    letter-spacing: 0.5px;
    flex-shrink: 0;
  }

  .btn-back:hover {
    background: rgba(255,255,255,0.08);
    color: #e0e0e0;
    border-color: rgba(255,255,255,0.15);
  }

  .btn-add-global {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    white-space: nowrap;
  }

  /* Three-dot menu button */
  .btn-menu {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    padding: 0;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    color: #888;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-menu:hover,
  .btn-menu[aria-expanded="true"] {
    background: rgba(255,255,255,0.1);
    color: #e0e0e0;
    border-color: rgba(255,255,255,0.18);
  }

  /* Dropdown Menu */
  .header-menu-container {
    position: relative;
  }

  .menu-dropdown-backdrop {
    position: fixed;
    inset: 0;
    z-index: 90;
  }

  .menu-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 210px;
    background: rgba(18,18,28,0.97);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 6px;
    z-index: 100;
    box-shadow: 0 16px 48px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4);
    backdrop-filter: blur(20px);
    animation: dropdownFadeIn 0.15s ease;
  }

  @keyframes dropdownFadeIn {
    from { opacity: 0; transform: translateY(-6px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 12px;
    background: none;
    border: none;
    border-radius: 8px;
    color: #b0b0b0;
    font-family: inherit;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s ease;
  }

  .menu-item:hover {
    background: rgba(255,255,255,0.07);
    color: #e0e0e0;
  }

  .menu-item-danger {
    color: #f38ba8;
  }

  .menu-item-danger:hover {
    background: rgba(243,139,168,0.1);
    color: #f38ba8;
  }

  .menu-divider {
    height: 1px;
    background: rgba(255,255,255,0.06);
    margin: 4px 6px;
  }

  .user-name {
    font-size: 0.72rem;
    font-weight: bold;
    color: #e0e0e0;
    letter-spacing: 0.5px;
  }

  /* Kanban Board columns */
  .board {
    display: flex;
    gap: 24px;
    overflow-x: auto;
    flex: 1;
    padding-bottom: 20px;
    align-items: flex-start;
  }

  /* Ultra Premium Glassmorphic Column */
  .column {
    flex: 1;
    min-width: 300px;
    max-width: 380px;
    background: linear-gradient(145deg, rgba(30, 30, 35, 0.5) 0%, rgba(20, 20, 25, 0.7) 100%);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 20px;
    display: flex;
    flex-direction: column;
    max-height: 100%;
    box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    position: relative;
    overflow: hidden;
  }

  .column::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .column:hover {
    box-shadow: 0 15px 50px -10px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-4px);
  }

  .column:hover::before {
    opacity: 1;
  }

  .column-dragover {
    border-color: #a6e3a1;
    background-color: rgba(166, 227, 161, 0.05);
    transform: scale(1.01);
  }

  .column-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 18px;
    margin: 10px;
    border-bottom: none;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .column-title {
    font-family: var(--title-font-family, 'Outfit', sans-serif);
    font-weight: 800;
    font-size: 0.95rem;
    letter-spacing: 1px;
    background: linear-gradient(90deg, #ffffff, #cdd6f4);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: 0px 2px 10px rgba(255, 255, 255, 0.1);
  }

  .column-count {
    color: #888888;
    font-size: 0.8rem;
  }

  .column-body {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
    max-height: calc(100vh - 250px);
  }

  .column-empty {
    text-align: center;
    padding: 30px 20px;
    border: 1px dashed rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.8rem;
    border-radius: 10px;
    background-color: rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
  }
  .column-empty:hover {
    border-color: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.6);
  }

  /* Buttons */
  .btn {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(5px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #e0e0e0;
    font-family: inherit;
    padding: 8px 16px;
    font-size: 0.8rem;
    font-weight: bold;
    cursor: pointer;
    outline: none;
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  .btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
  }

  .btn:active {
    transform: translateY(0) scale(0.95);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
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

  .btn-danger {
    background-color: #1e1e1e;
    border: 1px solid #3a1e1e;
    color: #ff8888;
  }

  .btn-danger:hover {
    background-color: #3a1e1e;
    border-color: #772222;
    color: #ffffff;
  }

  .btn-danger:active {
    box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.5);
  }

  .btn-delete-board {
    font-size: 0.8rem;
    padding: 8px 12px;
  }

  .btn-add-card {
    background: none;
    border: 1px dashed #282828;
    color: #505050;
    font-family: inherit;
    padding: 10px;
    font-size: 0.8rem;
    cursor: pointer;
    text-align: center;
    width: 100%;
    margin-top: 5px;
    border-radius: 6px;
    transition: all 0.15s ease;
  }

  .btn-add-card:hover {
    border-color: #505050;
    color: #e0e0e0;
    background-color: #121212;
  }

  .btn-doc-toggle {
    background-color: #1e1e1e;
    border: 1px solid #282828;
    color: #888888;
    font-family: inherit;
    padding: 8px 12px;
    font-size: 0.8rem;
    font-weight: bold;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .btn-doc-toggle:hover {
    color: #e0e0e0;
    border-color: #505050;
    background-color: #242424;
  }

  .btn-doc-toggle.active {
    background-color: #505050;
    color: #121212;
    border-color: #e0e0e0;
  }

  .btn-theme {
    background-color: #1e1e1e;
    border: 1px solid #282828;
    color: #e0e0e0;
    font-family: inherit;
    padding: 8px 12px;
    font-size: 0.8rem;
    font-weight: bold;
    cursor: pointer;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .btn-theme:hover {
    background-color: #242424;
    border-color: #505050;
  }

  /* Split screen board layout wrapper */
  .board-layout-wrapper {
    display: flex;
    gap: 20px;
    flex: 1;
    min-height: 0;
    width: 100%;
  }

  .board-layout-wrapper.split-active .board {
    flex: 0 0 58%;
    max-width: 58%;
  }

  .embedded-doc-panel {
    flex: 0 0 40%;
    max-width: 40%;
    background-color: #1a1a1a;
    border: 1px solid #242424;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 
      -3px -3px 8px rgba(255, 255, 255, 0.005),
      3px 3px 8px rgba(0, 0, 0, 0.3);
  }

  .panel-header-mini {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #121212;
    padding: 10px 15px;
    border-bottom: 1px solid #242424;
  }

  .panel-title-mini {
    font-size: 0.72rem;
    font-weight: bold;
    color: #e0e0e0;
    letter-spacing: 0.5px;
  }

  .panel-actions-mini {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .btn-mini {
    background-color: #1e1e1e;
    border: 1px solid #282828;
    color: #888888;
    font-family: inherit;
    padding: 4px 8px;
    font-size: 0.65rem;
    font-weight: bold;
    text-decoration: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .btn-mini:hover {
    color: #e0e0e0;
    border-color: #505050;
  }

  .btn-close-panel {
    color: #ff8888;
    border-color: #4a1a1a;
  }

  .btn-close-panel:hover {
    background-color: #4a1a1a;
    color: #ffffff;
    border-color: #772222;
  }

  .iframe-container {
    flex: 1;
    width: 100%;
    height: 100%;
  }

  .google-doc-iframe {
    width: 100%;
    height: 100%;
    border: none;
    background-color: #ffffff;
  }

  /* Mobile Tabs Bar styles */
  .mobile-tabs-bar {
    display: none;
    gap: 8px;
    margin-bottom: 15px;
    width: 100%;
    overflow-x: auto;
    padding-bottom: 5px;
  }

  .mobile-tab-btn {
    flex: 1;
    background-color: #1e1e1e;
    border: 1px solid #282828;
    color: #888888;
    font-family: inherit;
    padding: 10px 5px;
    font-size: 0.75rem;
    font-weight: bold;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    box-shadow: 2px 2px 4px rgba(0,0,0,0.2);
  }

  .mobile-tab-btn.active {
    background-color: #505050;
    color: #121212;
    border-color: #e0e0e0;
    box-shadow: inset 1px 1px 3px rgba(0,0,0,0.4);
  }

  .mobile-tab-btn .tab-count {
    font-size: 0.65rem;
    opacity: 0.8;
  }
  
  .btn-icon-label {
    display: none;
  }

  /* Responsive Adjustments */
  @media (max-width: 1200px) {
    .board-header {
      grid-template-columns: auto auto;
      grid-template-rows: auto auto;
    }
    .header-center {
      display: none;
    }
    .header-right {
      grid-column: 2;
      grid-row: 1;
    }
    .btn-text-label {
      display: none !important;
    }
    .btn-icon-label {
      display: inline !important;
    }
    .project-title {
      max-width: 180px;
    }
  }

  @media (max-width: 1024px) {
    .board-layout-wrapper.split-active {
      flex-direction: column;
    }
    
    .board-layout-wrapper.split-active .board {
      flex: 1;
      max-width: 100%;
    }
    
    .embedded-doc-panel {
      flex: 1;
      max-width: 100%;
      height: 400px;
      margin-top: 15px;
    }
  }

  @media (max-width: 768px) {
    .board-header {
      grid-template-columns: 1fr auto;
      grid-template-rows: auto;
      padding: 10px 14px;
      gap: 10px;
    }

    .header-center {
      display: none;
    }

    .header-right {
      gap: 6px;
    }

    .project-title {
      font-size: 1.1rem;
      max-width: 150px;
    }

    .google-doc-actions {
      display: none;
    }

    .project-info {
      align-items: flex-start;
    }

    .mobile-tabs-bar {
      display: flex;
    }

    .board {
      gap: 0;
      overflow-x: hidden;
      width: 100%;
    }

    .column {
      display: none !important;
    }

    .column.mobile-active {
      display: flex !important;
      max-width: 100% !important;
      width: 100% !important;
      flex: 1;
    }

    .column-body {
      max-height: calc(100vh - 300px);
    }
  }

  /* Subview View Selector */
  .board-view-selector {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    border-bottom: 1px solid #282828;
    padding-bottom: 12px;
  }

  .view-sel-btn {
    background-color: #1e1e1e;
    border: 1px solid #282828;
    color: #888888;
    padding: 8px 16px;
    border-radius: 6px;
    font-family: inherit;
    font-size: 0.8rem;
    font-weight: bold;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s ease;
    box-shadow: 2px 2px 4px rgba(0,0,0,0.25);
  }

  .view-sel-btn:hover {
    background-color: #242424;
    color: #e0e0e0;
    border-color: #505050;
  }

  .view-sel-btn.active {
    background-color: #505050;
    color: #121212;
    border-color: #ffffff;
    box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.4);
  }

  /* WIP limits styling */
  .column-header.wip-limit-exceeded {
    border-bottom: 2px solid #ff4444 !important;
    background-color: rgba(255, 68, 68, 0.08) !important;
  }

  .wip-count {
    color: #ff8888 !important;
    font-weight: bold;
  }

  .wip-warning-banner {
    background-color: #3a1e1e;
    border: 1px solid #772222;
    color: #ff8888;
    font-size: 0.72rem;
    font-weight: bold;
    padding: 6px 12px;
    text-align: center;
    border-radius: 4px;
    margin: 8px 12px 0 12px;
    animation: flash-border 2s infinite alternate;
  }

  @keyframes flash-border {
    from { border-color: #772222; }
    to { border-color: #ff4444; }
  }

  /* Timeline/Chronogram layout styling */
  .timeline-container {
    flex: 1;
    background-color: #1a1a1a;
    border: 1px solid #242424;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    overflow-x: auto;
    box-shadow: 
      -3px -3px 8px rgba(255, 255, 255, 0.005),
      3px 3px 8px rgba(0, 0, 0, 0.3);
    min-height: 400px;
  }

  .timeline-header-row {
    display: flex;
    background-color: #121212;
    border-bottom: 1px solid #242424;
    padding: 12px 18px;
    font-weight: bold;
    font-size: 0.8rem;
    color: #888888;
    letter-spacing: 0.5px;
  }

  .timeline-header-label {
    width: 250px;
    flex-shrink: 0;
  }

  .timeline-months-grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    text-align: center;
    font-size: 0.75rem;
    border-left: 1px solid #242424;
  }

  .timeline-months-grid span {
    border-right: 1px solid #242424;
    padding: 0 5px;
  }

  .timeline-months-grid span:last-child {
    border-right: none;
  }

  .timeline-body {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    max-height: calc(100vh - 280px);
  }

  .timeline-phase-group {
    border-bottom: 1px solid #242424;
  }

  .timeline-phase-name {
    background-color: #151515;
    padding: 8px 18px;
    font-size: 0.72rem;
    font-weight: bold;
    color: #505050;
    letter-spacing: 1px;
    border-bottom: 1px solid #202020;
  }

  .timeline-phase-tasks {
    display: flex;
    flex-direction: column;
  }

  .timeline-task-row {
    display: flex;
    align-items: center;
    border-bottom: 1px solid #202020;
    padding: 12px 18px;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .timeline-task-row:hover {
    background-color: rgba(255,255,255,0.02);
  }

  .timeline-task-row:last-child {
    border-bottom: none;
  }

  .timeline-task-info {
    width: 250px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding-right: 15px;
    box-sizing: border-box;
  }

  .timeline-task-info .t-title {
    font-size: 0.85rem;
    color: #e0e0e0;
    font-weight: 500;
  }

  .timeline-task-info .t-meta {
    font-size: 0.68rem;
    color: #505050;
  }

  .timeline-bar-container {
    flex: 1;
    height: 32px;
    position: relative;
    background-color: rgba(0,0,0,0.15);
    border-radius: 4px;
    border-left: 1px solid #242424;
    display: flex;
    align-items: center;
  }

  .timeline-span-bar {
    position: absolute;
    height: 20px;
    background: linear-gradient(90deg, #505050, #707070);
    border: 1px solid #888888;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #121212;
    font-size: 0.62rem;
    font-weight: bold;
    font-family: var(--font-family, 'JetBrains Mono', monospace);
    box-shadow: 1px 1px 3px rgba(0,0,0,0.5);
    cursor: pointer;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    padding: 0 4px;
  }

  .timeline-span-bar.bar-done {
    background: linear-gradient(90deg, #283a2e, #41604c);
    border-color: #588f6c;
    color: #e2fdf0;
  }

  .no-dates-txt {
    font-size: 0.7rem;
    color: #404040;
    font-style: italic;
    cursor: pointer;
    padding-left: 15px;
    text-decoration: underline;
  }

  .no-dates-txt:hover {
    color: #888888;
  }

  /* Real-time Presence Indicators Styles */
  .presence-indicators {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-right: 15px;
    border-right: 1px solid var(--border-color);
    padding-right: 15px;
  }

  .presence-avatar-wrapper {
    position: relative;
    cursor: pointer;
  }

  .presence-avatar {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    border: 2px solid #a6e3a1; /* Cute green online indicator */
    image-rendering: pixelated;
    box-shadow: 0 0 5px rgba(166, 227, 161, 0.4);
    display: block;
  }

  .presence-avatar-initial {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid #a6e3a1; /* Green online indicator */
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 0.75rem;
    font-weight: 900;
    color: #11111b;
    font-family: var(--title-font-family, 'Outfit', sans-serif);
    user-select: none;
    box-shadow: 0 0 5px rgba(166, 227, 161, 0.4);
  }

  .presence-tooltip {
    position: absolute;
    bottom: -32px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #11111b;
    border: 1px solid #313244;
    color: #cdd6f4;
    font-size: 0.6rem;
    padding: 4px 8px;
    border-radius: 4px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;
    z-index: 100;
    font-family: var(--font-family, monospace);
    box-shadow: 0 4px 6px rgba(0,0,0,0.35);
  }

  .presence-avatar-wrapper:hover .presence-tooltip {
    opacity: 1;
  }
</style>
