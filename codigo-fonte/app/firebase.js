// Configuração web do Firebase: é pública por natureza. Quem protege os dados é o firestore.rules.
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: 'AIzaSyCVnu10g7jvTsEd2tEZk1hxFb9oWCoe9cQ',
  authDomain: 'qualidadedoar-mt.firebaseapp.com',
  projectId: 'qualidadedoar-mt',
  storageBucket: 'qualidadedoar-mt.firebasestorage.app',
  messagingSenderId: '971294997959',
  appId: '1:971294997959:web:e8ff34be47bf7d7d6c6de2'
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
