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

<style src="./KanbanBoard.css"></style>
