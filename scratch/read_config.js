import { initializeApp } from "firebase/app";
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
const db = getFirestore(app);

async function run() {
  try {
    const docRef = doc(db, "system", "config");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      console.log("Firestore system/config:", docSnap.data());
    } else {
      console.log("system/config document does not exist in Firestore.");
    }
  } catch (err) {
    console.error("Error reading system/config:", err);
  }

  try {
    const docRef2 = doc(db, "projects", "system_config");
    const docSnap2 = await getDoc(docRef2);
    if (docSnap2.exists()) {
      console.log("Firestore projects/system_config:", docSnap2.data());
    } else {
      console.log("projects/system_config document does not exist in Firestore.");
    }
  } catch (err) {
    console.error("Error reading projects/system_config:", err);
  }
}

run();
