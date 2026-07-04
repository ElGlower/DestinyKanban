import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp
} from "firebase/firestore";

let firebaseApp = null;
let db = null;
let auth = null;
let isFirebaseEnabled = false;

const DEFAULT_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

export function getFirebaseConfig() {
  if (typeof window === "undefined") return null;
  const savedConfig = localStorage.getItem("destino_firebase_config");
  if (savedConfig === "disabled") return null;
  if (!savedConfig) return DEFAULT_CONFIG;
  try {
    return JSON.parse(savedConfig);
  } catch (e) {
    console.error("Error parsing Firebase config", e);
    return DEFAULT_CONFIG;
  }
}

export function saveFirebaseConfig(config) {
  if (typeof window === "undefined") return;
  if (config && config.apiKey && config.projectId) {
    localStorage.setItem("destino_firebase_config", JSON.stringify(config));
    return initializeFirebase(config);
  } else {
    localStorage.setItem("destino_firebase_config", "disabled");
    firebaseApp = null;
    db = null;
    isFirebaseEnabled = false;
    return false;
  }
}

export function initializeFirebase(config = null) {
  const fbConfig = config || getFirebaseConfig();
  if (!fbConfig || !fbConfig.apiKey || !fbConfig.projectId) {
    isFirebaseEnabled = false;
    db = null;
    return false;
  }

  try {
    if (getApps().length === 0) {
      firebaseApp = initializeApp(fbConfig);
    } else {
      firebaseApp = getApp();
    }
    db = getFirestore(firebaseApp);
    auth = getAuth(firebaseApp);
    isFirebaseEnabled = true;
    console.log("Firebase conectado en vivo con éxito!");
    return true;
  } catch (e) {
    console.error("Error inicializando Firebase:", e);
    isFirebaseEnabled = false;
    db = null;
    auth = null;
    return false;
  }
}

export function isCloudActive() {
  return isFirebaseEnabled && db !== null && auth !== null;
}

export function onAuthChange(callback) {
  if (!isCloudActive() || !auth) return () => {};
  import("firebase/auth").then(({ onAuthStateChanged }) => {
    onAuthStateChanged(auth, callback);
  });
}

// --- Firestore Sync Helpers ---

// Get all projects from Firebase
export async function getFirebaseProjects() {
  if (!isCloudActive()) return null;
  try {
    const querySnapshot = await getDocs(collection(db, "projects"));
    const projects = [];
    querySnapshot.forEach((doc) => {
      projects.push({ id: doc.id, ...doc.data() });
    });
    return projects;
  } catch (e) {
    console.error("Error al obtener proyectos de Firebase:", e);
    throw e;
  }
}

// Save/Update a project in Firebase
export async function saveFirebaseProject(project) {
  if (!isCloudActive()) return;
  try {
    const docRef = doc(db, "projects", project.id);
    // Normalize owner to lowercase so per-user queries always match
    const data = {
      ...project,
      owner: project.owner ? project.owner.toLowerCase() : ""
    };
    await setDoc(docRef, data, { merge: true });
    console.log(`Proyecto ${project.id} guardado en Firebase.`);
  } catch (e) {
    console.error("Error al guardar proyecto en Firebase:", e);
    throw e;
  }
}

// Delete a project from Firebase
export async function deleteFirebaseProject(projectId) {
  if (!isCloudActive()) return;
  try {
    // Delete project doc
    await deleteDoc(doc(db, "projects", projectId));
    
    // Also delete all tasks associated with this project
    const q = query(collection(db, "tasks"), where("projectId", "==", projectId));
    const querySnapshot = await getDocs(q);
    const deletePromises = [];
    querySnapshot.forEach((document) => {
      deletePromises.push(deleteDoc(doc(db, "tasks", document.id)));
    });
    await Promise.all(deletePromises);
    console.log(`Proyecto ${projectId} y sus tareas en la nube han sido eliminadas.`);
  } catch (e) {
    console.error("Error al eliminar proyecto de Firebase:", e);
    throw e;
  }
}

// Get all tasks for a project from Firebase
export async function getFirebaseTasks(projectId) {
  if (!isCloudActive()) return null;
  try {
    const q = query(collection(db, "tasks"), where("projectId", "==", projectId));
    const querySnapshot = await getDocs(q);
    const tasks = [];
    querySnapshot.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() });
    });
    return tasks;
  } catch (e) {
    console.error(`Error al obtener tareas de Firebase para ${projectId}:`, e);
    throw e;
  }
}

