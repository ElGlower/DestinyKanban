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

<style>
.welcome-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background: transparent;
    font-family: var(--font-family, 'JetBrains Mono', monospace);
    box-sizing: border-box;
    padding: 20px;
  }

  /* Neumorphic Extruded Container Box */
  .welcome-box {
    background-color: #1e1e1e;
    border: 1px solid #282828;
    border-radius: 16px;
    padding: 40px;
    max-width: 460px;
    width: 100%;
    text-align: center;
    box-shadow: 
      -6px -6px 20px rgba(255, 255, 255, 0.015),
      6px 6px 20px rgba(0, 0, 0, 0.55);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    box-sizing: border-box;
  }

  .server-logo {
    font-size: 2.2rem;
    font-weight: 800;
    font-family: var(--title-font-family, 'Outfit', sans-serif);
    letter-spacing: 2px;
    margin-bottom: 5px;
  }

  .logo-bracket {
    color: #505050;
  }

  .logo-core {
    color: #e0e0e0;
  }

  .welcome-title {
    font-family: var(--title-font-family, 'Outfit', sans-serif);
    font-size: 2.2rem;
    font-weight: 900;
    color: #e0e0e0;
    margin: 0;
    letter-spacing: 0.5px;
  }

  .welcome-subtitle {
    font-family: var(--title-font-family, 'Outfit', sans-serif);
    font-size: 0.85rem;
    font-weight: 700;
    color: #505050;
    margin: 0;
    letter-spacing: 3px;
  }

  .divider {
    width: 80px;
    height: 2px;
    background-color: #333333;
    margin: 5px 0;
  }

  /* Avatar Frame */
  .avatar-preview-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    margin: 10px 0;
  }

  .avatar-frame {
    width: 100px;
    height: 100px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 12px;
    padding: 8px;
    background-color: #121212;
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s ease;
  }

  .avatar-frame:hover {
    transform: scale(1.05) rotate(2deg);
  }

  .avatar-image {
    width: 80px;
    height: 80px;
    border-radius: 6px;
    image-rendering: pixelated;
  }

  .initial-avatar {
    font-size: 3rem;
    font-weight: 900;
    color: #11111b; /* Dark text for pastel background contrast */
    font-family: var(--title-font-family, 'Outfit', sans-serif);
    display: flex;
    justify-content: center;
    align-items: center;
    user-select: none;
  }

  .avatar-tag {
    font-size: 0.72rem;
    font-weight: bold;
    color: #e0e0e0;
    letter-spacing: 0.5px;
  }

  .text-muted {
    color: #505050 !important;
  }

  /* Form */
  .login-form {
    display: flex;
    flex-direction: column;
    gap: 15px;
    width: 100%;
  }

  .form-group {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 5px;
    text-align: left;
  }

  .input-label {
    font-size: 0.72rem;
    color: #888888;
    font-weight: bold;
    letter-spacing: 0.5px;
  }

  /* Neumorphic Input Sunken */
  .form-control {
    background-color: #121212;
    border: 1px solid #222222;
    color: #e0e0e0;
    font-family: inherit;
    padding: 12px 15px;
    font-size: 0.9rem;
    outline: none;
    width: 100%;
    box-sizing: border-box;
    border-radius: 6px;
    box-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.5);
    letter-spacing: 1px;
    transition: all 0.2s ease;
  }

  .form-control:focus {
    border-color: #505050;
    box-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.7);
  }

  /* Warning Box */
  .warning-text-box {
    display: flex;
    gap: 8px;
    margin-top: 5px;
    background-color: rgba(251, 179, 135, 0.05);
    border: 1px solid rgba(251, 179, 135, 0.15);
    padding: 8px 12px;
    border-radius: 6px;
    align-items: flex-start;
  }

  .warning-icon {
    font-size: 0.85rem;
    flex-shrink: 0;
  }

  .warning-text {
    font-size: 0.68rem;
    color: #fab387; /* Warm Peach color from Catppuccin */
    line-height: 1.4;
  }

  /* Error msg */
  .login-error-msg {
    background-color: rgba(243, 139, 168, 0.08);
    border: 1px solid rgba(243, 139, 168, 0.2);
    color: #f38ba8;
    font-size: 0.75rem;
    font-weight: bold;
    padding: 10px;
    border-radius: 6px;
    text-align: center;
  }

  /* Toggle Group */
  .toggle-group {
    background-color: #121212;
    padding: 10px 15px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #222222;
    box-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.5);
  }

  .toggle-label {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    font-size: 0.78rem;
    color: #888888;
    user-select: none;
    font-weight: bold;
    letter-spacing: 0.5px;
  }

  .toggle-label input[type="checkbox"] {
    cursor: pointer;
    accent-color: var(--accent-color, #505050);
  }

  /* Neumorphic Button Extruded */
  .btn-enter {
    background-color: #1e1e1e;
    border: 1px solid #282828;
    color: #e0e0e0;
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: bold;
    padding: 12px 30px;
    letter-spacing: 1px;
    cursor: pointer;
    border-radius: 6px;
    outline: none;
    box-shadow: 
      -3px -3px 8px rgba(255, 255, 255, 0.01),
      3px 3px 8px rgba(0, 0, 0, 0.35);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    width: 100%;
    box-sizing: border-box;
  }

  .btn-enter:hover:not(:disabled) {
    background-color: #242424;
    border-color: #505050;
    color: #ffffff;
    box-shadow: 
      -4px -4px 12px rgba(255, 255, 255, 0.015),
      4px 4px 12px rgba(0, 0, 0, 0.45);
  }

  .btn-enter:active:not(:disabled) {
    box-shadow: inset 3px 3px 6px rgba(0, 0, 0, 0.55);
  }

  .btn-enter:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    box-shadow: none;
    border-color: #202020;
  }

  @media (max-width: 480px) {
    .welcome-box {
      padding: 25px 20px;
      gap: 15px;
    }
    .welcome-title {
      font-size: 1.7rem;
    }
    .server-logo {
      font-size: 1.8rem;
    }
    .avatar-frame {
      width: 80px;
      height: 80px;
      padding: 6px;
    }
    .avatar-image {
      width: 64px;
      height: 64px;
    }
  }
</style>
