import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { useLogout, useGetSettings } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import {
  LogOut,
  LayoutDashboard,
  Package,
  Tags,
  Receipt,
  Users,
  UserCircle,
  BarChart3,
  Settings,
  FileText,
  UserCheck,
  RotateCcw,
  Calculator,
  KeyRound,
  Utensils,
  Clock,
  Truck,
  Wallet,
  Coins,
  Building2,
  Palette,
  Cpu,
  ShieldCheck,
  Boxes,
  ShoppingBag,
  ChevronDown,
  ChevronLeft,
  Database,
  DollarSign,
  ClipboardList,
  FileCheck,
  ListTodo,
  AlertTriangle,
  Lock,
  BookOpen,
  HelpCircle,
  ShieldAlert,
  MapPin,
  X,
  TrendingUp,
  UserPlus,
  Scale,
  Landmark,
  FileSpreadsheet,
  Calendar,
  Sparkles,
  Warehouse,
  Printer,
  Layers,
  Trash2,
  Link2,
  Plus,
  RefreshCw,
  Plane,
  Globe,
  Ticket,
  Luggage,
  Hotel,
  Compass,
  Bus,
  Search,
  Bell,
  Terminal,
  MessageSquare,
  CreditCard,
  FileCheck2,
  Radio,
  Percent,
  QrCode
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppIcon } from "./AppLogo";
import { TravelGlobalSearch } from "./travel-global-search";

interface SystemTask {
  name: string;
  href?: string;
  isAction?: "change_password";
  icon: any;
  highlight?: boolean;
}

interface SystemModule {
  id: string;
  title: string;
  icon: any;
  systemKey: string;
  items: SystemTask[];
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { data: settings } = useGetSettings();
  const logoutMutation = useLogout();
  const [location, setLocation] = useLocation();
  const sidebarNavRef = useRef<HTMLDivElement>(null);

  const isDeveloper = user?.role === "developer" || user?.username === "developer";
  const role = (user?.role || "admin") as string;
  const isCashier = role === "cashier" || role === "كاشير";
  const isAdminOrDev = role === "admin" || role === "developer" || user?.username === "developer" || role === "مدير";
  const isAccountant = role === "accountant" || role === "محاسب";
  const isInventory = role === "inventory" || role === "أمين مخزن";
  const isHr = role === "hr" || role === "شؤون موظفين";

