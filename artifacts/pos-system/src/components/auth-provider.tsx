import { createContext, useContext, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import type { User } from "@workspace/api-client-react";
import { PageLoader } from "@/components/PageLoader";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const token = localStorage.getItem("pos_token");

  const { data: user, isLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
      queryKey: getGetMeQueryKey(),
    },
  });

  useEffect(() => {
    if (!token || error) {
      localStorage.removeItem("pos_token");
      setLocation("/login");
    }
  }, [token, error, setLocation]);

  const logout = () => {
    localStorage.removeItem("pos_token");
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading: !!token && isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function ProtectedRoute({ children, requireAdmin = false, requireDeveloper = false }: { children: React.ReactNode; requireAdmin?: boolean; requireDeveloper?: boolean }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const isDev = user?.role === "developer" || user?.username === "developer";
  const isAdmin = user?.role === "admin" || user?.role === "manager" || user?.role === "مدير" || user?.username === "admin" || isDev;

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    } else if (!isLoading && user && requireDeveloper && !isDev) {
      setLocation("/dashboard");
    } else if (!isLoading && user && requireAdmin && !isAdmin) {
      setLocation("/pos");
    }
  }, [user, isLoading, requireAdmin, requireDeveloper, isDev, isAdmin, setLocation]);

  if (isLoading || !user || (requireDeveloper && !isDev) || (requireAdmin && !isAdmin)) {
    return <PageLoader message="جاري التحقق من الصلاحيات وتجهيز بيئة العمل..." />;
  }

  return <>{children}</>;
}
