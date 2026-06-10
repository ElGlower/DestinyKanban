<script>
  import { compressImage } from "../utils.js";

  // Props
  let { 
    show = $bindable(false), 
    themeSettings = $bindable() 
  } = $props();

  // Local copy to edit before saving
  let localSettings = $state({ ...themeSettings });

  // Input bindings
  let fileInput = $state(null);

  // Sync local copy when modal opens
  $effect(() => {
    if (show) {
      localSettings = { ...themeSettings };
    }
  });

  function selectTheme(themeId) {
    localSettings.theme = themeId;
  }

  function selectFont(fontId) {
    localSettings.font = fontId;
  }

  function selectSize(sizeId) {
    localSettings.size = sizeId;
  }

  function selectStyle(styleId) {
    localSettings.cardStyle = styleId;
  }

  function handleSave() {
    themeSettings = { ...localSettings };
    show = false;
  }

  // Local Background File Upload & Drag-Drop Handlers
  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        localSettings.bgImage = compressed;
      } catch (err) {
        console.error("Error compressing file selection:", err);
      }
    }
  }

  async function handleFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith("image/")) {
      try {
        const compressed = await compressImage(file);
        localSettings.bgImage = compressed;
      } catch (err) {
        console.error("Error compressing file drop:", err);
      }
    }
  }
</script>

