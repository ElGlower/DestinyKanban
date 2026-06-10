<script>
  // Props
  let { 
    showModal = $bindable(false), 
    editingTask = null, 
    config, 
    systemUsers = [],
    currentUser = "",
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
  let formDescription = $state("");
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
        formDescription = editingTask.description || "";
        formStartDate = editingTask.startDate || "";
        formDueDate = editingTask.dueDate || "";
      } else {
        formTitle = "";
        formStatus = formStatus || (config.columns[0] || "To Do");
        formPhase = config.phases[0] || "Pre-prod";
        formPriority = config.priorities[1] || "Media";
        formAssignedTo = config.roles[0] || "Desarrollador";
        formAssignedUser = "";
        formDescription = "";
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
      phase: formPhase,a\\
      priority: formPriority,
      assignedTo: formAssignedTo,
      assignedUser: formAssignedUser,
      description: formDescription,
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

        <div class="form-group">
          <label for="task-desc">DESCRIPCIÓN</label>
          <textarea 
            id="task-desc" 
            bind:value={formDescription} 
            placeholder="Añade más detalles sobre esta tarea..." 
            class="form-control"
            rows="3"
          ></textarea>
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
          <div style="display: flex; gap: 8px;">
            <select id="task-user" bind:value={formAssignedUser} class="form-control" style="flex: 1;">
              <option value="">(Sin asignar)</option>
              {#each systemUsers as user}
                <option value={user}>@{user}</option>
              {/each}
            </select>
            {#if currentUser && currentUser !== formAssignedUser}
              <button type="button" class="btn btn-secondary" onclick={() => formAssignedUser = currentUser}>
                A MÍ
              </button>
            {/if}
          </div>
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

<style src="./TaskModal.css"></style>
