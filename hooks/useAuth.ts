"use client";

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { auth } from "@/lib/firebase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(
    null,
  );

  const [isAuthLoading, setIsAuthLoading] =
    useState(true);

  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setIsAuthLoading(false);
      },
      (error) => {
        console.error(error);
        setAuthError(
          "Kullanıcı bilgisi alınamadı.",
        );
        setIsAuthLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  const loginWithGoogle = useCallback(
    async () => {
      setAuthError("");

      try {
        const provider =
          new GoogleAuthProvider();

        provider.setCustomParameters({
          prompt: "select_account",
        });

        await signInWithPopup(auth, provider);
      } catch (error) {
        console.error(error);

        setAuthError(
          "Google ile giriş yapılamadı.",
        );
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    setAuthError("");

    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);

      setAuthError(
        "Çıkış yapılırken hata oluştu.",
      );
    }
  }, []);

  return {
    user,
    isAuthLoading,
    authError,
    loginWithGoogle,
    logout,
  };
}