// Save/Update all tasks in a project to Firebase
export async function saveFirebaseTasks(projectId, tasks) {
  if (!isCloudActive()) return;
  try {
    // Sync present tasks
    const currentTasksInCloud = await getFirebaseTasks(projectId);
    const cloudTaskIds = new Set(currentTasksInCloud.map(t => t.id));
    const localTaskIds = new Set(tasks.map(t => t.id));

    // Delete tasks in cloud that are not present locally
    const deletePromises = [];
    cloudTaskIds.forEach(id => {
      if (!localTaskIds.has(id)) {
        deletePromises.push(deleteDoc(doc(db, "tasks", id)));
      }
    });
    await Promise.all(deletePromises);

    // Save/Update all current tasks
    const savePromises = tasks.map(task => {
      const docRef = doc(db, "tasks", task.id);
      return setDoc(docRef, {
        ...task,
        projectId: projectId
      }, { merge: true });
    });
    await Promise.all(savePromises);
    console.log(`Tareas de ${projectId} sincronizadas en la nube.`);
  } catch (e) {
    console.error("Error al sincronizar tareas en Firebase:", e);
    throw e;
  }
}

export async function verifyCloudUser(username, password) {
  if (!isCloudActive()) return true;
  
  // Create a fake email for Firebase Auth based on the username
  const fakeEmail = `${username.toLowerCase()}@destinykanban.local`;
  // Firebase Auth requires passwords to be at least 6 characters.
  // We pad it if it's shorter, but verify the legacy Firestore user with the original unpadded password.
  const fbPassword = password.length >= 6 ? password : password.padEnd(6, "_");
  let userCredential = null;

  try {
    // 1. Try to sign in via Firebase Auth
    userCredential = await signInWithEmailAndPassword(auth, fakeEmail, fbPassword);
  } catch (authError) {
    if (authError.code === "auth/user-not-found" || authError.code === "auth/invalid-credential" || authError.code === "auth/invalid-login-credentials") {
      // 2. If user doesn't exist, we check if they exist in the Firestore 'users' collection 
      // (to support legacy users that were pre-added but not registered in Auth yet)
      try {
        const userDocRef = doc(db, "users", username.toLowerCase());
        const userSnapshot = await getDoc(userDocRef);
        
        if (userSnapshot.exists()) {
          const data = userSnapshot.data();
          if (data.password && data.password !== password) {
            // Wrong password for legacy user
            return false;
          }
        }
      } catch (e) {
        // Ignorar errores de permisos aquí. Si no podemos leer, asumimos que no existe o es nuevo.
      }
      
      // 3. Register them in Firebase Auth
      try {
        userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, fbPassword);
      } catch (createError) {
        if (createError.code === "auth/email-already-in-use") {
          return false; // Wrong password
        }
        throw createError;
      }
    } else {
      console.error("Auth error:", authError);
      return false;
    }
  }

  // 4. Update or create the Firestore user document
  try {
    const userDocRef = doc(db, "users", username.toLowerCase());
    const userSnapshot = await getDoc(userDocRef);
    const isAdmin = username.toLowerCase() === "elglower";
    
    if (!userSnapshot.exists()) {
      await setDoc(userDocRef, {
        username: username,
        canCreateTeamBoards: isAdmin,
        createdAt: new Date().toISOString(),
        uid: userCredential.user.uid
      });
    } else {
      // Clean up plaintext password if it exists (for security)
      await setDoc(userDocRef, { uid: userCredential.user.uid, password: "" }, { merge: true });
    }
    return true;
  } catch (e) {
    console.error("Error creating/updating cloud user doc:", e);
    return true; // Return true if auth succeeded but doc creation failed due to rules
  }
}

