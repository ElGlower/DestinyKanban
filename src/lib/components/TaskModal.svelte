<script>
  // Props
  let { 
    showModal = $bindable(false), 
    editingTask = null, 
    config, 
    systemUsers = [],
    onSubmit, 
    onDelete 
  } = $props();

  // Form field state
  let formTitle = $state("");
  let formStatus = $state("");
  let formPhase = $state("");
  let formPriority = $state("");
  let formAssignedTo = $state(""); // Role
  let formAssignedUser = $state(""); // Actual user
  let formStartDate = $state("");
  let formDueDate = $state("");

  // Sync state when editingTask or showModal changes
  $effect(() => {
    if (showModal) {
      if (editingTask) {
        formTitle = editingTask.title;
        formStatus = editingTask.status;
        formPhase = editingTask.phase;
        formPriority = editingTask.priority;
        formAssignedTo = editingTask.assignedTo;
        formAssignedUser = editingTask.assignedUser || "";
        formStartDate = editingTask.startDate || "";
        formDueDate = editingTask.dueDate || "";
      } else {
        formTitle = "";
        formStatus = formStatus || (config.columns[0] || "To Do");
        formPhase = config.phases[0] || "Pre-prod";
        formPriority = config.priorities[1] || "Media";
        formAssignedTo = config.roles[0] || "Desarrollador";
        formAssignedUser = "";
        formStartDate = "";
        formDueDate = "";
      }
    }
  });

  function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!formTitle.trim()) return;

    onSubmit({
      title: formTitle.trim(),
      status: formStatus,
      phase: formPhase,
      priority: formPriority,
      assignedTo: formAssignedTo,
      assignedUser: formAssignedUser,
      startDate: formStartDate,
      dueDate: formDueDate
    });
    
    showModal = false;
  }
</script>

{#if showModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="modal-backdrop" onclick={() => showModal = false} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} role="presentation">
      <div class="modal-header">
        <h2>{editingTask ? 'EDITAR TAREA' : 'NUEVA TAREA'}</h2>
        <button class="btn-text" onclick={() => showModal = false}>[CERRAR]</button>
      </div>

      <form class="modal-form" onsubmit={handleSubmit}>
        <div class="form-group">
          <label for="task-title">TÍTULO DE LA TAREA</label>
          <input 
            id="task-title" 
            type="text" 
            bind:value={formTitle} 
            placeholder="Escribe la descripción de la tarea..." 
            required
            class="form-control"
            autocomplete="off"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="task-status">ESTADO</label>
            <select id="task-status" bind:value={formStatus} class="form-control">
              {#each config.columns as col}
                <option value={col}>{col.toUpperCase()}</option>
              {/each}
            </select>
          </div>

          <div class="form-group">
            <label for="task-phase">FASE</label>
            <select id="task-phase" bind:value={formPhase} class="form-control">
              {#each config.phases as phase}
                <option value={phase}>{phase.toUpperCase()}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="task-priority">PRIORIDAD</label>
            <select id="task-priority" bind:value={formPriority} class="form-control">
              {#each config.priorities as priority}
                <option value={priority}>{priority.toUpperCase()}</option>
              {/each}
            </select>
          </div>

          <div class="form-group">
            <label for="task-assigned">ROL</label>
            <select id="task-assigned" bind:value={formAssignedTo} class="form-control">
              {#each config.roles as role}
                <option value={role}>{role.toUpperCase()}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="task-user">USUARIO ASIGNADO</label>
          <select id="task-user" bind:value={formAssignedUser} class="form-control">
            <option value="">(Sin asignar)</option>
            {#each systemUsers as user}
              <option value={user}>@{user}</option>
            {/each}
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="task-start-date">FECHA DE INICIO</label>
            <input 
              id="task-start-date" 
              type="date" 
              bind:value={formStartDate} 
              class="form-control"
            />
          </div>

          <div class="form-group">
            <label for="task-due-date">FECHA DE VENCIMIENTO</label>
            <input 
              id="task-due-date" 
              type="date" 
              bind:value={formDueDate} 
              class="form-control"
            />
          </div>
        </div>

        <div class="modal-footer">
          {#if editingTask}
            <button 
              type="button" 
              class="btn btn-danger" 
              onclick={() => { onDelete(editingTask.id); showModal = false; }}
            >
              ELIMINAR TAREA
            </button>
          {/if}
          <div style="flex-grow: 1;"></div>
          <button type="button" class="btn btn-secondary" onclick={() => showModal = false}>
            CANCELAR
          </button>
          <button type="submit" class="btn btn-primary">
            {editingTask ? 'GUARDAR' : 'CREAR'}
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
    background-color: rgba(0, 0, 0, 0.75);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
  }

  .modal {
    background-color: #1e1e1e;
    border: 2px solid #505050;
    width: 90%;
    max-width: 500px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #333333;
    padding-bottom: 10px;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.2rem;
    letter-spacing: 1px;
    color: #e0e0e0;
  }

  .modal-form {
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

  .form-row {
    display: flex;
    gap: 15px;
  }

  .form-row .form-group {
    flex: 1;
  }

  .form-control {
    background-color: #121212;
    border: 1px solid #505050;
    color: #e0e0e0;
    font-family: inherit;
    padding: 8px;
    font-size: 0.85rem;
    outline: none;
    width: 100%;
    box-sizing: border-box;
  }

  .form-control:focus {
    border-color: #a0a0a0;
  }

  select.form-control {
    cursor: pointer;
  }

  .modal-footer {
    display: flex;
    gap: 10px;
    border-top: 1px solid #333333;
    padding-top: 15px;
    margin-top: 5px;
  }

  /* Buttons */
  .btn {
    background-color: #1e1e1e;
    border: 1px solid #505050;
    color: #e0e0e0;
    font-family: inherit;
    padding: 8px 12px;
    font-size: 0.85rem;
    font-weight: bold;
    cursor: pointer;
    outline: none;
  }

  .btn:hover {
    background-color: #333333;
    border-color: #888888;
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
    border-color: #333333;
  }

  .btn-secondary:hover {
    color: #e0e0e0;
    border-color: #505050;
  }

  .btn-danger {
    background-color: #3a1e1e;
    border-color: #772222;
    color: #ff8888;
  }

  .btn-danger:hover {
    background-color: #772222;
    color: #ffffff;
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
