<script>
  // Props with Svelte 5 bindings
  let { 
    config, 
    filterPhase = $bindable("All"), 
    filterRole = $bindable("All"), 
    filterPriority = $bindable("All"), 
    searchQuery = $bindable(""), 
    clearFilters 
  } = $props();
</script>

<section class="filters-bar neumorphic-panel">
  <div class="filter-group">
    <label for="search-input">BUSCAR:</label>
    <input 
      id="search-input" 
      type="text" 
      placeholder="Filtrar por título..." 
      bind:value={searchQuery} 
      class="form-control"
    />
  </div>

  <div class="filter-group">
    <label for="phase-filter">FASE:</label>
    <select id="phase-filter" bind:value={filterPhase} class="form-control">
      <option value="All">TODAS</option>
      {#each config.phases as phase}
        <option value={phase}>{phase.toUpperCase()}</option>
      {/each}
    </select>
  </div>

  <div class="filter-group">
    <label for="role-filter">ASIGNADO:</label>
    <select id="role-filter" bind:value={filterRole} class="form-control">
      <option value="All">TODOS</option>
      {#each config.roles as role}
        <option value={role}>{role.toUpperCase()}</option>
      {/each}
    </select>
  </div>

  <div class="filter-group">
    <label for="priority-filter">PRIORIDAD:</label>
    <select id="priority-filter" bind:value={filterPriority} class="form-control">
      <option value="All">TODAS</option>
      {#each config.priorities as priority}
        <option value={priority}>{priority.toUpperCase()}</option>
      {/each}
    </select>
  </div>

  {#if filterPhase !== 'All' || filterRole !== 'All' || filterPriority !== 'All' || searchQuery !== ''}
    <button class="btn btn-secondary" onclick={clearFilters}>
      LIMPIAR
    </button>
  {/if}
</section>

<style>
.filters-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    background-color: #1e1e1e;
    border: 1px solid #282828;
    padding: 12px 18px;
    margin-bottom: 20px;
    align-items: center;
    border-radius: 8px;
    box-shadow: 
      -3px -3px 8px rgba(255, 255, 255, 0.005),
      3px 3px 8px rgba(0, 0, 0, 0.3);
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .filter-group label {
    font-family: var(--title-font-family, 'Outfit', sans-serif);
    font-size: 0.8rem;
    font-weight: 700;
    color: #888888;
    white-space: nowrap;
    letter-spacing: 0.5px;
  }

  /* Sunken control inputs */
  .form-control {
    background-color: #121212;
    border: 1px solid #222222;
    color: #e0e0e0;
    font-family: var(--font-family, 'JetBrains Mono', monospace);
    padding: 6px 10px;
    font-size: 0.8rem;
    outline: none;
    border-radius: 4px;
    box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.4);
  }

  .form-control:focus {
    border-color: #505050;
  }

  input[type="text"].form-control {
    width: 180px;
  }

  select.form-control {
    cursor: pointer;
  }

  /* Tactile Button */
  .btn {
    background-color: #1e1e1e;
    border: 1px solid #282828;
    color: #e0e0e0;
    font-family: inherit;
    padding: 6px 12px;
    font-size: 0.85rem;
    font-weight: bold;
    cursor: pointer;
    outline: none;
    border-radius: 4px;
    box-shadow: 
      -2px -2px 6px rgba(255, 255, 255, 0.01),
      2px 2px 6px rgba(0, 0, 0, 0.3);
  }

  .btn:hover {
    background-color: #242424;
    border-color: #404040;
  }

  .btn:active {
    box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.5);
  }

  .btn-secondary {
    color: #888888;
    border-color: #262626;
  }

  .btn-secondary:hover {
    color: #e0e0e0;
    border-color: #505050;
  }
</style>
