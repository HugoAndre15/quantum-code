"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "next/navigation";

const API = "/api";

interface User {
  id: string;
  email: string;
  name?: string;
  role: "ADMIN" | "SUPER_ADMIN";
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshPromise = useRef<Promise<boolean> | null>(null);
  const router = useRouter();

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        return true;
      }
    } catch {
      // The session will be treated as expired below.
    }
    setUser(null);
    return false;
  }, []);

  const tryRefresh = useCallback((): Promise<boolean> => {
    if (!refreshPromise.current) {
      refreshPromise.current = refreshSession().finally(() => {
        refreshPromise.current = null;
      });
    }
    return refreshPromise.current;
  }, [refreshSession]);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API}/auth/profile`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else if (res.status === 401) {
        await tryRefresh();
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [tryRefresh]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const apiFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const body = options.body;
      const opts: RequestInit = {
        ...options,
        credentials: "include",
        cache: options.cache ?? "no-store",
        headers: {
          ...(!(body instanceof FormData) && {
            "Content-Type": "application/json",
          }),
          ...options.headers,
        },
      };

      let res = await fetch(url, opts);

      if (res.status === 401) {
        const refreshed = await tryRefresh();
        if (refreshed) {
          res = await fetch(url, opts);
        } else {
          const requestedPath =
            typeof window === "undefined"
              ? "/admin"
              : `${window.location.pathname}${window.location.search}`;
          router.replace(
            `/login?next=${encodeURIComponent(requestedPath)}`,
          );
        }
      }

      return res;
    },
    [router, tryRefresh],
  );

  async function login(email: string, password: string): Promise<User> {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Identifiants incorrects");
    }

    const data = await res.json();
    setUser(data.user);
    return data.user;
  }

  async function logout(): Promise<void> {
    try {
      await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    }
    setUser(null);
    router.replace("/login");
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
