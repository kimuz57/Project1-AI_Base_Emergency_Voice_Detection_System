"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/stores/userStore";

export function useAuth(requireAuth: boolean = true) {
  const { isAuthenticated, loadToken, user, token } = useUserStore();
  const router = useRouter();

  useEffect(() => {
    loadToken();
  }, [loadToken]);

  useEffect(() => {
    if (requireAuth && !isAuthenticated) {
      // Check localStorage directly too (for first load)
      const storedToken = localStorage.getItem("guardian_token");
      if (!storedToken) {
        router.replace("/login");
      }
    }
  }, [isAuthenticated, requireAuth, router]);

  return { isAuthenticated, user, token };
}
