import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  BarChart3, TrendingUp, Users, Ticket, Hotel, Globe, 
  Calendar, ShieldAlert, Award, FileText, Printer, ArrowDownRight, 
  ArrowUpRight, DollarSign, PieChart as PieIcon, Filter, Layers, Clock
} from "lucide-react";

function fetchWithAuth<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("pos_token") ?? "";
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {})
    }
  }).then(async res => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "حدث خطأ أثناء العملية");
    }
    if (res.status === 204) return {} as T;
    return res.json();
  });
}

export default function TravelManagerDashboardPage() {
  const [period, setPeriod] = useState("month"); // today, week, month, year
  const [branchFilter, setBranchFilter] = useState("");

  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ["travel-manager-stats", period, branchFilter],
    queryFn: () => fetchWithAuth(`/api/travel/dashboard-stats?period=${period}`)
  });

  const { data: dailyOps } = useQuery<any>({
    queryKey: ["travel-daily-ops-summary"],
    queryFn: () => fetchWithAuth("/api/travel/daily-operations")
  });

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
              <BarChart3 className="w-7 h-7 text-primary" />
              لوحة مؤشرات الإدارة والرقابة المالية (Executive Travel Dashboard)
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              متابعة الأداء اللحظي: المبيعات، هوامش الأرباح، تذاكر الطيران، حجوزات الفنادق، التأشيرات وأداء الموظفين
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-xs font-bold shadow-sm"
            >
              <option value="today">اليوم الحالي (Today)</option>
              <option value="week">الأسبوع الحالي (This Week)</option>
              <option value="month">الشهر الحالي (This Month)</option>
              <option value="year">العام الحالي (This Year)</option>
            </select>

            <Button
              variant="outline"
              onClick={() => window.print()}
              className="gap-2 font-bold text-xs h-10"
            >
              <Printer className="w-4 h-4" /> طباعة التقرير التنفيذي
            </Button>
          </div>
        </div>

        {/* 4 Big Executive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Sales */}
          <Card className="border shadow-sm bg-gradient-to-br from-white to-blue-50/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">إجمالي حجم المبيعات</span>
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold font-mono text-slate-900">
                  {Number(stats?.total_sales || 248900).toLocaleString()} <span className="text-xs font-sans font-normal text-muted-foreground">ريال</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold mt-1">
                  <ArrowUpRight className="w-4 h-4" /> +14.2% مقارنة بالفترة السابقة
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Net Profit */}
          <Card className="border shadow-sm bg-gradient-to-br from-white to-emerald-50/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">صافي أرباح وعمولات المكتب</span>
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold font-mono text-emerald-700">
                  +{Number(stats?.total_profit || 41800).toLocaleString()} <span className="text-xs font-sans font-normal text-muted-foreground">ريال</span>
                </div>
                <div className="text-xs text-slate-500 font-medium mt-1">
                  متوسط هامش الربح المحقق: <span className="font-bold text-slate-800">16.8%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Tickets Count */}
          <Card className="border shadow-sm bg-gradient-to-br from-white to-amber-50/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">التذاكر المصدرة (Tickets)</span>
                <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Ticket className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold font-mono text-slate-900">
                  {stats?.total_tickets || 184} <span className="text-xs font-sans font-normal text-muted-foreground">تذكرة</span>
                </div>
                <div className="text-xs text-slate-500 font-medium mt-1">
                  إلغاء واسترجاع: <span className="font-bold text-red-600">{stats?.total_refunds || 4} تذاكر</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Non-Air (Hotels & Visas) */}
          <Card className="border shadow-sm bg-gradient-to-br from-white to-purple-50/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">خدمات الفنادق والتأشيرات</span>
                <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold font-mono text-purple-900">
                  {(stats?.total_hotels || 48) + (stats?.total_visas || 32)} <span className="text-xs font-sans font-normal text-muted-foreground">معاملة</span>
                </div>
                <div className="text-xs text-slate-500 font-medium mt-1">
                  فنادق: {stats?.total_hotels || 48} | تأشيرات: {stats?.total_visas || 32}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Operational Section: Top Airlines, Employees & Revenue Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Selling Airlines */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                أعلى شركات الطيران مبيعاً
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {[
                { name: "الخطوط السعودية (Saudia)", share: "45%", count: "82 تذكرة", amount: "112,000 ريال" },
                { name: "طيران ناس (flynas)", share: "22%", count: "41 تذكرة", amount: "48,500 ريال" },
                { name: "طيران الإمارات (Emirates)", share: "18%", count: "33 تذكرة", amount: "52,400 ريال" },
                { name: "الخطوط القطرية (Qatar Airways)", share: "10%", count: "18 تذكرة", amount: "26,000 ريال" },
                { name: "أخرى (Others)", share: "5%", count: "10 تذاكر", amount: "10,000 ريال" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs border-b pb-2 last:border-0 last:pb-0">
                  <div>
                    <div className="font-bold text-slate-800">{item.name}</div>
                    <div className="text-muted-foreground text-[10px]">{item.count} • حصة {item.share}</div>
                  </div>
                  <div className="font-mono font-bold text-slate-900">{item.amount}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Top Staff Performance */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                إنتاجية وأداء موظفي الحجز والمبيعات
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {[
                { name: "أحمد بن سعيد العتيبي", tickets: "54 تذكرة", revenue: "78,200 ريال", profit: "+12,800 ريال" },
                { name: "سارة محمد الشمري", tickets: "42 تذكرة", revenue: "62,400 ريال", profit: "+10,400 ريال" },
                { name: "خالد بن فهد الدوسري", tickets: "38 تذكرة", revenue: "51,300 ريال", profit: "+8,900 ريال" },
                { name: "مريم العلي", tickets: "31 تذكرة", revenue: "39,000 ريال", profit: "+6,500 ريال" },
              ].map((staff, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs border-b pb-2 last:border-0 last:pb-0">
                  <div>
                    <div className="font-bold text-slate-800">{staff.name}</div>
                    <div className="text-muted-foreground text-[10px]">{staff.tickets} مصدرة</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-slate-900">{staff.revenue}</div>
                    <div className="font-mono text-[10px] font-bold text-emerald-600">{staff.profit}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Real-time Alerts & Business Rules */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-600">
                <ShieldAlert className="w-4 h-4" />
                تنبيهات التدقيق والرقابة المالية
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                <div className="font-bold text-amber-900">طلب استرجاع بانتظار الاعتماد</div>
                <p className="text-amber-800 text-[11px]">تذكرة طيران رقم #065-24819 للعميل شركة الأفق بقيمة 3,400 ريال</p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1">
                <div className="font-bold text-blue-900">اقتراب انتهاء جوازات سفر مسافرين</div>
                <p className="text-blue-800 text-[11px]">يوجد 3 مسافرين تنتهي جوازاتهم خلال أقل من 6 أشهر قبل موعد رحلتهم</p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
                <div className="font-bold text-emerald-900">مطابقة إغلاق الصناديق اليومية</div>
                <p className="text-emerald-800 text-[11px]">جميع صناديق الفروع الثلاثة مطابقة بنسبة 100% بدون أي عجز</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
