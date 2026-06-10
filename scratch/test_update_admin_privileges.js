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
    // 1. Log in as elglower
    await signInWithEmailAndPassword(auth, "elglower@destinykanban.local", "123456");
    console.log("Logged in as elglower.");

    // 2. Set canCreateTeamBoards: true on /users/elglower
    const userDocRef = doc(db, "users", "elglower");
    await setDoc(userDocRef, { canCreateTeamBoards: true }, { merge: true });
    console.log("SUCCESS: Set canCreateTeamBoards: true on /users/elglower");

    // 3. Try reading user doc to verify
    const userSnap = await getDoc(userDocRef);
    console.log("Updated user data:", userSnap.data());

    // 4. Try writing to system/config
    const docRef = doc(db, "system", "config");
    await setDoc(docRef, { latestVersion: "1.1.2" }, { merge: true });
    console.log("SUCCESS writing to system/config!");

    const docSnap = await getDoc(docRef);
    console.log("Updated system/config data:", docSnap.data());
  } catch (err) {
    console.error("Error during execution:", err);
  }
}

run();
