<script>
  import { onMount } from "svelte";

  // Props
  let { onEnter } = $props();

  let username = $state("");
  let password = $state("");
  let useMinecraftSkin = $state(true); // Default to true so they see "Usuario de Minecraft" by default
  let loginError = $state("");
  let isLoggingIn = $state(false);

  onMount(() => {
    if (typeof window !== "undefined") {
      const lastUser = localStorage.getItem("destino_last_username");
      if (lastUser) {
        username = lastUser;
      }
      const lastSkinPref = localStorage.getItem("destino_use_minecraft_skin");
      if (lastSkinPref !== null) {
        useMinecraftSkin = lastSkinPref === "true";
      }
    }
  });

  function getAvatarColor(name) {
    if (!name) return '#505050';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      '#f5c2e7', // Pink (Mocha)
      '#cba6f7', // Mauve
      '#f38ba8', // Red
      '#fab387', // Peach
      '#f9e2af', // Yellow
      '#a6e3a1', // Green
      '#94e2d5', // Teal
      '#89b4fa', // Blue
      '#b4befe'  // Lavender
    ];
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    loginError = "";
    isLoggingIn = true;
    try {
      await onEnter(username.trim(), password.trim(), useMinecraftSkin);
    } catch (err) {
      loginError = err.message || "Error al iniciar sesión.";
    } finally {
      isLoggingIn = false;
    }
  }
</script>

<div class="welcome-container">
  <div class="welcome-box neumorphic-box">
    <div class="server-logo">
      <span class="logo-bracket">[</span>
      <span class="logo-core">DK</span>
      <span class="logo-bracket">]</span>
    </div>

    <h1 class="welcome-title">DestinyKanban</h1>
    <h2 class="welcome-subtitle">SISTEMA KANBAN COLABORATIVO</h2>
    
    <div class="divider"></div>

    <!-- Live Preview (Minecraft Head or Initial-based Avatar) -->
    <div class="avatar-preview-container">
      <div 
        class="avatar-frame neumorphic-well" 
        style={!useMinecraftSkin && username.trim() ? `background-color: ${getAvatarColor(username.trim())};` : ''}
      >
        {#if useMinecraftSkin}
          <img 
            src={username.trim() ? `https://mc-heads.net/avatar/${username.trim()}/80` : 'https://mc-heads.net/avatar/Steve/80'} 
            alt="Minecraft Head" 
            class="avatar-image"
          />
        {:else}
          <div class="initial-avatar">
            {username.trim() ? username.trim().charAt(0).toUpperCase() : '?'}
          </div>
        {/if}
      </div>
      {#if username.trim()}
        <span class="avatar-tag">LOGUEANDO COMO: {username.toUpperCase()}</span>
      {:else}
        <span class="avatar-tag text-muted">INGRESA TU USUARIO DE MINECRAFT</span>
      {/if}
    </div>

    <!-- Login Form -->
    <form class="login-form" onsubmit={handleSubmit}>
      <div class="form-group">
        <label for="login-username" class="input-label">USUARIO DE MINECRAFT</label>
        <input 
          id="login-username"
          type="text" 
          bind:value={username} 
          placeholder="Nombre de usuario de Minecraft..." 
          required
          class="form-control neumorphic-input"
          autocomplete="off"
          maxlength="16"
        />
      </div>

      <div class="form-group">
        <label for="login-password" class="input-label">CONTRASEÑA</label>
        <input 
          id="login-password"
          type="password" 
          bind:value={password} 
          placeholder="Contraseña..." 
          required
          class="form-control neumorphic-input"
          autocomplete="off"
        />
        <div class="warning-text-box">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #fab387; margin-top: 1px; flex-shrink: 0;">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span class="warning-text">No debe ser la contraseña de tu cuenta de Microsoft o cuenta original de Minecraft.</span>
        </div>
      </div>

      {#if loginError}
        <div class="login-error-msg">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; display: inline-block; vertical-align: middle;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <span>{loginError}</span>
        </div>
      {/if}

      <div class="toggle-group neumorphic-well">
        <label class="toggle-label" for="mc-skin-checkbox">
          <input 
            type="checkbox" 
            id="mc-skin-checkbox" 
            bind:checked={useMinecraftSkin} 
          />
          <span>Vincular mi skin/cabeza de Minecraft</span>
        </label>
      </div>

      <button type="submit" class="btn-enter btn-neumorphic" disabled={!username.trim() || !password.trim() || isLoggingIn}>
        {isLoggingIn ? "VERIFICANDO..." : "INICIAR SESIÓN"}
      </button>
    </form>
  </div>
</div>

<style src="./WelcomeScreen.css"></style>
