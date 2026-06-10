import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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

import { createUserWithEmailAndPassword } from "firebase/auth";

async function run() {
  try {
    const username = "cestart";
    const password = "eseweculaiookbruh";
    const email = `${username}@destinykanban.local`;
    
    // Log in or sign up
    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Logged in successfully.");
    } catch (authError) {
      if (authError.code === "auth/invalid-credential" || authError.code === "auth/user-not-found") {
        console.log("User not found or invalid. Attempting to create user...");
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("User created successfully.");
      } else {
        throw authError;
      }
    }

    // Try reading system/config
    const docRef1 = doc(db, "system", "config");
    const docSnap1 = await getDoc(docRef1);
    console.log("system/config exists:", docSnap1.exists(), docSnap1.data());

    // Try reading projects/system_config
    const docRef2 = doc(db, "projects", "system_config");
    const docSnap2 = await getDoc(docRef2);
    console.log("projects/system_config exists:", docSnap2.exists(), docSnap2.data());
  } catch (err) {
    console.error("Error during run:", err);
  }
}

run();
