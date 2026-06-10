<script>
  import { onMount } from "svelte";
  import { 
    getFirebaseUsers, 
    updateUserPermission, 
    isCloudActive,
    getFirebaseConfig,
    saveFirebaseConfig,
    addAuthorizedUser,
    updateSystemVersion
  } from "../firebase.js";

  // Props
  let { 
    show = $bindable(false),
    appVersion = "1.0.0",
    latestAppVersion = "1.0.0"
  } = $props();

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
    }
  });

  async function togglePermission(user) {
    const newValue = !user.canCreateTeamBoards;
    try {
      await updateUserPermission(user.username, newValue);
      // Update local state
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
      // Reload users list
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
      await loadUsers(); // Refresh list
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
</script>

{#if show}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="modal-backdrop" onclick={() => show = false} role="presentation">
    <div class="modal neumorphic-modal" onclick={(e) => e.stopPropagation()} role="presentation">
      <div class="modal-header">
        <div class="header-title-wrapper">
          <span class="admin-badge">PANEL</span>
          <h2>CONTROL DE ACCESO Y PERMISOS</h2>
        </div>
        <button class="btn-text" onclick={() => show = false}>[CERRAR]</button>
      </div>

      <div class="modal-body">
        
        <!-- SECCIÓN 1: CONFIGURACIÓN DE FIREBASE CLOUD (Exclusivo para Admin) -->
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

        <!-- SECCIÓN 2: GESTIÓN DE USUARIOS Y PERMISOS -->
        {#if !isCloudActive()}
          <div class="alert-box warning" style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 15px;">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #fab387; flex-shrink: 0;">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span>Configura y guarda las credenciales de Firebase arriba para poder gestionar permisos de usuarios.</span>
          </div>
        {:else}
          
          <!-- FORMULARIO: AUTORIZAR NUEVO USUARIO DE MINECRAFT -->
          <div class="admin-section-card" style="margin-top: 15px;">
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

          <div class="admin-section-card" style="margin-top: 15px;">
            <form onsubmit={(e) => {
              e.preventDefault();
              const v = prompt("Ingresa el número de la nueva versión a publicar (ej. 1.0.1):", appVersion);
              if (v && v !== latestAppVersion) {
                updateSystemVersion(v);
                alert("Actualización publicada a todos los usuarios.");
              }
            }}>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <h3>VERSIÓN DE LA APLICACIÓN</h3>
                  <p class="section-desc" style="font-size: 0.72rem; margin-bottom: 0;">Versión en código: <b>{appVersion}</b> | Versión en la Nube: <b>{latestAppVersion}</b></p>
                </div>
                <button type="submit" class="btn btn-primary" style="padding: 8px 15px; font-size: 0.78rem;">
                  SUBIR ACTUALIZACIÓN
                </button>
              </div>
            </form>
          </div>

          <!-- TABLA DE USUARIOS REGISTRADOS -->
          <div class="admin-section-card" style="margin-top: 15px;">
            <h3>USUARIOS REGISTRADOS Y PERMISOS</h3>
            <p class="section-desc" style="font-size: 0.72rem; margin-bottom: 10px;">Los usuarios autorizados por Minecraft registrarán su contraseña de Kanban en su primer inicio de sesión.</p>
            
            {#if loading}
              <div class="loading-users">
                <span>OBTENIENDO LISTA DE USUARIOS REGISTRADOS...</span>
              </div>
            {:else if errorMsg}
              <div class="alert-box error" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #f38ba8; flex-shrink: 0;">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
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
    width: 90%;
    max-width: 800px;
    padding: 25px;
    display: flex;
    flex-direction: column;
    gap: 20px;
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
  }

  .header-title-wrapper {
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: left;
  }

  .admin-badge {
    background-color: #f38ba8; /* Catppuccin Red */
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

  .section-desc {
    color: #888888;
    margin: 0 0 15px 0;
    font-size: 0.82rem;
    line-height: 1.5;
    text-align: left;
  }

  .modal-body {
    display: flex;
    flex-direction: column;
    max-height: 55vh;
    overflow-y: auto;
    gap: 15px;
  }

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
    background-color: #121212;
    box-shadow: inset 3px 3px 8px rgba(0, 0, 0, 0.5);
    border: 1px solid #1c1c1c;
    border-radius: 8px;
    padding: 10px;
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
    color: #a6e3a1; /* Catppuccin Green */
    border: 1px solid rgba(166, 227, 161, 0.15);
  }

  .status-pill.restricted {
    background-color: rgba(243, 139, 168, 0.08);
    color: #f38ba8; /* Catppuccin Red */
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

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    border-top: 1px solid #1e1e1e;
    padding-top: 15px;
  }

  /* Core Buttons */
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

  /* Admin section card & forms */
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
    font-size: 0.8rem;
    color: #e0e0e0;
    font-weight: bold;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #242424;
    padding-bottom: 6px;
  }

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
</style>
