import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

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
    await signInWithEmailAndPassword(auth, "elglower@destinykanban.local", "123456");
    console.log("Logged in.");
    
    const docRef = doc(db, "projects", "system_config");
    await setDoc(docRef, { 
      id: "system_config",
      owner: "elglower",
      latestVersion: "1.1.1",
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    console.log("SUCCESS writing projects/system_config!");
    
    const docSnap = await getDoc(docRef);
    console.log("Read projects/system_config data:", docSnap.data());
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
