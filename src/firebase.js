import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBcPzV1wHEzAUrzpGJYWM9mgN7F_J3zx88",
  authDomain: "fulbito-51409.firebaseapp.com",
  projectId: "fulbito-51409",
  storageBucket: "fulbito-51409.appspot.com",
  messagingSenderId: "980458107767",
  appId: "1:980458107767:web:fa94f2e16cfe6ff25f2772"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { auth, googleProvider };
