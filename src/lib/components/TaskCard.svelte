<script>
  let { task, onEdit, onDelete, onDragStart, draggedTaskId } = $props();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
  class="card task-card {draggedTaskId === task.id ? 'card-dragging' : ''}"
  draggable="true"
  ondragstart={(e) => onDragStart(e, task.id)}
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

<style src="./TaskCard.css"></style>
