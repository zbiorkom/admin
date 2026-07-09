import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { me as fetchMe, logout as apiLogout } from "../api/auth";

type Status = "loading" | "authed" | "anon";

interface AuthState {
  status: Status;
  username: string | null;
  /** Call after a successful login/verify to flip into the panel. */
  onAuthenticated: (username: string) => void;
  /** Re-check the session against the server. */
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [username, setUsername] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetchMe();
      if (res) {
        setUsername(res.username);
        setStatus("authed");
      } else {
        setUsername(null);
        setStatus("anon");
      }
    } catch {
      // Network error → treat as anonymous so the login screen shows.
      setUsername(null);
      setStatus("anon");
    }
  }, []);

  const onAuthenticated = useCallback((name: string) => {
    setUsername(name);
    setStatus("authed");
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setUsername(null);
      setStatus("anon");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider
      value={{ status, username, onAuthenticated, refresh, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
