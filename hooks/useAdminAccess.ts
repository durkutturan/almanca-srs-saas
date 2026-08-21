"use client";

import {
  useEffect,
  useState,
} from "react";
import type { User } from "firebase/auth";

export function useAdminAccess(
  user: User | null,
) {
  const [isAdmin, setIsAdmin] =
    useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    const currentUser = user;
    let cancelled = false;

    async function check() {
      try {
        const token =
          await currentUser.getIdToken();

        const response = await fetch(
          "/api/admin?mode=check",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          },
        );

        if (!cancelled) {
          setIsAdmin(response.ok);
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
        }
      }
    }

    void check();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return isAdmin;
}