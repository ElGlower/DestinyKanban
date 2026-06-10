<script>
  import { onMount } from "svelte";

  // Guild ID state (loaded from LocalStorage)
  let guildId = $state(
    (typeof window !== "undefined" && localStorage.getItem("destino_discord_guild_id")) || ""
  );

  let guildName = $state("DestinyOwner Crew");
  let channelName = $state("VOZ GENERAL");
  let inviteUrl = $state("");
  let showSettings = $state(false);
  let inputGuildId = $state(guildId);
  let statusMessage = $state("");
  let isLive = $state(false);

  let activeUsers = $state([]);

  // Fetch real widget data from Discord
  async function fetchDiscordData() {
    if (!guildId) {
      guildName = "DISCORD";
      channelName = "DESCONECTADO";
      activeUsers = [];
      isLive = false;
      return;
    }

    try {
      statusMessage = "Conectando...";
      const res = await fetch(`https://discord.com/api/guilds/${guildId}/widget.json`);
      if (!res.ok) {
        throw new Error("Servidor no encontrado o Widget desactivado.");
      }

      const data = await res.json();
      guildName = data.name;
      inviteUrl = data.instant_invite || "";

      // Find voice channels
      const channels = data.channels || [];
      const voiceChannels = channels.filter(c => c.name.toLowerCase().includes("voz") || c.name.toLowerCase().includes("voice") || c.position !== undefined);

      if (voiceChannels.length > 0) {
        const members = data.members || [];
        const voiceChannelMap = new Map(voiceChannels.map(c => [c.id, c.name]));
        const membersInVoice = members.filter(m => m.channel_id && voiceChannelMap.has(m.channel_id));

        if (membersInVoice.length > 0) {
          const activeChannelId = membersInVoice[0].channel_id;
          channelName = voiceChannelMap.get(activeChannelId);

          activeUsers = membersInVoice
            .filter(m => m.channel_id === activeChannelId)
            .map(m => {
              // Extract avatar URL, fall back to Discord's official default avatars based on member ID
              const defaultAvatarIdx = m.id ? (Math.abs(parseInt(m.id)) % 5) : 0;
              const avatar = m.avatar_url || `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIdx}.png`;
              
              return {
                name: m.username,
                avatarUrl: avatar,
                speaking: m.speaking || false,
                status: (m.self_mute || m.mute) ? "muted" : "online"
              };
            });
        } else {
          channelName = voiceChannels[0].name;
          activeUsers = [];
        }
      } else {
        channelName = "SIN CANALES DE VOZ";
        activeUsers = [];
      }

      isLive = true;
      statusMessage = "Conectado en vivo";
    } catch (err) {
      console.error("Error fetching Discord widget:", err);
      statusMessage = "Error: Widget inactivo. Actívalo en los Ajustes de Discord.";
      guildName = "DISCORD";
      channelName = "WIDGET INACTIVO";
      activeUsers = [];
      isLive = false;
    }
  }

  function handleSaveSettings(e) {
    if (e) e.preventDefault();
    guildId = inputGuildId.trim();
    if (typeof window !== "undefined") {
      localStorage.setItem("destino_discord_guild_id", guildId);
    }
    showSettings = false;
    fetchDiscordData();
  }

  let interval;
  let speakInterval;

  onMount(() => {
    fetchDiscordData();

    interval = setInterval(() => {
      fetchDiscordData();
    }, 5000);

    speakInterval = setInterval(() => {
      if (!isLive) {
        activeUsers = activeUsers.map(u => {
          if (u.status !== "muted" && Math.random() > 0.5) {
            return { ...u, speaking: !u.speaking };
          }
          return u;
        });
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      clearInterval(speakInterval);
    };
  });
</script>

<div class="discord-voice-widget neumorphic-well">
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="discord-header" onclick={() => showSettings = !showSettings} title="Configurar conexión de Discord">
    <div class="discord-brand">
      <svg class="discord-icon" viewBox="0 0 127.14 96.36" width="16" height="12" fill="currentColor">
        <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.45-5c.88-.65,1.72-1.34,2.53-2a75.58,75.58,0,0,0,72.76,0c.81.71,1.65,1.4,2.53,2a68.43,68.43,0,0,1-10.45,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C129.87,48.12,123.63,25.32,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
      </svg>
      <span class="guild-name">{guildName.toUpperCase()}</span>
      <span class="settings-cog">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </span>
    </div>
    <div class="channel-info">
      <span class="voice-dot {isLive ? 'live' : 'demo'}"></span>
      <span class="channel-name">{channelName}</span>
    </div>
  </div>

  <div class="users-list">
    {#each activeUsers as user}
      <div class="user-avatar-wrapper" title="{user.name} - {user.status === 'muted' ? 'Silenciado' : (user.speaking ? 'Hablando' : 'En llamada')}">
        <img 
          src={user.avatarUrl} 
          alt={user.name} 
          class="discord-avatar {user.speaking ? 'speaking' : ''} {user.status === 'muted' ? 'muted' : ''}" 
        />
        {#if user.status === 'muted'}
          <div class="mic-status-badge">
            <svg viewBox="0 0 24 24" width="8" height="8" fill="none" stroke="currentColor" stroke-width="3">
              <line x1="1" y1="1" x2="23" y2="23"></line>
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
              <path d="M17 11a5 5 0 0 1-8 4"></path>
              <path d="M12 19v4"></path>
              <path d="M8 23h8"></path>
            </svg>
          </div>
        {/if}
      </div>
    {:else}
      <span class="channel-empty-txt">Canal vacío</span>
    {/each}

    {#if inviteUrl}
      <a href={inviteUrl} target="_blank" rel="noopener noreferrer" class="btn-join-call" title="Unirse a la llamada de Discord">
        <span>UNIRSE</span>
        <svg viewBox="0 0 24 24" width="8" height="8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
      </a>
    {/if}
  </div>

  <!-- Settings Popover bubble -->
  {#if showSettings}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="settings-popover neumorphic-panel" onclick={(e) => e.stopPropagation()}>
      <h4>CONECTAR DISCORD EN VIVO</h4>
      <p class="popover-desc">Introduce el ID de tu servidor de Discord. Asegúrate de activar el widget en "Ajustes del Servidor > Widget > Habilitar widget del servidor".</p>
      
      <form onsubmit={handleSaveSettings} class="settings-form">
        <div class="input-row">
          <input 
            type="text" 
            bind:value={inputGuildId} 
            placeholder="ID de Servidor (Guild ID)..." 
            class="form-control"
            required
          />
        </div>
        {#if statusMessage}
          <div class="status-msg">{statusMessage}</div>
        {/if}
        <div class="popover-footer">
          <button type="button" class="btn-mini btn-close" onclick={() => showSettings = false}>CERRAR</button>
          <button type="button" class="btn-mini btn-unlink" onclick={() => { inputGuildId = ""; guildId = ""; localStorage.removeItem("destino_discord_guild_id"); showSettings = false; fetchDiscordData(); }}>DESCONECTAR</button>
          <button type="submit" class="btn-mini btn-save">CONECTAR</button>
        </div>
      </form>
    </div>
  {/if}
</div>

<style>
.discord-voice-widget {
    display: inline-flex;
    align-items: center;
    gap: 15px;
    background-color: rgba(18, 18, 18, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 6px 14px;
    border-radius: 8px;
    backdrop-filter: blur(12px);
    box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.45);
    position: relative;
  }

  .discord-header {
    display: flex;
    flex-direction: column;
    gap: 2px;
    border-right: 1px solid rgba(255, 255, 255, 0.08);
    padding-right: 12px;
    cursor: pointer;
  }

  .discord-brand {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #5865F2;
  }

  .settings-cog {
    font-size: 0.6rem;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .discord-header:hover .settings-cog {
    opacity: 0.6;
  }

  .guild-name {
    font-size: 0.65rem;
    font-weight: 900;
    color: #888888;
    letter-spacing: 0.5px;
  }

  .channel-info {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .voice-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: inline-block;
  }

  .voice-dot.live {
    background-color: #23a55a;
    animation: pulse 2s infinite;
  }

  .voice-dot.demo {
    background-color: #da373c;
    animation: pulse 3s infinite;
  }

  .channel-name {
    font-size: 0.68rem;
    font-weight: bold;
    color: #e0e0e0;
    letter-spacing: 0.5px;
  }

  .users-list {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .user-avatar-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .discord-avatar {
    width: 22px;
    height: 22px;
    border-radius: 50%; /* Rounded avatars for Discord style */
    border: 2px solid transparent;
    transition: all 0.2s ease;
  }

  .discord-avatar.speaking {
    border-color: #23a55a;
    box-shadow: 0 0 8px rgba(35, 165, 90, 0.6);
    transform: scale(1.05);
  }

  .discord-avatar.muted {
    opacity: 0.6;
  }

  .mic-status-badge {
    position: absolute;
    bottom: -3px;
    right: -3px;
    background-color: #da373c;
    border-radius: 50%;
    width: 10px;
    height: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    color: #ffffff;
    border: 1px solid #121212;
  }

  .channel-empty-txt {
    font-size: 0.65rem;
    color: #505050;
    font-style: italic;
  }

  .btn-join-call {
    background-color: #5865F2;
    color: #ffffff;
    border: none;
    font-family: inherit;
    font-size: 0.62rem;
    font-weight: bold;
    padding: 3px 6px;
    border-radius: 3px;
    text-decoration: none;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    transition: background-color 0.15s ease;
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }

  .btn-join-call:hover {
    background-color: #4752c4;
  }

  /* Settings popover styling */
  .settings-popover {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 10px;
    width: 280px;
    background-color: #1a1a1a;
    border: 1px solid #282828;
    border-radius: 8px;
    padding: 15px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 1000;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  }

  .settings-popover h4 {
    margin: 0;
    font-size: 0.75rem;
    color: #e0e0e0;
    font-weight: bold;
    letter-spacing: 0.5px;
  }

  .popover-desc {
    margin: 0;
    font-size: 0.65rem;
    color: #888888;
    line-height: 1.4;
  }

  .settings-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-control {
    background-color: #121212;
    border: 1px solid #282828;
    color: #e0e0e0;
    font-family: inherit;
    padding: 6px 10px;
    font-size: 0.75rem;
    outline: none;
    width: 100%;
    box-sizing: border-box;
    border-radius: 4px;
    box-shadow: inset 1px 1px 3px rgba(0,0,0,0.4);
  }

  .form-control:focus {
    border-color: #5865F2;
  }

  .status-msg {
    font-size: 0.65rem;
    color: #888888;
  }

  .popover-footer {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 5px;
  }

  .btn-mini {
    background: none;
    border: 1px solid #282828;
    color: #888888;
    font-family: inherit;
    font-size: 0.65rem;
    font-weight: bold;
    padding: 4px 8px;
    cursor: pointer;
    border-radius: 3px;
  }

  .btn-mini:hover {
    color: #e0e0e0;
    border-color: #505050;
  }

  .btn-save {
    background-color: #5865F2;
    border-color: #5865F2;
    color: #ffffff;
  }

  .btn-save:hover {
    background-color: #4752c4;
    border-color: #4752c4;
    color: #ffffff;
  }

  .btn-unlink {
    color: #ff8888;
    border-color: #4a1a1a;
  }

  .btn-unlink:hover {
    background-color: #4a1a1a;
    color: #ffffff;
  }

  @keyframes pulse {
    0% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(35, 165, 90, 0.7);
    }
    70% {
      transform: scale(1);
      box-shadow: 0 0 0 5px rgba(35, 165, 90, 0);
    }
    100% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(35, 165, 90, 0);
    }
  }

  @media (max-width: 600px) {
    .discord-voice-widget {
      padding: 4px 8px;
      gap: 8px;
      max-width: 100%;
      box-sizing: border-box;
    }
    .guild-name {
      display: none;
    }
    .discord-header {
      padding-right: 8px;
    }
    .discord-avatar {
      width: 18px;
      height: 18px;
    }
    .users-list {
      gap: 4px;
    }
  }
</style>
