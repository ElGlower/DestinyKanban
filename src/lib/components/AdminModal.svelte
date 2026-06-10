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

<style src="./AdminModal.css"></style>
