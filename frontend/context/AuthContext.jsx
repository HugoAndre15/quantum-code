import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/router";

const API = "/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const res = await fetch(`${API}/auth/profile`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else if (res.status === 401) {
        const refreshed = await tryRefresh();
        if (!refreshed) setUser(null);
      }
    } catch {
      // API unreachable
    } finally {
      setLoading(false);
    }
  }

  async function tryRefresh() {
    try {
      const res = await fetch(`${API}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        return true;
      }
    } catch {
      // ignore
    }
    setUser(null);
    return false;
  }

  // Wrapper around fetch that auto-refreshes on 401
  const apiFetch = useCallback(
    async (url, options = {}) => {
const opts = {
        ...options,
        credentials: "include",
        headers: {
          ...(!(options.body instanceof FormData) && {
            "Content-Type": options.headers?.["Content-Type"] || "application/json",
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
          router.push("/login");
        }
      }

      return res;
    },
    [router],
  );

  async function login(email, password) {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      credentials: "include",
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

  async function logout() {
    try {
      await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    }
    setUser(null);
    router.push("/login");
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
