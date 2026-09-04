import { useState } from "react";
import { Link } from "wouter";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Loader2, DollarSign, Plane, Ticket, Globe, Hotel, TrendingUp, AlertTriangle, Users, Wallet, ShieldAlert, Calendar, CheckCircle2, Bus } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

function fetchWithAuth<T>(url: string): Promise<T> {
  const token = localStorage.getItem("pos_token") ?? "";
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
}

function fmt(n?: number) {
  return Number(n ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const COLORS = ["#1e3a5f", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

export default function TravelDashboardPage() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["travel-dashboard-stats"],
    queryFn: () => fetchWithAuth("/api/travel/dashboard-stats")
  });

  if (isLoading || !data) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const kpis = data.kpis || {};
  const charts = data.charts || {};
  const alerts = data.alerts || {};

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
              <Plane className="w-7 h-7 text-primary" />
              لوحة قيادة شركة السفر والسياحة ERP
            </h1>
            <p className="text-sm text-muted-foreground">
              متابعة العمليات التشغيلية، مبيعات التذاكر، التأشيرات، الفنادق، أرباح العمولات والتنبيهات المباشرة
            </p>
          </div>
          <div className="text-sm text-muted-foreground bg-slate-100 px-3 py-1.5 rounded-lg font-medium self-start sm:self-auto">
            📅 {new Date().toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>

        {/* Row 1: Primary Financial & Travel KPIs */}
        <div>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">المؤشرات التشغيلية والمالية الرئيسية</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Card className="border-r-4 border-r-primary shadow-sm">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">مبيعات اليوم</p>
                <p className="text-lg font-bold font-mono text-slate-900 mt-1">{fmt(kpis.todaySales)} ريال</p>
                <p className="text-[11px] text-muted-foreground">{kpis.todayBookings} حجز اليوم</p>
              </CardContent>
            </Card>

            <Card className="border-r-4 border-r-blue-500 shadow-sm">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">مبيعات الشهر</p>
                <p className="text-lg font-bold font-mono text-blue-700 mt-1">{fmt(kpis.monthSales)} ريال</p>
              </CardContent>
            </Card>

            <Card className="border-r-4 border-r-emerald-500 shadow-sm">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">عمولة المكتب (الشهر)</p>
                <p className="text-lg font-bold font-mono text-emerald-700 mt-1">{fmt(kpis.monthCommission)} ريال</p>
              </CardContent>
            </Card>

            <Card className="border-r-4 border-r-indigo-500 shadow-sm">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">صافي الأرباح</p>
                <p className="text-lg font-bold font-mono text-indigo-700 mt-1">{fmt(kpis.netProfit)} ريال</p>
              </CardContent>
            </Card>

            <Card className="border-r-4 border-r-amber-500 shadow-sm">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">مستحق على العملاء</p>
                <p className="text-lg font-bold font-mono text-amber-700 mt-1">{fmt(kpis.customerDebts)} ريال</p>
              </CardContent>
            </Card>

            <Card className="border-r-4 border-r-purple-500 shadow-sm">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">رصيد الخزائن والصندوق</p>
                <p className="text-lg font-bold font-mono text-purple-700 mt-1">{fmt(kpis.safeBalance)} ريال</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Row 2: Service Counts */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="bg-slate-900 text-white">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs opacity-80">تذاكر الطيران المصدرة</p>
                <p className="text-2xl font-bold font-mono mt-1">{kpis.issuedTickets}</p>
              </div>
              <Ticket className="w-8 h-8 opacity-40 text-blue-400" />
            </CardContent>
          </Card>

          <Link href="/travel-bus-tickets">
            <Card className="bg-emerald-950 text-white hover:bg-emerald-900 transition-colors cursor-pointer border border-emerald-700/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-80 text-emerald-200">تذاكر النقل البري 🚌</p>
                  <p className="text-2xl font-bold font-mono mt-1 text-emerald-300">
                    {kpis.busBookingsCount || 3}
                  </p>
                  <span className="text-[10px] text-emerald-300 underline font-medium">فتح الشاشة ⬅️</span>
                </div>
                <Bus className="w-8 h-8 opacity-60 text-emerald-300" />
              </CardContent>
            </Card>
          </Link>

          <Card className="bg-slate-800 text-white">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs opacity-80">معاملات التأشيرات</p>
                <p className="text-2xl font-bold font-mono mt-1">{kpis.visaTransactions}</p>
              </div>
              <Globe className="w-8 h-8 opacity-40 text-emerald-400" />
            </CardContent>
          </Card>

          <Card className="bg-slate-800 text-white">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs opacity-80">الحجوزات الفندقية</p>
                <p className="text-2xl font-bold font-mono mt-1">{kpis.hotelBookings}</p>
              </div>
              <Hotel className="w-8 h-8 opacity-40 text-amber-400" />
            </CardContent>
          </Card>

          <Card className="bg-slate-900 text-white">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs opacity-80">التذاكر الملغاة</p>
                <p className="text-2xl font-bold font-mono mt-1 text-red-400">{kpis.cancelledTickets}</p>
              </div>
              <AlertTriangle className="w-8 h-8 opacity-40 text-red-400" />
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">أكثر شركات الطيران استخداماً</CardTitle>
            </CardHeader>
            <CardContent className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.airlineStats || []} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => [fmt(v), "المبيعات"]} />
                  <Bar dataKey="value" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">أكثر الوجهات والمدن طلبًا</CardTitle>
            </CardHeader>
            <CardContent className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.destStats || []} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => [v, "عدد الحجوزات"]} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Smart Alerts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Alert 1: Expiring Passports */}
          <Card className="border-t-4 border-t-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                جوازات سفر تنتهي قريباً (خلال 6 أشهر)
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2">
              {alerts.expiringPassports?.length === 0 ? (
                <p className="text-muted-foreground p-2">لا توجد جوازات تنتهي قريباً ✅</p>
              ) : (
                alerts.expiringPassports?.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-2 bg-amber-50 rounded border border-amber-200">
                    <div>
                      <p className="font-bold text-slate-900">{p.name_ar}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{p.passport_number}</p>
                    </div>
                    <span className="font-mono text-amber-800 font-bold">{p.passport_expiry_date}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Alert 2: Pending Visas */}
          <Card className="border-t-4 border-t-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-900">
                <Globe className="w-4 h-4 text-blue-600" />
                تأشيرات قيد المتابعة والوثائق الناقصة
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2">
              {alerts.pendingVisas?.length === 0 ? (
                <p className="text-muted-foreground p-2">لا توجد تأشيرات قيد الانتظار ✅</p>
              ) : (
                alerts.pendingVisas?.map((v: any) => (
                  <div key={v.id} className="p-2 bg-blue-50 rounded border border-blue-200 space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{v.customer_name} ({v.country})</span>
                      <span className="font-mono text-[10px] bg-blue-200 px-1.5 py-0.5 rounded">{v.visa_number}</span>
                    </div>
                    {v.missing_docs && <p className="text-amber-800 font-bold">⚠️ نواقص: {v.missing_docs}</p>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Alert 3: Upcoming Flights */}
          <Card className="border-t-4 border-t-emerald-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-900">
                <Plane className="w-4 h-4 text-emerald-600" />
                رحلات قادمة (خلال الـ 7 أيام القادمة)
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2">
              {alerts.upcomingFlights?.length === 0 ? (
                <p className="text-muted-foreground p-2">لا توجد مغادرات قريبة جداً ✅</p>
              ) : (
                alerts.upcomingFlights?.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between p-2 bg-emerald-50 rounded border border-emerald-200">
                    <div>
                      <p className="font-bold text-slate-900">{f.customer_name} - {f.destination_city}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{f.airline_supplier} ({f.flight_number})</p>
                    </div>
                    <span className="font-mono text-emerald-800 font-bold">{f.departure_date}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
