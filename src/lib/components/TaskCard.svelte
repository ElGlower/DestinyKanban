<script>
  let { task, currentUser, onEdit, onDelete, onAssignMe, onCycleUser } = $props();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="card task-card">
  <div class="card-header">
    <div class="header-badges">
      <span class="badge card-phase">{task.phase}</span>
      <span class="badge card-priority card-priority-{task.priority.toLowerCase()}">
        {task.priority.toUpperCase()}
      </span>
    </div>
    
    <div class="card-actions">
      {#if currentUser && task.assignedUser !== currentUser}
        <button class="btn-icon" onclick={() => onAssignMe(task.id)} title="Asignarme a mí">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
        </button>
      {/if}
      <button class="btn-icon" onclick={() => onEdit(task)} title="Editar Tarea">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
      </button>
      <button class="btn-icon btn-icon-danger" onclick={() => onDelete(task.id)} title="Eliminar Tarea">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
      </button>
    </div>
  </div>
  
  <h3 class="card-title">{task.title}</h3>
  
  {#if task.description}
    <div class="card-description">
      {task.description.length > 75 ? task.description.substring(0, 75) + '...' : task.description}
    </div>
  {/if}
  
  <div class="card-meta">
    {#if task.startDate || task.dueDate}
      <div class="card-dates">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px; color: #a6adc8;">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <span class="date-txt">
          {task.startDate ? task.startDate.split('-').reverse().slice(0,2).join('/') : '?' } 
          <span style="opacity: 0.5; margin: 0 2px;">➔</span> 
          {task.dueDate ? task.dueDate.split('-').reverse().slice(0,2).join('/') : '?' }
        </span>
        {#if task.dueDate && new Date(task.dueDate + 'T23:59:59') < new Date() && task.status !== 'Done' && task.status !== 'Archivo'}
          <span class="badge-overdue">ATRASADA</span>
        {/if}
      </div>
    {/if}
  </div>
  
  <div class="card-footer">
    <div class="card-assignments">
      <span class="card-role">{task.assignedTo}</span>
    </div>
    
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    {#if (task.assignedUsers && task.assignedUsers.length > 0) || task.assignedUser}
      <div class="user-badge" title={`Clic para reasignar. Asignados: ${(task.assignedUsers || [task.assignedUser]).join(', ')}`} onclick={(e) => { e.stopPropagation(); onCycleUser(task.id); }} style="cursor: pointer;">
        <div class="avatar-stack">
          {#each (task.assignedUsers && task.assignedUsers.length > 0 ? task.assignedUsers : [task.assignedUser]) as u, i}
            <img src={`https://mc-heads.net/avatar/${u}/20`} alt={u} class="user-avatar" style="z-index: {10 - i}; margin-left: {i > 0 ? '-10px' : '0'};" />
          {/each}
        </div>
        <span class="card-user" style="margin-left: 4px;">
          {(task.assignedUsers && task.assignedUsers.length > 0 ? task.assignedUsers : [task.assignedUser]).length > 1 ? 
            `${(task.assignedUsers && task.assignedUsers.length > 0 ? task.assignedUsers : [task.assignedUser]).length} Asignados` : 
            (task.assignedUsers && task.assignedUsers.length > 0 ? task.assignedUsers[0] : task.assignedUser)}
        </span>
      </div>
    {:else}
      <div class="user-badge unassigned" title="Clic para asignar a un usuario" onclick={(e) => { e.stopPropagation(); onCycleUser(task.id); }} style="cursor: pointer;">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        <span>No asignado</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .card {
    background: rgba(24, 24, 28, 0.85);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 16px;
    cursor: grab;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
    position: relative;
    overflow: hidden;
  }

  /* Micro-animation hover effect on the card */
  .card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, rgba(166,227,161,0) 0%, rgba(166,227,161,0.5) 50%, rgba(166,227,161,0) 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .card:hover {
    border-color: rgba(166, 227, 161, 0.3);
    transform: translateY(-4px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    background: rgba(30, 30, 35, 0.95);
  }

  .card:hover::before {
    opacity: 1;
  }

  .card:active {
    cursor: grabbing;
    transform: scale(0.98);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  }

  .card-dragging {
    opacity: 0.4;
    border-style: dashed;
    box-shadow: none;
    transform: none;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .header-badges {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .badge {
    font-size: 0.65rem;
    font-family: var(--font-family, 'JetBrains Mono', monospace);
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    letter-spacing: 0.5px;
  }

  .card-phase {
    background-color: rgba(255, 255, 255, 0.05);
    color: #a6adc8;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .card-priority-crítica {
    color: #f38ba8;
    background-color: rgba(243, 139, 168, 0.1);
    border: 1px solid rgba(243, 139, 168, 0.3);
  }

  .card-priority-alta {
    color: #fab387;
    background-color: rgba(250, 179, 135, 0.1);
    border: 1px solid rgba(250, 179, 135, 0.3);
  }

  .card-priority-media {
    color: #f9e2af;
    background-color: rgba(249, 226, 175, 0.1);
    border: 1px solid rgba(249, 226, 175, 0.3);
  }

  .card-priority-baja {
    color: #a6e3a1;
    background-color: rgba(166, 227, 161, 0.1);
    border: 1px solid rgba(166, 227, 161, 0.3);
  }

  .card-title {
    margin: 0;
    font-family: var(--title-font-family, 'Outfit', sans-serif);
    font-size: 1.05rem;
    font-weight: 600;
    line-height: 1.35;
    color: #cdd6f4;
    word-break: break-word;
  }

  .card-description {
    margin: 0;
    font-size: 0.8rem;
    color: #bac2de;
    line-height: 1.4;
    word-break: break-word;
    font-style: italic;
    opacity: 0.8;
  }

  .card-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .card-dates {
    display: inline-flex;
    align-items: center;
    font-size: 0.7rem;
    color: #a6adc8;
    background-color: rgba(0, 0, 0, 0.3);
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .date-txt {
    font-family: var(--font-family, 'JetBrains Mono', monospace);
    font-weight: 500;
  }

  .badge-overdue {
    background-color: rgba(243, 139, 168, 0.15);
    color: #f38ba8;
    border: 1px solid rgba(243, 139, 168, 0.4);
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 0.65rem;
    font-weight: 800;
    margin-left: 6px;
    letter-spacing: 0.5px;
    animation: pulse-red 2s infinite;
  }

  @keyframes pulse-red {
    0% { box-shadow: 0 0 0 0 rgba(243, 139, 168, 0.4); }
    70% { box-shadow: 0 0 0 4px rgba(243, 139, 168, 0); }
    100% { box-shadow: 0 0 0 0 rgba(243, 139, 168, 0); }
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 10px;
    margin-top: auto;
  }

  .card-role {
    color: #a6adc8;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .user-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(166, 227, 161, 0.1);
    border: 1px solid rgba(166, 227, 161, 0.2);
    padding: 3px 8px 3px 4px;
    border-radius: 20px;
    transition: all 0.2s;
  }

  .user-badge:hover {
    background: rgba(166, 227, 161, 0.2);
    border-color: rgba(166, 227, 161, 0.4);
  }

  .user-badge.unassigned {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #7f849c;
    padding: 3px 8px;
  }

  .user-badge.unassigned:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .user-avatar {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    image-rendering: pixelated;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    border: 1px solid rgba(24, 24, 28, 0.9);
    position: relative;
  }
  
  .avatar-stack {
    display: flex;
    align-items: center;
  }

  .card-user {
    color: #a6e3a1;
    font-weight: 700;
    font-size: 0.75rem;
  }

  .user-badge.unassigned span {
    font-size: 0.7rem;
    font-weight: 500;
  }

  .card-actions {
    display: flex;
    gap: 4px;
    opacity: 0;
    transform: translateX(10px);
    transition: all 0.2s ease;
  }

  .card:hover .card-actions {
    opacity: 1;
    transform: translateX(0);
  }

  .btn-icon {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #bac2de;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    width: 26px;
    height: 26px;
    border-radius: 6px;
    transition: all 0.2s;
  }

  .btn-icon:hover {
    color: #cdd6f4;
    border-color: rgba(255, 255, 255, 0.3);
    background-color: rgba(255, 255, 255, 0.1);
    transform: scale(1.05);
  }

  .btn-icon-danger:hover {
    color: #f38ba8;
    border-color: rgba(243, 139, 168, 0.4);
    background-color: rgba(243, 139, 168, 0.15);
  }
</style>
