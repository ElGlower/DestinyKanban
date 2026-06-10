<script>
  import { onMount } from "svelte";

  // Props
  let { 
    showConfig = $bindable(false), 
    config = $bindable(), 
    onSave 
  } = $props();

  // Local state for editing lists
  let localPhases = $state([...config.phases]);
  let localRoles = $state([...config.roles]);
  let localPriorities = $state([...config.priorities]);
  let localColumns = $state([...config.columns]);

  // Inputs for adding new items
  let newPhase = $state("");
  let newRole = $state("");
  let newPriority = $state("");
  let newColumn = $state("");

  // Sync local lists when config or modal visibility changes
  $effect(() => {
    if (showConfig) {
      localPhases = [...config.phases];
      localRoles = [...config.roles];
      localPriorities = [...config.priorities];
      localColumns = [...config.columns];
    }
  });

  function addItem(type) {
    if (type === 'phase' && newPhase.trim()) {
      if (!localPhases.includes(newPhase.trim())) {
        localPhases = [...localPhases, newPhase.trim()];
      }
      newPhase = "";
    } else if (type === 'role' && newRole.trim()) {
      if (!localRoles.includes(newRole.trim())) {
        localRoles = [...localRoles, newRole.trim()];
      }
      newRole = "";
    } else if (type === 'priority' && newPriority.trim()) {
      if (!localPriorities.includes(newPriority.trim())) {
        localPriorities = [...localPriorities, newPriority.trim()];
      }
      newPriority = "";
    } else if (type === 'column' && newColumn.trim()) {
      if (!localColumns.includes(newColumn.trim())) {
        localColumns = [...localColumns, newColumn.trim()];
      }
      newColumn = "";
    }
  }

  function removeItem(type, index) {
    if (type === 'phase') {
      localPhases = localPhases.filter((_, i) => i !== index);
    } else if (type === 'role') {
      localRoles = localRoles.filter((_, i) => i !== index);
    } else if (type === 'priority') {
      localPriorities = localPriorities.filter((_, i) => i !== index);
    } else if (type === 'column') {
      localColumns = localColumns.filter((_, i) => i !== index);
    }
  }

  function handleSave() {
    // Validate that we have at least one column/phase/role
    if (localColumns.length === 0 || localPhases.length === 0 || localRoles.length === 0) {
      alert("Error: Debes tener al menos una columna, una fase y un rol.");
      return;
    }

    onSave({
      phases: localPhases,
      roles: localRoles,
      priorities: localPriorities,
      columns: localColumns
    });

    showConfig = false;
  }
</script>

{#if showConfig}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="modal-backdrop" onclick={() => showConfig = false} role="presentation">
    <div class="modal neumorphic-modal" onclick={(e) => e.stopPropagation()} role="presentation">
      <div class="modal-header">
        <h2>AJUSTES DE CONFIGURACIÓN</h2>
        <button class="btn-text" onclick={() => showConfig = false}>[CERRAR]</button>
      </div>

      <div class="modal-body">
        <p class="section-desc">Personaliza los metadatos de las tareas y columnas sin tocar el código fuente. Se guardará de inmediato en config.json.</p>
        
        <div class="config-grid">
          <!-- Columnas Config -->
          <div class="config-card">
            <h3>COLUMNAS DEL TABLERO</h3>
            <div class="items-list">
              {#each localColumns as col, i}
                <div class="item-pill">
                  <span>{col}</span>
                  <button class="btn-delete-item" onclick={() => removeItem('column', i)} title="Eliminar">×</button>
                </div>
              {/each}
            </div>
            <div class="add-item-form">
              <input type="text" bind:value={newColumn} placeholder="Nueva columna..." class="form-control" />
              <button class="btn btn-add" onclick={() => addItem('column')}>+</button>
            </div>
          </div>

          <!-- Fases Config -->
          <div class="config-card">
            <h3>FASES DE PROYECTO</h3>
            <div class="items-list">
              {#each localPhases as phase, i}
                <div class="item-pill">
                  <span>{phase}</span>
                  <button class="btn-delete-item" onclick={() => removeItem('phase', i)} title="Eliminar">×</button>
                </div>
              {/each}
            </div>
            <div class="add-item-form">
              <input type="text" bind:value={newPhase} placeholder="Nueva fase..." class="form-control" />
              <button class="btn btn-add" onclick={() => addItem('phase')}>+</button>
            </div>
          </div>

          <!-- Roles Config -->
          <div class="config-card">
            <h3>ROLES Y EQUIPO</h3>
            <div class="items-list">
              {#each localRoles as role, i}
                <div class="item-pill">
                  <span>{role}</span>
                  <button class="btn-delete-item" onclick={() => removeItem('role', i)} title="Eliminar">×</button>
                </div>
              {/each}
            </div>
            <div class="add-item-form">
              <input type="text" bind:value={newRole} placeholder="Nuevo rol..." class="form-control" />
              <button class="btn btn-add" onclick={() => addItem('role')}>+</button>
            </div>
          </div>

          <!-- Prioridades Config -->
          <div class="config-card">
            <h3>NIVELES DE PRIORIDAD</h3>
            <div class="items-list">
              {#each localPriorities as priority, i}
                <div class="item-pill">
                  <span>{priority}</span>
                  <button class="btn-delete-item" onclick={() => removeItem('priority', i)} title="Eliminar">×</button>
                </div>
              {/each}
            </div>
            <div class="add-item-form">
              <input type="text" bind:value={newPriority} placeholder="Nueva prioridad..." class="form-control" />
              <button class="btn btn-add" onclick={() => addItem('priority')}>+</button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick={() => showConfig = false}>CANCELAR</button>
        <button class="btn btn-primary" onclick={handleSave}>GUARDAR CONFIGURACIÓN</button>
      </div>
    </div>
  </div>
{/if}

<style src="./ConfigModal.css"></style>