// Add or pre-authorize a Minecraft user manually by admin
export async function addAuthorizedUser(username, canCreateTeamBoards) {
  if (!isCloudActive()) throw new Error("Firebase no está activo.");
  try {
    const userDocRef = doc(db, "users", username.toLowerCase());
    const userSnapshot = await getDoc(userDocRef);
    if (userSnapshot.exists()) {
      await setDoc(userDocRef, {
        canCreateTeamBoards: canCreateTeamBoards
      }, { merge: true });
    } else {
      await setDoc(userDocRef, {
        username: username,
        canCreateTeamBoards: canCreateTeamBoards,
        createdAt: new Date().toISOString()
      });
    }
  } catch (e) {
    console.error("Error al añadir usuario autorizado:", e);
    throw e;
  }
}

// Get all registered users (for admin view)
export async function getFirebaseUsers() {
  if (!isCloudActive()) return [];
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    return users;
  } catch (e) {
    console.error("Error al obtener usuarios:", e);
    throw e;
  }
}

// Update user permissions
export async function updateUserPermission(username, canCreateTeamBoards) {
  if (!isCloudActive()) return;
  try {
    const userDocRef = doc(db, "users", username.toLowerCase());
    await setDoc(userDocRef, {
      canCreateTeamBoards: canCreateTeamBoards
    }, { merge: true });
    console.log(`Permisos actualizados para ${username}: canCreateTeamBoards = ${canCreateTeamBoards}`);
  } catch (e) {
    console.error("Error actualizando permisos de usuario:", e);
    throw e;
  }
}

// Fetch single user data (to check permissions on login/load)
export async function getFirebaseUser(username) {
  if (!isCloudActive()) return null;
  try {
    const userDocRef = doc(db, "users", username.toLowerCase());
    const userSnapshot = await getDoc(userDocRef);
    if (userSnapshot.exists()) {
      return userSnapshot.data();
    }
    return null;
  } catch (e) {
    console.error("Error fetching user data:", e);
    throw e;
  }
}

let presenceHeartbeatInterval = null;

