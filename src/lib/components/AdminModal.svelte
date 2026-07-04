<script>
  import { onDestroy } from "svelte";
  import { 
    getFirebaseUsers, 
    updateUserPermission, 
    isCloudActive,
    getFirebaseConfig,
    saveFirebaseConfig,
    addAuthorizedUser,
    updateSystemVersion,
    subscribeToActivityLog
  } from "../firebase.js";

  // Props
  let { 
    show = $bindable(false),
    appVersion = "1.0.0",
    latestAppVersion = "1.0.0"
  } = $props();

  // Active tab state: 'users' | 'activity'
  let activeTab = $state("activity");

  let users = $state([]);
  let loading = $state(true);
  let errorMsg = $state("");

  // Firebase Config State
  let fbApiKey = $state("");
  let fbProjectId = $state("");
  let fbAppId = $state("");
  let fbAuthDomain = $state("");
  let cloudStatus = $state(false);

  // Manual Minecraft user authorization form state
  let newAuthUsername = $state("");
  let newAuthCanCreateTeam = $state(false);
  let addingUserMsg = $state("");
  let isAddingUser = $state(false);

  // Activity log state
  let activityLog = $state([]);
  let activityFilter = $state("all"); // 'all' | username
  let _unsubActivity = null;

  // ── Action metadata ──────────────────────────────────────────────────
  const ACTION_META = {
    login:        { label: "Entró al sistema",   color: "#89b4fa", icon: "🔑", short: "LOGIN" },
    logout:       { label: "Salió del sistema",  color: "#6c7086", icon: "🚪", short: "LOGOUT" },
    enter_board:  { label: "Abrió tablero",      color: "#a6e3a1", icon: "📋", short: "BOARD" },
    leave_board:  { label: "Cerró tablero",      color: "#585b70", icon: "↩️",  short: "LEAVE" },
    create_task:  { label: "Creó tarea",         color: "#cba6f7", icon: "✨", short: "CREATE" },
    edit_task:    { label: "Editó tarea",        color: "#f9e2af", icon: "✏️",  short: "EDIT" },
    delete_task:  { label: "Eliminó tarea",      color: "#f38ba8", icon: "🗑️",  short: "DELETE" },
    move_task:    { label: "Movió tarea",        color: "#fab387", icon: "↔️",  short: "MOVE" },
  };

  function getActionMeta(action) {
    return ACTION_META[action] || { label: action, color: "#888888", icon: "•", short: action.toUpperCase() };
  }

  // ── Derived stats ────────────────────────────────────────────────────
  let statsPerUser = $derived.by(() => {
    const map = {};
    activityLog.forEach(e => {
      const u = e.displayName || e.username;
      if (!map[u]) map[u] = { total: 0, byAction: {} };
      map[u].total++;
      map[u].byAction[e.action] = (map[u].byAction[e.action] || 0) + 1;
    });
    // Sort by total desc
    return Object.entries(map)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, data]) => ({ name, ...data }));
  });

  let maxUserTotal = $derived(statsPerUser.length > 0 ? statsPerUser[0].total : 1);

  let filteredLog = $derived(
    activityFilter === "all"
      ? activityLog
      : activityLog.filter(e => (e.displayName || e.username) === activityFilter)
  );

  function startActivitySubscription() {
    if (_unsubActivity) { _unsubActivity(); _unsubActivity = null; }
    if (!isCloudActive()) return;
    _unsubActivity = subscribeToActivityLog((entries) => {
      activityLog = entries;
    }, 150);
  }

  async function loadUsers() {
    if (!isCloudActive()) {
      users = [];
      loading = false;
      return;
    }
    loading = true;
    errorMsg = "";
    try {
      users = await getFirebaseUsers();
    } catch (e) {
      errorMsg = "Error al cargar la lista de usuarios: " + e.message;
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (show) {
      loadUsers();
      startActivitySubscription();

      // Load saved Firebase settings
      const fbConfig = getFirebaseConfig();
      if (fbConfig) {
        fbApiKey = fbConfig.apiKey || "";
        fbProjectId = fbConfig.projectId || "";
        fbAppId = fbConfig.appId || "";
        fbAuthDomain = fbConfig.authDomain || "";
      } else {
        fbApiKey = "";
        fbProjectId = "";
        fbAppId = "";
        fbAuthDomain = "";
      }
      cloudStatus = isCloudActive();
    } else {
      // Unsub when modal closes to save reads
      if (_unsubActivity) { _unsubActivity(); _unsubActivity = null; }
    }
  });

  onDestroy(() => {
    if (_unsubActivity) _unsubActivity();
  });

  async function togglePermission(user) {
    const newValue = !user.canCreateTeamBoards;
    try {
      await updateUserPermission(user.username, newValue);
      users = users.map(u => u.username === user.username ? { ...u, canCreateTeamBoards: newValue } : u);
    } catch (e) {
      alert("Error al actualizar permisos: " + e.message);
    }
  }

  async function handleSaveFirebase() {
    try {
      if (fbApiKey.trim() && fbProjectId.trim()) {
        saveFirebaseConfig({
          apiKey: fbApiKey.trim(),
          projectId: fbProjectId.trim(),
          appId: fbAppId.trim(),
          authDomain: fbAuthDomain.trim()
        });
        alert("Configuración de Firebase guardada. Se requiere reiniciar la aplicación para aplicar.");
      } else if (!fbApiKey.trim() && !fbProjectId.trim()) {
        saveFirebaseConfig(null);
        alert("Configuración de Firebase eliminada. Se requiere reiniciar la aplicación.");
      }
      cloudStatus = isCloudActive();
      loadUsers();
    } catch (e) {
      alert("Error al guardar la configuración de Firebase: " + e.message);
    }
  }

  async function handleAddUser(e) {
    e.preventDefault();
    if (!newAuthUsername.trim()) return;
    addingUserMsg = "";
    isAddingUser = true;
    try {
      await addAuthorizedUser(newAuthUsername.trim(), newAuthCanCreateTeam);
      addingUserMsg = `Usuario ${newAuthUsername.trim()} agregado/autorizado correctamente.`;
      newAuthUsername = "";
      newAuthCanCreateTeam = false;
      await loadUsers();
    } catch (err) {
      addingUserMsg = "Error al autorizar usuario: " + err.message;
    } finally {
      isAddingUser = false;
    }
  }

  function formatDate(isoString) {
    if (!isoString) return "Desconocida";
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return "Formato inválido";
    }
  }

  function formatRelativeTime(isoString) {
    if (!isoString) return "";
    try {
      const now = Date.now();
      const then = new Date(isoString).getTime();
      const diff = Math.floor((now - then) / 1000);
      if (diff < 60) return `hace ${diff}s`;
      if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
      if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
      return `hace ${Math.floor(diff / 86400)}d`;
    } catch { return ""; }
  }

  function buildActionDescription(entry) {
    const meta = entry.meta || {};
    switch (entry.action) {
      case 'enter_board':
      case 'leave_board':
        return meta.projectName ? `"${meta.projectName}"` : "";
      case 'create_task':
      case 'edit_task':
      case 'delete_task':
        return meta.taskTitle ? `"${meta.taskTitle}"` : "";
      case 'move_task':
        return meta.taskTitle
          ? `"${meta.taskTitle}" ${meta.fromCol ? `${meta.fromCol} → ${meta.toCol}` : ""}`
          : "";
      default:
        return "";
    }
  }

  // Unique list of users who have appeared in activity log (for filter pills)
  let activityUsers = $derived(
    [...new Set(activityLog.map(e => e.displayName || e.username))].slice(0, 10)
  );
