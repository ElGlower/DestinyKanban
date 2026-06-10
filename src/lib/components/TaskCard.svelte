<script>
  let { task, onEdit, onDelete, onDragStart, onDragEnd, draggedTaskId } = $props();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
  class="card task-card {draggedTaskId === task.id ? 'card-dragging' : ''}"
  draggable="true"
  ondragstart={(e) => onDragStart(e, task.id)}
  ondragend={onDragEnd}
>
  <div class="card-header">
    <span class="card-phase">[{task.phase}]</span>
    <span class="card-priority card-priority-{task.priority.toLowerCase()}">
      [{task.priority.toUpperCase()}]
    </span>
  </div>
  
  <h3 class="card-title">{task.title}</h3>
  
  {#if task.description}
    <div class="card-description">
      {task.description.length > 60 ? task.description.substring(0, 60) + '...' : task.description}
    </div>
  {/if}
  
  {#if task.startDate || task.dueDate}
    <div class="card-dates">
      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 3px; color: #888888;">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
      <span class="date-txt">
        {task.startDate ? task.startDate.split('-').reverse().slice(0,2).join('/') : '?' } 
        ➔ 
        {task.dueDate ? task.dueDate.split('-').reverse().slice(0,2).join('/') : '?' }
      </span>
      {#if task.dueDate && new Date(task.dueDate + 'T23:59:59') < new Date() && task.status !== 'Done' && task.status !== 'Archivo'}
        <span class="badge-overdue">ATRASADA</span>
      {/if}
    </div>
  {/if}
  
  <div class="card-footer">
    <div class="card-assignments">
      <span class="card-role">[{task.assignedTo}]</span>
      {#if task.assignedUser}
        <span class="card-user">@{task.assignedUser}</span>
      {/if}
    </div>
    <div class="card-actions">
      <button class="btn-icon" onclick={() => onEdit(task)} title="Editar">
        [EDIT]
      </button>
      <button class="btn-icon btn-icon-danger" onclick={() => onDelete(task.id)} title="Eliminar">
        [ELIM]
      </button>
    </div>
  </div>
</div>

<style>
.card-dates {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.68rem;
    color: #888888;
    background-color: rgba(0, 0, 0, 0.25);
    padding: 3px 6px;
    border-radius: 4px;
    align-self: flex-start;
    border: 1px solid rgba(255, 255, 255, 0.02);
  }

  .date-txt {
    font-family: var(--font-family, 'JetBrains Mono', monospace);
  }

  .badge-overdue {
    background-color: #3a1e1e;
    color: #ff8888;
    border: 1px solid #772222;
    padding: 0 4px;
    border-radius: 3px;
    font-size: 0.62rem;
    font-weight: bold;
    letter-spacing: 0.5px;
    animation: flash-red 2s infinite alternate;
  }

  @keyframes flash-red {
    from { box-shadow: 0 0 2px #772222; }
    to { box-shadow: 0 0 6px #ff4444; }
  }

  .card {
    background: rgba(20, 20, 25, 0.7);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 14px;
    cursor: grab;
    display: flex;
    flex-direction: column;
    gap: 10px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  .card:hover {
    border-color: rgba(166, 227, 161, 0.4);
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
    background: rgba(30, 30, 35, 0.8);
  }

  .card:active {
    cursor: grabbing;
    transform: scale(0.98);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  }

  .card-dragging {
    opacity: 0.3;
    border-style: dashed;
    box-shadow: none;
    transform: none;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    font-size: 0.72rem;
    font-family: var(--font-family, 'JetBrains Mono', monospace);
  }

  .card-phase {
    color: #888888;
  }

  .card-priority {
    font-weight: bold;
    letter-spacing: 0.5px;
  }

  .card-priority-crítica {
    color: #ffb8b8;
    background-color: #3a1e1e;
    padding: 0px 4px;
    border: 1px solid #772222;
    border-radius: 3px;
  }

  .card-priority-alta {
    color: #ffb8b8;
  }

  .card-priority-media {
    color: #dedede;
  }

  .card-priority-baja {
    color: #888888;
  }

  .card-title {
    margin: 0;
    font-family: var(--title-font-family, 'Outfit', sans-serif);
    font-size: 0.95rem;
    font-weight: 500;
    line-height: 1.4;
    color: #e0e0e0;
    word-break: break-word;
  }

  .card-description {
    margin: 0;
    font-size: 0.75rem;
    color: #999999;
    line-height: 1.3;
    word-break: break-word;
    font-style: italic;
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #222222;
    padding-top: 8px;
    font-size: 0.75rem;
  }

  .card-assignments {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .card-role {
    color: #666666;
    font-size: 0.7rem;
  }

  .card-user {
    color: #a6e3a1; /* distinctive color for assigned user */
    font-weight: bold;
    font-size: 0.8rem;
  }

  .card-actions {
    display: flex;
    gap: 6px;
  }

  .btn-icon {
    background: none;
    border: none;
    color: #505050;
    font-family: inherit;
    font-size: 0.7rem;
    cursor: pointer;
    padding: 2px 4px;
    border: 1px solid transparent;
    border-radius: 3px;
  }

  .btn-icon:hover {
    color: #e0e0e0;
    border-color: #505050;
    background-color: #1e1e1e;
  }

  .btn-icon-danger:hover {
    color: #ff8888;
    border-color: #772222;
    background-color: #3a1e1e;
  }
</style>
