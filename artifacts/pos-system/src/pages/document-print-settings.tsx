import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save, FileText, Image, Building, Receipt, Users, ShieldCheck, Upload } from "lucide-react";

export default function DocumentPrintSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    companyName: "OmniSystem Pro",
    companySubtitle: "نظام نقاط البيع وإدارة الموارد",
    logoUrl: "/assets/images/omnisystem_pro_logo_1784250216808.png",
    customerHeaderText: "كشف حساب عميل معتمد",
    customerFooterText: "شكراً لتعاملكم معنا - يُرجى مراجعة الحسابات خلال 15 يوماً",
    employeeHeaderText: "كشف حساب ومسير رواتب موظف",
    employeeFooterText: "إدارة الموارد البشرية - التوقيع والاعتماد",
    voucherReceiptTitle: "سند قبض",
    voucherPaymentTitle: "سند صرف",
    voucherFooterText: "المحاسب _______ المدير _______ المستلم _______",
    reportHeaderText: "تقرير عام شامل",
    reportFooterText: "طبع بواسطة نظام OmniSystem Pro",
    accentColor: "#2563eb",
    headerRightText1: "معمل عبدالاسلام للخبز العربي",
    headerRightText2: "عدن/المعلا",
    headerRightText3: "774106282",
    headerLeftText1: "قيس",
    headerLeftText2: "عدن/المعلا",
    headerLeftText3: "771845734",
  });

  useEffect(() => {
    fetch("/api/document-print-settings")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setForm(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = () => {
    setSaving(true);
    const token = localStorage.getItem("pos_token") || "";
    fetch("/api/document-print-settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(form),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || data?.message || `خطأ في الخادم (${res.status})`);
        }
        return data;
      })
      .then((data) => {
        setSaving(false);
        if (data && !data.error) {
          toast({ title: "تم حفظ إعدادات التقارير والسندات بنجاح" });
        } else {
          toast({ variant: "destructive", title: "فشل الحفظ", description: data?.error || "خطأ غير معروف" });
        }
      })
      .catch((err) => {
        setSaving(false);
        console.error("Save error:", err);
        toast({ 
          variant: "destructive", 
          title: "فشل الاتصال بالخادم", 
          description: err.message || "تأكد من اتصالك بالإنترنت ومن عمل الخادم بشكل صحيح" 
        });
      });
  };

  const setField = (field: string, val: string) => {
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">جاري تحميل إعدادات التقارير...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-7 h-7 text-blue-600" />
              إدارة تخصيص النصوص، الصور، كشوفات الحسابات والسندات
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              تحكم كامل في ترويسات ومحتويات وتذييلات الفواتير، كشوفات عملاء وموظفين، والسندات وتطبيقها فوراً على النظام.
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6">
            <Save className="w-4 h-4" />
            {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* General Company & Branding */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                <Building className="w-5 h-5 text-blue-600" />
                هوية المؤسسة والترويسة العامة
              </CardTitle>
              <CardDescription>الاسم والشعار والألوان المستخدمة في جميع التقارير</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 border p-3 rounded-lg bg-slate-50">
                  <label className="text-xs font-bold text-slate-700 mb-1 block">بيانات الترويسة اليمنى (عربي)</label>
                  <Input placeholder="السطر الأول (مثال: معمل عبدالاسلام للخبز)" value={form.headerRightText1} onChange={(e) => setField("headerRightText1", e.target.value)} className="text-xs" />
                  <Input placeholder="السطر الثاني (مثال: عدن/المعلا)" value={form.headerRightText2} onChange={(e) => setField("headerRightText2", e.target.value)} className="text-xs" />
                  <Input placeholder="السطر الثالث (مثال: رقم هاتف)" value={form.headerRightText3} onChange={(e) => setField("headerRightText3", e.target.value)} className="text-xs" />
                </div>
                <div className="space-y-2 border p-3 rounded-lg bg-slate-50">
                  <label className="text-xs font-bold text-slate-700 mb-1 block">بيانات الترويسة اليسرى (عربي/إنجليزي)</label>
                  <Input placeholder="السطر الأول (مثال: قيس)" value={form.headerLeftText1} onChange={(e) => setField("headerLeftText1", e.target.value)} className="text-xs" />
                  <Input placeholder="السطر الثاني (مثال: عدن/المعلا)" value={form.headerLeftText2} onChange={(e) => setField("headerLeftText2", e.target.value)} className="text-xs" />
                  <Input placeholder="السطر الثالث (مثال: رقم هاتف)" value={form.headerLeftText3} onChange={(e) => setField("headerLeftText3", e.target.value)} className="text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">اسم المؤسسة / الشركة (الافتراضي)</label>
                  <Input value={form.companyName} onChange={(e) => setField("companyName", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">العنوان الفرعي / الوصف</label>
                  <Input value={form.companySubtitle} onChange={(e) => setField("companySubtitle", e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>شعار كشف الحساب والسندات والطباعة</span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-300">متاح للرفع والتعديل</span>
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-xl bg-slate-50/50">
                  <div className="border rounded-lg p-2 bg-white flex items-center justify-center w-28 h-18 shrink-0 shadow-sm overflow-hidden">
                    <img src={form.logoUrl || "/assets/images/omnisystem_pro_logo_1784250216808.png"} alt="الشعار المعتمد" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <p className="text-xs font-bold text-slate-800">شعار الطباعة والوثائق الرسمية المعتمد</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      اختر ملف صورة للشعار من الجهاز لطباعته في ترويسة التقارير، كشوفات الحسابات والسندات.
                    </p>
                    <div className="flex items-center gap-2">
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
                            رفع شعار جديد
                          </span>
                        </Button>
                      </label>
                      {form.logoUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs text-red-600 hover:bg-red-50 cursor-pointer"
                          onClick={() => setField("logoUrl", "")}
                        >
                          إزالة الشعار
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">اللون الرئيسي للتقارير (Accent Color)</label>
                <div className="flex gap-2 items-center">
                  <Input type="color" value={form.accentColor} onChange={(e) => setField("accentColor", e.target.value)} className="w-16 h-10 p-1 cursor-pointer" />
                  <Input value={form.accentColor} onChange={(e) => setField("accentColor", e.target.value)} className="flex-1" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vouchers Customization */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                <Receipt className="w-5 h-5 text-blue-600" />
                تخصيص سندات القبض والصرف
              </CardTitle>
              <CardDescription>عناوين وتذييلات السندات المالية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">عنوان سند القبض</label>
                <Input value={form.voucherReceiptTitle} onChange={(e) => setField("voucherReceiptTitle", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">عنوان سند الصرف</label>
                <Input value={form.voucherPaymentTitle} onChange={(e) => setField("voucherPaymentTitle", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">تذييل السندات (التواقيع والأختام)</label>
                <Textarea value={form.voucherFooterText} onChange={(e) => setField("voucherFooterText", e.target.value)} rows={3} />
              </div>
            </CardContent>
          </Card>

          {/* Customer Statements Customization */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                <Users className="w-5 h-5 text-blue-600" />
                تخصيص كشوفات حساب العملاء
              </CardTitle>
              <CardDescription>النصوص الافتتاحية والختامية لكشوفات حساب العملاء</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">ترويسة كشف حساب العملاء</label>
                <Input value={form.customerHeaderText} onChange={(e) => setField("customerHeaderText", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">ملاحظات وتذييل كشف حساب العملاء</label>
                <Textarea value={form.customerFooterText} onChange={(e) => setField("customerFooterText", e.target.value)} rows={3} />
              </div>
            </CardContent>
          </Card>

          {/* Employee Statements Customization */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                تخصيص كشوفات ومسيرات رواتب الموظفين
              </CardTitle>
              <CardDescription>النصوص والاعتمادات لمسيرات الرواتب وكشوفات الموظفين</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">ترويسة كشف حساب/مسير الموظفين</label>
                <Input value={form.employeeHeaderText} onChange={(e) => setField("employeeHeaderText", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">تذييل مسيرات الرواتب</label>
                <Textarea value={form.employeeFooterText} onChange={(e) => setField("employeeFooterText", e.target.value)} rows={3} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* General Reports Customization */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50/50 pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
              <FileText className="w-5 h-5 text-blue-600" />
              تخصيص التقارير العامة والإدارية الشاملة
            </CardTitle>
            <CardDescription>الترويسة والتذييل الموحد لجميع التقارير في النظام</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">ترويسة التقارير العامة</label>
              <Input value={form.reportHeaderText} onChange={(e) => setField("reportHeaderText", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">تذييل التقارير العامة</label>
              <Input value={form.reportFooterText} onChange={(e) => setField("reportFooterText", e.target.value)} />
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
