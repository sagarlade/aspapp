
// src/components/auth-provider.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  userRole: 'admin' | 'teacher' | null;
  loading: boolean;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  loading: true,
  logout: async () => {},
  refetchUser: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<AuthContextType['userRole']>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = useCallback(async (uid: string) => {
    const userDocRef = doc(db, "users", uid);
    try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            setUserRole(docSnap.data().role || 'teacher');
        } else {
            // Default to teacher if no specific role is found
            setUserRole('teacher');
        }
    } catch(error) {
        console.error("Error fetching user role:", error);
        setUserRole('teacher'); // Default on error
    }
  }, []);
  
  const refetchUser = useCallback(async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
          await fetchUserRole(currentUser.uid);
      }
  }, [fetchUserRole]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        await fetchUserRole(user.uid);
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchUserRole]);
  
  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, userRole, loading, logout, refetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
