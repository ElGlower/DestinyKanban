import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCfzq2_PfLSyhG5cRZz4KtYr-Kd29FPLMM",
  authDomain: "destinykanban.firebaseapp.com",
  projectId: "destinykanban",
  storageBucket: "destinykanban.firebasestorage.app",
  messagingSenderId: "697873311825",
  appId: "1:697873311825:web:f3a6944f55d592e6ccf070",
  measurementId: "G-8NQKJPTZDW"
};

// Check arguments
const versionArg = process.argv[2];
const changelogArg = process.argv[3];

if (!versionArg || !changelogArg) {
  console.log(`
❌ Uso: node release.js <version> "<changelog>"
Ejemplo: node release.js 1.1.4 "Mejoras de rendimiento y correcciones visuales."
`);
  process.exit(1);
}

const NEW_VERSION = versionArg.trim();
const CHANGELOG = changelogArg.trim();

// Semver validation pattern
if (!/^\d+\.\d+\.\d+$/.test(NEW_VERSION)) {
  console.error("❌ La versión debe estar en formato semver (ej. 1.1.4)");
  process.exit(1);
}

console.log(`🚀 Iniciando proceso de publicación para versión: ${NEW_VERSION}`);
console.log(`📝 Changelog: "${CHANGELOG}"\n`);

try {
  // 1. Modificar package.json
  console.log("📝 Actualizando package.json...");
  const pkgPath = path.resolve('package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const oldVersion = pkg.version;
  pkg.version = NEW_VERSION;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

  // 2. Modificar src-tauri/Cargo.toml
  console.log("📝 Actualizando src-tauri/Cargo.toml...");
  const cargoPath = path.resolve('src-tauri/Cargo.toml');
  let cargoContent = fs.readFileSync(cargoPath, 'utf8');
  cargoContent = cargoContent.replace(/version\s*=\s*"[^"]+"/, `version = "${NEW_VERSION}"`);
  fs.writeFileSync(cargoPath, cargoContent, 'utf8');

  // 3. Modificar src-tauri/tauri.conf.json
  console.log("📝 Actualizando src-tauri/tauri.conf.json...");
  const tauriConfPath = path.resolve('src-tauri/tauri.conf.json');
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
  tauriConf.version = NEW_VERSION;
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n', 'utf8');

  // 4. Modificar src/routes/+page.svelte
  console.log("📝 Actualizando APP_VERSION en src/routes/+page.svelte...");
  const pageSveltePath = path.resolve('src/routes/+page.svelte');
  let pageContent = fs.readFileSync(pageSveltePath, 'utf8');
  pageContent = pageContent.replace(/let APP_VERSION = \$state\("[^"]+"\);/, `let APP_VERSION = $state("${NEW_VERSION}");`);
  fs.writeFileSync(pageSveltePath, pageContent, 'utf8');

  // 5. Configurar clave de firma para Tauri y compilar
  console.log("🔑 Cargando clave de firma...");
  const privateKey = fs.readFileSync(path.resolve('updater.key'), 'utf8').trim();
  
  // Asignamos variables de entorno para que el compilador de Tauri firme automáticamente
  process.env.TAURI_SIGNING_PRIVATE_KEY = privateKey;
  process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "testpassword123";

  console.log("🏗️ Compilando aplicación en modo de producción (Tauri build)...");
  execSync('cmd /c "npx tauri build"', { stdio: 'inherit' });

  // 6. Leer firma del zip generado
  const zipPath = path.resolve(`src-tauri/target/release/bundle/nsis/DestinyKanban_${NEW_VERSION}_x64-setup.nsis.zip`);
  const sigPath = `${zipPath}.sig`;
  
  if (!fs.existsSync(sigPath)) {
    throw new Error(`No se encontró el archivo de firma en: ${sigPath}`);
  }

  console.log("🔏 Leyendo firma digital...");
  const signature = fs.readFileSync(sigPath, 'utf8').trim();

  // 7. Modificar update.json
  console.log("📝 Actualizando update.json...");
  const updateJsonPath = path.resolve('update.json');
  const updateJson = {
    version: NEW_VERSION,
    notes: `v${NEW_VERSION}: ${CHANGELOG}`,
    pub_date: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), // formato UTC simple
    platforms: {
      "windows-x86_64": {
        signature: signature,
        url: `https://github.com/ElGlower/DestinyKanban/releases/download/v${NEW_VERSION}/DestinyKanban_${NEW_VERSION}_x64-setup.nsis.zip`
      }
    }
  };
  fs.writeFileSync(updateJsonPath, JSON.stringify(updateJson, null, 2) + '\n', 'utf8');

  // 8. Hacer git commit & push
  console.log("📦 Confirmando cambios en Git...");
  execSync('git add package.json src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/tauri.conf.json src/routes/+page.svelte update.json', { stdio: 'inherit' });
  execSync(`git commit -m "chore: release version ${NEW_VERSION}"`, { stdio: 'inherit' });
  
  console.log("⬆️ Empujando cambios a GitHub...");
  execSync('git push origin main', { stdio: 'inherit' });

  // 9. Crear release en GitHub y subir assets
  console.log("🏷️ Creando release en GitHub y subiendo instaladores...");
  
  const exePath = path.resolve(`src-tauri/target/release/bundle/nsis/DestinyKanban_${NEW_VERSION}_x64-setup.exe`);
  const msiPath = path.resolve(`src-tauri/target/release/bundle/msi/DestinyKanban_${NEW_VERSION}_x64_en-US.msi`);

  // Ejecutamos a través de CMD
  const ghCmd = `gh release create v${NEW_VERSION} "${exePath}" "${zipPath}" "${sigPath}" "${msiPath}" --title "Release v${NEW_VERSION}" --notes "v${NEW_VERSION}: ${CHANGELOG}"`;
  execSync(`cmd /c "${ghCmd}"`, { stdio: 'inherit' });

  // 10. Actualizar Firestore
  console.log("🔥 Sincronizando versión en la nube (Firestore)...");
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const cred = await signInWithEmailAndPassword(auth, "elglower@destinykanban.local", "123456");
  console.log(`🔓 Autenticado en Firebase como administrador (UID: ${cred.user.uid})`);

  const ref = doc(db, "projects", "system_config");
  await setDoc(ref, {
    latestVersion: NEW_VERSION,
    updatedAt: new Date().toISOString(),
    changelog: `v${NEW_VERSION}: ${CHANGELOG}`
  }, { merge: true });

  console.log(`\n🎉 ¡PUBLICACIÓN DE LA VERSIÓN ${NEW_VERSION} COMPLETADA CON ÉXITO!`);
  process.exit(0);

} catch (err) {
  console.error(`\n❌ ERROR durante el proceso de publicación:`, err.message || err);
  process.exit(1);
}
