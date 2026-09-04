import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Luggage, Plus, Search, Edit2, Trash2, Calendar, CreditCard, User, Globe, Phone, Mail, FileText, CheckCircle2 } from "lucide-react";

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

export default function PassengersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPax, setEditingPax] = useState<any | null>(null);

  const [form, setForm] = useState({
    customer_id: "",
    name_ar: "",
    name_en: "",
    title: "Mr",
    dob: "",
    gender: "ذكر",
    nationality: "سعودي",
    passport_number: "",
    passport_issue_date: "",
    passport_expiry_date: "",
    passport_issue_place: "",
    passport_type: "عادي",
    national_id: "",
    phone: "",
    email: "",
    special_notes: ""
  });

  const { data: passengers = [], isLoading } = useQuery<any[]>({
    queryKey: ["travel-passengers", search],
    queryFn: () => fetchWithAuth(`/api/travel/passengers${search ? `?search=${encodeURIComponent(search)}` : ""}`)
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["customers-list"],
    queryFn: () => fetchWithAuth("/api/customers")
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingPax) {
        return fetchWithAuth(`/api/travel/passengers/${editingPax.id}`, { method: "PUT", body: JSON.stringify(data) });
      }
      return fetchWithAuth("/api/travel/passengers", { method: "POST", body: JSON.stringify(data) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["travel-passengers"] });
      setModalOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetchWithAuth(`/api/travel/passengers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["travel-passengers"] });
    }
  });

  const resetForm = () => {
    setEditingPax(null);
    setForm({
      customer_id: "",
      name_ar: "",
      name_en: "",
      title: "Mr",
      dob: "",
      gender: "ذكر",
      nationality: "سعودي",
      passport_number: "",
      passport_issue_date: "",
      passport_expiry_date: "",
      passport_issue_place: "",
      passport_type: "عادي",
      national_id: "",
      phone: "",
      email: "",
      special_notes: ""
    });
  };

  const handleEdit = (pax: any) => {
    setEditingPax(pax);
    setForm({
      customer_id: pax.customer_id ? String(pax.customer_id) : "",
      name_ar: pax.name_ar || "",
      name_en: pax.name_en || "",
      title: pax.title || "Mr",
      dob: pax.dob || "",
      gender: pax.gender || "ذكر",
      nationality: pax.nationality || "سعودي",
      passport_number: pax.passport_number || "",
      passport_issue_date: pax.passport_issue_date || "",
      passport_expiry_date: pax.passport_expiry_date || "",
      passport_issue_place: pax.passport_issue_place || "",
      passport_type: pax.passport_type || "عادي",
      national_id: pax.national_id || "",
      phone: pax.phone || "",
      email: pax.email || "",
      special_notes: pax.special_notes || ""
    });
    setModalOpen(true);
  };

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const exp = new Date(expiryDate);
    const sixMonths = new Date();
    sixMonths.setMonth(sixMonths.getMonth() + 6);
    return exp <= sixMonths;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
              <Luggage className="w-7 h-7 text-primary" />
              إدارة المسافرين (Passengers Management)
            </h1>
            <p className="text-sm text-muted-foreground">
              سجل تفصيلي للمسافرين مستقل عن العميل لسهولة إعادة الاستخدام في الحجوزات والتذاكر بنقرة واحدة
            </p>
          </div>
          <Button onClick={() => { resetForm(); setModalOpen(true); }} className="bg-primary hover:bg-primary/90 gap-2 font-bold">
            <Plus className="w-4 h-4" /> إضافة مسافر جديد
          </Button>
        </div>

        {/* Search bar */}
        <Card className="p-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute right-3 top-3 text-muted-foreground" />
            <Input
              placeholder="ابحث بالاسم، رقم الجواز، رقم الهوية أو الهاتف..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pr-9"
            />
          </div>
        </Card>

        {/* Passengers Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">قائمة المسافرين المسجلين ({passengers.length})</CardTitle>
            <CardDescription>عرض كامل لبيانات جوازات السفر والتفضيلات الخاصة بالمسافرين</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">جاري تحميل المسافرين...</div>
            ) : passengers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">لا يوجد مسافرون مطابقون للبحث</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b text-slate-700 font-bold">
                      <th className="p-3">#</th>
                      <th className="p-3">الاسم بالعربية والإنجليزية</th>
                      <th className="p-3">اللقب/الجنس</th>
                      <th className="p-3">العميل الكفيل/الدافع</th>
                      <th className="p-3">رقم جواز السفر</th>
                      <th className="p-3">تاريخ انتهاء الجواز</th>
                      <th className="p-3">الجنسية</th>
                      <th className="p-3">التواصل</th>
                      <th className="p-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {passengers.map((p, idx) => {
                      const expiring = isExpiringSoon(p.passport_expiry_date);
                      return (
                        <tr key={p.id} className="border-b hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono text-xs">{idx + 1}</td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{p.name_ar}</div>
                            <div className="text-xs font-mono text-muted-foreground">{p.name_en}</div>
                          </td>
                          <td className="p-3">
                            <span className="inline-block px-2 py-0.5 text-xs bg-slate-100 rounded font-medium">
                              {p.title} - {p.gender}
                            </span>
                          </td>
                          <td className="p-3 text-xs">
                            {p.customer_name ? (
                              <span className="font-semibold text-primary">{p.customer_name}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-800">
                            {p.passport_number || "-"}
                          </td>
                          <td className="p-3">
                            {p.passport_expiry_date ? (
                              <div className="flex items-center gap-1">
                                <span className={`font-mono text-xs ${expiring ? "text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded" : ""}`}>
                                  {p.passport_expiry_date}
                                </span>
                                {expiring && <span className="text-[10px] text-amber-800 font-bold">⚠️ ينتهي قريباً</span>}
                              </div>
                            ) : "-"}
                          </td>
                          <td className="p-3 text-xs">{p.nationality || "-"}</td>
                          <td className="p-3 text-xs font-mono">{p.phone || p.email || "-"}</td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => handleEdit(p)}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  if (confirm(`هل أنت تأكد من حذف المسافر "${p.name_ar}"؟`)) {
                                    deleteMutation.mutate(p.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add / Edit Passenger Modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPax ? "تعديل بيانات المسافر" : "تسجيل مسافر جديد"}</DialogTitle>
              <DialogDescription>
                أدخل بيانات المسافر المطابقة لجواز السفر لاستخدامها التلقائي في جميع الفواتير والحجوزات
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={e => {
                e.preventDefault();
                saveMutation.mutate(form);
              }}
              className="space-y-4 py-2"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">العميل الكفيل / الدافع (اختیاري)</label>
                  <select
                    value={form.customer_id}
                    onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">-- بدون ربط بمستفيد خاص --</option>
                    {customers.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phone || c.customer_type})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">اللقب (Title)</label>
                  <select
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="Mr">Mr (سيد)</option>
                    <option value="Mrs">Mrs (سيدة)</option>
                    <option value="Ms">Ms (آنسة)</option>
                    <option value="Child">Child (طفل)</option>
                    <option value="Infant">Infant (رضيع)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">الاسم بالعربية *</label>
                  <Input
                    required
                    placeholder="مثال: عبدالله محمد العتيبي"
                    value={form.name_ar}
                    onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">الاسم بالإنجليزية (حسب الجواز) *</label>
                  <Input
                    required
                    placeholder="مثال: ABDULLAH MOHAMMED ALOTAIBI"
                    value={form.name_en}
                    onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">رقم جواز السفر</label>
                  <Input
                    placeholder="مثال: A12345678"
                    value={form.passport_number}
                    onChange={e => setForm(f => ({ ...f, passport_number: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">تاريخ انتهاء الجواز</label>
                  <Input
                    type="date"
                    value={form.passport_expiry_date}
                    onChange={e => setForm(f => ({ ...f, passport_expiry_date: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">تاريخ إصدار الجواز</label>
                  <Input
                    type="date"
                    value={form.passport_issue_date}
                    onChange={e => setForm(f => ({ ...f, passport_issue_date: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">مكان إصدار الجواز</label>
                  <Input
                    placeholder="مثال: الرياض / القاهرة / دبي"
                    value={form.passport_issue_place}
                    onChange={e => setForm(f => ({ ...f, passport_issue_place: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">الجنسية</label>
                  <Input
                    placeholder="مثال: سعودي / يمني / مصري"
                    value={form.nationality}
                    onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">تاريخ الميلاد</label>
                  <Input
                    type="date"
                    value={form.dob}
                    onChange={e => setForm(f => ({ ...f, dob: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">رقم الهوية الوطنية / الإقامة</label>
                  <Input
                    placeholder="مثال: 1088776655"
                    value={form.national_id}
                    onChange={e => setForm(f => ({ ...f, national_id: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">رقم الهاتف الخاص</label>
                  <Input
                    placeholder="0500000000"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">تفضيلات وملاحظات خاصة (نوع المقعد / الوجبة / ذوي الاحتياجات)</label>
                <textarea
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="مثال: يفضل مقعد بجانب النافذة / وجبة نباتية / كرسي متحرك"
                  value={form.special_notes}
                  onChange={e => setForm(f => ({ ...f, special_notes: e.target.value }))}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={saveMutation.isPending} className="bg-primary hover:bg-primary/90 font-bold">
                  {saveMutation.isPending ? "جاري الحفظ..." : "حفظ بيانات المسافر"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
