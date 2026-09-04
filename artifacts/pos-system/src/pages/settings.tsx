import { useEffect, useState, useRef } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useAuth } from "@/components/auth-provider";
import {
  useGetSettings, useUpdateSettings, getGetSettingsQueryKey,
  useGetReceiptCopyConfigs, useUpdateReceiptCopyConfig, useCreateReceiptCopyConfig, useDeleteReceiptCopyConfig, getGetReceiptCopyConfigsQueryKey,
  useGetDepartmentPrintConfigs, useUpdateDepartmentPrintConfig, useCreateDepartmentPrintConfig, useDeleteDepartmentPrintConfig, getGetDepartmentPrintConfigsQueryKey,
  useGetCategories, useGetPrintersList,
  useGetPrinterSettings, useUpdatePrinterSettings, getGetPrinterSettingsQueryKey,
} from "@workspace/api-client-react";
import type { SettingsInput, ReceiptCopyConfig, DepartmentPrintConfig, PrinterSettingsInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, Trash2, Pencil, Printer, Copy, Building2, Settings2, Upload, X, ShieldCheck, Sparkles, Image as ImageIcon } from "lucide-react";

// ─────────────────────────────────────────────
// Main Settings Component
// ─────────────────────────────────────────────
export default function Settings() {
  const { user } = useAuth();
  const isDeveloper = user?.role === "developer" || user?.username === "developer";
  const { data: settings, isLoading } = useGetSettings();
  const updateMutation = useUpdateSettings();
  const qc = useQueryClient();
  const { toast } = useToast();

  const devLogoInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<any>({
    businessName: "",
    address: null,
    phone: null,
    taxNumber: null,
    taxRate: 15,
    currency: "ريال",
    receiptMessage: null,
    printLogo: true,
    printQr: false,
    showCashier: true,
    showCustomer: true,
    allowCashierDiscount: false,
    receiptPaperSize: "80mm",
    showOrderNumber: true,
    showTableNumber: true,
    showDateTime: true,
    showBarcode: false,
    showOrderType: true,
    showTax: true,
    showDiscount: true,
    showNotes: true,
    autoPrintTrigger: "print_button",
    maxReprintCount: 3,
    masterCopiesCount: 2,
    logoUrl: null,
    printMode: "browser",
  });
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) setForm({ ...form, ...settings });
  }, [settings]);

  const handleSave = () => {
    const payload = { ...form };
    if (!isDeveloper) {
      delete payload.systemLogoUrl;
    }
    updateMutation.mutate({ data: payload }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: "تم حفظ الإعدادات بنجاح" });
      },
      onError: (err: any) => toast({ variant: "destructive", title: "فشل في الحفظ", description: err?.message || "يرجى المحاولة مرة أخرى" })
    });
  };

  const setField = (field: any, value: any) =>
    setForm((f: any) => ({ ...f, [field]: value }));

  if (isLoading) return (
    <AdminLayout>
      <div className="text-center py-16 text-muted-foreground">جاري التحميل...</div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="space-y-4 max-w-4xl">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">إعدادات النظام</h1>
          <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2">
            <Save className="w-4 h-4" />
            حفظ الإعدادات
          </Button>
        </div>

        <Tabs defaultValue="business">
          <TabsList className="w-full grid grid-cols-5 h-auto">
            <TabsTrigger value="business" className="gap-1 py-2 text-xs sm:text-sm">
              <Settings2 className="w-4 h-4" />
              النشاط التجاري
            </TabsTrigger>
            <TabsTrigger value="receipt-format" className="gap-1 py-2 text-xs sm:text-sm">
              <Printer className="w-4 h-4" />
              شكل الفاتورة
            </TabsTrigger>
            <TabsTrigger value="master-copies" className="gap-1 py-2 text-xs sm:text-sm">
              <Copy className="w-4 h-4" />
              نسخ الفاتورة
            </TabsTrigger>
            <TabsTrigger value="departments" className="gap-1 py-2 text-xs sm:text-sm">
              <Building2 className="w-4 h-4" />
              الأقسام
            </TabsTrigger>
            <TabsTrigger value="printer-layout" className="gap-1 py-2 text-xs sm:text-sm">
              <Printer className="w-4 h-4" />
              ضبط الطابعة
            </TabsTrigger>
          </TabsList>

          {/* ─── Business Tab ─── */}
          <TabsContent value="business" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>معلومات النشاط التجاري</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {([
                  ["businessName", "اسم النشاط / النظام *"],
                  ["address", "العنوان"],
                  ["phone", "رقم الهاتف"],
                  ["taxNumber", "الرقم الضريبي"],
                  ["currency", "العملة"],
                ] as [keyof SettingsInput, string][]).map(([field, label]) => {
                  return (
                    <div key={field} className="space-y-1">
                      <label className="text-sm font-medium flex items-center gap-1.5">
                        <span>{label}</span>
                      </label>
                      <Input
                        value={(form[field] as string) ?? ""}
                        onChange={e => setField(field, e.target.value || null)}
                      />
                    </div>
                  );
                })}
                <div className="space-y-1">
                  <label className="text-sm font-medium">نسبة الضريبة (%)</label>
                  <Input
                    type="number"
                    value={form.taxRate ?? 15}
                    onChange={e => setField("taxRate", Number(e.target.value))}
                    className="w-32"
                    min={0}
                    max={100}
                  />
                </div>
              </CardContent>
            </Card>

            {/* ─── Cashier Discount Permissions Card ─── */}
            <Card className="border-amber-500/30 bg-amber-50/20 dark:bg-amber-950/10 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <ShieldCheck className="w-5 h-5 text-amber-600" />
                    <span>صلاحيات الكاشير ونقاط البيع (الخصم)</span>
                  </div>
                  <Badge variant={form.allowCashierDiscount ? "default" : "secondary"} className={form.allowCashierDiscount ? "bg-green-600 text-white font-bold" : "bg-slate-200 text-slate-700 font-bold"}>
                    {form.allowCashierDiscount ? "الخصم مسموح للكاشير" : "الخصم ممنوع عن الكاشير"}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-slate-600 dark:text-slate-400">
                  التحكم في إمكانية قيام موظفي الكاشير بإدخال خصم مباشر على الفواتير في شاشة نقطة البيع.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-border">
                  <div className="space-y-0.5 max-w-[80%]">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">السماح للكاشير بعمل خصم في نقطة البيع</div>
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      عند <strong>التفعيل</strong>: يمكن للكاشير إدخال وتطبيق الخصم بحرية. عند <strong>التعطيل</strong>: يتم قفل حقل الخصم عن الكاشير ولا يمكن منحه إلا بإذن المشرف/المدير.
                    </div>
                  </div>
                  <Switch
                    checked={Boolean(form.allowCashierDiscount)}
                    onCheckedChange={(checked) => setField("allowCashierDiscount", checked)}
                  />
                </div>
              </CardContent>
            </Card>



            <Card className="border-blue-500/20 bg-blue-50/20 dark:bg-slate-900/40">
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-blue-600" />
                    <span>شعار النشاط التجاري (الفواتير والوثائق المعتمدة)</span>
                  </div>
                  <Badge className="bg-blue-600 text-white font-bold gap-1 shadow-xs">
                    <Upload className="w-3.5 h-3.5" />
                    متاح للرفع والتعديل
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  يمكنك رفع وتغيير صورة شعار المنشأة والنشاط التجاري لاستخدامها مباشرة على الفواتير، السندات، والمطبوعات الرسمية.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-blue-500/20 shadow-xs">
                  <div className="border rounded-lg p-2 bg-white flex items-center justify-center w-36 h-24 shrink-0 shadow-inner overflow-hidden">
                    <img src={form.logoUrl || "/assets/images/omnisystem_pro_logo_1784250216808.png"} alt="شعار النشاط التجاري" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">رفع وتحديث الشعار من الملفات</div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      اختر ملف صورة للشعار (PNG, JPG, WEBP, SVG). سيتم حفظه واستخدامه في جميع الترويسات والمطبوعات المعتمدة.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <label className="cursor-pointer">
                        <Input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setField("logoUrl", reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <Button type="button" variant="outline" size="sm" asChild className="gap-1.5 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-300 cursor-pointer">
                          <span>
                            <Upload className="w-3.5 h-3.5 ml-1" />
                            اختر صورة الشعار من الملفات
                          </span>
                        </Button>
                      </label>
                      {form.logoUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs text-red-600 hover:bg-red-50 cursor-pointer"
                          onClick={() => setField("logoUrl", null)}
                        >
                          إزالة الشعار
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isDeveloper && (
              <Card className="border-blue-500/50 bg-blue-50/10 dark:bg-blue-950/10 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-blue-600 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5" />
                    أدوات المطور - منطقة إدارة
                  </CardTitle>
                  <CardDescription className="text-blue-500/80 font-bold">
                    تحذير: هذه العمليات لا يمكن التراجع عنها. يرجى التأكد قبل التنفيذ.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-900/50 space-y-3">
                    <div className="flex flex-col gap-1">
                      <h4 className="font-bold text-slate-900 dark:text-slate-100">تصفير ومحو بيانات النظام بالكامل</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        سيقوم النظام بحذف كافة (الطلبات، المنتجات، العملاء، الموردين، بيانات الموظفين، العمليات المالية، والتقارير). 
                        سيبقى فقط حساب (admin) و (developer) وإعدادات النظام الأساسية لتبدأ من الصفر تماماً.
                      </p>
                    </div>
                    <Button 
                      variant="destructive" 
                      className="w-full sm:w-auto gap-2 font-bold shadow-md bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        if (confirm("هل أنت متأكد تماماً من رغبتك في تصفير قاعدة البيانات ومحو كل البيانات؟\nسيتم حذف كافة الطلبات والمنتجات والتقارير ولا يمكن التراجع!")) {
                          const token = localStorage.getItem("token");
                          fetch("/api/admin/reset-database", {
                            method: "POST",
                            headers: {
                              "Authorization": `Bearer ${token}`
                            }
                          })
                          .then(res => res.json())
                          .then(data => {
                            if (data.error) throw new Error(data.error);
                            toast({ title: "تم التصفير بنجاح", description: data.message });
                            window.location.reload();
                          })
                          .catch(err => {
                            toast({ variant: "destructive", title: "فشل التصفير", description: err.message });
                          });
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                      تصفير قاعدة البيانات والبدء من الصفر
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>معلومات الدخول الافتراضية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 font-mono">
                  <p>مدير النظام: <span className="font-bold text-foreground">admin</span> / كلمة المرور: <span className="font-bold text-foreground">admin123</span></p>
                  <p>الكاشير: <span className="font-bold text-foreground">cashier</span> / كلمة المرور: <span className="font-bold text-foreground">cashier123</span></p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Receipt Format Tab ─── */}
          <TabsContent value="receipt-format" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>شكل الفاتورة الرئيسية</CardTitle>
                <CardDescription>تحكم في البيانات التي تظهر على الفاتورة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">رسالة الشكر في نهاية الفاتورة</label>
                  <Input
                    value={form.receiptMessage ?? ""}
                    onChange={e => setField("receiptMessage", e.target.value || null)}
                    placeholder="شكراً لزيارتكم..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">حجم الورق</label>
                  <Select
                    value={form.receiptPaperSize as string ?? "80mm"}
                    onValueChange={v => setField("receiptPaperSize", v)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="58mm">58mm</SelectItem>
                      <SelectItem value="80mm">80mm</SelectItem>
                      <SelectItem value="A4">A4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-2 pt-2">
                  {([
                    ["printLogo", "إظهار شعار المطعم"],
                    ["printQr", "إظهار QR Code"],
                    ["showCashier", "إظهار اسم الكاشير"],
                    ["showCustomer", "إظهار اسم العميل"],
                    ["showOrderNumber", "إظهار رقم الطلب"],
                    ["showTableNumber", "إظهار رقم الطاولة"],
                    ["showDateTime", "إظهار التاريخ والوقت"],
                    ["showBarcode", "إظهار الباركود"],
                    ["showOrderType", "إظهار نوع الطلب (محلي/سفري/توصيل)"],
                    ["showTax", "إظهار الضريبة"],
                    ["showDiscount", "إظهار الخصم"],
                    ["showNotes", "إظهار الملاحظات"],
                  ] as [keyof SettingsInput, string][]).map(([field, label]) => (
                    <div key={field} className="flex items-center justify-between py-1.5 border-b border-border/50">
                      <label className="text-sm">{label}</label>
                      <Switch
                        checked={Boolean(form[field])}
                        onCheckedChange={v => setField(field, v)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>إعدادات الطباعة التلقائية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">وقت تنفيذ الطباعة التلقائية</label>
                  <Select
                    value={form.autoPrintTrigger as string ?? "print_button"}
                    onValueChange={v => setField("autoPrintTrigger", v)}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="print_button">عند الضغط على زر الطباعة</SelectItem>
                      <SelectItem value="save">عند حفظ الطلب</SelectItem>
                      <SelectItem value="after_payment">بعد الدفع مباشرة</SelectItem>
                      <SelectItem value="manual">يدوي فقط</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 pt-2 border-t">
                  <label className="text-sm font-medium">طريقة الطباعة المفضلة للطلب</label>
                  <Select
                    value={form.printMode as string ?? "browser"}
                    onValueChange={v => setField("printMode", v)}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="browser">طباعة المتصفح الرسومية (بالشعار والتنسيق الكامل)</SelectItem>
                      <SelectItem value="silent">الطباعة الصامتة المباشرة (بدون نوافذ - نصوص فقط)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-xl">
                    تنويه: طباعة المتصفح تدعم إظهار الشعار ونفس التنسيق المبرمج بالملف بشكل مثالي، بينما الطباعة الصامتة ترسل نصوصًا خامًا مباشرة وتعتمد على إعدادات الحروف والعرض بالطابعة.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">الحد الأقصى لإعادة الطباعة</label>
                  <Input
                    type="number"
                    value={form.maxReprintCount ?? 3}
                    onChange={e => setField("maxReprintCount", Number(e.target.value))}
                    className="w-32"
                    min={0}
                    max={20}
                  />
                  <p className="text-xs text-muted-foreground">0 = بدون حد</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Master Copies Tab ─── */}
          <TabsContent value="master-copies" className="mt-4">
            <MasterCopiesTab
              masterCopiesCount={form.masterCopiesCount as number ?? 2}
              onCopiesCountChange={v => setField("masterCopiesCount", v)}
              onSave={handleSave}
              isSaving={updateMutation.isPending}
            />
          </TabsContent>

          {/* ─── Departments Tab ─── */}
          <TabsContent value="departments" className="mt-4">
            <DepartmentsTab />
          </TabsContent>

          {/* ─── Printer Layout Tab ─── */}
          <TabsContent value="printer-layout" className="mt-4">
            <PrinterLayoutTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

// ─────────────────────────────────────────────
// Master Copies Tab
// ─────────────────────────────────────────────
function MasterCopiesTab({
  masterCopiesCount,
  onCopiesCountChange,
  onSave,
  isSaving,
}: {
  masterCopiesCount: number;
  onCopiesCountChange: (v: number) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  const { data: copies = [], isLoading } = useGetReceiptCopyConfigs();
  const updateCopy = useUpdateReceiptCopyConfig();
  const createCopy = useCreateReceiptCopyConfig();
  const deleteCopy = useDeleteReceiptCopyConfig();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [editItem, setEditItem] = useState<ReceiptCopyConfig | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newEnabled, setNewEnabled] = useState(true);

  const handleToggle = (item: ReceiptCopyConfig) => {
    updateCopy.mutate({ id: item.id, data: { copyNumber: item.copyNumber, label: item.label, enabled: !item.enabled } }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetReceiptCopyConfigsQueryKey() }),
    });
  };

  const handleEditSave = () => {
    if (!editItem) return;
    updateCopy.mutate({ id: editItem.id, data: { copyNumber: editItem.copyNumber, label: editLabel, enabled: editItem.enabled } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetReceiptCopyConfigsQueryKey() });
        setEditItem(null);
        toast({ title: "تم التعديل" });
      },
    });
  };

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    const nextNum = copies.length > 0 ? Math.max(...copies.map(c => c.copyNumber)) + 1 : 1;
    createCopy.mutate({ data: { copyNumber: nextNum, label: newLabel.trim(), enabled: newEnabled } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetReceiptCopyConfigsQueryKey() });
        setShowAdd(false);
        setNewLabel("");
        setNewEnabled(true);
        toast({ title: "تمت الإضافة" });
      },
    });
  };

  const handleDelete = (id: number) => {
    deleteCopy.mutate({ id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetReceiptCopyConfigsQueryKey() });
        toast({ title: "تم الحذف" });
      },
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>عدد نسخ الفاتورة الرئيسية</CardTitle>
          <CardDescription>تحديد عدد النسخ الإجمالي للفاتورة الرئيسية التي تُطبع عند كل طلب</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">عدد النسخ</label>
              <Input
                type="number"
                value={masterCopiesCount}
                onChange={e => onCopiesCountChange(Number(e.target.value))}
                className="w-24 text-center text-lg font-bold"
                min={1}
                max={10}
              />
            </div>
            <Button onClick={onSave} disabled={isSaving} variant="outline" className="mt-6 gap-2">
              <Save className="w-4 h-4" />
              حفظ
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>تخصيص كل نسخة</CardTitle>
            <CardDescription>تحديد الغرض من كل نسخة (عميل، كاشير، محاسبة، أرشيف...)</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            إضافة نسخة
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : (
            <div className="space-y-2">
              {copies.map(copy => (
                <div key={copy.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {copy.copyNumber}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{copy.label}</p>
                    <p className="text-xs text-muted-foreground">نسخة رقم {copy.copyNumber}</p>
                  </div>
                  <Badge variant={copy.enabled ? "default" : "secondary"}>
                    {copy.enabled ? "مفعّل" : "معطّل"}
                  </Badge>
                  <Switch checked={copy.enabled} onCheckedChange={() => handleToggle(copy)} />
                  <Button variant="ghost" size="sm" onClick={() => { setEditItem(copy); setEditLabel(copy.label); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(copy.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              {copies.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">لا توجد نسخ مضافة</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={o => !o && setEditItem(null)}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader><DialogTitle>تعديل النسخة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">اسم النسخة / الغرض</label>
              <Input value={editLabel} onChange={e => setEditLabel(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>إلغاء</Button>
            <Button onClick={handleEditSave} disabled={updateCopy.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader><DialogTitle>إضافة نسخة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">اسم النسخة / الغرض</label>
              <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="مثال: نسخة المحاسبة" />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">مفعّل</label>
              <Switch checked={newEnabled} onCheckedChange={setNewEnabled} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>إلغاء</Button>
            <Button onClick={handleAdd} disabled={createCopy.isPending || !newLabel.trim()}>إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// Departments Tab
// ─────────────────────────────────────────────
function DepartmentsTab() {
  const { data: depts = [], isLoading } = useGetDepartmentPrintConfigs();
  const { data: categories = [] } = useGetCategories();
  const { data: systemPrinters = [] } = useGetPrintersList();
  const updateDept = useUpdateDepartmentPrintConfig();
  const createDept = useCreateDepartmentPrintConfig();
  const deleteDept = useDeleteDepartmentPrintConfig();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [editItem, setEditItem] = useState<DepartmentPrintConfig | null>(null);
  const [editForm, setEditForm] = useState({ categoryId: "", printerName: "", copies: 1, enabled: true, printOrder: 0 });
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ categoryId: "", printerName: "", copies: 1, enabled: true, printOrder: 0 });

  const openEdit = (item: DepartmentPrintConfig) => {
    setEditItem(item);
    setEditForm({
      categoryId: item.categoryId ? String(item.categoryId) : "",
      printerName: item.printerName ?? "",
      copies: item.copies,
      enabled: item.enabled,
      printOrder: item.printOrder,
    });
  };

  const handleEditSave = () => {
    if (!editItem) return;
    updateDept.mutate({
      id: editItem.id,
      data: {
        categoryId: editForm.categoryId ? Number(editForm.categoryId) : null,
        printerName: editForm.printerName || null,
        copies: editForm.copies,
        enabled: editForm.enabled,
        printOrder: editForm.printOrder,
      }
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetDepartmentPrintConfigsQueryKey() });
        setEditItem(null);
        toast({ title: "تم التعديل" });
      },
    });
  };

  const handleAdd = () => {
    createDept.mutate({
      data: {
        categoryId: addForm.categoryId ? Number(addForm.categoryId) : null,
        printerName: addForm.printerName || null,
        copies: addForm.copies,
        enabled: addForm.enabled,
        printOrder: addForm.printOrder,
      }
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetDepartmentPrintConfigsQueryKey() });
        setShowAdd(false);
        setAddForm({ categoryId: "", printerName: "", copies: 1, enabled: true, printOrder: 0 });
        toast({ title: "تمت الإضافة" });
      },
    });
  };

  const handleToggle = (item: DepartmentPrintConfig) => {
    updateDept.mutate({
      id: item.id,
      data: {
        categoryId: item.categoryId ?? null,
        printerName: item.printerName ?? null,
        copies: item.copies,
        enabled: !item.enabled,
        printOrder: item.printOrder,
      }
    }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetDepartmentPrintConfigsQueryKey() }),
    });
  };

  const handleDelete = (id: number) => {
    deleteDept.mutate({ id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetDepartmentPrintConfigsQueryKey() });
        toast({ title: "تم الحذف" });
      },
    });
  };

  const DeptForm = ({ form, onChange }: { form: typeof addForm, onChange: (f: typeof addForm) => void }) => (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-sm font-medium">القسم (التصنيف)</label>
        <Select value={form.categoryId} onValueChange={v => onChange({ ...form, categoryId: v })}>
          <SelectTrigger>
            <SelectValue placeholder="اختر قسماً" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">الطابعة</label>
        {systemPrinters.length > 0 ? (
          <Select value={form.printerName || "__none__"} onValueChange={v => onChange({ ...form, printerName: v === "__none__" ? "" : v })}>
            <SelectTrigger dir="ltr">
              <SelectValue placeholder="اختر طابعة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">بدون طابعة</SelectItem>
              {systemPrinters.map((p: string) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="space-y-1">
            <Input value={form.printerName} onChange={e => onChange({ ...form, printerName: e.target.value })} placeholder="اسم الطابعة أو عنوان IP (مثال: 192.168.1.100)" dir="ltr" />
            <p className="text-xs text-muted-foreground">لم يتم اكتشاف طابعات. أدخل اسم الطابعة يدوياً أو عنوان IP الشبكي</p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">عدد النسخ</label>
          <Input type="number" value={form.copies} onChange={e => onChange({ ...form, copies: Number(e.target.value) })} min={1} max={10} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">ترتيب الطباعة</label>
          <Input type="number" value={form.printOrder} onChange={e => onChange({ ...form, printOrder: Number(e.target.value) })} min={0} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">تفعيل الطباعة</label>
        <Switch checked={form.enabled} onCheckedChange={v => onChange({ ...form, enabled: v })} />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>فواتير الأقسام</CardTitle>
            <CardDescription>
              بعد طباعة الفاتورة الرئيسية، يُرسل النظام تلقائياً فاتورة مستقلة لكل قسم تحتوي فقط على الأصناف الخاصة به
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            إضافة قسم
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : (
            <div className="space-y-2">
              {depts.map(dept => (
                <div key={dept.id} className={`flex items-center gap-3 p-3 rounded-lg border bg-card transition-opacity ${!dept.enabled ? "opacity-50" : ""}`}>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {dept.printOrder}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{dept.categoryName ?? "قسم غير محدد"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {dept.printerName ? `🖨️ ${dept.printerName}` : "بدون طابعة محددة"}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{dept.copies} نسخة</span>
                    </div>
                  </div>
                  <Badge variant={dept.enabled ? "default" : "secondary"}>
                    {dept.enabled ? "مفعّل" : "معطّل"}
                  </Badge>
                  <Switch checked={dept.enabled} onCheckedChange={() => handleToggle(dept)} />
                  <Button variant="ghost" size="sm" onClick={() => openEdit(dept)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(dept.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              {depts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  لا توجد أقسام مضافة. أضف قسماً لتفعيل طباعة فواتير الأقسام.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={o => !o && setEditItem(null)}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader><DialogTitle>تعديل إعدادات القسم</DialogTitle></DialogHeader>
          <DeptForm form={editForm} onChange={setEditForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>إلغاء</Button>
            <Button onClick={handleEditSave} disabled={updateDept.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader><DialogTitle>إضافة قسم جديد</DialogTitle></DialogHeader>
          <DeptForm form={addForm} onChange={setAddForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>إلغاء</Button>
            <Button onClick={handleAdd} disabled={createDept.isPending}>إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// Printer Layout Settings Tab
// ─────────────────────────────────────────────
function PrinterLayoutTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: saved } = useGetPrinterSettings();
  const updateMutation = useUpdatePrinterSettings();

  const defaults: PrinterSettingsInput & { mainPrinterName?: string | null } = {
    paperWidth: 80, leftMargin: 8, rightMargin: 4,
    topMargin: 2, bottomMargin: 2, fontSize: 11,
    lineSpacing: 2, charactersPerLine: 48, mainPrinterName: null,
  };

  const [form, setForm] = useState<PrinterSettingsInput & { mainPrinterName?: string | null }>(defaults);

  useEffect(() => {
    if (saved) {
      // If legacy setting had leftMargin <= 2, automatically recommend 8mm calibration
      const effectiveLeftMargin = (saved.leftMargin !== undefined && saved.leftMargin !== null && saved.leftMargin > 2)
        ? saved.leftMargin
        : 8;
      const effectiveRightMargin = (saved.rightMargin !== undefined && saved.rightMargin !== null && saved.rightMargin > 0)
        ? saved.rightMargin
        : 4;
      setForm({
        ...defaults,
        ...(saved as any),
        leftMargin: effectiveLeftMargin,
        rightMargin: effectiveRightMargin,
      });
    }
  }, [saved]);

  const set = (k: any, v: number | string | null) =>
    setForm(f => ({ ...f, [k]: v }));

  const applyPreset = (type: "80mm_standard" | "58mm_compact") => {
    if (type === "80mm_standard") {
      setForm(prev => ({
        ...prev,
        paperWidth: 80,
        leftMargin: 8,
        rightMargin: 4,
        topMargin: 2,
        bottomMargin: 2,
        fontSize: 11,
        lineSpacing: 2,
        charactersPerLine: 48,
      }));
      toast({ title: "تم تطبيق معايرة طابعات 80mm القياسية (الهامش الأيسر 8mm)" });
    } else {
      setForm(prev => ({
        ...prev,
        paperWidth: 58,
        leftMargin: 4,
        rightMargin: 2,
        topMargin: 1.5,
        bottomMargin: 1.5,
        fontSize: 9.5,
        lineSpacing: 1.5,
        charactersPerLine: 32,
      }));
      toast({ title: "تم تطبيق معايرة طابعات 58mm الصغيرة" });
    }
  };

  const handleSave = () => {
    updateMutation.mutate({ data: form }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetPrinterSettingsQueryKey() });
        toast({ title: "تم حفظ وضبط إعدادات الطابعة بنجاح" });
      },
      onError: () => toast({ variant: "destructive", title: "فشل حفظ الإعدادات" }),
    });
  };

  const handleTestPrint = () => {
    const lm = form.leftMargin ?? 8;
    const rm = form.rightMargin ?? 4;
    const pw = form.paperWidth ?? 80;
    const fs = form.fontSize ?? 11;
    const tm = form.topMargin ?? 2;
    const bm = form.bottomMargin ?? 2;
    const ls = form.lineSpacing ?? 2;

    const testContainerId = "__printer-test-container__";
    document.getElementById(testContainerId)?.remove();

    const style = document.createElement("style");
    style.id = "__test-print-style__";
    style.textContent = `
      @page { size: ${pw}mm auto; margin: 0; padding: 0; }
      @media print {
        body * { visibility: hidden !important; }
        #${testContainerId}, #${testContainerId} * { visibility: visible !important; }
        #${testContainerId} {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          width: 100% !important;
          max-width: ${pw}mm !important;
          margin: 0 auto !important;
          box-sizing: border-box !important;
          background: white !important;
          z-index: 999999 !important;
        }
      }
      .test-receipt-slip {
        font-family: 'Tajawal', sans-serif !important;
        font-size: ${fs}px !important;
        line-height: ${1 + ls / 10} !important;
        padding: ${tm}mm ${rm}mm ${bm}mm ${lm}mm !important;
        box-sizing: border-box !important;
        width: 100% !important;
        max-width: 100% !important;
        color: #000 !important;
        direction: rtl !important;
      }
    `;
    document.head.appendChild(style);

    const testDiv = document.createElement("div");
    testDiv.id = testContainerId;
    testDiv.innerHTML = `
      <div class="test-receipt-slip">
        <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 4px; margin-bottom: 4px;">
          <h3 style="font-size: 14px; font-weight: 900; margin: 0;">اختبار معايرة الطابعة الحرارية</h3>
          <p style="font-size: 10px; margin: 2px 0;">عرض الورق: ${pw}mm | الهامش الأيسر: ${lm}mm</p>
        </div>
        <div style="font-size: 10px; margin: 4px 0; border: 1px solid #000; padding: 4px;">
          <div><strong>الهامش الأيسر (Left):</strong> ${lm}mm ✅ متزن ومحمي من القص</div>
          <div><strong>الهامش الأيمن (Right):</strong> ${rm}mm</div>
          <div><strong>حجم الخط:</strong> ${fs}px | <strong>السطر:</strong> ${ls}px</div>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 4px 0; font-size: 10px;">
          <thead>
            <tr style="border-bottom: 1px solid #000;">
              <th style="text-align: right; padding: 2px;">الصنف</th>
              <th style="text-align: center; padding: 2px;">الكمية</th>
              <th style="text-align: left; padding: 2px;">السعر</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style="padding: 2px;">صنف اختباري تجريبي 1</td><td style="text-align: center;">2</td><td style="text-align: left;">50.00</td></tr>
            <tr><td style="padding: 2px;">صنف اختباري تجريبي 2</td><td style="text-align: center;">1</td><td style="text-align: left;">120.00</td></tr>
          </tbody>
        </table>
        <div style="border-top: 1px dashed #000; padding-top: 4px; text-align: left; font-weight: bold; font-size: 12px;">
          الإجمالي: 170.00 ريال
        </div>
        <div style="text-align: center; margin-top: 6px; font-size: 9px; border-top: 1px solid #000; padding-top: 2px;">
          تمت الطباعة بنجاح - الهامش الأيسر ${lm}mm مطابق لمعايير 80mm
        </div>
      </div>
    `;
    document.body.appendChild(testDiv);

    window.print();

    setTimeout(() => {
      document.getElementById("__test-print-style__")?.remove();
      document.getElementById(testContainerId)?.remove();
    }, 1000);
  };

  const numField = (label: string, key: keyof PrinterSettingsInput, unit = "mm", min = 0, max = 99, step = 0.5, helper?: string) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b last:border-0 gap-2">
      <div>
        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{label}</span>
        {helper && <p className="text-[11px] text-muted-foreground">{helper}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={form[key] as number ?? 0}
          onChange={e => set(key, Number(e.target.value))}
          className="w-24 text-center font-bold"
          min={min} max={max} step={step}
        />
        <span className="text-xs text-muted-foreground w-8 font-medium">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── Guidance Banner ── */}
      <Card className="border-blue-500/30 bg-blue-50/30 dark:bg-blue-950/20 shadow-xs">
        <CardContent className="p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            <strong className="text-slate-900 dark:text-slate-100 font-bold block text-sm">
              معايرة دقيقة لطابعات الفواتير الحرارية 80mm
            </strong>
            <p>
              تحتوي الطابعات الحرارية مقاس <strong>80mm</strong> على رأس طباعة يترك مسافة ميكانيكية غير قابلة للطباعة على الطرف الأيسر.
              لذا فإن ضبط <strong>الهامش الأيسر على 8mm</strong> (والأيمن على 4mm) هو المعيار الهندسي المعتمد لضمان ظهور كامل أعمدة الفاتورة، الأسعار، والإطارات بدقة متناهية وبدون أي قص.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Presets Selector ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">القوالب الجاهزة والمعايرة الموصى بها</CardTitle>
          <CardDescription>اختر الإعداد الموصى به لنوع طابعتك بضغطة زر</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant={(form.paperWidth === 80 && form.leftMargin === 8) ? "default" : "outline"}
            className="gap-2 text-xs font-bold"
            onClick={() => applyPreset("80mm_standard")}
          >
            <Printer className="w-4 h-4" />
            🌟 طابعات 80mm القياسية (الهامش الأيسر 8mm - موصى به)
          </Button>
          <Button
            type="button"
            variant={(form.paperWidth === 58 && form.leftMargin === 4) ? "default" : "outline"}
            className="gap-2 text-xs font-bold"
            onClick={() => applyPreset("58mm_compact")}
          >
            <Printer className="w-4 h-4" />
            طابعات 58mm الصغيرة (الهامش 4mm)
          </Button>
        </CardContent>
      </Card>

      {/* ── Paper Type ── */}
      <Card>
        <CardHeader>
          <CardTitle>نوع الورق</CardTitle>
          <CardDescription>عرض رول ورق الطابعة الحرارية المستخدمة</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-6">
          {[80, 58].map(w => (
            <label key={w} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="paperWidth"
                value={w}
                checked={(form.paperWidth ?? 80) === w}
                onChange={() => set("paperWidth", w)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm font-bold">{w}mm {w === 80 ? "(الافتراضي والأكثر شيوعاً)" : "(رول صغير)"}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* ── Margins ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>هوامش رأس الطباعة</CardTitle>
            <Badge className="bg-emerald-600 text-white font-bold">
              الهامش الأيسر الحالي: {form.leftMargin ?? 8}mm
            </Badge>
          </div>
          <CardDescription>
            المساحة القابلة للطباعة الفعلية = {form.paperWidth ?? 80}mm − {form.leftMargin ?? 8}mm (يسار) − {form.rightMargin ?? 4}mm (يمين) ={" "}
            <strong className="text-slate-900 font-black">{(form.paperWidth ?? 80) - (form.leftMargin ?? 8) - (form.rightMargin ?? 4)}mm</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 px-6">
          {numField("الهامش الأيسر (Left Margin)", "leftMargin", "mm", 0, 25, 0.5, "الحد الموصى به 8mm لمنع اختفاء الأرقام والأعمدة اليسرى في طابعات 80mm")}
          {numField("الهامش الأيمن (Right Margin)", "rightMargin", "mm", 0, 20, 0.5, "الحد الموصى به 4mm")}
          {numField("الهامش العلوي (Top Margin)", "topMargin", "mm", 0, 20, 0.5, "المسافة قبل بداية طباعة الترويسة والشعار")}
          {numField("الهامش السفلي (Bottom Margin)", "bottomMargin", "mm", 0, 25, 0.5, "المسافة بعد نهاية الفاتورة لضمان خروج الورق من القاطع")}
        </CardContent>
      </Card>

      {/* ── Typography ── */}
      <Card>
        <CardHeader><CardTitle>الخط والسطر والتباعد</CardTitle></CardHeader>
        <CardContent className="p-0 px-6">
          {numField("حجم الخط (Font Size)", "fontSize", "px", 8, 20, 1, "الحجم المثالي 11px للقراءة الواضحة")}
          {numField("مسافة السطر (Line Spacing)", "lineSpacing", "px", 0.5, 10, 0.5, "المسافة بين أسطر النصوص والأصناف")}
          {numField("عدد الأحرف بالسطر (ESC/POS Mode)", "charactersPerLine", "حرف", 20, 80, 1, "مخصص للطباعة المباشرة الصامتة بدون متصفح")}
        </CardContent>
      </Card>

      {/* ── Main Printer Direct Network / Silent ── */}
      <Card>
        <CardHeader>
          <CardTitle>طابعة الفاتورة الرئيسية المباشرة</CardTitle>
          <CardDescription>
            عند إدخال اسم الطابعة أو عنوان IP الخاص بها، سيقوم النظام بالطباعة المباشرة عليها تلقائياً.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">اسم الطابعة أو عنوان IP (اختياري)</label>
            <Input
              value={(form as any).mainPrinterName ?? ""}
              onChange={e => set("mainPrinterName", e.target.value || null)}
              placeholder="مثال: 192.168.1.100 أو Xprinter XP-80C"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground">
              اتركه فارغاً لاستخدام نافذة الطباعة الرسومية للمتصفح مع كامل التنسيقات والشعار.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 flex-wrap pt-2">
        <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold">
          <Save className="w-4 h-4" />
          حفظ وتطبيق إعدادات الطابعة
        </Button>
        <Button variant="outline" onClick={handleTestPrint} className="gap-2 font-bold border-slate-300">
          <Printer className="w-4 h-4" />
          طباعة تجريبية بالهوامش الحالية ({form.leftMargin ?? 8}mm)
        </Button>
      </div>
    </div>
  );
}
