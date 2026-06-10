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

<style src="./FiltersBar.css"></style>
