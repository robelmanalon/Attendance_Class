import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthChange } from '../firebase/auth';
import { getUser } from '../services/userService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (fbUser) => {
      if (fbUser) {
        setUser(fbUser);
        try {
          const prof = await getUser(fbUser.uid);
          setProfile(prof || { uid: fbUser.uid, name: fbUser.displayName, email: fbUser.email });
        } catch (err) {
          console.error('Error loading profile', err);
          setProfile({ uid: fbUser.uid, name: fbUser.displayName, email: fbUser.email });
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return <AuthContext.Provider value={{ user, profile, setProfile, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}