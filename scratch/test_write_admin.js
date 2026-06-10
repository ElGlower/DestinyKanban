import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

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
    console.log("Logged in UID:", cred.user.uid);
    console.log("Expected UID:", "qh6GuyNal1PAvSpWQXmpUpJf4zb2");
    
    // Check if we can read system/config
    const docRef = doc(db, "system", "config");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      console.log("system/config data:", docSnap.data());
    } else {
      console.log("system/config does not exist");
    }
    
    // Try to write to system/config
    await setDoc(docRef, { latestVersion: "1.1.1" }, { merge: true });
    console.log("SUCCESS writing to system/config!");
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
