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
  import { compressImage } from "../lib/utils.js";
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
  let APP_VERSION = $state("1.1.4");

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
      updateStatus = `Error: ${e?.message || e || "Error desconocido"}`;
      console.error("Error al actualizar:", e);
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
        // Excluir el documento de configuración del sistema de los proyectos visibles
        const filteredOwn = liveOwn.filter(p => p.id !== "system_config");
        const prevIds = _ownProjects.map(p => p.id);
        const added = filteredOwn.filter(p => !prevIds.includes(p.id));
        if (added.length && prevIds.length > 0) {
          added.forEach(p => notify(`Tablero propio "${p.name}" creado`, 'success'));
        }
        _ownProjects = filteredOwn;
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

  async function handleDrop(e) {
    e.preventDefault();
    isDraggingFile = false;
    dragCounter = 0;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        try {
          const compressed = await compressImage(file);
          themeSettings.bgImage = compressed;
          notify("Imagen de fondo aplicada y optimizada.", "success");
        } catch (err) {
          console.error("Error al comprimir la imagen de fondo:", err);
          notify("Error al procesar la imagen de fondo.", "error");
        }
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
      try {
        const themeKey = currentUser ? `destino_theme_settings_${currentUser}` : "destino_theme_settings";
        localStorage.setItem(themeKey, JSON.stringify(themeSettings));
      } catch (err) {
        console.error("Error saving theme to localStorage:", err);
        notify("Error al guardar tema localmente: memoria llena.", "error");
      }
    }
  });

  // Modals state for Deletion & Google Doc Linking
  let showConfirmDelete = $state(false);
  let projectToDelete = $state(null);

  let showGoogleDocModal = $state(false);
  let projectToLinkDoc = $state(null);

  onMount(async () => {
    // Load theme settings from localStorage
    const themeKey = currentUser ? `destino_theme_settings_${currentUser}` : "destino_theme_settings";
    const localTheme = localStorage.getItem(themeKey);
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
              
              // Si el usuario es elglower (dueño/admin), sincronizar automáticamente la versión del sistema de la nube
              if (currentUser.toLowerCase() === "elglower") {
                try {
                  console.log("DestinyKanban Owner: Sincronizando versión de la nube automáticamente a", APP_VERSION);
                  await updateSystemVersion(APP_VERSION);
                } catch (e) {
                  console.error("Error sincronizando versión del sistema automáticamente:", e);
                  notify("Error al autopublicar versión: " + (e.message || e), "error");
                }
              }

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
      
      // Load user specific theme
      const themeKey = `destino_theme_settings_${username}`;
      const localTheme = localStorage.getItem(themeKey);
      if (localTheme) {
        try { themeSettings = JSON.parse(localTheme); } catch(e) {}
      } else {
        themeSettings = { theme: "grayscale-dark", font: "monospace", size: "medium", cardStyle: "neumorphic", bgImage: "", blurIntensity: 12 };
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
        
        // Si el usuario es elglower (dueño/admin), sincronizar automáticamente la versión del sistema de la nube
        if (username.toLowerCase() === "elglower") {
          try {
            console.log("DestinyKanban Owner: Sincronizando versión de la nube automáticamente a", APP_VERSION);
            await updateSystemVersion(APP_VERSION);
          } catch (e) {
            console.error("Error al sincronizar automáticamente la versión en la nube:", e);
          }
        }
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
    
    // Load default theme for logged out state
    const localTheme = localStorage.getItem("destino_theme_settings");
    if (localTheme) {
      try { themeSettings = JSON.parse(localTheme); } catch(e) {}
    } else {
      themeSettings = { theme: "grayscale-dark", font: "monospace", size: "medium", cardStyle: "neumorphic", bgImage: "", blurIntensity: 12 };
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

<style src="./+page.css"></style>
