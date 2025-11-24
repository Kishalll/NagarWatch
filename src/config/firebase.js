import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAjxf1Uftc1459ljOqgduQW0OtYExKbnxo",
  authDomain: "nagar-watch.firebaseapp.com",
  projectId: "nagar-watch",
  storageBucket: "nagar-watch.firebasestorage.app",
  messagingSenderId: "16955286362",
  appId: "1:16955286362:web:5292d93cdb9332e71dc963",
  measurementId: "G-J1Q14KTKGZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Export services for use in the app
export const auth = getAuth(app);
export const db = getFirestore(app);
export { analytics };
