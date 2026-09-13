import React, { useState, useRef, Fragment } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppLogo } from "@/components/AppLogo";
import { KeyRound, Plus, Trash2, ShieldCheck, Monitor, Lock, AlertTriangle, Laptop, Palette, Upload, RefreshCw } from "lucide-react";

function fetchAuth(url: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("pos_token") ?? "";
  return fetch(url, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) } });
}
async function apiGet(url: string) { const r = await fetchAuth(url); if (!r.ok) throw new Error(await r.text()); return r.json(); }
async function apiPost(url: string, body: any) { const r = await fetchAuth(url, { method: "POST", body: JSON.stringify(body) }); if (!r.ok) throw new Error(await r.text()); return r.json(); }
async function apiPatch(url: string, body: any) { const r = await fetchAuth(url, { method: "PATCH", body: JSON.stringify(body) }); if (!r.ok) throw new Error(await r.text()); return r.json(); }
async function apiPut(url: string, body: any) { const r = await fetchAuth(url, { method: "PUT", body: JSON.stringify(body) }); if (!r.ok) throw new Error(await r.text()); return r.json(); }
async function apiDel(url: string) { const r = await fetchAuth(url, { method: "DELETE" }); if (!r.ok && r.status !== 204) throw new Error(await r.text()); }

