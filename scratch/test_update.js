import { initializeApp } from "firebase/app";
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
const db = getFirestore(app);

async function run() {
  try {
    const docRef = doc(db, "system", "config");
    await setDoc(docRef, { latestVersion: "1.0.8" }, { merge: true });
    console.log("SUCCESS: Firestore system/config updated to 1.0.8");
  } catch (err) {
    console.error("FAILED to update Firestore:", err);
  }
}

run();
