<script>
  import { invoke } from "@tauri-apps/api/core";
  import { check } from "@tauri-apps/plugin-updater";
  import { relaunch } from "@tauri-apps/plugin-process";
  import { getVersion } from "@tauri-apps/api/app";
  import { onMount, onDestroy } from "svelte";
  import { 
    isCloudActive, 
    saveFirebaseProject, 
    deleteFirebaseProject, 
    saveFirebaseTasks,
    verifyCloudUser,
    startPresenceHeartbeat,
    stopPresenceHeartbeat,
    clearPresence,
    getFirebaseUser,
    getFirebaseUsers,
    subscribeToOwnProjects,
    subscribeToTeamProjects,
    subscribeToTasks,
    subscribeToSystemConfig,
    updateSystemVersion,
    onAuthChange
  } from "../lib/firebase.js";
  import { notify } from "../lib/stores.js";
  import WelcomeScreen from "../lib/components/WelcomeScreen.svelte";
  import ProjectSelector from "../lib/components/ProjectSelector.svelte";
  import KanbanBoard from "../lib/components/KanbanBoard.svelte";
  import ConfigModal from "../lib/components/ConfigModal.svelte";
  import ConfirmModal from "../lib/components/ConfirmModal.svelte";
  import GoogleDocModal from "../lib/components/GoogleDocModal.svelte";
  import ThemeModal from "../lib/components/ThemeModal.svelte";
  import AdminModal from "../lib/components/AdminModal.svelte";
  import NotificationSystem from "../lib/components/NotificationSystem.svelte";

  const isTauri = typeof window !== "undefined" && window.__TAURI_INTERNALS__ !== undefined;
  let APP_VERSION = $state("1.0.9");

  // Global State
  let config = $state({
    phases: [],
    roles: [],
    priorities: [],
    columns: [],
    wipLimits: {}
  });

  let projects = $state([]);
  let loading = $state(true);
  let errorMessage = $state("");

  // Real-time unsubscribe handles
  let _unsubOwnProjects = null;
  let _unsubTeamProjects = null;
  let _unsubTasks = null;
  let _unsubSystemConfig = null;

  // System status
  let updateAvailable = $state(false);
  let latestAppVersion = $state(APP_VERSION);
  let isUpdating = $state(false);
  let updateProgress = $state(0);
  let updateStatus = $state("");

  // Separate reactive arrays merged for the selector
  let _ownProjects = $state([]);
  let _teamProjects = $state([]);

  // Routing and user state
  let currentUser = $state(
    (typeof window !== "undefined" && localStorage.getItem("destino_current_user")) || ""
  );
  let useMinecraftSkin = $state(
    typeof window !== "undefined" && localStorage.getItem("destino_use_minecraft_skin") === "true"
  );
  let currentView = $state("welcome"); // "welcome", "selector", "board"
  let canCreateTeam = $state(false);
  let isAdmin = $derived(currentUser.toLowerCase() === "elglower");
  let showAdminModal = $state(false);

  // ── System Config Subscription ──────────────────────────────────────────────
  function startSystemConfigSubscription() {
    if (!isCloudActive()) return;
    if (_unsubSystemConfig) _unsubSystemConfig();
    _unsubSystemConfig = subscribeToSystemConfig((config) => {
      if (config && config.latestVersion) {
        latestAppVersion = config.latestVersion;
        // Solo mostrar actualización si la versión de la nube es mayor que la local
        const isNewer = latestAppVersion.localeCompare(APP_VERSION, undefined, { numeric: true, sensitivity: 'base' }) > 0;
        if (isNewer) {
          updateAvailable = true;
        } else {
          updateAvailable = false;
        }
      }
    });
  }

  async function installUpdate() {
    if (!isTauri) return;
    try {
      isUpdating = true;
      updateStatus = "Comprobando actualizaciones...";
      const update = await check();
      if (update) {
        updateStatus = `Descargando actualización v${update.version}...`;
        let downloaded = 0;
        let contentLength = 0;
        await update.downloadAndInstall((event) => {
          if (event.event === 'Started') {
            contentLength = event.data.contentLength;
          } else if (event.event === 'Progress') {
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              updateProgress = Math.round((downloaded / contentLength) * 100);
            }
          } else if (event.event === 'Finished') {
            updateStatus = "Instalando actualización...";
            updateProgress = 100;
          }
        });
        updateStatus = "Actualización instalada. Reiniciando...";
        await relaunch();
      } else {
        updateStatus = "No hay actualizaciones disponibles.";
        setTimeout(() => { isUpdating = false; }, 3000);
      }
    } catch (e) {
      updateStatus = `Error: ${e.message}`;
      console.error(e);
      setTimeout(() => { isUpdating = false; }, 5000);
    }
  }

  // ── Real-time project subscriptions (own + team, separate) ────────────────
  function startProjectsSubscription(username) {
    if (!isCloudActive()) return;

    // Own projects — only this user's
    if (_unsubOwnProjects) _unsubOwnProjects();
    _unsubOwnProjects = subscribeToOwnProjects(
      username,
      (liveOwn) => {
        const prevIds = _ownProjects.map(p => p.id);
        const added = liveOwn.filter(p => !prevIds.includes(p.id));
        if (added.length && prevIds.length > 0) {
          added.forEach(p => notify(`Tablero "${p.name}" añadido`, 'info'));
        }
        _ownProjects = liveOwn;
        const allProjects = [..._ownProjects, ..._teamProjects];
        const uniqueProjectsMap = new Map();
        allProjects.forEach(p => uniqueProjectsMap.set(p.id, p));
        projects = Array.from(uniqueProjectsMap.values());
      },
      (err) => notify('Error sync tableros propios: ' + err.message, 'error')
    );

    // Team (Destiny) projects — shared by all
    if (_unsubTeamProjects) _unsubTeamProjects();
    _unsubTeamProjects = subscribeToTeamProjects(
      (liveTeam) => {
        const prevIds = _teamProjects.map(p => p.id);
        const added = liveTeam.filter(p => !prevIds.includes(p.id));
        if (added.length && prevIds.length > 0) {
          added.forEach(p => notify(`Tablero de equipo "${p.name}" actualizado`, 'info'));
        }
        _teamProjects = liveTeam;
        const allProjects = [..._ownProjects, ..._teamProjects];
        const uniqueProjectsMap = new Map();
        allProjects.forEach(p => uniqueProjectsMap.set(p.id, p));
        projects = Array.from(uniqueProjectsMap.values());
      },
      (err) => notify('Error sync tableros equipo: ' + err.message, 'error')
    );
  }

  // ── Real-time task subscription for current project ───────────────────────
  function startTasksSubscription(projectId) {
    if (_unsubTasks) { _unsubTasks(); _unsubTasks = null; }
    if (!isCloudActive() || !projectId) return;
    _unsubTasks = subscribeToTasks(
      projectId,
      (liveTasks) => {
        // Detect task changes from other users (simple count diff guard)
        const prevCount = currentProjectTasks.length;
        currentProjectTasks = liveTasks;
        if (typeof window !== 'undefined') {
          localStorage.setItem(`destino_tasks_${projectId}`, JSON.stringify(liveTasks));
        }
      },
      (err) => {
        notify('Error de sync de tareas: ' + err.message, 'error');
      }
    );
  }

  async function loadUserPermissions(username) {
    if (!username) {
      canCreateTeam = false;
      return;
    }
    if (username.toLowerCase() === "elglower") {
      canCreateTeam = true;
      return;
    }
    if (isCloudActive()) {
      try {
        const userData = await getFirebaseUser(username);
        if (userData) {
          canCreateTeam = !!userData.canCreateTeamBoards;
        } else {
          canCreateTeam = false;
        }
      } catch (e) {
        console.error("Error loading user permissions:", e);
        canCreateTeam = false;
      }
      
      // Load all system users for assigning tasks
      try {
        const users = await getFirebaseUsers();
        systemUsers = users.map(u => u.id); // Array of usernames
      } catch (e) {
        console.error("Error loading system users:", e);
      }
    } else {
      canCreateTeam = true; // In offline mode, anyone can create team boards
    }
  }
  
  let systemUsers = $state([]);
  let currentProject = $state(null);
  let currentProjectTasks = $state([]);
  
  // Settings view state
  let showConfig = $state(false);

  // Customization/Theme settings state
  let themeSettings = $state({
    theme: "grayscale-dark",
    font: "monospace",
    size: "medium",
    cardStyle: "neumorphic",
    bgImage: "",
    blurIntensity: 12
  });
  let showThemeModal = $state(false);

  // Global Drag & Drop background image state
  let isDraggingFile = $state(false);
  let dragCounter = 0;

  function handleDragEnter(e) {
    e.preventDefault();
    dragCounter++;
    if (e.dataTransfer?.types.includes("Files")) {
      isDraggingFile = true;
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  function handleDragLeave(e) {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) {
      isDraggingFile = false;
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    isDraggingFile = false;
    dragCounter = 0;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            themeSettings.bgImage = event.target.result;
          }
        };
        reader.readAsDataURL(file);
      }
    }
  }

  // Sync theme variables to DOM root element
  $effect(() => {
    if (typeof window !== "undefined") {
      const root = document.documentElement;
      
      // Remove previous styling classes
      const classesToRemove = Array.from(root.classList).filter(
        c => c.startsWith("theme-") || c.startsWith("font-") || c.startsWith("size-") || c.startsWith("card-")
      );
      classesToRemove.forEach(c => root.classList.remove(c));
      
      // Add new styling classes
      root.classList.add(`theme-${themeSettings.theme}`);
      root.classList.add(`font-${themeSettings.font}`);
      root.classList.add(`size-${themeSettings.size}`);
      root.classList.add(`card-${themeSettings.cardStyle}`);

      // Apply to body as well for background animations to register properly
      const body = document.body;
      const bodyClassesToRemove = Array.from(body.classList).filter(
        c => c.startsWith("theme-") || c.startsWith("font-") || c.startsWith("size-") || c.startsWith("card-")
      );
      bodyClassesToRemove.forEach(c => body.classList.remove(c));
      
      body.classList.add(`theme-${themeSettings.theme}`);
      body.classList.add(`font-${themeSettings.font}`);
      body.classList.add(`size-${themeSettings.size}`);
      body.classList.add(`card-${themeSettings.cardStyle}`);
      
      // Apply Custom Background Image
      if (themeSettings.bgImage) {
        body.style.backgroundImage = `url("${themeSettings.bgImage}")`;
        body.style.backgroundSize = "cover";
        body.style.backgroundPosition = "center";
        body.style.backgroundAttachment = "fixed";
        body.classList.add("has-bg-image");
      } else {
        body.style.backgroundImage = "";
        body.style.backgroundSize = "";
        body.style.backgroundPosition = "";
        body.style.backgroundAttachment = "";
        body.classList.remove("has-bg-image");
      }

      // Apply Blur Intensity
      root.style.setProperty("--blur-intensity", `${themeSettings.blurIntensity ?? 12}px`);
      
      // Save settings to LocalStorage
      localStorage.setItem("destino_theme_settings", JSON.stringify(themeSettings));
    }
  });

  // Modals state for Deletion & Google Doc Linking
  let showConfirmDelete = $state(false);
  let projectToDelete = $state(null);

  let showGoogleDocModal = $state(false);
  let projectToLinkDoc = $state(null);

  onMount(async () => {
    // Load theme settings from localStorage
    const localTheme = localStorage.getItem("destino_theme_settings");
    if (localTheme) {
      try {
        themeSettings = JSON.parse(localTheme);
      } catch (e) {
        console.error("Error parsing theme settings", e);
      }
    }

    if (isTauri) {
      try {
        APP_VERSION = await getVersion();
      } catch (e) {
        console.error("No se pudo obtener la versión de Tauri", e);
      }
      try {
        const update = await check();
        if (update) {
          console.log(`Update available: ${update.version}`);
          const confirmUpdate = confirm(`¡Nueva actualización ${update.version} disponible!\n\n¿Quieres descargarla e instalarla ahora?`);
          if (confirmUpdate) {
            loading = true;
            try {
              await update.downloadAndInstall();
              await relaunch();
            } catch (err) {
              console.error("Error al instalar la actualización", err);
              alert("Hubo un error instalando la actualización.");
              loading = false;
            }
          }
        }
      } catch (err) {
        console.error("No se pudo comprobar actualizaciones", err);
      }
    }

    try {
      // Load Configuration
      if (isTauri) {
        const configStr = await invoke("read_config");
        config = JSON.parse(configStr);
      } else {
        const localConfig = localStorage.getItem("destino_kanban_config");
        if (localConfig) {
          config = JSON.parse(localConfig);
        } else {
          config = {
            phases: ["Pre-prod", "Launch", "Competición", "Archivo"],
            roles: ["Desarrollador", "Diseñador", "Moderador", "Administrador", "Owner"],
            priorities: ["Baja", "Media", "Alta", "Crítica"],
            columns: ["Backlog", "To Do", "In Progress", "Done"],
            wipLimits: { "In Progress": 2, "To Do": 5 }
          };
          localStorage.setItem("destino_kanban_config", JSON.stringify(config));
        }
      }

      // Load Projects List — real-time if cloud is active
      if (isCloudActive()) {
        console.log("DestinyKanban: Firebase activo — sync en tiempo real iniciado");
        startSystemConfigSubscription();
        onAuthChange(async (user) => {
          if (user) {
            // User is fully authenticated in Firebase Auth
            if (currentUser) {
              currentView = "selector";
              startProjectsSubscription(currentUser);
              await loadUserPermissions(currentUser);
              startPresenceHeartbeat(currentUser, () => {
                return currentProject ? currentProject.id : (currentView === "selector" ? "selector" : "");
              }, useMinecraftSkin);
            }
          } else {
            // Not authenticated in Firebase Auth
            // If they skipped the login screen, force them back
            if (currentUser) {
              console.log("Sesión de Firebase ausente, forzando cierre de sesión local...");
              handleLogoutWithCleanup();
            }
          }
        });
      } else {
        console.log("Firebase inactivo: Cargando proyectos desde almacenamiento local...");
        if (isTauri) {
          const projectsStr = await invoke("read_projects");
          projects = JSON.parse(projectsStr);
        } else {
          const localProjects = localStorage.getItem("destino_kanban_projects");
          if (localProjects) {
            projects = JSON.parse(localProjects);
          } else {
            projects = [
              {
                id: "destino-survival",
                name: "Destino Survival (Temporada 2)",
                category: "equipo_destinyowner",
                googleDocUrl: "https://docs.google.com/document/d/1"
              },
              {
                id: "destino-minijuegos",
                name: "Destino Minijuegos",
                category: "equipo_destinyowner"
              },
              {
                id: "mi-proyecto-spawn",
                name: "Mi Spawn Privado",
                category: "propio"
              },
              {
                id: "mi-proyecto-plugins",
                name: "Configurador de Plugins",
                category: "propio"
              }
            ];
            localStorage.setItem("destino_kanban_projects", JSON.stringify(projects));
          }
        }

        // If user is already logged in (offline mode), redirect directly to the project selector
        if (currentUser) {
          currentView = "selector";
          await loadUserPermissions(currentUser);
        }
      }

      // Add window close listener to clear presence
      if (typeof window !== "undefined") {
        window.addEventListener("beforeunload", () => {
          if (isCloudActive() && currentUser) {
            clearPresence(currentUser);
          }
        });
      }
    } catch (e) {
      errorMessage = "Error cargando datos globales: " + e;
      console.error(e);
    } finally {
      loading = false;
    }
  });

  // User Authentication Handlers
  async function handleLogin(username, password, mcSkin) {
    try {
      if (isCloudActive()) {
        const success = await verifyCloudUser(username, password);
        if (!success) {
          throw new Error("Contraseña incorrecta para este usuario.");
        }
      }
      currentUser = username;
      useMinecraftSkin = mcSkin;
      await loadUserPermissions(username);
      if (typeof window !== "undefined") {
        localStorage.setItem("destino_current_user", username);
        localStorage.setItem("destino_last_username", username);
        localStorage.setItem("destino_use_minecraft_skin", mcSkin ? "true" : "false");
      }
      if (isCloudActive()) {
        startPresenceHeartbeat(currentUser, () => {
          return currentProject ? currentProject.id : (currentView === "selector" ? "selector" : "");
        }, mcSkin);
        startProjectsSubscription(username);
        startSystemConfigSubscription();
      }
      currentView = "selector";
    } catch (e) {
      console.error("Login verification error:", e);
      throw e;
    }
  }

  function handleLogout() {
    if (isCloudActive() && currentUser) {
      clearPresence(currentUser);
      stopPresenceHeartbeat();
    }
    currentUser = "";
    useMinecraftSkin = false;
    canCreateTeam = false;
    if (typeof window !== "undefined") {
      localStorage.removeItem("destino_current_user");
      localStorage.removeItem("destino_use_minecraft_skin");
    }
    currentView = "welcome";
  }

  // Load tasks for selected project
  async function handleSelectProject(project) {
    loading = true;
    currentProject = project;
    try {
      if (isCloudActive()) {
        // Stop previous task subscription before starting a new one
        if (_unsubTasks) { _unsubTasks(); _unsubTasks = null; }
        startTasksSubscription(project.id);
        // onSnapshot populates currentProjectTasks; wait a tick
        await new Promise(r => setTimeout(r, 300));
      } else {
        if (isTauri) {
          const tasksStr = await invoke("read_tasks", { projectId: project.id });
          currentProjectTasks = JSON.parse(tasksStr);
        } else {
          const localTasksKey = `destino_tasks_${project.id}`;
          const localTasks = localStorage.getItem(localTasksKey);
          if (localTasks) {
            currentProjectTasks = JSON.parse(localTasks);
          } else {
            if (project.id === "destino-survival") {
              currentProjectTasks = [
                {
                  id: "task-1",
                  title: "Configurar el spawn del servidor y zonas de protección",
                  status: "To Do",
                  phase: "Pre-prod",
                  priority: "Alta",
                  assignedTo: "Desarrollador"
                },
                {
                  id: "task-2",
                  title: "Diseñar logo oficial y banners promocionales",
                  status: "In Progress",
                  phase: "Launch",
                  priority: "Media",
                  assignedTo: "Diseñador"
                }
              ];
            } else {
              currentProjectTasks = [];
            }
            localStorage.setItem(localTasksKey, JSON.stringify(currentProjectTasks));
          }
        }
      }
      currentView = "board";
    } catch (e) {
      errorMessage = `Error cargando tareas del proyecto ${project.name}: ` + e;
      console.error(e);
    } finally {
      loading = false;
    }
  }

  // Create new project
  async function handleCreateProject(newProject) {
    // Always tag owner as lowercase username
    const project = {
      ...newProject,
      owner: currentUser.toLowerCase()
    };
    if (!isCloudActive()) {
      // Offline: add locally
      projects = [...projects, project];
    }
    // If cloud active, subscribeToOwnProjects will push it automatically
    try {
      if (isCloudActive()) {
        await saveFirebaseProject(project);
        notify(`Tablero "${project.name}" creado en la nube`, 'success');
      }
      
      if (isTauri) {
        await invoke("write_projects", { projectsJson: JSON.stringify(projects, null, 2) });
      } else {
        localStorage.setItem("destino_kanban_projects", JSON.stringify(projects));
      }
    } catch (e) {
      errorMessage = "Error guardando nuevo proyecto: " + e;
      console.error(e);
    }
  }

  // Trigger project deletion — only allowed for own projects or admin for team boards
  function triggerDeleteProject(project) {
    const isTeamBoard = project.category === 'equipo_destinyowner';
    if (isTeamBoard && !isAdmin) {
      notify('Solo el admin puede eliminar tableros de equipo', 'error');
      return;
    }
    const isOwner = !project.owner || project.owner === currentUser.toLowerCase();
    if (!isTeamBoard && !isOwner && !isAdmin) {
      notify('Solo puedes eliminar tus propios tableros', 'error');
      return;
    }
    projectToDelete = project;
    showConfirmDelete = true;
  }

  // Delete existing project
  async function handleDeleteProject() {
    if (!projectToDelete) return;
    const projectId = projectToDelete.id;
    const projectName = projectToDelete.name;
    if (!isCloudActive()) {
      projects = projects.filter(p => p.id !== projectId);
    }
    // Cloud: subscribeToProjects will remove it automatically

    if (currentProject && currentProject.id === projectId) {
      handleBackToMenu();
    }

    try {
      if (isCloudActive()) {
        await deleteFirebaseProject(projectId);
      } else if (isTauri) {
        await invoke("write_projects", { projectsJson: JSON.stringify(projects, null, 2) });
        await invoke("delete_tasks_file", { projectId: projectId });
      } else {
        localStorage.setItem("destino_kanban_projects", JSON.stringify(projects));
        localStorage.removeItem(`destino_tasks_${projectId}`);
      }
    } catch (e) {
      errorMessage = "Error al eliminar el proyecto: " + e;
      console.error(e);
    } finally {
      projectToDelete = null;
    }
  }

  // Trigger google doc connection modal
  function triggerLinkGoogleDoc(project) {
    projectToLinkDoc = project;
    showGoogleDocModal = true;
  }

  // Save google doc link (called from GoogleDocModal)
  async function handleSaveGoogleDoc(url) {
    if (!projectToLinkDoc) return;
    const updated = {
      ...projectToLinkDoc,
      googleDocUrl: url
    };
    await handleUpdateProject(updated);
    projectToLinkDoc = null;
  }

  // Update existing project details (like Google Doc URL)
  async function handleUpdateProject(updatedProject) {
    projects = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
    currentProject = updatedProject;
    try {
      if (isCloudActive()) {
        await saveFirebaseProject(updatedProject);
      } else if (isTauri) {
        await invoke("write_projects", { projectsJson: JSON.stringify(projects, null, 2) });
      } else {
        localStorage.setItem("destino_kanban_projects", JSON.stringify(projects));
      }
    } catch (e) {
      errorMessage = "Error al actualizar metadatos del proyecto: " + e;
      console.error(e);
    }
  }

  // Save active project tasks
  async function handleSaveTasks() {
    if (!currentProject) return;
    try {
      if (isCloudActive()) {
        // With real-time sync active, only write to Firestore; onSnapshot will update other clients
        await saveFirebaseTasks(currentProject.id, currentProjectTasks);
      } else if (isTauri) {
        await invoke("write_tasks", { 
          projectId: currentProject.id, 
          tasksJson: JSON.stringify(currentProjectTasks, null, 2) 
        });
      } else {
        const localTasksKey = `destino_tasks_${currentProject.id}`;
        localStorage.setItem(localTasksKey, JSON.stringify(currentProjectTasks));
      }
    } catch (e) {
      errorMessage = "Error guardando tareas: " + e;
      notify('Error al guardar tareas', 'error');
      console.error(e);
    }
  }

  // Save updated configuration
  async function handleSaveConfig(updatedConfig) {
    config = updatedConfig;
    try {
      if (isTauri) {
        await invoke("write_config", { configJson: JSON.stringify(updatedConfig, null, 2) });
      } else {
        localStorage.setItem("destino_kanban_config", JSON.stringify(updatedConfig));
        console.log("Configuración general guardada en localStorage.");
      }
    } catch (e) {
      errorMessage = "Error guardando configuración global: " + e;
      console.error(e);
    }
  }

  function handleBackToMenu() {
    // Unsubscribe from task listener when leaving a board
    if (_unsubTasks) { _unsubTasks(); _unsubTasks = null; }
    currentProject = null;
    currentProjectTasks = [];
    currentView = "selector";
  }

  function handleLogoutWithCleanup() {
    // Stop all subscriptions on logout
    if (_unsubOwnProjects) { _unsubOwnProjects(); _unsubOwnProjects = null; }
    if (_unsubTeamProjects) { _unsubTeamProjects(); _unsubTeamProjects = null; }
    if (_unsubTasks) { _unsubTasks(); _unsubTasks = null; }
    if (_unsubSystemConfig) { _unsubSystemConfig(); _unsubSystemConfig = null; }
    _ownProjects = [];
    _teamProjects = [];
    handleLogout();
  }

  onDestroy(() => {
    if (_unsubOwnProjects) _unsubOwnProjects();
    if (_unsubTeamProjects) _unsubTeamProjects();
    if (_unsubTasks) _unsubTasks();
  });