{#if show}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="modal-backdrop" onclick={() => show = false} role="presentation">
    <div class="modal neumorphic-modal" onclick={(e) => e.stopPropagation()} role="presentation">
      <div class="modal-header">
        <h2>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.02106 19.1652 5.09353 19.3976 5.05193 19.624L4.81818 20.9C4.74242 21.3129 5.09633 21.6881 5.50901 21.6149L6.82857 21.3813C7.05041 21.342 7.27643 21.4116 7.43954 21.5714C8.7562 22.8624 10.4571 23 12 22Z"></path>
            <circle cx="7.5" cy="10.5" r="1.2" fill="currentColor"></circle>
            <circle cx="11.5" cy="7.5" r="1.2" fill="currentColor"></circle>
            <circle cx="16.5" cy="9.5" r="1.2" fill="currentColor"></circle>
            <circle cx="15.5" cy="14.5" r="1.2" fill="currentColor"></circle>
          </svg>PERSONALIZACIÓN DE INTERFAZ
        </h2>
        <button class="btn-text" onclick={() => show = false}>[CERRAR]</button>
      </div>

      <div class="modal-body">
        <p class="section-desc">Personaliza tu entorno de trabajo a tu gusto. Todos los cambios se aplican de inmediato en tiempo real y se guardan localmente.</p>

        <!-- 1. Temas y Fondos (Selección Visual) -->
        <div class="config-section">
          <h3>FONDO Y PALETA DE COLORES (SELECCIÓN VISUAL)</h3>
          <div class="theme-options">
            
            <!-- Gris Oscuro (grayscale-dark) -->
            <div class="theme-wrapper theme-grayscale-dark">
              <button 
                class="theme-opt-btn {localSettings.theme === 'grayscale-dark' ? 'active' : ''}" 
                onclick={() => selectTheme('grayscale-dark')}
                title="Gris Oscuro (Sleek)"
              >
                <span class="preview-dot circle-primary"></span>
                <div class="mini-card-preview">
                  <div class="mini-bar-title"></div>
                  <div class="mini-card"></div>
                </div>
              </button>
            </div>
            
            <!-- Neumórfico Claro (grayscale-light) -->
            <div class="theme-wrapper theme-grayscale-light">
              <button 
                class="theme-opt-btn {localSettings.theme === 'grayscale-light' ? 'active' : ''}" 
                onclick={() => selectTheme('grayscale-light')}
                title="Neumórfico Claro"
              >
                <span class="preview-dot circle-primary"></span>
                <div class="mini-card-preview">
                  <div class="mini-bar-title"></div>
                  <div class="mini-card"></div>
                </div>
              </button>
            </div>

            <!-- Lava Minecraft (liquid-lava) -->
            <div class="theme-wrapper theme-liquid-lava">
              <button 
                class="theme-opt-btn {localSettings.theme === 'liquid-lava' ? 'active' : ''}" 
                onclick={() => selectTheme('liquid-lava')}
                title="Lava Minecraft (Liquid)"
              >
                <span class="preview-dot circle-primary"></span>
                <div class="mini-card-preview">
                  <div class="mini-bar-title"></div>
                  <div class="mini-card"></div>
                </div>
              </button>
            </div>

            <!-- Agua Destiny (liquid-water) -->
            <div class="theme-wrapper theme-liquid-water">
              <button 
                class="theme-opt-btn {localSettings.theme === 'liquid-water' ? 'active' : ''}" 
                onclick={() => selectTheme('liquid-water')}
                title="Agua Destiny (Liquid)"
              >
                <span class="preview-dot circle-primary"></span>
                <div class="mini-card-preview">
                  <div class="mini-bar-title"></div>
                  <div class="mini-card"></div>
                </div>
              </button>
            </div>

            <!-- Nether Portal (liquid-portal) -->
            <div class="theme-wrapper theme-liquid-portal">
              <button 
                class="theme-opt-btn {localSettings.theme === 'liquid-portal' ? 'active' : ''}" 
                onclick={() => selectTheme('liquid-portal')}
                title="Nether Portal (Liquid)"
              >
                <span class="preview-dot circle-primary"></span>
                <div class="mini-card-preview">
                  <div class="mini-bar-title"></div>
                  <div class="mini-card"></div>
                </div>
              </button>
            </div>

            <!-- Redstone Activo (redstone) -->
            <div class="theme-wrapper theme-redstone">
              <button 
                class="theme-opt-btn {localSettings.theme === 'redstone' ? 'active' : ''}" 
                onclick={() => selectTheme('redstone')}
                title="Redstone Activo"
              >
                <span class="preview-dot circle-primary"></span>
                <div class="mini-card-preview">
                  <div class="mini-bar-title"></div>
                  <div class="mini-card"></div>
                </div>
              </button>
            </div>

            <!-- Esmeralda Craft (emerald) -->
            <div class="theme-wrapper theme-emerald">
              <button 
                class="theme-opt-btn {localSettings.theme === 'emerald' ? 'active' : ''}" 
                onclick={() => selectTheme('emerald')}
                title="Esmeralda Craft"
              >
                <span class="preview-dot circle-primary"></span>
                <div class="mini-card-preview">
                  <div class="mini-bar-title"></div>
                  <div class="mini-card"></div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- 1b. Fondo Personalizado (Drag & Drop y Selección Local) -->
        <div class="config-section">
          <h3>IMAGEN DE FONDO PERSONALIZADA</h3>
          <div 
            class="bg-upload-zone neumorphic-well"
            onclick={() => fileInput.click()}
            ondragover={(e) => { e.preventDefault(); e.stopPropagation(); }}
            ondrop={handleFileDrop}
            role="presentation"
          >
            <input 
              type="file" 
              accept="image/*" 
              bind:this={fileInput} 
              style="display: none;" 
              onchange={handleFileSelect}
            />
            <svg class="upload-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            {#if localSettings.bgImage}
              <span class="upload-text">FONDO DETECTADO ACTIVO. Haz click o arrastra para cambiarlo.</span>
            {:else}
              <span class="upload-text">Arrastra una imagen aquí o haz click para seleccionar archivo local</span>
            {/if}
          </div>
          
          <div class="custom-bg-input">
            <input 
              type="url" 
              bind:value={localSettings.bgImage} 
              placeholder="O introduce la URL de una imagen externa (ej. https://example.com/imagen.jpg)..." 
              class="form-control-custom-bg"
            />
            {#if localSettings.bgImage}
              <button class="btn btn-secondary btn-clear-bg" onclick={() => localSettings.bgImage = ""}>LIMPIAR FONDO</button>
            {/if}
          </div>
          <span class="section-hint">Puedes cambiar el fondo arrastrando cualquier archivo de imagen directamente a esta ventana o a la pantalla principal.</span>
        </div>

        <!-- 2. Tipografías -->
        <div class="config-section">
          <h3>FUENTE / TIPOGRAFÍA</h3>
          <div class="option-grid">
            <button 
              class="opt-btn {localSettings.font === 'monospace' ? 'active' : ''}" 
              style="font-family: 'JetBrains Mono', monospace;"
              onclick={() => selectFont('monospace')}
            >
              JetBrains Mono
            </button>
            <button 
              class="opt-btn {localSettings.font === 'pixel' ? 'active' : ''}" 
              style="font-family: 'VT323', monospace; font-size: 1.25rem;"
              onclick={() => selectFont('pixel')}
            >
              Retro Pixel (Minecraft)
            </button>
            <button 
              class="opt-btn {localSettings.font === 'retro-gamer' ? 'active' : ''}" 
              style="font-family: 'Press Start 2P', monospace; font-size: 0.7rem;"
              onclick={() => selectFont('retro-gamer')}
            >
              Retro Gamer (Arcade)
            </button>
            <button 
              class="opt-btn {localSettings.font === 'sans' ? 'active' : ''}" 
              style="font-family: 'Inter', sans-serif;"
              onclick={() => selectFont('sans')}
            >
              Inter (Limpio)
            </button>
            <button 
              class="opt-btn {localSettings.font === 'outfit' ? 'active' : ''}" 
              style="font-family: 'Outfit', sans-serif;"
              onclick={() => selectFont('outfit')}
            >
              Outfit (Moderno)
            </button>
          </div>
        </div>

        <!-- 3. Tamaño del Texto y Estilos de Tarjeta -->
        <div class="config-row-double">
          <div class="config-section">
            <h3>TAMAÑO DEL TEXTO</h3>
            <div class="option-grid-triple">
              <button 
                class="opt-btn {localSettings.size === 'small' ? 'active' : ''}" 
                onclick={() => selectSize('small')}
              >
                Pequeño
              </button>
              <button 
                class="opt-btn {localSettings.size === 'medium' ? 'active' : ''}" 
                onclick={() => selectSize('medium')}
              >
                Mediano
              </button>
              <button 
                class="opt-btn {localSettings.size === 'large' ? 'active' : ''}" 
                onclick={() => selectSize('large')}
              >
                Grande
              </button>
            </div>
          </div>

          <div class="config-section">
            <h3>ESTILO DE ELEMENTOS</h3>
            <div class="option-grid-triple">
              <button 
                class="opt-btn {localSettings.cardStyle === 'neumorphic' ? 'active' : ''}" 
                onclick={() => selectStyle('neumorphic')}
              >
                Neumórfico
              </button>
              <button 
                class="opt-btn {localSettings.cardStyle === 'flat' ? 'active' : ''}" 
                onclick={() => selectStyle('flat')}
              >
                Plano
              </button>
              <button 
                class="opt-btn {localSettings.cardStyle === 'glass' ? 'active' : ''}" 
                onclick={() => selectStyle('glass')}
              >
                Glassmorphism
              </button>
            </div>
          </div>
        </div>

        <!-- 3b. Intensidad de Blur para Glassmorphism -->
        <div class="config-section">
          <h3>INTENSIDAD DEL BLUR (Efecto Glassmorphism)</h3>
          <div class="blur-slider-group">
            <input 
              type="range" 
              min="0" 
              max="25" 
              step="1"
              bind:value={localSettings.blurIntensity} 
              class="blur-slider"
            />
            <span class="blur-value">{localSettings.blurIntensity ?? 12}px</span>
          </div>
          <span class="section-hint">Solo se aplica cuando el estilo de elementos seleccionado es "Glassmorphism".</span>
        </div>

      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick={() => show = false}>CANCELAR</button>
        <button class="btn btn-primary" onclick={handleSave}>APLICAR Y GUARDAR</button>
      </div>
    </div>
  </div>
{/if}

<style src="./ThemeModal.css"></style>
