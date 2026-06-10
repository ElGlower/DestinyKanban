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

<style>
.modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 200;
  }

  .modal {
    background-color: #121212;
    border: 1px solid #1e1e1e;
    width: 90%;
    max-width: 850px;
    padding: 25px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* Neumorphic style */
  .neumorphic-modal {
    box-shadow: 
      -5px -5px 15px rgba(255, 255, 255, 0.02),
      5px 5px 15px rgba(0, 0, 0, 0.5);
    border-radius: 12px;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #1e1e1e;
    padding-bottom: 12px;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
    letter-spacing: 1px;
    color: #e0e0e0;
  }

  .section-desc {
    color: #888888;
    margin: 0 0 15px 0;
    font-size: 0.85rem;
    line-height: 1.5;
  }

  .modal-body {
    display: flex;
    flex-direction: column;
    max-height: 60vh;
    overflow-y: auto;
  }

  .config-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }

  /* Neumorphic Extruded Cards */
  .config-card {
    background: #1e1e1e;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 
      -3px -3px 8px rgba(255, 255, 255, 0.01),
      3px 3px 8px rgba(0, 0, 0, 0.3);
    border: 1px solid #282828;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .config-card h3 {
    margin: 0;
    font-size: 0.85rem;
    color: #888888;
    font-weight: bold;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #222;
    padding-bottom: 8px;
  }

  .items-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    min-height: 80px;
    align-content: flex-start;
  }

  /* Neumorphic Flat Pill */
  .item-pill {
    background-color: #121212;
    border: 1px solid #282828;
    padding: 4px 8px 4px 10px;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    color: #e0e0e0;
  }

  .btn-delete-item {
    background: none;
    border: none;
    color: #505050;
    cursor: pointer;
    font-size: 1rem;
    padding: 0;
    line-height: 1;
  }

  .btn-delete-item:hover {
    color: #aa3333;
  }

  .add-item-form {
    display: flex;
    gap: 8px;
  }

  /* Neumorphic Sunken Input */
  .form-control {
    background-color: #121212;
    border: 1px solid #222;
    color: #e0e0e0;
    font-family: inherit;
    padding: 6px 10px;
    font-size: 0.8rem;
    outline: none;
    flex: 1;
    border-radius: 4px;
    box-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.4);
  }

  .form-control:focus {
    border-color: #505050;
  }

  /* Neumorphic Button Extruded */
  .btn {
    background-color: #1e1e1e;
    border: 1px solid #282828;
    color: #e0e0e0;
    font-family: inherit;
    padding: 6px 12px;
    font-size: 0.8rem;
    font-weight: bold;
    cursor: pointer;
    border-radius: 4px;
    outline: none;
    box-shadow: 
      -2px -2px 6px rgba(255, 255, 255, 0.01),
      2px 2px 6px rgba(0, 0, 0, 0.3);
  }

  .btn:hover {
    background-color: #242424;
    border-color: #404040;
  }

  .btn:active {
    box-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.4);
  }

  .btn-add {
    padding: 6px 10px;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    border-top: 1px solid #1e1e1e;
    padding-top: 15px;
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
    border-color: #282828;
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

  .fb-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }
  @media (max-width: 600px) {
    .fb-form-grid {
      grid-template-columns: 1fr;
    }
  }
  .fb-status-banner {
    margin-top: 15px;
    padding: 8px 12px;
    font-size: 0.72rem;
    font-weight: bold;
    border-radius: 4px;
    text-align: center;
    border: 1px solid transparent;
  }
  .fb-status-banner.connected {
    background-color: rgba(76, 217, 100, 0.1);
    color: #4cd964;
    border-color: rgba(76, 217, 100, 0.2);
  }
  .fb-status-banner.disconnected {
    background-color: rgba(255, 255, 255, 0.03);
    color: #888888;
    border-color: rgba(255, 255, 255, 0.05);
  }
  .status-dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .status-dot.connected {
    background-color: #4cd964;
    box-shadow: 0 0 6px #4cd964;
  }
  .status-dot.disconnected {
    background-color: #888888;
  }
</style>
