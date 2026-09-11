import { createContext, useContext, useState, ReactNode } from "react";
import { User } from "../types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  setSession: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): User | null {
  try {
    const savedUser = localStorage.getItem("khetchain_user");
    return savedUser ? (JSON.parse(savedUser) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Read from localStorage synchronously during the first render (lazy
  // initializer) rather than in a useEffect. Otherwise a ProtectedRoute
  // mounted on the same initial render sees `user === null` and redirects
  // to /login before the effect has a chance to hydrate the real session --
  // so a hard refresh or direct link to a dashboard route always bounced to
  // login, even with a valid saved session.
  const [user, setUser] = useState<User | null>(readStoredUser);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("khetchain_token"));

  const setSession = (newToken: string, newUser: User) => {
    localStorage.setItem("khetchain_token", newToken);
    localStorage.setItem("khetchain_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("khetchain_token");
    localStorage.removeItem("khetchain_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
