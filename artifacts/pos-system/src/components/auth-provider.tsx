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

  const role = (user?.role as string) || "";
  const isDev = role === "developer" || user?.username === "developer";
  
  // Strict admin/manager check for system configuration and user management
  const isStrictAdmin = role === "admin" || role === "manager" || role === "مدير" || role === "general_manager" || role === "مدير عام" || role === "مدير عام الشركة" || user?.username === "admin" || isDev;
  
  // General staff check (any authenticated staff member)
  const isStaff = isStrictAdmin || ["accountant", "محاسب", "sales", "موظف مبيعات", "purchasing", "موظف مشتريات", "storekeeper", "inventory", "أمين مخزن", "hr", "شؤون موظفين", "cashier", "كاشير"].includes(role);

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
      return;
    }
    
    if (!isLoading && user) {
      const path = window.location.pathname;
      const isAdminOnlyPath = ["/users", "/audit", "/licenses", "/branches", "/currencies", "/backup-restore", "/settings", "/document-print-settings"].some(p => path.startsWith(p));
      
      if (requireDeveloper && !isDev) {
        setLocation("/dashboard");
      } else if (isAdminOnlyPath && !isStrictAdmin) {
        // Blocks non-admins from sensitive administration routes
        setLocation("/pos");
      } else if (requireAdmin && !isStaff) {
        // General protection for ERP routes
        setLocation("/pos");
      }
    }
  }, [user, isLoading, requireAdmin, requireDeveloper, isDev, isStrictAdmin, isStaff, setLocation]);

  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const isAdminOnlyPath = ["/users", "/audit", "/licenses", "/branches", "/currencies", "/backup-restore", "/settings", "/document-print-settings"].some(p => path.startsWith(p));

  const hasAccess = !isLoading && user && 
    (!requireDeveloper || isDev) && 
    (!isAdminOnlyPath || isStrictAdmin) && 
    (!requireAdmin || isStaff);

  if (!hasAccess) {
    return <PageLoader message="جاري التحقق من الصلاحيات وتجهيز بيئة العمل..." />;
  }

  return <>{children}</>;
}