export default function LicensesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [clientName, setClientName] = useState("");
  const [devicesLimit, setDevicesLimit] = useState("3");
  const [expiresAt, setExpiresAt] = useState("2027-12-31");
  const [expandedLicenseId, setExpandedLicenseId] = useState<number | null>(null);

  // Logo upload state
  const devLogoFileRef = useRef<HTMLInputElement>(null);
  const [devLogoUrlInput, setDevLogoUrlInput] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);

  // REQUIREMENT: Developer or Admin role can access this page
  const isDeveloper = user?.role === "developer" || user?.role === "admin" || user?.username === "developer";

  const { data: licenses = [] } = useQuery({
    queryKey: ["licenses"],
    queryFn: () => apiGet("/api/licenses"),
    enabled: isDeveloper
  });

  if (!isDeveloper) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4 dir-rtl">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shadow-md border-2 border-red-200">
            <Lock className="w-10 h-10 animate-bounce" />
          </div>
          <Card className="max-w-md border-2 border-red-200 bg-red-50/80 shadow-xl rounded-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-red-700 font-black text-lg flex items-center justify-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                غير مصرح للوصول - ميزة خاصة بالمطور
              </CardTitle>
              <CardDescription className="text-red-700 font-bold text-xs pt-2 leading-relaxed">
                يُمنع منعاً باتاً ظهور أو إمكانية استخدام شاشة التراخيص وإدارة الأجهزة (Developer License) وشعار النظام لأي مستخدم غير مطور النظام.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  const handleApplyLogo = async (logoDataUrl: string) => {
    try {
      setLogoUploading(true);
      // 1. Store in localStorage for instant reactive display across components
      localStorage.setItem("omni_developer_system_logo", logoDataUrl);

      // 2. Persist in database settings via API (systemLogoUrl ONLY)
      await apiPut("/api/settings", { systemLogoUrl: logoDataUrl });

      // 3. Invalidate React Query settings cache
      qc.invalidateQueries({ queryKey: ["settings"] });

      // 4. Trigger global event so all components update immediately
      window.dispatchEvent(new Event("omni_logo_updated"));

      toast({ title: "تم رفع وتحديث شعار النظام المطور بنجاح ✅" });
      setDevLogoUrlInput("");
    } catch (err: any) {
      toast({ variant: "destructive", title: "فشل حفظ الشعار", description: err.message });
    } finally {
      setLogoUploading(false);
    }
  };

  const handleDevLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "حجم الملف كبير جداً", description: "يرجى اختيار صورة بحجم أقل من 5 ميجابايت" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        handleApplyLogo(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetDevLogo = async () => {
    try {
      localStorage.removeItem("omni_developer_system_logo");
      await apiPut("/api/settings", { systemLogoUrl: "/assets/images/omnisystem_pro_logo_1784250216808.png" });
      qc.invalidateQueries({ queryKey: ["settings"] });
      window.dispatchEvent(new Event("omni_logo_updated"));
      toast({ title: "تم إعادة الشعار الافتراضي للنظام ✅" });
    } catch (e) {
      toast({ variant: "destructive", title: "حدث خطأ" });
    }
  };

  const addMut = useMutation({
    mutationFn: () => apiPost("/api/licenses", { client_name: clientName, devices_limit: Number(devicesLimit), expires_at: expiresAt }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["licenses"] }); setClientName(""); toast({ title: "تم إصدار مفتاح التفعيل بنجاح" }); },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل", description: e.message })
  });

  const delMut = useMutation({
    mutationFn: (id: number) => apiDel(`/api/licenses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["licenses"] });
      toast({ title: "تم حذف الترخيص بنجاح ✅" });
    },
    onError: (e: any) => {
      toast({ variant: "destructive", title: "فشل حذف الترخيص", description: e.message });
    }
  });

  const updateLicMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => apiPatch(`/api/licenses/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["licenses"] });
      toast({ title: "تم تحديث حالة وبيانات الترخيص بنجاح ✅" });
    },
    onError: (e: any) => {
      toast({ variant: "destructive", title: "فشل تحديث الترخيص", description: e.message });
    }
  });

  const removeDeviceMut = useMutation({
    mutationFn: (deviceId: number) => apiDel(`/api/licenses/devices/${deviceId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["licenses"] });
      toast({ title: "تم إلغاء ربط الجهاز بنجاح ✅" });
    },
    onError: (e: any) => {
      toast({ variant: "destructive", title: "فشل إلغاء ربط الجهاز", description: e.message });
    }
  });

  return (
    <AdminLayout>
      <div className="space-y-6 dir-rtl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2.5 text-slate-900">
              <KeyRound className="w-7 h-7 text-red-600" />
              نظام التراخيص وإدارة الأجهزة والشعار (Developer License)
            </h1>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              لوحة التحكم الخاصة بمطور النظام لإدارة التراخيص والتفعيل، ربط وإلغاء الأجهزة، وتخصيص شعار النظام.
            </p>
          </div>
          <Badge className="bg-red-600 text-white font-black px-3 py-1 text-xs self-start sm:self-auto shadow-md">
            خاص بالمطور المعتمد 💻
          </Badge>
        </div>

        {/* ── Developer System Logo Upload Card ── */}
        <Card className="border-2 border-amber-500/40 shadow-lg bg-slate-950 text-white overflow-hidden rounded-2xl">
          <CardHeader className="border-b border-slate-800 pb-3 bg-slate-900/90">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-black text-amber-400 flex items-center gap-2">
                <Palette className="w-5 h-5 text-amber-400" />
                <span>شعار النظام المطور (Developer System Logo)</span>
              </CardTitle>
              <Badge variant="outline" className="border-amber-500/50 text-amber-300 bg-amber-500/10 text-[10px]">
                تأثير فوري ومزامن ⚡
              </Badge>
            </div>
            <CardDescription className="text-slate-300 text-xs pt-1 font-medium">
              يمكن للمطور رفع وتحديد شعار النظام المعتمد. يظهر الشعار المرفوع تلقائياً في شريط القائمة الجانبية، شاشة تسجيل الدخول، وأعلى الترويسات الرسمية.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-col md:flex-row items-center gap-6 bg-slate-900/90 p-4 rounded-xl border border-slate-800">
              {/* Logo Preview Box */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="w-28 h-28 rounded-2xl bg-slate-950 border-2 border-amber-500/50 p-2.5 flex items-center justify-center shadow-xl overflow-hidden relative group">
                  <AppLogo className="w-full h-full object-contain" />
                </div>
                <span className="text-[11px] text-amber-300 font-bold">معاينة الشعار الحالي</span>
              </div>

              {/* Upload controls */}
              <div className="flex-1 space-y-3.5 w-full">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    1. رفع ملف صورة الشعار من الجهاز (PNG / JPG / SVG / WebP)
                  </label>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="file"
                      ref={devLogoFileRef}
                      accept="image/*"
                      className="hidden"
                      onChange={handleDevLogoFileUpload}
                    />
                    <Button
                      type="button"
                      onClick={() => devLogoFileRef.current?.click()}
                      disabled={logoUploading}
                      className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black hover:from-amber-400 hover:to-amber-500 border-amber-400 text-xs shadow-md"
                    >
                      <Upload className="w-4 h-4" />
                      {logoUploading ? "جاري الرفع..." : "رفع وتثبيت الشعار"}
                    </Button>
                    <span className="text-[11px] text-slate-400">ينصح بدقة عالية وخلفية شفافة</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-200">
                    2. أو إدخال رابط الشعار المباشر (Logo URL)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="url"
                      value={devLogoUrlInput}
                      onChange={(e) => setDevLogoUrlInput(e.target.value)}
                      placeholder="https://example.com/system-logo.png"
                      className="bg-slate-950 border-slate-800 text-white text-xs h-9 focus:border-amber-500"
                    />
                    <Button
                      type="button"
                      onClick={() => handleApplyLogo(devLogoUrlInput.trim())}
                      disabled={!devLogoUrlInput.trim() || logoUploading}
                      className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs h-9 px-4 shrink-0"
                    >
                      حفظ الرابط
                    </Button>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800">
                  <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    يتم الحفظ والتطبيق الفوري للشعار في كافة مكونات وشاشات النظام.
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleResetDevLogo}
                    className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 px-2 font-bold"
                  >
                    <RefreshCw className="w-3 h-3 ml-1" />
                    استعادة الشعار الافتراضي
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Alert Banner ── */}
        <div className="p-3.5 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl flex items-center gap-3 text-xs text-amber-900 font-bold shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>
            تنبيه المطور: عند تحديد تاريخ ترخيص منتهي الصلاحية أو إيقاف حالة الترخيص (موقوف)، يتوقف النظام فوراً بالكامل لجميع المستخدمين، ولا يستأنف العمل إلا بعد قيام المطور بتعديل الترخيص وتحديث تاريخ الصلاحية.
          </span>
        </div>

        {/* ── Issue New License Card ── */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 font-black text-slate-800">
              <ShieldCheck className="w-5 h-5 text-red-600" />
              إصدار مفتاح تفعيل جديد
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="اسم العميل / المنشأة *" className="text-xs font-bold" />
            <Input type="number" min="1" value={devicesLimit} onChange={e => setDevicesLimit(e.target.value)} placeholder="عدد الأجهزة المسموحة" className="text-xs font-bold" />
            <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} placeholder="تاريخ الانتهاء" className="text-xs font-bold" />
            <Button onClick={() => addMut.mutate()} disabled={!clientName.trim() || addMut.isPending} className="gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md">
              <Plus className="w-4 h-4" />
              {addMut.isPending ? "جاري الإصدار..." : "إصدار مفتاح الترخيص"}
            </Button>
          </CardContent>
        </Card>

        {/* ── Licenses & Devices Table ── */}
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-4 bg-muted/40 border-b flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-red-600" />
              سجل التراخيص والأجهزة النشطة ({licenses.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/60 border-b text-slate-700">
                <tr>
                  <th className="text-right p-3 font-bold">مفتاح التفعيل</th>
                  <th className="text-right p-3 font-bold">اسم العميل</th>
                  <th className="text-center p-3 font-bold">الأجهزة النشطة / المسموحة</th>
                  <th className="text-right p-3 font-bold">تاريخ الانتهاء</th>
                  <th className="text-right p-3 font-bold">الحالة</th>
                  <th className="p-3 text-center font-bold">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {((licenses as any[]) || []).map(l => {
                  const isExpanded = expandedLicenseId === l.id;
                  const activeCount = l.devices?.length ?? 0;
                  const isExpired = l.expires_at && l.expires_at !== "غير محدد" && new Date(l.expires_at) < new Date();
                  const isSuspended = l.status === "suspended";

                  return (
                    <React.Fragment key={l.id}>
                      <tr className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono text-red-600 font-extrabold dir-ltr text-right">{l.license_key}</td>
                        <td className="p-3 font-bold text-slate-800">{l.client_name}</td>
                        <td className="p-3 text-center">
                          <button 
                            onClick={() => setExpandedLicenseId(isExpanded ? null : l.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition-colors border"
                          >
                            <Monitor className="w-3.5 h-3.5 text-red-600" />
                            <span>{activeCount} / {l.devices_limit} أجهزة</span>
                            <span className="text-slate-500 font-normal">({isExpanded ? "إخفاء التفاصيل" : "عرض الأجهزة"})</span>
                          </button>
                        </td>
                        <td className="p-3">
                          <input
                            type="date"
                            defaultValue={l.expire_date || l.expires_at || ""}
                            onChange={(e) => {
                              const newDate = e.target.value;
                              updateLicMut.mutate({ id: l.id, body: { expire_date: newDate, expires_at: newDate } });
                            }}
                            className="text-xs bg-white text-slate-900 border border-slate-300 rounded-lg px-2.5 py-1 font-mono focus:ring-1 focus:ring-red-500 focus:outline-none shadow-xs font-bold"
                          />
                        </td>
                        <td className="p-3">
                          <select
                            value={l.status || (l.active === 0 ? "suspended" : isExpired ? "expired" : "active")}
                            onChange={(e) => {
                              const newStatus = e.target.value;
                              updateLicMut.mutate({
                                id: l.id,
                                body: {
                                  status: newStatus,
                                  active: newStatus === "suspended" ? 0 : 1
                                }
                              });
                            }}
                            className={`text-xs font-black rounded-full px-3 py-1 border cursor-pointer shadow-xs ${
                              isSuspended || l.status === "suspended" || l.active === 0
                                ? "bg-red-100 text-red-800 border-red-300"
                                : isExpired
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : "bg-emerald-100 text-emerald-800 border-emerald-300"
                            }`}
                          >
                            <option value="active">🟢 نشط</option>
                            <option value="suspended">🔴 موقوف (توقف النظام)</option>
                            <option value="expired">🟡 منتهي الصلاحية</option>
                          </select>
                        </td>
                        <td className="p-3 text-center flex items-center justify-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-600 hover:bg-red-100 h-8 w-8 rounded-lg transition-colors" 
                            title="حذف هذا الترخيص"
                            disabled={delMut.isPending}
                            onClick={() => {
                              if (window.confirm(`هل أنت متأكد من حذف الترخيص (${l.license_key}) الخاص بـ (${l.client_name})؟`)) {
                                delMut.mutate(l.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={6} className="p-4">
                            <div className="bg-white rounded-xl border p-4 space-y-3 shadow-xs">
                              <h4 className="font-extrabold text-xs text-slate-700 flex items-center gap-1.5">
                                <Laptop className="w-4 h-4 text-red-600" /> الأجهزة المرجعية المسجلة لهذا الترخيص ({activeCount} من {l.devices_limit})
                              </h4>
                              {l.devices && l.devices.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                  {l.devices.map((d: any) => (
                                    <div key={d.id} className="flex items-center justify-between p-3 rounded-xl border bg-slate-50 text-xs">
                                      <div className="space-y-0.5 truncate pr-1">
                                        <div className="font-extrabold text-slate-800 truncate">{d.device_name || "جهاز غير محدد"}</div>
                                        <div className="font-mono text-[10px] text-slate-500 truncate">ID: {d.device_id}</div>
                                        <div className="text-[10px] text-slate-400">آخر نشاط: {d.last_active}</div>
                                      </div>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-red-600 h-7 px-2 hover:bg-red-50 font-bold shrink-0" 
                                        onClick={() => confirm("هل تريد إلغاء ربط هذا الجهاز وإتاحة الترخيص لجهاز آخر؟") && removeDeviceMut.mutate(d.id)}
                                      >
                                        إلغاء الربط
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500 py-2">لا توجد أجهزة مسجلة حتى الآن لهذا الترخيص. سيتم تسجيل الجهاز تلقائياً عند أول عملية تحقق.</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {licenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 font-bold">لا توجد تراخيص مسجلة في الوقت الحالي.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