// Update presence in Firestore
export async function updatePresence(username, projectId, useMinecraftSkin) {
  if (!isCloudActive()) return;
  try {
    const docRef = doc(db, "presence", username.toLowerCase());
    await setDoc(docRef, {
      username: username,
      projectId: projectId || "selector",
      useMinecraftSkin: useMinecraftSkin,
      lastActive: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.error("Error updating presence:", e);
  }
}

// Clear presence (on logout or exit)
export async function clearPresence(username) {
  if (!isCloudActive()) return;
  try {
    const docRef = doc(db, "presence", username.toLowerCase());
    await deleteDoc(docRef);
  } catch (e) {
    console.error("Error clearing presence:", e);
  }
}

// Start heartbeat to keep presence alive
export function startPresenceHeartbeat(username, getActiveProjectId, useMinecraftSkin) {
  if (!isCloudActive()) return;
  
  // Clear any existing heartbeat
  if (presenceHeartbeatInterval) {
    clearInterval(presenceHeartbeatInterval);
  }

  // Update immediately
  updatePresence(username, getActiveProjectId(), useMinecraftSkin);

  // Set interval every 30 seconds
  presenceHeartbeatInterval = setInterval(() => {
    updatePresence(username, getActiveProjectId(), useMinecraftSkin);
  }, 30000);
}

// Stop presence heartbeat
export function stopPresenceHeartbeat() {
  if (presenceHeartbeatInterval) {
    clearInterval(presenceHeartbeatInterval);
    presenceHeartbeatInterval = null;
  }
}

// Subscribe to other users online on a specific board
export function subscribeToBoardPresence(projectId, callback) {
  if (!isCloudActive()) {
    callback([]);
    return () => {};
  }
  
  const q = query(
    collection(db, "presence"),
    where("projectId", "==", projectId)
  );

  return onSnapshot(q, (snapshot) => {
    const activeUsers = [];
    const now = new Date().getTime();
    snapshot.forEach((doc) => {
      const data = doc.data();
      const lastActiveTime = new Date(data.lastActive).getTime();
      // Filter out users who haven't updated heartbeat in more than 90 seconds (offline)
      if (now - lastActiveTime < 90000) {
        activeUsers.push(data);
      }
    });
    callback(activeUsers);
  }, (error) => {
    console.error("Presence subscription error:", error);
  });
}

// ── Real-time subscriptions ────────────────────────────────────────────────

/**
 * Subscribe to live changes of a specific user's OWN projects.
 * Only projects where owner === username are returned.
 * Returns an unsubscribe function.
 * @param {string} username
 * @param {function(project[]): void} callback
 * @param {function(Error): void} [onError]
 */
export function subscribeToOwnProjects(username, callback, onError) {
  if (!isCloudActive() || !username) {
    callback([]);
    return () => {};
  }
  const q = query(
    collection(db, "projects"),
    where("owner", "==", username.toLowerCase())
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const projects = [];
      snapshot.forEach((d) => projects.push({ id: d.id, ...d.data() }));
      callback(projects);
    },
    (err) => {
      console.error("subscribeToOwnProjects error:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to live changes of team (Destiny) projects.
 * Returns all projects with category === "equipo_destinyowner".
 * Returns an unsubscribe function.
 * @param {function(project[]): void} callback
 * @param {function(Error): void} [onError]
 */
export function subscribeToTeamProjects(callback, onError) {
  if (!isCloudActive()) {
    callback([]);
    return () => {};
  }
  const q = query(
    collection(db, "projects"),
    where("category", "==", "equipo_destinyowner")
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const projects = [];
      snapshot.forEach((d) => projects.push({ id: d.id, ...d.data() }));
      callback(projects);
    },
    (err) => {
      console.error("subscribeToTeamProjects error:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to live task changes for a specific project.
 * Returns an unsubscribe function.
 * @param {string} projectId
 * @param {function(task[]): void} callback
 * @param {function(Error): void} [onError]
 */
export function subscribeToTasks(projectId, callback, onError) {
  if (!isCloudActive()) {
    callback([]);
    return () => {};
  }
  const q = query(
    collection(db, "tasks"),
    where("projectId", "==", projectId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const tasks = [];
      snapshot.forEach((d) => tasks.push({ id: d.id, ...d.data() }));
      callback(tasks);
    },
    (err) => {
      console.error(`subscribeToTasks(${projectId}) error:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to system config changes (like version updates).
 * Returns an unsubscribe function.
 * @param {function(Object): void} callback
 * @param {function(Error): void} [onError]
 */
export function subscribeToSystemConfig(callback, onError) {
  if (!isCloudActive()) {
    callback({});
    return () => {};
  }
  const docRef = doc(db, "projects", "system_config");
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      } else {
        callback({});
      }
    },
    (err) => {
      console.error("subscribeToSystemConfig error:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Updates the global system version
 */
export async function updateSystemVersion(newVersion) {
  if (!isCloudActive()) return;
  const docRef = doc(db, "projects", "system_config");
  await setDoc(docRef, { 
    id: "system_config",
    owner: "elglower",
    latestVersion: newVersion,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

// ── Activity Log ──────────────────────────────────────────────────────────

/**
 * Log a user activity event to Firestore.
 * @param {string} username  - The user performing the action
 * @param {string} action    - e.g. 'login', 'enter_board', 'create_task', 'edit_task', 'delete_task', 'move_task', 'logout'
 * @param {Object} [meta]    - Optional extra context (projectId, projectName, taskTitle, fromCol, toCol, etc.)
 */
export async function logActivity(username, action, meta = {}) {
  if (!isCloudActive() || !username) return;
  try {
    const colRef = collection(db, "activity_log");
    await addDoc(colRef, {
      username: username.toLowerCase(),
      displayName: username,
      action,
      meta,
      timestamp: serverTimestamp(),
      timestampISO: new Date().toISOString()
    });
  } catch (e) {
    // Silently ignore — activity logging should never break the app
    console.warn("logActivity error:", e.message);
  }
}

/**
 * Subscribe to the activity log (last N entries, real-time).
 * Admin-only function.
 * @param {function(Array): void} callback
 * @param {number} [maxEntries=100]
 * @returns {function} Unsubscribe function
 */
export function subscribeToActivityLog(callback, maxEntries = 100) {
  if (!isCloudActive()) {
    callback([]);
    return () => {};
  }
  const q = query(
    collection(db, "activity_log"),
    orderBy("timestampISO", "desc"),
    limit(maxEntries)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const entries = [];
      snapshot.forEach((d) => entries.push({ id: d.id, ...d.data() }));
      callback(entries);
    },
    (err) => {
      console.error("subscribeToActivityLog error:", err);
    }
  );
}

// Initialize on import if config exists
if (typeof window !== "undefined") {
  initializeFirebase();
}
