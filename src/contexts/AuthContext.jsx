import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../firebase';
import { seedDefaultsIfNeeded } from '../services/data';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          await seedDefaultsIfNeeded(u.uid, { email: u.email, naam: u.displayName });
        } catch (e) {
          console.warn('Seed mislukt:', e?.message);
        }
      }
      setUser(u);
      setLaden(false);
    });
  }, []);

  const login = (email, ww) => signInWithEmailAndPassword(auth, email, ww);
  const logout = () => signOut(auth);
  const wachtwoordVergeten = (email) => sendPasswordResetEmail(auth, email);

  return (
    <AuthContext.Provider value={{ user, laden, login, logout, wachtwoordVergeten }}>
      {children}
    </AuthContext.Provider>
  );
}
