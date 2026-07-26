import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { app, db } from './firebase-config';

export { db };
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const email = result.user.email;
    
    // Check if email ends with cantho.edu.vn
    if (!email?.endsWith('@cantho.edu.vn') && email !== 'legiang299115@gmail.com') {
      await signOut(auth);
      throw new Error('Chỉ tài khoản email thuộc tên miền @cantho.edu.vn mới được phép đăng nhập. Vui lòng đăng nhập lại với tài khoản khác.');
    }
    
    return result.user;
  } catch (error) {
    throw error;
  }
};

export const logout = () => signOut(auth);