</script>

<main 
  class="app-container"
  ondragenter={handleDragEnter}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
>
  {#if isDraggingFile}
    <div class="drag-drop-overlay">
      <div class="drop-box neumorphic-card">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-color);">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <span class="drop-title">SUELTA LA IMAGEN AQUÍ</span>
        <span class="drop-sub">Para establecerla como fondo de DestinyKanban</span>
      </div>
    </div>
  {/if}

  <!-- Update Banners -->
  {#if updateAvailable && currentView !== 'welcome'}
    <div class="update-banner neumorphic-panel glow-effect">
      <span class="update-icon">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      </span>
      <div class="update-text">
        <strong>¡NUEVA ACTUALIZACIÓN DISPONIBLE!</strong>
        <span>Descarga e instala la versión <b>{latestAppVersion}</b> para ver los nuevos cambios.</span>
        {#if isUpdating}
          <div style="margin-top: 8px;">
            <div style="font-size: 0.8rem; margin-bottom: 4px; color: #a0a0a0;">{updateStatus}</div>
            <div style="width: 100%; max-width: 200px; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
              <div style="width: {updateProgress}%; height: 100%; background: #4cd964; transition: width 0.3s ease;"></div>
            </div>
          </div>
        {:else}
          <button class="btn btn-primary" style="margin-top: 8px; padding: 4px 12px; font-size: 0.8rem;" onclick={installUpdate}>
            ACTUALIZAR AHORA
          </button>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Error Banner -->
  {#if errorMessage}
    <div class="error-banner">
      <span>ERROR: {errorMessage}</span>
      <button class="btn-text" onclick={() => errorMessage = ""}>[X]</button>
    </div>
  {/if}

  {#if loading}
    <div class="loading">
      <span>CARGANDO SISTEMA...</span>
    </div>
  {:else if currentView === "welcome"}
    <WelcomeScreen onEnter={handleLogin} />
  {:else if currentView === "selector"}
    <ProjectSelector 
      {projects}
      currentUser={currentUser}
      useMinecraftSkin={useMinecraftSkin}
      canCreateTeam={canCreateTeam}
      isAdmin={isAdmin}
      onOpenAdminPanel={() => showAdminModal = true}
      onSelectProject={handleSelectProject}
      onCreateProject={handleCreateProject}
      onOpenConfig={() => showConfig = true}
      onOpenTheme={() => showThemeModal = true}
      onBack={handleLogoutWithCleanup}
      onTriggerDelete={triggerDeleteProject}
      onTriggerLinkDoc={triggerLinkGoogleDoc}
    />
  {:else if currentView === "board"}
    <KanbanBoard 
      {config}
      {systemUsers}
      project={currentProject}
      currentUser={currentUser}
      useMinecraftSkin={useMinecraftSkin}
      bind:tasks={currentProjectTasks}
      onBack={handleBackToMenu}
      saveTasks={handleSaveTasks}
      onUpdateProject={handleUpdateProject}
      onTriggerDelete={triggerDeleteProject}
      onTriggerLinkDoc={triggerLinkGoogleDoc}
      onOpenTheme={() => showThemeModal = true}
    />
  {/if}

  <!-- Configuration Modal -->
  <ConfigModal 
    bind:showConfig={showConfig}
    bind:config={config}
    onSave={handleSaveConfig}
  />

  {#if isAdmin}
    <!-- Admin Modal -->
    <AdminModal 
      bind:show={showAdminModal} 
      appVersion={APP_VERSION}
      latestAppVersion={latestAppVersion}
    />
  {/if}

  <!-- Confirm Delete Modal -->
  <ConfirmModal 
    bind:show={showConfirmDelete}
    title="ELIMINAR TABLERO KANBAN"
    message={projectToDelete ? `¿Estás seguro de que deseas eliminar el proyecto "${projectToDelete.name}"? Esta acción borrará el tablero del menú principal, todas sus tarjetas de tareas y su archivo físico de datos en el servidor.` : ""}
    matchText={projectToDelete ? projectToDelete.name : ""}
    confirmText="ELIMINAR TABLERO"
    onConfirm={handleDeleteProject}
  />

  <!-- Google Doc Modal -->
  <GoogleDocModal 
    bind:show={showGoogleDocModal}
    project={projectToLinkDoc}
    onSave={handleSaveGoogleDoc}
  />

  <!-- Theme Customizer Modal -->
  <ThemeModal 
    bind:show={showThemeModal}
    bind:themeSettings={themeSettings}
  />

  <!-- Global Notification Toasts -->
  <NotificationSystem />
</main>

<style>
  :global(:root) {
    /* Base Variables (Default Theme: Grayscale Dark) */
    --bg-color: #121212;
    --surface-color: #1e1e1e;
    --text-color: #e0e0e0;
    --accent-color: #505050;
    --accent-text: #121212;
    --border-color: #282828;
    --well-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.5);
    --card-shadow: -4px -4px 10px rgba(255, 255, 255, 0.01), 4px 4px 10px rgba(0, 0, 0, 0.35);
    --card-hover-shadow: -6px -6px 14px rgba(255, 255, 255, 0.015), 6px 6px 14px rgba(0, 0, 0, 0.5);
    
    --font-size-base: 14px;
    --font-family: 'JetBrains Mono', monospace;
    --title-font-family: 'Outfit', sans-serif;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    background-color: var(--bg-color);
    color: var(--text-color);
    font-family: var(--font-family);
    font-size: var(--font-size-base);
    transition: background-color 0.4s ease, color 0.3s ease;
    overflow-x: hidden;
  }

  /* Themes (Upgraded with Catppuccin Mocha & Latte Palettes) */
  :global(.theme-grayscale-dark) {
    --bg-color: #1e1e2e;
    --surface-color: #252538;
    --text-color: #cdd6f4;
    --accent-color: #b4befe;
    --accent-text: #11111b;
    --border-color: #313244;
    --well-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.5);
    --card-shadow: -4px -4px 10px rgba(255, 255, 255, 0.01), 4px 4px 10px rgba(0, 0, 0, 0.35);
    --card-hover-shadow: -6px -6px 14px rgba(255, 255, 255, 0.015), 6px 6px 14px rgba(0, 0, 0, 0.5);
  }
  :global(body.theme-grayscale-dark:not(.has-bg-image)) {
    background: radial-gradient(circle at center, #313244 0%, #11111b 100%) !important;
  }

  :global(.theme-grayscale-light) {
    --bg-color: #eff1f5;
    --surface-color: #e6e9ef;
    --text-color: #4c4f69;
    --accent-color: #1e66f5;
    --accent-text: #eff1f5;
    --border-color: #ccd0da;
    --well-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.1);
    --card-shadow: -6px -6px 12px rgba(0, 0, 0, 0.05), 6px 6px 12px rgba(0, 0, 0, 0.1);
    --card-hover-shadow: -8px -8px 16px rgba(0, 0, 0, 0.08), 8px 8px 16px rgba(0, 0, 0, 0.15);
  }
  :global(body.theme-grayscale-light:not(.has-bg-image)) {
    background: radial-gradient(circle at center, #ffffff 0%, #dce0e8 100%) !important;
  }

  :global(.theme-liquid-lava) {
    --bg-color: #1a0b0b;
    --surface-color: #2e1212;
    --text-color: #f5e0dc;
    --accent-color: #f38ba8;
    --accent-text: #11111b;
    --border-color: #eba0ac;
    --card-shadow: -4px -4px 10px rgba(243, 139, 168, 0.05), 4px 4px 10px rgba(0, 0, 0, 0.6);
    --card-hover-shadow: -6px -6px 14px rgba(243, 139, 168, 0.1), 6px 6px 14px rgba(0, 0, 0, 0.8);
    --well-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.7);
  }
  :global(body.theme-liquid-lava:not(.has-bg-image)) {
    background: linear-gradient(135deg, #11111b 0%, #2e1212 35%, #451a1a 70%, #11111b 100%) !important;
    background-size: 400% 400% !important;
    animation: liquidBg 15s ease infinite !important;
  }

  :global(.theme-liquid-water) {
    --bg-color: #0b112c;
    --surface-color: #111936;
    --text-color: #cdd6f4;
    --accent-color: #89b4fa;
    --accent-text: #11111b;
    --border-color: #313244;
    --card-shadow: -4px -4px 10px rgba(137, 180, 250, 0.05), 4px 4px 10px rgba(0, 0, 0, 0.6);
    --card-hover-shadow: -6px -6px 14px rgba(137, 180, 250, 0.1), 6px 6px 14px rgba(0, 0, 0, 0.8);
    --well-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.7);
  }
  :global(body.theme-liquid-water:not(.has-bg-image)) {
    background: linear-gradient(135deg, #11111b 0%, #111936 35%, #18224b 70%, #11111b 100%) !important;
    background-size: 400% 400% !important;
    animation: liquidBg 15s ease infinite !important;
  }

  :global(.theme-liquid-portal) {
    --bg-color: #160e2e;
    --surface-color: #211545;
    --text-color: #f5c2e7;
    --accent-color: #cba6f7;
    --accent-text: #11111b;
    --border-color: #45475a;
    --card-shadow: -4px -4px 10px rgba(203, 166, 247, 0.05), 4px 4px 10px rgba(0, 0, 0, 0.6);
    --card-hover-shadow: -6px -6px 14px rgba(203, 166, 247, 0.1), 6px 6px 14px rgba(0, 0, 0, 0.8);
    --well-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.7);
  }
  :global(body.theme-liquid-portal:not(.has-bg-image)) {
    background: linear-gradient(135deg, #11111b 0%, #211545 35%, #35216e 70%, #11111b 100%) !important;
    background-size: 400% 400% !important;
    animation: liquidBg 12s ease infinite !important;
  }

  :global(.theme-redstone) {
    --bg-color: #11111b;
    --surface-color: #1e1e2e;
    --text-color: #cdd6f4;
    --accent-color: #f38ba8;
    --accent-text: #11111b;
    --border-color: #f38ba8;
    --card-shadow: 0 0 8px rgba(243, 139, 168, 0.25);
    --card-hover-shadow: 0 0 15px rgba(243, 139, 168, 0.5);
    --well-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.8);
  }
  :global(body.theme-redstone:not(.has-bg-image)) {
    background: radial-gradient(circle at center, #2e1212 0%, #11111b 100%) !important;
  }

  :global(.theme-emerald) {
    --bg-color: #11111b;
    --surface-color: #1e1e2e;
    --text-color: #cdd6f4;
    --accent-color: #a6e3a1;
    --accent-text: #11111b;
    --border-color: #a6e3a1;
    --card-shadow: -4px -4px 10px rgba(166, 227, 161, 0.05), 4px 4px 10px rgba(0, 0, 0, 0.6);
    --card-hover-shadow: -6px -6px 14px rgba(166, 227, 161, 0.1), 6px 6px 14px rgba(0, 0, 0, 0.8);
    --well-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.7);
  }
  :global(body.theme-emerald:not(.has-bg-image)) {
    background: radial-gradient(circle at center, #0f2d19 0%, #11111b 100%) !important;
  }

  @keyframes -global-liquidBg {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  /* Fonts */
  :global(.font-monospace) {
    --font-family: 'JetBrains Mono', monospace;
    --title-font-family: 'Outfit', sans-serif;
  }

  :global(.font-pixel) {
    --font-family: 'VT323', monospace;
    --title-font-family: 'VT323', monospace;
  }
  :global(.font-pixel) h1, :global(.font-pixel) h2, :global(.font-pixel) h3, :global(.font-pixel) button, :global(.font-pixel) span, :global(.font-pixel) input, :global(.font-pixel) select, :global(.font-pixel) label, :global(.font-pixel) a {
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  :global(.font-retro-gamer) {
    --font-family: 'Press Start 2P', monospace;
    --title-font-family: 'Press Start 2P', monospace;
  }
  :global(.font-retro-gamer) h1, :global(.font-retro-gamer) h2, :global(.font-retro-gamer) h3, :global(.font-retro-gamer) button, :global(.font-retro-gamer) span, :global(.font-retro-gamer) input, :global(.font-retro-gamer) select, :global(.font-retro-gamer) label, :global(.font-retro-gamer) a {
    font-size: 0.82em;
  }

  :global(.font-sans) {
    --font-family: 'Inter', sans-serif;
    --title-font-family: 'Inter', sans-serif;
  }

  :global(.font-outfit) {
    --font-family: 'Outfit', sans-serif;
    --title-font-family: 'Outfit', sans-serif;
  }

  /* Sizes */
  :global(.size-small) {
    --font-size-base: 12px;
  }
  :global(.size-medium) {
    --font-size-base: 14px;
  }
  :global(.size-large) {
    --font-size-base: 16px;
  }

  /* Card Styles */
  :global(.card-flat) {
    --card-shadow: none !important;
    --card-hover-shadow: none !important;
    --well-shadow: none !important;
  }
  :global(.card-flat .project-card), :global(.card-flat .neumorphic-card), :global(.card-flat .neumorphic-panel), :global(.card-flat .column), :global(.card-flat .task-card), :global(.card-flat .user-profile-card) {
    border: 1px solid var(--border-color) !important;
    background: var(--surface-color) !important;
    box-shadow: none !important;
  }

  :global(.card-glass) {
    --card-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.35) !important;
    --card-hover-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.55) !important;
  }
  /* Primary glassmorphic panels and containers */
  :global(.card-glass .project-card), :global(.card-glass .neumorphic-card), :global(.card-glass .neumorphic-panel), :global(.card-glass .column), :global(.card-glass .modal), :global(.card-glass .user-profile-card), :global(.card-glass .timeline-container), :global(.card-glass .welcome-box) {
    background: rgba(30, 30, 30, 0.45) !important;
    backdrop-filter: blur(var(--blur-intensity, 12px)) !important;
    -webkit-backdrop-filter: blur(var(--blur-intensity, 12px)) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
  }
  /* Nested cards (like task cards) should NOT have their own backdrop-filter to prevent browser rendering double-blur bugs */
  :global(.card-glass .task-card) {
    background: rgba(12, 12, 12, 0.45) !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    border: 1px solid rgba(255, 255, 255, 0.05) !important;
  }
  :global(.card-glass.theme-grayscale-light .project-card), :global(.card-glass.theme-grayscale-light .neumorphic-card), :global(.card-glass.theme-grayscale-light .column), :global(.card-glass.theme-grayscale-light .modal), :global(.card-glass.theme-grayscale-light .user-profile-card), :global(.card-glass.theme-grayscale-light .welcome-box) {
    background: rgba(240, 240, 240, 0.45) !important;
    backdrop-filter: blur(var(--blur-intensity, 12px)) !important;
    -webkit-backdrop-filter: blur(var(--blur-intensity, 12px)) !important;
    border: 1px solid rgba(0, 0, 0, 0.08) !important;
  }
  :global(.card-glass.theme-grayscale-light .task-card) {
    background: rgba(255, 255, 255, 0.5) !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    border: 1px solid rgba(0, 0, 0, 0.05) !important;
  }

  .app-container {
    max-width: 100%;
    margin: 0 auto;
    padding: 20px;
    height: 100vh;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    background-color: transparent;
  }

  /* Error Banner */
  .error-banner {
    background-color: #3a1e1e;
    border: 1px solid #aa3333;
    padding: 10px 15px;
    margin-bottom: 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #ff8888;
    font-size: 0.9rem;
    z-index: 1000;
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

  /* Loading State */
  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    flex: 1;
    font-size: 1.2rem;
    letter-spacing: 2px;
    color: #888888;
  }

  /* Global Drag Drop File Overlay */
  .drag-drop-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.85);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    pointer-events: none;
  }

  .drop-box {
    background-color: var(--surface-color, #1e1e1e);
    border: 3px dashed var(--accent-color, #505050);
    padding: 40px;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.6);
    max-width: 400px;
    width: 80%;
    text-align: center;
  }

  .drop-title {
    font-family: var(--title-font-family, 'Outfit', sans-serif);
    font-size: 1.4rem;
    font-weight: bold;
    color: var(--text-color, #e0e0e0);
    letter-spacing: 1px;
  }

  .drop-sub {
    font-size: 0.85rem;
    color: #888888;
  }

  .update-banner {
    background: linear-gradient(135deg, rgba(230, 57, 70, 0.1) 0%, rgba(230, 57, 70, 0.02) 100%);
    border: 1px solid rgba(230, 57, 70, 0.3);
    border-left: 4px solid #e63946;
    margin: 10px 20px;
    padding: 12px 20px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 15px;
    z-index: 100;
  }

  .glow-effect {
    box-shadow: 0 0 15px rgba(230, 57, 70, 0.2);
    animation: pulseGlow 2s infinite;
  }

  @keyframes pulseGlow {
    0% { box-shadow: 0 0 10px rgba(230, 57, 70, 0.1); }
    50% { box-shadow: 0 0 20px rgba(230, 57, 70, 0.3); }
    100% { box-shadow: 0 0 10px rgba(230, 57, 70, 0.1); }
  }

  .update-icon {
    color: #e63946;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(230, 57, 70, 0.1);
    width: 36px;
    height: 36px;
    border-radius: 50%;
  }

  .update-text {
    display: flex;
    flex-direction: column;
    color: var(--text-color, #e0e0e0);
  }

  .update-text strong {
    font-size: 0.95rem;
    color: #e63946;
    letter-spacing: 0.5px;
  }

  .update-text span {
    font-size: 0.85rem;
    opacity: 0.9;
  }

  .admin-update-banner {
    background-color: rgba(0, 0, 0, 0.3);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding: 6px 20px;
    display: flex;
    align-items: center;
    gap: 15px;
    font-size: 0.8rem;
    color: #888;
  }

  .admin-badge {
    background-color: #89b4fa;
    color: #111;
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.7rem;
    letter-spacing: 1px;
  }

  .status-warning {
    color: #f39c12;
    font-weight: bold;
  }

  .status-ok {
    color: #4cd964;
  }

  .btn-sube-act {
    margin-left: auto;
    background: linear-gradient(135deg, rgba(137, 180, 250, 0.2) 0%, rgba(137, 180, 250, 0.05) 100%);
    border: 1px solid rgba(137, 180, 250, 0.3);
    color: #89b4fa;
    padding: 4px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    display: flex;
    align-items: center;
    transition: all 0.2s ease;
  }

  .btn-sube-act:hover {
    background: rgba(137, 180, 250, 0.15);
    box-shadow: 0 0 10px rgba(137, 180, 250, 0.2);
  }
</style>
