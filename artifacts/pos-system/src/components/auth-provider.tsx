import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@workspace/api-client-react";
import { PageLoader } from "@/components/PageLoader";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (token: string, user?: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("pos_token") || localStorage.getItem("pos_token");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(getStoredToken);
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
      queryKey: getGetMeQueryKey(),
    },
  });

  useEffect(() => {
    // If the server returns an explicit authentication error (401/403)
    if (error && token) {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("pos_token");
        localStorage.removeItem("pos_token");
      }
      setToken(null);
      queryClient.setQueryData(getGetMeQueryKey(), null);
      if (location !== "/login") {
        setLocation("/login");
      }
    }
  }, [error, token, location, setLocation, queryClient]);

  const login = (newToken: string, newUser?: User) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pos_token", newToken);
      localStorage.setItem("pos_token", newToken);
    }
    setToken(newToken);
    if (newUser) {
      queryClient.setQueryData(getGetMeQueryKey(), newUser);
    }
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("pos_token");
      localStorage.removeItem("pos_token");
    }
    setToken(null);
    queryClient.setQueryData(getGetMeQueryKey(), null);
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading: !!token && isLoading, login, logout }}>
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

  const role = (user?.role as string) || "";
  const isDev = role === "developer" || user?.username?.toLowerCase() === "developer";
  
  // Strict admin/manager check for system configuration and user management
  const isStrictAdmin = role === "admin" || role === "manager" || role === "مدير" || role === "general_manager" || role === "مدير عام" || role === "مدير عام الشركة" || user?.username === "admin" || isDev;
  
  // General staff check (any authenticated staff member)
  const isStaff = isStrictAdmin || ["accountant", "محاسب", "sales", "موظف مبيعات", "purchasing", "موظف مشتريات", "storekeeper", "inventory", "أمين مخزن", "hr", "شؤون موظفين", "cashier", "كاشير"].includes(role);

  const storedToken = getStoredToken();

  useEffect(() => {
    if (!storedToken && !isLoading) {
      setLocation("/login");
      return;
    }
    
    if (!isLoading && user) {
      const path = typeof window !== "undefined" ? window.location.pathname : "";
      const isAdminOnlyPath = ["/users", "/audit", "/licenses", "/branches", "/currencies", "/backup-restore", "/settings", "/document-print-settings"].some(p => path.startsWith(p));
      
      if (requireDeveloper && !isDev) {
        setLocation("/travel-dashboard");
      } else if (isAdminOnlyPath && !isStrictAdmin) {
        // Blocks non-admins from sensitive administration routes
        setLocation("/travel-dashboard");
      } else if (requireAdmin && !isStaff) {
        // General protection for ERP routes
        setLocation("/travel-dashboard");
      }
    }
  }, [user, isLoading, storedToken, requireAdmin, requireDeveloper, isDev, isStrictAdmin, isStaff, setLocation]);

  if (!storedToken) {
    return null;
  }

  if (isLoading || !user) {
    return <PageLoader message="جاري التحقق من الصلاحيات وتجهيز بيئة العمل..." />;
  }

  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const isAdminOnlyPath = ["/users", "/audit", "/licenses", "/branches", "/currencies", "/backup-restore", "/settings", "/document-print-settings"].some(p => path.startsWith(p));

  const hasAccess = 
    (!requireDeveloper || isDev) && 
    (!isAdminOnlyPath || isStrictAdmin) && 
    (!requireAdmin || isStaff);

  if (!hasAccess) {
    return <PageLoader message="جاري التحويل للصفحة المصرحة..." />;
  }

  return <>{children}</>;
}
