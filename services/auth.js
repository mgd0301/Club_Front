// src/services/auth.js
import { auth, googleProvider } from '../firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  updateProfile,
  signInWithCredential,
  GoogleAuthProvider
} from 'firebase/auth';

import { Capacitor } from '@capacitor/core';
import { CapacitorGoogleAuth } from '@codetrix-studio/capacitor-google-auth';

// Inicializar Google Auth solo en plataforma nativa
if (Capacitor.isNativePlatform()) {
  CapacitorGoogleAuth.initialize({
    scopes: ['profile', 'email'],
    serverClientId: '980458107767-6ai6lkhvpd3v5ivccm0ppd26906gqf1i.apps.googleusercontent.com',
    forceCodeForRefreshToken: true,
    appWebViewScheme: 'com.googleusercontent.apps.980458107767-9einklqom7v9nn3nm3gmqhonv5rtgg75'
  });
}

// Login con email y contraseña
export const loginWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('Login con email OK:', userCredential.user.email);
    return userCredential.user;
  } catch (error) {
    console.error('Error login con email:', error);
    throw error;
  }
};

// Registro con email, contraseña y username
export const registerWithEmail = async (email, password, username) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: username });
    console.log('Registro OK:', userCredential.user.email);
    return userCredential.user;
  } catch (error) {
    console.error('Error registro con email:', error);
    throw error;
  }
};


// Login con Google híbrido (web + Capacitor)
export const loginWithGoogle = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        // 🚀 Android / iOS vía Capacitor
        const result = await CapacitorGoogleAuth.signIn();
        
        // 👇 Nuevo: Usar el token para autenticarse en Firebase
        const credential = GoogleAuthProvider.credential(result.authentication.idToken);
        const firebaseUser = await signInWithCredential(auth, credential);
  
        console.log('Login con Google Capacitor y Firebase OK:', firebaseUser.user.email);
        return firebaseUser.user;
      } else {
        // Web
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult && redirectResult.user) {
          console.log('Login con Google Web OK:', redirectResult.user.email);
          return redirectResult.user;
        }
        // Si no hay resultado previo, inicia redirect
        await signInWithRedirect(auth, googleProvider);
        return null;
      }
    } catch (error) {
      console.error('Error login con Google:', error);
      throw error;
    }
  };



// Login con Google híbrido (web + Capacitor)
//export const loginWithGoogle = async () => {
 // try {
   // if (Capacitor.isNativePlatform()) {
      // Android / iOS vía Capacitor
    //  const result = await CapacitorGoogleAuth.signIn();
     // console.log('Login con Google Capacitor OK:', result.email);
      //return result;
    //} else {
      // Web
 //     const redirectResult = await getRedirectResult(auth);
 //     if (redirectResult && redirectResult.user) {
 //       console.log('Login con Google Web OK:', redirectResult.user.email);
 //       return redirectResult.user;
  //    }
      // Si no hay resultado previo, inicia redirect
  //    await signInWithRedirect(auth, googleProvider);
  //    return null;
  //  }
  //} catch (error) {
  //  console.error('Error login con Google:', error);
  //  throw error;
  //}
//};