  const [licenseBlockedReason, setLicenseBlockedReason] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkLicense = async () => {
      try {
        const res = await fetch("/api/license/status");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (data.blocked && !isDeveloper) {
              setLicenseBlockedReason(data.reason || "توقف الترخيص");
            } else {
              setLicenseBlockedReason(null);
            }
          }
        }
      } catch (e) {}
    };

    checkLicense();
    const interval = setInterval(checkLicense, 8000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [isDeveloper]);

  // Change Password Modal State
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);

  // Full URL State for Sidebar Active Link Matching
  const [currSearchUrl, setCurrSearchUrl] = useState(() =>
    typeof window !== "undefined" ? window.location.pathname + window.location.search : ""
  );

  useEffect(() => {
    const updateUrl = () => {
      setCurrSearchUrl(window.location.pathname + window.location.search);
    };
    updateUrl();
    window.addEventListener("popstate", updateUrl);
    return () => window.removeEventListener("popstate", updateUrl);
  }, [location]);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdError("كلمتا المرور غير متطابقتين");
      return;
    }
    if (pwdForm.newPassword.length < 4) {
      setPwdError("كلمة المرور الجديدة يجب أن تكون 4 أحرف/أرقام على الأقل");
      return;
    }

    setPwdLoading(true);
    try {
      const token = localStorage.getItem("pos_token") ?? "";
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: pwdForm.currentPassword,
          newPassword: pwdForm.newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل تغيير كلمة السر");
      }

      setPwdSuccess("تم تغيير كلمة السر بنجاح ✅");
      setPwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => {
        setChangePasswordOpen(false);
        setPwdSuccess(null);
      }, 2000);
    } catch (err: any) {
      setPwdError(err.message || "فشل تغيير كلمة السر");
    } finally {
      setPwdLoading(false);
    }
  };

  // Systems Definition matching the Travel & Tourism ERP layout and structure
  const allSystemModules: SystemModule[] = [
    {
      id: "sys_enterprise",
      title: "الأنظمة العالمية المتقدمة Enterprise Hub",
      icon: Sparkles,
      systemKey: "sys_enterprise",
      items: [
        { name: "بوابة الربط المباشر IATA NDC & AIR/MIR", href: "/travel-ndc-hub", icon: Radio, highlight: true },
        { name: "محلل وشاشة أوامر GDS Terminal & PNR", href: "/travel-gds-terminal", icon: Terminal, highlight: true },
        { name: "مجمع الفنادق ومحرك الهوامش Aggregator", href: "/travel-hotel-aggregator", icon: Building2, highlight: true },
        { name: "إدارة مقاعد التشارتر وغرف Allotments", href: "/travel-charter-allotments", icon: Layers, highlight: true },
        { name: "الفوترة الإلكترونية ZATCA & تقييم FX", href: "/travel-zatca-compliance", icon: FileCheck2, highlight: true },
        { name: "بطاقات الشركات الافتراضية Virtual Cards VCC", href: "/travel-vcc-payments", icon: CreditCard, highlight: true },
        { name: "المساعد الذكي لتخطيط البرامج Smart Itinerary", href: "/travel-smart-itinerary", icon: Sparkles, highlight: true },
        { name: "بوابة الشركات والمؤسسات B2B Portal", href: "/travel-b2b-portal", icon: Building2 },
        { name: "بوابة المسافر وتتبع التأشيرات B2C", href: "/travel-b2c-portal", icon: UserCheck },
        { name: "مطابقة فواتير الإياتا IATA BSP & ADM", href: "/travel-bsp-reconciliation", icon: Scale },
        { name: "مركز تنبيهات الواتساب WhatsApp & SMS", href: "/travel-notifications-hub", icon: MessageSquare },
        { name: "طباعة التذاكر الحرارية وبطاقات ATB", href: "/travel-atb-printing", icon: Printer }
      ]
    },
    {
      id: "sys_travel",
      title: "نظام السفريات والسياحة ERP",
      icon: Plane,
      systemKey: "sys_travel",
      items: [
        { name: "مركز العمليات والمتابعة اليومية", href: "/travel-operations", icon: Calendar, highlight: true },
        { name: "شاشة الحجز السريع الذكية Wizard", href: "/travel-wizard", icon: Sparkles, highlight: true },
        { name: "لوحة مؤشرات الإدارة والرقابة", href: "/travel-manager-dashboard", icon: BarChart3 },
        { name: "سلسلة الاعتمادات والموافقات Approvals", href: "/travel-approvals", icon: ShieldCheck },
        { name: "فروع ومكاتب السياحة Multi-Branch", href: "/travel-branches-hub", icon: Building2 },
        { name: "مهام ومتابعات موظفي السياحة", href: "/travel-tasks", icon: ListTodo },
        { name: "إدارة العملاء والشركات CRM", href: "/customers", icon: Users },
        { name: "إدارة المسافرين والجوازات Passengers", href: "/passengers", icon: Luggage },
        { name: "جوازات السفر والوثائق Document Center", href: "/travel-documents", icon: FileText },
        { name: "إعدادات السياحة وقواعد العمل Rules", href: "/travel-settings", icon: Settings }
      ]
    },
    {
      id: "sys_services",
      title: "خدمات وحجوزات السفر",
      icon: Globe,
      systemKey: "sys_services",
      items: [
        { name: "حجوزات وتذاكر الطيران Flight Tickets", href: "/travel-bookings", icon: Ticket },
        { name: "حجوزات تذاكر النقل البري والباصات", href: "/travel-bus-tickets", icon: Bus, highlight: true },
        { name: "فواتير ومردود الخدمات والاسترجاع Refunds", href: "/travel-refunds", icon: RotateCcw, highlight: true },
        { name: "تعديلات وإعادة إصدار الرحلات Modifies", href: "/travel-modifications", icon: RefreshCw },
        { name: "دليل الفنادق والمنتجعات Hotels Catalog", href: "/travel-hotels-db", icon: Building2 },
        { name: "حجوزات الفنادق Hotel Bookings", href: "/travel-hotels", icon: Hotel },
        { name: "معاملات وخدمات التأشيرات Visas", href: "/travel-visas", icon: Globe, highlight: true },
        { name: "برامج وباقات الرحلات السياحية Packages", href: "/travel-packages", icon: Compass },
        { name: "إدارة النقل واللوجستيات Logistics", href: "/travel-transport", icon: Truck },
        { name: "التأمين الصحي والسياحي Insurance", href: "/travel-insurance", icon: ShieldCheck },
        { name: "شركات الطيران والوكلاء Airlines", href: "/travel-airlines", icon: Plane },
        { name: "المطارات والوجهات الدولية Airports", href: "/travel-airports", icon: MapPin }
      ]
    },
    {
      id: "sys_sales",
      title: "المبيعات والفواتير السياحية",
      icon: TrendingUp,
      systemKey: "sys_sales",
      items: [
        { name: "الفواتير والمبيعات المركزية Invoices", href: "/travel-invoices", icon: Receipt, highlight: true },
        { name: "عروض الأسعار السياحية Quotations", href: "/travel-quotations", icon: FileText },
        { name: "إدارة العمولات والأرباح Commissions", href: "/travel-commissions", icon: Coins },
        { name: "تقرير كشف حساب المبيعات والعملاء", href: "/reports/cashier-statement", icon: FileSpreadsheet },
        { name: "مركز التقارير السياحية والتحليلية", href: "/travel-reports", icon: BarChart3 }
      ]
    },
    {
      id: "sys_purchases",
      title: "مشتريات الخدمات والموردين",
      icon: ShoppingBag,
      systemKey: "sys_purchases",
      items: [
        { name: "طلبات شراء وحجز الخدمات", href: "/travel-procurement?tab=requests", icon: ClipboardList },
        { name: "عروض أسعار الموردين والمقارنة", href: "/travel-procurement?tab=rfqs", icon: FileCheck },
        { name: "أوامر شراء الخدمات والتذاكر", href: "/travel-procurement?tab=orders", icon: ShoppingBag },
        { name: "فواتير مشتريات خطوط الطيران والفنادق", href: "/travel-procurement?tab=invoices", icon: Receipt },
        { name: "شبكة الموردين والوكلاء المعتمدين", href: "/travel-suppliers", icon: Users },
        { name: "سندات دفع الموردين والتسويات", href: "/travel-procurement?tab=payments", icon: Wallet },
        { name: "عقود الموردين وتحليلات الأسعار", href: "/travel-procurement?tab=contracts", icon: FileText },
        { name: "تقارير المشتريات السياحية", href: "/travel-procurement?tab=reports", icon: BarChart3 }
      ]
    },
    {
      id: "sys_accounting",
      title: "نظام الحسابات العامة والقيود",
      icon: Landmark,
      systemKey: "sys_accounting",
      items: [
        { name: "لوحة البيانات والمؤشرات المالية", href: "/accounting?tab=dashboard", icon: LayoutDashboard },
        { name: "شجرة الحسابات والدليل المحاسبي", href: "/accounting?tab=chart", icon: BookOpen },
        { name: "دفتر اليومية العامة والقيود الآلية", href: "/accounting?tab=journal", icon: FileText },
        { name: "سندات القبض والصرف المحاسبية", href: "/accounting?tab=vouchers", icon: Receipt },
        { name: "إدارة الصناديق والخزائن المالية", href: "/accounting?tab=safes", icon: Wallet },
        { name: "الحسابات البنكية والتحويلات", href: "/accounting?tab=banks", icon: Landmark },
        { name: "مراكز التكلفة للفروع والخدمات", href: "/accounting?tab=cost_centers", icon: Layers },
        { name: "إدارة المصروفات والمدفوعات", href: "/expenses", icon: Coins },
        { name: "إدارة الأصول الثابتة والإهلاكات", href: "/accounting?tab=assets", icon: Building2 },
        { name: "ميزان المراجعة والقوائم المالية", href: "/accounting?tab=trial_balance", icon: Scale },
        { name: "الفترات المالية والإغلاقات", href: "/accounting?tab=periods", icon: Clock },
        { name: "التقارير الحسابية والختامية", href: "/accounting?tab=reports", icon: BarChart3 }
      ]
    },
    {
      id: "sys_hr",
      title: "نظام شؤون الموظفين والوكلاء",
      icon: Users,
      systemKey: "sys_hr",
      items: [
        { name: "بيانات موظفي ومندوبي السياحة", href: "/hr?view=employees", icon: Users },
        { name: "الحضور والانصراف والورديات", href: "/hr?view=attendance", icon: Clock },
        { name: "مسير المرتبات وعمولات المبيعات", href: "/hr?view=salaries", icon: Wallet },
        { name: "سلف ومستحقات الموظفين", href: "/hr?view=loans", icon: Coins },
        { name: "الإجازات والجزاءات والعهد", href: "/hr?view=leaves", icon: FileText },
        { name: "قائمة التكويد والتهيئة للإدارات", href: "/hr?view=hr_coding_jobs", icon: ListTodo },
        { name: "تقارير ومؤشرات شؤون الموظفين", href: "/hr?view=reports_tab", icon: BarChart3 }
      ]
    },
    {
      id: "sys_admin",
      title: "إدارة وتهيئة النظام",
      icon: ShieldCheck,
      systemKey: "sys_admin",
      items: [
        { name: "إدارة المستخدمين والأذونات السياحية", href: "/users", icon: Users },
        { name: "سجل التدقيق والرقابة والأمان", href: "/audit", icon: ShieldAlert },
        { name: "العملات وأسعار الصرف المتعددة", href: "/currencies", icon: Coins },
        { name: "تصميم الترويسة والوثائق والسندات", href: "/document-print-settings", icon: Palette },
        { name: "إدارة الفروع والمواقع السياحية", href: "/branches", icon: Building2 },
        { name: "النسخ الاحتياطي واستعادة البيانات", href: "/backup-restore", icon: Database },
        ...(isDeveloper ? [{ name: "تراخيص التشغيل والتفعيل", href: "/licenses", icon: KeyRound }] : []),
        { name: "سجل الطباعة والتحكم", href: "/print-log", icon: Printer },
        { name: "إعدادات النظام العامة", href: "/settings", icon: Settings },
        { name: "🔑 تغيير كلمة السر", isAction: "change_password", icon: Lock }
      ]
    },
    {
      id: "sys_help",
      title: "المساعدة والدعم",
      icon: HelpCircle,
      systemKey: "sys_help",
      items: [
        { name: "دليل الاستخدام والتشغيل التفصيلي", href: "/system-guide", icon: BookOpen, highlight: true }
      ]
    }
  ];

  // Role-based filtering logic
  const getVisibleSystems = (): SystemModule[] => {
    if (isCashier) {
      return allSystemModules.filter((s) => ["sys_enterprise", "sys_travel", "sys_services", "sys_sales"].includes(s.id));
    }
    if (isAccountant) {
      return allSystemModules.filter((s) => ["sys_enterprise", "sys_travel", "sys_services", "sys_sales", "sys_purchases", "sys_accounting"].includes(s.id));
    }
    if (isInventory) {
      return allSystemModules.filter((s) => ["sys_services", "sys_purchases"].includes(s.id));
    }
    if (isHr) {
      return allSystemModules.filter((s) => ["sys_hr", "sys_help"].includes(s.id));
    }
    // Default (Admin / Developer / Full Manager)
    return allSystemModules;
  };

  const visibleSystems = getVisibleSystems();

  // State to track which system accordion dropdown is currently open
  const [openSystems, setOpenSystems] = useState<Record<string, boolean>>(() => {
    let saved: Record<string, boolean> = {};
    try {
      const raw = sessionStorage.getItem("admin_open_systems");
      if (raw) saved = JSON.parse(raw);
    } catch (e) {}

    const initialState: Record<string, boolean> = { ...saved };

    if (isCashier) {
      initialState["sys_sales"] = true;
    } else {
      // Auto-open active system based on route while preserving other open accordions
      if (location.startsWith("/travel-ndc") || location.startsWith("/travel-gds") || location.startsWith("/travel-hotel-aggregator") || location.startsWith("/travel-charter") || location.startsWith("/travel-zatca") || location.startsWith("/travel-vcc") || location.startsWith("/travel-smart") || location.startsWith("/travel-b2b") || location.startsWith("/travel-b2c") || location.startsWith("/travel-bsp") || location.startsWith("/travel-notifications") || location.startsWith("/travel-atb")) {
        initialState["sys_enterprise"] = true;
      } else if (location.startsWith("/travel-operations") || location.startsWith("/travel-wizard") || location.startsWith("/travel-manager") || location.startsWith("/travel-approvals") || location.startsWith("/travel-branches") || location.startsWith("/travel-tasks") || location.startsWith("/travel-documents") || location.startsWith("/travel-settings") || location.startsWith("/passengers")) {
        initialState["sys_travel"] = true;
      } else if (location.startsWith("/travel-bookings") || location.startsWith("/travel-refunds") || location.startsWith("/travel-modifications") || location.startsWith("/travel-hotels") || location.startsWith("/travel-visas") || location.startsWith("/travel-packages") || location.startsWith("/travel-transport") || location.startsWith("/travel-insurance") || location.startsWith("/travel-airlines") || location.startsWith("/travel-airports")) {
        initialState["sys_services"] = true;
      } else if (location.startsWith("/travel-invoices") || location.startsWith("/travel-quotations") || location.startsWith("/travel-commissions") || location.startsWith("/travel-reports")) {
        initialState["sys_sales"] = true;
      } else if (location.startsWith("/travel-procurement") || location.startsWith("/travel-suppliers")) {
        initialState["sys_purchases"] = true;
      } else if (location.startsWith("/pos") || location.startsWith("/orders") || location.startsWith("/tables") || location.startsWith("/shifts") || location.startsWith("/returns")) {
        initialState["sys_sales"] = true;
      } else if (location.startsWith("/accounting") || location.startsWith("/customers") || location.startsWith("/expenses")) {
        initialState["sys_accounting"] = true;
      } else if (location.startsWith("/products") || location.startsWith("/categories") || location.startsWith("/inventory")) {
        initialState["sys_inventory"] = true;
      } else if (location.startsWith("/suppliers") || location.startsWith("/purchases")) {
        initialState["sys_purchases"] = true;
      } else if (location.startsWith("/hr")) {
        initialState["sys_hr"] = true;
      } else if (location.startsWith("/users") || location.startsWith("/audit") || location.startsWith("/licenses")) {
        initialState["sys_admin"] = true;
      } else if (location.startsWith("/onyx-erp") || location.startsWith("/settings") || location.startsWith("/currencies") || location.startsWith("/document-print-settings") || location.startsWith("/system-guide")) {
        initialState["sys_config"] = true;
      } else {
        if (Object.keys(initialState).length === 0) {
          initialState["sys_sales"] = true;
        }
      }
    }
    return initialState;
  });

  useEffect(() => {
    try {
      sessionStorage.setItem("admin_open_systems", JSON.stringify(openSystems));
    } catch (e) {}
  }, [openSystems]);

  const toggleSystem = (sysId: string) => {
    saveScrollState();
    setOpenSystems((prev) => {
      const next = { ...prev, [sysId]: !prev[sysId] };
      try {
        sessionStorage.setItem("admin_open_systems", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const handleSidebarScroll = () => {
    if (sidebarNavRef.current) {
      sessionStorage.setItem("admin_sidebar_scroll", String(sidebarNavRef.current.scrollTop));
    }
  };

  const saveScrollState = () => {
    if (sidebarNavRef.current) {
      sessionStorage.setItem("admin_sidebar_scroll", String(sidebarNavRef.current.scrollTop));
    }
  };

  useLayoutEffect(() => {
    const restoreScroll = () => {
      const savedScroll = sessionStorage.getItem("admin_sidebar_scroll");
      if (savedScroll !== null && sidebarNavRef.current) {
        sidebarNavRef.current.scrollTop = Number(savedScroll);
      }
    };

    restoreScroll();
    const timer = setTimeout(restoreScroll, 0);
    const raf = requestAnimationFrame(restoreScroll);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [location, openSystems]);

  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);

  // Keyboard shortcut Ctrl+K for Global Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setGlobalSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem("pos_token");
        window.location.href = "/login";
      }
    });
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden" dir="rtl">
      {/* Global Search Dialog */}
      <TravelGlobalSearch open={globalSearchOpen} onOpenChange={setGlobalSearchOpen} />

      {/* Sidebar Navigation */}
      <aside className="w-72 bg-slate-950 text-slate-100 flex flex-col border-l border-slate-800 shadow-xl shrink-0">
        {/* Top Header Branding */}
        <div className="h-16 flex items-center justify-between border-b border-slate-800/80 px-4 bg-slate-900/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl border border-amber-500/30 overflow-hidden flex items-center justify-center bg-white p-0.5 shadow-md shrink-0">
              <AppIcon className="w-full h-full object-contain" />
            </div>
            <div className="overflow-hidden min-w-0">
              <h1 className="text-sm font-black text-white leading-tight truncate">
                OmniFly Pro
              </h1>
              <span className="text-[10px] text-amber-400 font-bold tracking-tight block truncate">
                نظام إدارة الطيران والسفريات والمؤسسات
              </span>
            </div>
          </div>
        </div>

        {/* Quick Link to Dashboard if admin/dev */}
        {isAdminOrDev && (
          <div className="p-2 border-b border-slate-800/60 bg-slate-900/40">
            <Link href="/dashboard" onClick={saveScrollState}>
              <div className={cn(
                "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border",
                location === "/dashboard"
                  ? "bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md"
                  : "bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-800 hover:border-slate-700"
              )}>
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-amber-400" />
                  <span>لوحة القيادة والمؤشرات</span>
                </div>
                <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
              </div>
            </Link>
          </div>
        )}

        {/* Sidebar System List - Matched with Image */}
        <div ref={sidebarNavRef} onScroll={handleSidebarScroll} className="flex-1 py-3 px-3 overflow-y-auto space-y-2.5 scrollbar-thin">
          {visibleSystems.map((sys) => {
            const SysIcon = sys.icon;
            const isOpen = !!openSystems[sys.id];

            return (
              <div key={sys.id} className="space-y-1.5">
                {/* Main System Button (Matching Image Style) */}
                <div
                  onClick={() => toggleSystem(sys.id)}
                  className={cn(
                    "relative w-full overflow-hidden rounded-2xl p-2.5 flex items-center justify-between cursor-pointer transition-all duration-200 shadow-md border group select-none",
                    isOpen
                      ? "bg-slate-900 border-blue-500/80 ring-1 ring-blue-500/50 shadow-lg"
                      : "bg-slate-900/90 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700"
                  )}
                >
                  {/* Blue Accent Trim / Flag on right edge (Matching photo design) */}
                  <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 rounded-r-2xl shadow-xs"></div>

                  <div className="flex items-center gap-3 pr-2.5 overflow-hidden">
                    {/* Blue Circular Icon Frame */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 border-2 border-white/90 flex items-center justify-center text-white shadow-md shrink-0 group-hover:scale-105 transition-transform">
                      <SysIcon className="w-4 h-4 text-white stroke-[2.4]" />
                    </div>

                    {/* System Name Title */}
                    <span className="text-sm font-extrabold text-white group-hover:text-amber-300 transition-colors truncate tracking-wide">
                      {sys.title}
                    </span>
                  </div>

                  {/* Expand Chevron Icon */}
                  <div className="flex items-center gap-1 shrink-0 pl-1">
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-blue-400 font-bold transition-transform" />
                    ) : (
                      <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                    )}
                  </div>
                </div>

                {/* Submenu Dropdown List of Tasks & Operations */}
                {isOpen && (
                  <div className="mr-3 pl-1 pr-3 my-1 space-y-1 border-r-2 border-blue-500/60 animate-in fade-in slide-in-from-top-1 duration-200">
                    {sys.items.map((item, idx) => {
                      if (item.isAction === "change_password") {
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              saveScrollState();
                              setChangePasswordOpen(true);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 border border-amber-500/30 transition-all text-right cursor-pointer my-1 shadow-xs"
                          >
                            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="truncate">{item.name}</span>
                          </button>
                        );
                      }

                      const ItemIcon = item.icon;
                      const isActive = item.href ? (
                        currSearchUrl === item.href ||
                        (item.href.includes("?tab=") && currSearchUrl === item.href) ||
                        (!item.href.includes("?") && location === item.href)
                      ) : false;

                      return (
                        <Link key={idx} href={item.href || "#"} onClick={() => {
                          saveScrollState();
                          if (item.href) {
                            window.history.pushState({}, "", item.href);
                            window.dispatchEvent(new Event("popstate"));
                          }
                        }}>
                          <div className={cn(
                            "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer group",
                            isActive
                              ? "bg-blue-600 text-white font-black shadow-md border border-blue-400/50"
                              : item.highlight
                              ? "bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/20"
                              : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                          )}>
                            <div className="flex items-center gap-2 overflow-hidden">
                              <ItemIcon className={cn("w-3.5 h-3.5 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-blue-400/80")} />
                              <span className="truncate">{item.name}</span>
                            </div>
                            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0"></span>}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Logged in User Profile Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/80 shrink-0 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-amber-600 text-white flex items-center justify-center font-black text-sm shadow-md border border-white/20">
              {user?.name ? user.name.charAt(0) : "م"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-extrabold text-white truncate">{user?.name || "مستخدم النظام"}</p>
              <p className="text-[10px] text-slate-400 truncate">
                {isDeveloper ? "مطور ومبرمج النظام 💻" : isAdminOrDev ? "مدير النظام العام 👑" : isCashier ? "كاشير مبيعات 🛒" : isAccountant ? "محاسب مالي 📊" : "مستخدم النظام"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              onClick={() => setChangePasswordOpen(true)}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] text-amber-400 hover:bg-amber-500/15 rounded-xl transition-colors font-bold border border-amber-500/30"
              title="تغيير كلمة السر"
            >
              <Lock className="w-3 h-3" />
              <span>كلمة السر</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] text-blue-400 hover:bg-blue-500/15 rounded-xl transition-colors font-bold border border-blue-500/30"
            >
              <LogOut className="w-3 h-3" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        {/* Top Header Bar with Global Search & Branch Switcher */}
        <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shadow-xs shrink-0 print:hidden z-10">
          <div className="flex items-center gap-3">
            {/* Global Search Button */}
            <button
              type="button"
              onClick={() => setGlobalSearchOpen(true)}
              className="flex items-center gap-2.5 bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-xs transition-colors shadow-xs group w-56 sm:w-72"
            >
              <Search className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
              <span className="truncate flex-1 text-right text-slate-500">بحث شامل في السفريات والعملاء...</span>
              <kbd className="hidden sm:inline-block bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-500 shadow-xs">
                Ctrl+K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Branch Switcher Pill */}
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-900 px-2.5 py-1 rounded-lg text-xs font-semibold">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{settings?.businessName || "فرع الرياض الرئيسي"}</span>
            </div>

            {/* Quick Reports Link */}
            <Link href="/travel-reports">
              <div className="hidden md:flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer">
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                <span>مركز التقارير</span>
              </div>
            </Link>

            {/* Notification Bell */}
            <Link href="/travel-dashboard">
              <button
                type="button"
                className="relative p-2 text-slate-600 hover:text-primary hover:bg-slate-100 rounded-xl transition-colors"
                title="التنبيهات والإشعارات"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              </button>
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </div>
      </main>

      {/* Change Password Modal */}
      {changePasswordOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 dir-rtl">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center border border-red-500/30">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">تغيير كلمة السر</h3>
                  <p className="text-[11px] text-slate-400">تحديث كلمة المرور الخاصة بحسابك في النظام</p>
                </div>
              </div>
              <button 
                onClick={() => { setChangePasswordOpen(false); setPwdError(null); setPwdSuccess(null); }}
                className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {pwdError && (
              <div className="p-3 bg-red-500/15 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold">
                {pwdError}
              </div>
            )}

            {pwdSuccess && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold">
                {pwdSuccess}
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">كلمة المرور الحالية</label>
                <input
                  type="password"
                  required
                  value={pwdForm.currentPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  placeholder="أدخل كلمة المرور الحالية"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">كلمة المرور الجديدة</label>
                <input
                  type="password"
                  required
                  value={pwdForm.newPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  placeholder="أدخل كلمة المرور الجديدة"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">تأكيد كلمة المرور الجديدة</label>
                <input
                  type="password"
                  required
                  value={pwdForm.confirmPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  placeholder="أعد إدخال كلمة المرور الجديدة"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setChangePasswordOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors shadow-md disabled:opacity-50"
                >
                  {pwdLoading ? "جاري الحفظ..." : "حفظ كلمة السر الجديدة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global License Kill Switch Lock Overlay */}
      {licenseBlockedReason && !isDeveloper && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-500/50 text-white rounded-3xl p-8 max-w-lg w-full text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300 dir-rtl">
            <div className="w-20 h-20 bg-red-500/20 text-red-500 border-2 border-red-500/40 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-10 h-10 animate-bounce" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-black rounded-full uppercase tracking-widest">
                توقف النظام بالكامل 🔒
              </span>
              <h2 className="text-2xl font-black text-white pt-2">تم تجميد وإيقاف عمل النظام</h2>
              <p className="text-sm text-slate-200 bg-slate-800/90 p-4 rounded-xl border border-slate-700 leading-relaxed font-semibold">
                {licenseBlockedReason}
              </p>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-300 space-y-1.5 text-right">
              <p className="font-bold flex items-center gap-1.5 text-amber-400">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                تنبيه هام من إدارة النظام (إتقان سوفت):
              </p>
              <p className="text-slate-300 leading-relaxed">
                قام المطور بإضافة أو تعديل فترة الترخيص وحالته بالانتهاء أو التوقف. لا يمكن للعميل أو المستثمر استخدام الشاشات والوظائف إلا بعد قيام المطور بتعديل الترخيص مجدداً.
              </p>
            </div>

            <div className="pt-2 space-y-3">
              <button
                onClick={handleLogout}
                className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                تسجيل الدخول بحساب المطور لتحديث الترخيص
              </button>

              <div className="text-xs text-slate-400 font-mono flex items-center justify-center gap-2 pt-1">
                <span>للدعم الفني وتحديث التراخيص:</span>
                <a href="tel:777146387" className="text-amber-400 hover:underline font-bold dir-ltr inline-block">777146387</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
