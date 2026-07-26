import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyBovPzdzxh6ReFcazYtdG3aEM2_zhmqz-c",
  authDomain: "empirical-dynamo-d7c1c.firebaseapp.com",
  projectId: "empirical-dynamo-d7c1c",
  storageBucket: "empirical-dynamo-d7c1c.firebasestorage.app",
  messagingSenderId: "123652597765",
  appId: "1:123652597765:web:0ad80fc18c73408f0f146c"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-nhgivinchc-d407e5fc-36ff-4506-b45c-71631ac38d41");
