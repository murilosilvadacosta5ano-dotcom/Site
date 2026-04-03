import { initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyDbyIdIQ3ksNG9nArdS-j2iV4OGj6anxDw",
  authDomain: "kaise-studios-8c83c.firebaseapp.com",
  projectId: "kaise-studios-8c83c",
  storageBucket: "kaise-studios-8c83c.firebasestorage.app",
  messagingSenderId: "963755321704",
  appId: "1:963755321704:web:7ae30f32d9fb9825f38edd"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const provider = new GoogleAuthProvider()