</script>

{#if show}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="modal-backdrop" onclick={() => show = false} role="presentation">
    <div class="modal neumorphic-modal" onclick={(e) => e.stopPropagation()} role="presentation">
      
      <!-- Header -->
      <div class="modal-header">
        <div class="header-title-wrapper">
          <span class="admin-badge">PANEL</span>
          <h2>CONTROL DE ACCESO Y PERMISOS</h2>
        </div>
        <button class="btn-text" onclick={() => show = false}>
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <!-- Tab Nav -->
      <div class="tab-nav">
        <button class="tab-btn {activeTab === 'activity' ? 'active' : ''}" onclick={() => activeTab = 'activity'}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          ACTIVIDAD EN VIVO
          {#if activityLog.length > 0}
            <span class="tab-count">{activityLog.length}</span>
          {/if}
        </button>
        <button class="tab-btn {activeTab === 'users' ? 'active' : ''}" onclick={() => activeTab = 'users'}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          USUARIOS Y PERMISOS
        </button>
        <button class="tab-btn {activeTab === 'firebase' ? 'active' : ''}" onclick={() => activeTab = 'firebase'}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect><line x1="2" y1="12" x2="22" y2="12"></line></svg>
          FIREBASE
        </button>
      </div>

      <!-- Modal Body -->
      <div class="modal-body">

        <!-- ═══════════════════════════════════ TAB: ACTIVITY ═══════════════════════════════════ -->
        {#if activeTab === 'activity'}
          {#if !isCloudActive()}
            <div class="alert-box warning" style="display: flex; align-items: center; gap: 8px;">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #fab387; flex-shrink: 0;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              <span>Firebase debe estar activo para ver la actividad en tiempo real.</span>
            </div>
          {:else}
            <!-- Stats bar chart per user -->
            {#if statsPerUser.length > 0}
              <div class="admin-section-card">
                <h3>
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline; margin-right:5px;"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                  GRÁFICA DE ACTIVIDAD POR USUARIO
                </h3>
                <p class="section-desc" style="font-size: 0.7rem; margin: 0 0 10px 0;">Últimas {activityLog.length} acciones registradas en tiempo real</p>
                <div class="chart-area">
                  {#each statsPerUser as stat}
                    <div class="chart-row">
                      <div class="chart-user-info">
                        <img 
                          src={`https://mc-heads.net/avatar/${stat.name}/18`} 
                          alt={stat.name}
                          class="chart-avatar"
                          onerror={(e) => e.target.style.display='none'}
                        />
                        <span class="chart-username">{stat.name.toUpperCase()}</span>
                      </div>
                      <div class="chart-bar-track">
                        <div 
                          class="chart-bar-fill"
                          style="width: {Math.round((stat.total / maxUserTotal) * 100)}%;"
                        >
                          <!-- Mini action breakdown -->
                          {#each Object.entries(ACTION_META) as [actionKey, actionData]}
                            {#if stat.byAction[actionKey]}
                              {@const segWidth = Math.round((stat.byAction[actionKey] / stat.total) * 100)}
                              <div 
                                class="bar-segment"
                                style="width: {segWidth}%; background: {actionData.color}; opacity: 0.85;"
                                title="{actionData.label}: {stat.byAction[actionKey]}"
                              ></div>
                            {/if}
                          {/each}
                        </div>
                        <span class="chart-count">{stat.total}</span>
                      </div>
                      <!-- Mini pill breakdown -->
                      <div class="chart-pills">
                        {#each Object.entries(stat.byAction).sort((a,b)=>b[1]-a[1]).slice(0,4) as [actionKey, count]}
                          {@const am = getActionMeta(actionKey)}
                          <span class="mini-pill" style="background: {am.color}18; color: {am.color}; border-color: {am.color}30;">
                            {am.icon} {count}
                          </span>
                        {/each}
                      </div>
                    </div>
                  {/each}
                </div>
                <!-- Legend -->
                <div class="chart-legend">
                  {#each Object.entries(ACTION_META) as [key, am]}
                    <div class="legend-item">
                      <span class="legend-dot" style="background: {am.color};"></span>
                      <span class="legend-label">{am.short}</span>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Activity Feed -->
            <div class="admin-section-card" style="flex: 1;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <h3 style="margin: 0; border: none; padding: 0;">
                  <span class="live-dot"></span>
                  FEED DE ACTIVIDAD EN TIEMPO REAL
                </h3>
                <!-- Filter pills -->
                <div class="filter-pills">
                  <button 
                    class="filter-pill {activityFilter === 'all' ? 'active' : ''}"
                    onclick={() => activityFilter = 'all'}
                  >TODOS</button>
                  {#each activityUsers as uname}
                    <button 
                      class="filter-pill {activityFilter === uname ? 'active' : ''}"
                      onclick={() => activityFilter = activityFilter === uname ? 'all' : uname}
                    >
                      <img 
                        src={`https://mc-heads.net/avatar/${uname}/14`} 
                        alt={uname} 
                        class="pill-avatar"
                        onerror={(e) => e.target.style.display='none'}
                      />
                      {uname.toUpperCase()}
                    </button>
                  {/each}
                </div>
              </div>

              {#if activityLog.length === 0}
                <div class="empty-feed">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: #303030;"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                  <span>Esperando actividad...</span>
                  <span style="font-size: 0.68rem; color: #303030;">Los eventos aparecerán aquí cuando los usuarios interactúen con el kanban</span>
                </div>
              {:else}
                <div class="activity-feed neumorphic-well">
                  {#each filteredLog as entry (entry.id)}
                    {@const am = getActionMeta(entry.action)}
                    {@const desc = buildActionDescription(entry)}
                    <div class="feed-entry" style="--entry-color: {am.color};">
                      <div class="feed-left">
                        <div class="feed-action-dot" style="background: {am.color}; box-shadow: 0 0 6px {am.color}55;"></div>
                        <div class="feed-connector"></div>
                      </div>
                      <div class="feed-content">
                        <div class="feed-top-row">
                          <img 
                            src={`https://mc-heads.net/avatar/${entry.displayName || entry.username}/18`} 
                            alt={entry.username}
                            class="feed-avatar"
                            onerror={(e) => e.target.style.display='none'}
                          />
                          <span class="feed-username">{(entry.displayName || entry.username).toUpperCase()}</span>
                          <span class="feed-action-badge" style="background: {am.color}15; color: {am.color}; border-color: {am.color}30;">
                            {am.icon} {am.label}
                          </span>
                          <span class="feed-time">{formatRelativeTime(entry.timestampISO)}</span>
                        </div>
                        {#if desc}
                          <div class="feed-desc">{desc}</div>
                        {/if}
                      </div>
                    </div>
                  {:else}
                    <div class="empty-feed" style="padding: 20px;">
                      <span style="color: #404040;">Sin eventos para este filtro</span>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}

        <!-- ═══════════════════════════════════ TAB: USERS ═══════════════════════════════════ -->
        {:else if activeTab === 'users'}
          {#if !isCloudActive()}
            <div class="alert-box warning" style="display: flex; align-items: center; gap: 8px;">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #fab387; flex-shrink: 0;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              <span>Configura y guarda las credenciales de Firebase para gestionar permisos de usuarios.</span>
            </div>
          {:else}
            <!-- AUTORIZAR NUEVO USUARIO -->
            <div class="admin-section-card">
              <h3>AUTORIZAR NUEVO USUARIO POR NICK DE MINECRAFT</h3>
              <form class="add-auth-user-form" onsubmit={handleAddUser} style="display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; margin-top: 8px;">
                <div class="form-group" style="flex: 1; min-width: 200px;">
                  <label for="new-auth-user">NICKNAME DE MINECRAFT</label>
                  <input 
                    id="new-auth-user" 
                    type="text" 
                    bind:value={newAuthUsername} 
                    placeholder="Ej: Steve..." 
                    class="form-control" 
                    required 
                    maxlength="16"
                    style="padding: 8px 12px; font-size: 0.78rem;"
                  />
                </div>
                
                <div class="form-group" style="min-width: 150px;">
                  <label for="new-auth-perm">CREAR TABLEROS EQUIPO</label>
                  <select 
                    id="new-auth-perm" 
                    bind:value={newAuthCanCreateTeam} 
                    class="form-control"
                    style="padding: 8px 12px; font-size: 0.78rem; background-color: #121212; border: 1px solid #282828; color: #e0e0e0; border-radius: 4px;"
                  >
                    <option value={true}>PERMITIDO</option>
                    <option value={false}>RESTRINGIDO</option>
                  </select>
                </div>

                <button type="submit" class="btn btn-primary" disabled={isAddingUser} style="padding: 8px 15px; font-size: 0.78rem; height: 35px;">
                  {isAddingUser ? "AÑADIENDO..." : "AGREGAR USUARIO"}
                </button>
              </form>
              {#if addingUserMsg}
                <div class="adding-msg" style="font-size: 0.7rem; color: #fab387; margin-top: 5px;">{addingUserMsg}</div>
              {/if}
            </div>

            <!-- TABLA DE USUARIOS -->
            <div class="admin-section-card">
              <h3>USUARIOS REGISTRADOS Y PERMISOS</h3>
              <p class="section-desc" style="font-size: 0.72rem; margin-bottom: 10px;">Los usuarios autorizados por Minecraft registrarán su contraseña de Kanban en su primer inicio de sesión.</p>
              
              {#if loading}
                <div class="loading-users">
                  <span>OBTENIENDO LISTA DE USUARIOS REGISTRADOS...</span>
                </div>
              {:else if errorMsg}
                <div class="alert-box error" style="display: flex; align-items: center; gap: 8px;">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #f38ba8; flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                  <span>{errorMsg}</span>
                </div>
              {:else}
                <div class="users-table-container neumorphic-well">
                  <table class="users-table">
                    <thead>
                      <tr>
                        <th>USUARIO</th>
                        <th>REGISTRO / ACCESO</th>
                        <th style="text-align: center;">CREAR TABLEROS EQUIPO</th>
                        <th style="text-align: center;">ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each users as user}
                        <tr class={user.username.toLowerCase() === 'elglower' ? 'admin-row' : ''}>
                          <td class="user-cell">
                            <img 
                              src={`https://mc-heads.net/avatar/${user.username}/24`} 
                              alt={user.username} 
                              class="table-user-avatar" 
                            />
                            <span class="user-name-txt">{user.username.toUpperCase()}</span>
                            {#if user.username.toLowerCase() === 'elglower'}
                              <span class="row-admin-tag">PANEL</span>
                            {/if}
                          </td>
                          <td class="date-cell">
                            {#if user.password}
                              {formatDate(user.createdAt)}
                            {:else}
                              <span style="color: #fab387; font-style: italic;">Pendiente Primer Acceso</span>
                            {/if}
                          </td>
                          <td class="status-cell" style="text-align: center;">
                            <span class="status-pill {user.canCreateTeamBoards ? 'allowed' : 'restricted'}">
                              {user.canCreateTeamBoards ? 'PERMITIDO' : 'RESTRINGIDO'}
                            </span>
                          </td>
                          <td class="actions-cell" style="text-align: center;">
                            {#if user.username.toLowerCase() === 'elglower'}
                              <span class="disabled-text">PROTEGIDO</span>
                            {:else}
                              <button 
                                class="btn-toggle-perm {user.canCreateTeamBoards ? 'btn-restrict' : 'btn-allow'}"
                                onclick={() => togglePermission(user)}
                              >
                                {user.canCreateTeamBoards ? 'RESTRINGIR' : 'PERMITIR'}
                              </button>
                            {/if}
                          </td>
                        </tr>
                      {:else}
                        <tr>
                          <td colspan="4" style="text-align: center; color: #505050; padding: 20px;">
                            No hay usuarios registrados en la base de datos de Firebase.
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              {/if}
            </div>
          {/if}

        <!-- ═══════════════════════════════════ TAB: FIREBASE ═══════════════════════════════════ -->
        {:else if activeTab === 'firebase'}
          <div class="admin-section-card">
            <h3>CONEXIÓN DE BASE DE DATOS CLOUD (FIREBASE)</h3>
            <p class="section-desc" style="font-size: 0.72rem; margin-bottom: 12px;">Configura las credenciales de tu proyecto de Firebase. Los datos de tus tableros se sincronizarán en la nube de forma segura.</p>
            
            <div class="fb-form-grid">
              <div class="form-group">
                <label for="fb-api-key">API KEY</label>
                <input type="password" id="fb-api-key" bind:value={fbApiKey} placeholder="AIzaSy..." class="form-control" />
              </div>
              <div class="form-group">
                <label for="fb-proj-id">PROJECT ID</label>
                <input type="text" id="fb-proj-id" bind:value={fbProjectId} placeholder="mi-proyecto-destiny" class="form-control" />
              </div>
              <div class="form-group">
                <label for="fb-app-id">APP ID (OPCIONAL)</label>
                <input type="text" id="fb-app-id" bind:value={fbAppId} placeholder="1:589623:web:a12b3c..." class="form-control" />
              </div>
              <div class="form-group">
                <label for="fb-auth-domain">AUTH DOMAIN (OPCIONAL)</label>
                <input type="text" id="fb-auth-domain" bind:value={fbAuthDomain} placeholder="mi-proyecto-destiny.firebaseapp.com" class="form-control" />
              </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; gap: 10px; flex-wrap: wrap;">
              <div class="fb-status-banner {cloudStatus ? 'connected' : 'disconnected'}" style="display: flex; align-items: center; gap: 6px; margin: 0; padding: 6px 12px;">
                {#if cloudStatus}
                  <span class="status-dot connected"></span>
                  <span>FIREBASE CLOUD ACTIVO</span>
                {:else}
                  <span class="status-dot disconnected"></span>
                  <span>MODO LOCAL (OFFLINE)</span>
                {/if}
              </div>
              <button class="btn btn-primary btn-save-fb" onclick={handleSaveFirebase} style="padding: 6px 15px; font-size: 0.75rem;">
                GUARDAR CONEXIÓN
              </button>
            </div>
          </div>
        {/if}

      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick={() => show = false}>CERRAR PANEL</button>
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
    background-color: rgba(0, 0, 0, 0.85);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 250;
  }

  .modal {
    background-color: #121212;
    border: 1px solid #1e1e1e;
    width: 92%;
    max-width: 860px;
    padding: 25px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-height: 92vh;
  }

  .neumorphic-modal {
    box-shadow: 
      -5px -5px 15px rgba(255, 255, 255, 0.02),
      5px 5px 15px rgba(0, 0, 0, 0.55);
    border-radius: 12px;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #1e1e1e;
    padding-bottom: 12px;
    flex-shrink: 0;
  }

  .header-title-wrapper {
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: left;
  }

  .admin-badge {
    background-color: #f38ba8;
    color: #11111b;
    font-size: 0.6rem;
    font-weight: 900;
    padding: 2px 6px;
    border-radius: 3px;
    align-self: flex-start;
    letter-spacing: 1px;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.2rem;
    letter-spacing: 0.5px;
    color: #e0e0e0;
    font-family: var(--title-font-family, 'Outfit', sans-serif);
  }

  /* ── Tab Navigation ───────────────────────────────────────────────── */
  .tab-nav {
    display: flex;
    gap: 4px;
    background: #0d0d0d;
    border: 1px solid #1e1e1e;
    border-radius: 8px;
    padding: 4px;
    flex-shrink: 0;
  }

  .tab-btn {
    flex: 1;
    background: none;
    border: none;
    color: #555;
    font-family: inherit;
    font-size: 0.7rem;
    font-weight: bold;
    letter-spacing: 0.5px;
    padding: 7px 10px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    transition: all 0.2s ease;
  }

  .tab-btn:hover {
    color: #888;
    background: rgba(255,255,255,0.03);
  }

  .tab-btn.active {
    background: #1e1e1e;
    color: #e0e0e0;
    box-shadow: inset 1px 1px 3px rgba(0,0,0,0.4);
  }

  .tab-count {
    background: #f38ba8;
    color: #11111b;
    font-size: 0.6rem;
    font-weight: 900;
    border-radius: 10px;
    padding: 1px 5px;
    min-width: 16px;
    text-align: center;
  }

  /* ── Modal Body ───────────────────────────────────────────────────── */
  .modal-body {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    gap: 12px;
    flex: 1;
    min-height: 0;
  }

  /* ── Admin Section Cards ──────────────────────────────────────────── */
  .admin-section-card {
    background: #161616;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid #202020;
    box-shadow: 
      -2px -2px 6px rgba(255, 255, 255, 0.015),
      2px 2px 6px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-align: left;
  }

  .admin-section-card h3 {
    margin: 0;
    font-size: 0.78rem;
    color: #e0e0e0;
    font-weight: bold;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #242424;
    padding-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  /* ── Chart ────────────────────────────────────────────────────────── */
  .chart-area {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .chart-row {
    display: grid;
    grid-template-columns: 130px 1fr auto;
    align-items: center;
    gap: 10px;
  }

  .chart-user-info {
    display: flex;
    align-items: center;
    gap: 6px;
    overflow: hidden;
  }

  .chart-avatar {
    width: 18px;
    height: 18px;
    border-radius: 3px;
    image-rendering: pixelated;
    flex-shrink: 0;
  }

  .chart-username {
    font-size: 0.68rem;
    font-weight: bold;
    color: #cdd6f4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .chart-bar-track {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .chart-bar-fill {
    height: 14px;
    border-radius: 3px;
    display: flex;
    overflow: hidden;
    min-width: 4px;
    transition: width 0.5s ease;
    background: #1e1e1e;
    flex: 1;
    position: relative;
  }

  .bar-segment {
    height: 100%;
    transition: width 0.4s ease;
  }

  .chart-count {
    font-size: 0.65rem;
    font-weight: bold;
    color: #6c7086;
    min-width: 20px;
    text-align: right;
  }

  .chart-pills {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    justify-content: flex-end;
    min-width: 80px;
  }

  .mini-pill {
    font-size: 0.6rem;
    padding: 1px 5px;
    border-radius: 3px;
    border: 1px solid transparent;
    font-weight: bold;
    white-space: nowrap;
  }

  .chart-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 6px;
    padding-top: 8px;
    border-top: 1px solid #1e1e1e;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .legend-dot {
    width: 7px;
    height: 7px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .legend-label {
    font-size: 0.62rem;
    color: #6c7086;
    font-weight: bold;
    letter-spacing: 0.3px;
  }

  /* ── Live Dot ─────────────────────────────────────────────────────── */
  .live-dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #a6e3a1;
    box-shadow: 0 0 6px #a6e3a1;
    animation: pulse-live 1.8s ease-in-out infinite;
    margin-right: 6px;
    flex-shrink: 0;
  }

  @keyframes pulse-live {
    0%, 100% { opacity: 1; box-shadow: 0 0 6px #a6e3a1; }
    50%       { opacity: 0.4; box-shadow: 0 0 2px #a6e3a1; }
  }

  /* ── Filter Pills ─────────────────────────────────────────────────── */
  .filter-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  .filter-pill {
    background: #0d0d0d;
    border: 1px solid #222;
    color: #555;
    font-family: inherit;
    font-size: 0.62rem;
    font-weight: bold;
    padding: 3px 8px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: all 0.15s ease;
  }

  .filter-pill:hover {
    color: #aaa;
    border-color: #333;
  }

  .filter-pill.active {
    background: #1e1e1e;
    border-color: #404040;
    color: #cdd6f4;
  }

  .pill-avatar {
    width: 14px;
    height: 14px;
    border-radius: 2px;
    image-rendering: pixelated;
  }

  /* ── Activity Feed ────────────────────────────────────────────────── */
  .activity-feed {
    display: flex;
    flex-direction: column;
    max-height: 340px;
    overflow-y: auto;
    padding: 8px 10px;
  }

  .feed-entry {
    display: flex;
    gap: 8px;
    min-height: 36px;
    position: relative;
  }

  .feed-left {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    width: 14px;
    padding-top: 4px;
  }

  .feed-action-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    z-index: 1;
  }

  .feed-connector {
    flex: 1;
    width: 1px;
    background: linear-gradient(to bottom, #2a2a2a, transparent);
    margin-top: 2px;
    min-height: 8px;
  }

  .feed-entry:last-child .feed-connector {
    display: none;
  }

  .feed-content {
    flex: 1;
    min-width: 0;
    padding-bottom: 10px;
  }

  .feed-top-row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .feed-avatar {
    width: 18px;
    height: 18px;
    border-radius: 3px;
    image-rendering: pixelated;
    flex-shrink: 0;
  }

  .feed-username {
    font-size: 0.72rem;
    font-weight: bold;
    color: #cdd6f4;
  }

  .feed-action-badge {
    font-size: 0.62rem;
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 3px;
    border: 1px solid transparent;
    white-space: nowrap;
  }

  .feed-time {
    font-size: 0.6rem;
    color: #404040;
    margin-left: auto;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .feed-desc {
    font-size: 0.65rem;
    color: #585b70;
    margin-top: 3px;
    font-style: italic;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .empty-feed {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 40px 20px;
    color: #404040;
    font-size: 0.8rem;
    text-align: center;
  }

  /* ── Users Table (unchanged) ──────────────────────────────────────── */
  .loading-users {
    padding: 40px;
    text-align: center;
    color: #505050;
    font-size: 0.85rem;
    font-weight: bold;
    letter-spacing: 1px;
  }

  .alert-box {
    padding: 15px;
    border-radius: 6px;
    font-size: 0.8rem;
    text-align: center;
    border: 1px solid transparent;
  }

  .alert-box.warning {
    background-color: rgba(251, 179, 135, 0.08);
    border-color: rgba(251, 179, 135, 0.15);
    color: #fab387;
  }

  .alert-box.error {
    background-color: rgba(243, 139, 168, 0.08);
    border-color: rgba(243, 139, 168, 0.15);
    color: #f38ba8;
  }

  .neumorphic-well {
    background-color: #0e0e0e;
    box-shadow: inset 3px 3px 8px rgba(0, 0, 0, 0.5);
    border: 1px solid #1c1c1c;
    border-radius: 8px;
    padding: 8px 10px;
  }

  .users-table-container {
    overflow-x: auto;
    width: 100%;
    box-sizing: border-box;
  }

  .users-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
  }

  .users-table th {
    text-align: left;
    color: #6c7086;
    padding: 10px 12px;
    border-bottom: 1px solid #222222;
    font-size: 0.72rem;
    letter-spacing: 0.5px;
  }

  .users-table td {
    padding: 12px;
    border-bottom: 1px solid #1a1a1a;
    color: #cdd6f4;
  }

  .users-table tbody tr:last-child td {
    border-bottom: none;
  }

  .admin-row {
    background-color: rgba(243, 139, 168, 0.02);
  }

  .user-cell {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .table-user-avatar {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    image-rendering: pixelated;
  }

  .user-name-txt {
    font-weight: bold;
    color: #e0e0e0;
  }

  .row-admin-tag {
    font-size: 0.6rem;
    background-color: rgba(243, 139, 168, 0.1);
    color: #f38ba8;
    padding: 1px 4px;
    border-radius: 3px;
    font-weight: bold;
  }

  .date-cell {
    color: #a6adc8;
  }

  .status-pill {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.68rem;
    font-weight: bold;
    letter-spacing: 0.5px;
  }

  .status-pill.allowed {
    background-color: rgba(166, 227, 161, 0.08);
    color: #a6e3a1;
    border: 1px solid rgba(166, 227, 161, 0.15);
  }

  .status-pill.restricted {
    background-color: rgba(243, 139, 168, 0.08);
    color: #f38ba8;
    border: 1px solid rgba(243, 139, 168, 0.15);
  }

  .disabled-text {
    font-size: 0.72rem;
    color: #585b70;
    font-style: italic;
  }

  .btn-toggle-perm {
    background: none;
    font-family: inherit;
    font-size: 0.72rem;
    font-weight: bold;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.15s ease;
  }

  .btn-toggle-perm.btn-allow {
    color: #a6e3a1;
    border-color: rgba(166, 227, 161, 0.3);
    background-color: rgba(166, 227, 161, 0.05);
  }

  .btn-toggle-perm.btn-allow:hover {
    background-color: #a6e3a1;
    color: #11111b;
    border-color: #a6e3a1;
  }

  .btn-toggle-perm.btn-restrict {
    color: #f38ba8;
    border-color: rgba(243, 139, 168, 0.3);
    background-color: rgba(243, 139, 168, 0.05);
  }

  .btn-toggle-perm.btn-restrict:hover {
    background-color: #f38ba8;
    color: #11111b;
    border-color: #f38ba8;
  }

  /* ── Footer ───────────────────────────────────────────────────────── */
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    border-top: 1px solid #1e1e1e;
    padding-top: 12px;
    flex-shrink: 0;
  }

  /* ── Core Buttons ─────────────────────────────────────────────────── */
  .btn {
    background-color: #1e1e1e;
    border: 1px solid #282828;
    color: #e0e0e0;
    font-family: inherit;
    padding: 8px 15px;
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

  .btn-primary {
    background-color: #2a2a2a;
    border-color: #353535;
    color: #e0e0e0;
  }

  .btn-primary:hover {
    background-color: #303030;
    border-color: #454545;
  }

  .btn-secondary {
    color: #888888;
    border-color: #262626;
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

  /* ── Firebase Form ────────────────────────────────────────────────── */
  .fb-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  @media (max-width: 600px) {
    .fb-form-grid {
      grid-template-columns: 1fr;
    }
  }

  .fb-status-banner {
    padding: 6px 12px;
    font-size: 0.7rem;
    font-weight: bold;
    border-radius: 4px;
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

  .form-control {
    background-color: #121212;
    border: 1px solid #222;
    color: #e0e0e0;
    font-family: inherit;
    padding: 8px 10px;
    font-size: 0.8rem;
    outline: none;
    flex: 1;
    border-radius: 4px;
    box-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.4);
    box-sizing: border-box;
    width: 100%;
  }

  .form-control:focus {
    border-color: #505050;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: left;
  }

  .form-group label {
    font-size: 0.68rem;
    color: #888888;
    font-weight: bold;
  }

  .section-desc {
    color: #888888;
    margin: 0 0 15px 0;
    font-size: 0.82rem;
    line-height: 1.5;
    text-align: left;
  }
</style>