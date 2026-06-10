import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCfzq2_PfLSyhG5cRZz4KtYr-Kd29FPLMM",
  authDomain: "destinykanban.firebaseapp.com",
  projectId: "destinykanban",
  storageBucket: "destinykanban.firebasestorage.app",
  messagingSenderId: "697873311825",
  appId: "1:697873311825:web:f3a6944f55d592e6ccf070",
  measurementId: "G-8NQKJPTZDW"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  try {
    const cred = await signInWithEmailAndPassword(auth, "elglower@destinykanban.local", "123456");
    console.log("Login OK:", cred.user.uid);

    const ref = doc(db, "projects", "system_config");
    await setDoc(ref, {
      latestVersion: "1.1.3",
      updatedAt: new Date().toISOString(),
      changelog: "v1.1.3: Rediseno header glassmorphism + grid responsivo + menu desplegable. Fix: imagen de fondo personalizada se guarda correctamente."
    }, { merge: true });

    console.log("✅ VERSION 1.1.3 SUBIDA A FIREBASE CORRECTAMENTE");
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
  process.exit(0);
}

run();
