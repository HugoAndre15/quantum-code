import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/router";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      fetchProfile(token);
    } else {
      setLoading(false);
    }
  }, []);

  async function fetchProfile(token) {
    try {
      const res = await fetch(`${API}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        // Try refresh before giving up
        const refreshed = await tryRefresh();
        if (!refreshed) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
        }
      }
    } catch {
      // API unreachable
    } finally {
      setLoading(false);
    }
  }

  async function tryRefresh() {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        setUser(data.user);
        return true;
      }
    } catch {
      // ignore
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
    return false;
  }

  // Wrapper around fetch that auto-refreshes on 401
  const apiFetch = useCallback(
    async (url, options = {}) => {
      const token = localStorage.getItem("accessToken");
      const headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      };
      // Only set Content-Type if not FormData (let browser set multipart boundary)
      if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = options.headers?.["Content-Type"] || "application/json";
      }
      const opts = {
        ...options,
        headers,
      };

      let res = await fetch(url, opts);

      if (res.status === 401) {
        const refreshed = await tryRefresh();
        if (refreshed) {
          const newToken = localStorage.getItem("accessToken");
          opts.headers.Authorization = `Bearer ${newToken}`;
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Identifiants incorrects");
    }

    const data = await res.json();
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    const refreshToken = localStorage.getItem("refreshToken");
    const accessToken = localStorage.getItem("accessToken");

    try {
      await fetch(`${API}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // ignore
    }

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
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
