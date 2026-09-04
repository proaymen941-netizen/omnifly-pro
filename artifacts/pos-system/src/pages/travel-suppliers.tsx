import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  Wallet,
  Receipt,
  FileText,
  DollarSign,
  Printer,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
  Coins
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";

export default function TravelSuppliersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  // Modals & Sheets
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openPaymentModal, setOpenPaymentModal] = useState(false);
  const [openStatementSheet, setOpenStatementSheet] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);

  // Forms
  const [form, setForm] = useState({
    name: "",
    supplier_type: "شركة طيران",
    contact_person: "",
    phone: "",
    email: "",
    country: "السعودية",
    currency: "ريال",
    bank_details: "",
    notes: ""
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: 1000,
    voucher_date: new Date().toISOString().slice(0, 10),
    payment_method: "cash",
    notes: "سداد دفعة حساب للمورد"
  });

  // Queries
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["/api/travel/suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/travel/suppliers");
      return res.json();
    }
  });

  const { data: statementData, refetch: refetchStatement } = useQuery({
    queryKey: ["/api/travel/suppliers", selectedSupplier?.id, "statement"],
    queryFn: async () => {
      if (!selectedSupplier?.id) return null;
      const res = await fetch(`/api/travel/suppliers/${selectedSupplier.id}/statement`);
      return res.json();
    },
    enabled: !!selectedSupplier?.id
  });

  // Mutations
  const createSupplierMutation = useMutation({
    mutationFn: async (payload: any) => {
      const token = localStorage.getItem("pos_token") ?? "";
      const res = await fetch("/api/travel/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("فشل تسجيل المورد");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/travel/suppliers"] });
      toast({ title: "نجاح", description: "تم تسجيل المورد/الوكيل بنجاح ✅" });
      setOpenAddModal(false);
    }
  });

  const paySupplierMutation = useMutation({
    mutationFn: async ({ suppId, payload }: { suppId: number; payload: any }) => {
      const token = localStorage.getItem("pos_token") ?? "";
      const res = await fetch(`/api/travel/suppliers/${suppId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("فشل إضافة سند الصرف");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/travel/suppliers"] });
      refetchStatement();
      toast({ title: "تم الصرف", description: "تم إنشاء سند الصرف وترحيل القيد المحاسبي بنجاح ✅" });
      setOpenPaymentModal(false);
    }
  });

  const filtered = suppliers.filter((s: any) => {
    const matchType = filterType === "all" || s.supplier_type === filterType;
    const matchSearch =
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.supplier_code?.toLowerCase().includes(search.toLowerCase()) ||
      s.contact_person?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans" dir="rtl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-8 h-8 text-amber-600" />
              <h1 className="text-2xl font-bold text-slate-800">إدارة الموردين والوكلاء (Suppliers & Agents)</h1>
            </div>
            <p className="text-slate-500 text-sm mt-1">
              إدارة شركات الطيران، سلاسل الفنادق، النقل، وكلاء التأشيرات، مع كشف حساب دائن ومدين وسندات الصرف المحاسبية
            </p>
          </div>
          <Button onClick={() => setOpenAddModal(true)} className="bg-amber-600 hover:bg-amber-700 text-white gap-2 font-medium">
            <Plus className="w-4 h-4" /> إضافة مورد/وكيل جديد
          </Button>
        </div>

        {/* Filter Controls */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم المورد، الكود، مسؤول التواصل..."
              className="pr-9"
            />
          </div>

          <div className="w-full md:w-64">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger><SelectValue placeholder="نوع المورد" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الموردين والوكلاء</SelectItem>
                <SelectItem value="شركة طيران">شركات الطيران</SelectItem>
                <SelectItem value="فندق / سلسلة">سلاسل الفنادق</SelectItem>
                <SelectItem value="شركة نقل">شركات النقل والمواصلات</SelectItem>
                <SelectItem value="شركة تأمين">شركات التأمين</SelectItem>
                <SelectItem value="وكيل تأشيرات">وكلاء التأشيرات</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Supplier Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-3 text-center py-12 text-slate-500">جاري تحميل قائمة الموردين...</div>
          ) : filtered.length === 0 ? (
            <div className="col-span-3 text-center py-12 bg-white rounded-2xl border text-slate-500">
              لا يوجد موردين مطابقين للبحث
            </div>
          ) : (
            filtered.map((supp: any) => (
              <div key={supp.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="px-2.5 py-1 text-xs font-mono font-bold bg-amber-50 text-amber-800 rounded-lg">
                      {supp.supplier_code}
                    </span>
                    <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full font-bold">
                      {supp.supplier_type}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-800 text-lg leading-snug">{supp.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">المسؤول: {supp.contact_person || "غير محدد"}</p>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl">
                    {supp.phone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /><span dir="ltr">{supp.phone}</span></div>}
                    {supp.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" /><span className="truncate">{supp.email}</span></div>}
                  </div>

                  <div className="flex justify-between items-center p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                    <span className="text-xs text-slate-600">الرصيد الدائن المستحق:</span>
                    <span className="font-bold text-amber-800 text-base font-mono">
                      {supp.current_balance?.toLocaleString()} ريال
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs gap-1 border-slate-200"
                    onClick={() => { setSelectedSupplier(supp); setOpenStatementSheet(true); }}
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-600" /> كشف حساب
                  </Button>
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1"
                    onClick={() => { setSelectedSupplier(supp); setOpenPaymentModal(true); }}
                  >
                    <Coins className="w-3.5 h-3.5" /> سند صرف
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Add Supplier */}
        <Dialog open={openAddModal} onOpenChange={setOpenAddModal}>
          <DialogContent className="max-w-lg font-sans" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-600" /> تسجيل مورد أو وكيل جديد
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1 col-span-2">
                <Label>اسم المورد / الشركة *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: الخطوط السعودية / Bupa / VFS Global" />
              </div>

              <div className="space-y-1">
                <Label>تصنيف المورد</Label>
                <Select value={form.supplier_type} onValueChange={(v) => setForm({ ...form, supplier_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="شركة طيران">شركة طيران</SelectItem>
                    <SelectItem value="فندق / سلسلة">فندق / سلسلة فنادق</SelectItem>
                    <SelectItem value="شركة نقل">شركة نقل ومواصلات</SelectItem>
                    <SelectItem value="شركة تأمين">شركة تأمين</SelectItem>
                    <SelectItem value="وكيل تأشيرات">وكيل تأشيرات</SelectItem>
                    <SelectItem value="متعهد رحلات">متعهد رحلات سياحية</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>اسم مسؤول التواصل</Label>
                <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} placeholder="اسم المندوب" />
              </div>

              <div className="space-y-1">
                <Label>رقم الهاتف</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0501122334" />
              </div>

              <div className="space-y-1">
                <Label>البريد الإلكتروني</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="b2b@supplier.com" />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setOpenAddModal(false)}>إلغاء</Button>
              <Button onClick={() => createSupplierMutation.mutate(form)} className="bg-amber-600 hover:bg-amber-700 text-white font-medium">
                حفظ المورد
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Payment Voucher */}
        <Dialog open={openPaymentModal} onOpenChange={setOpenPaymentModal}>
          <DialogContent className="max-w-md font-sans" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-600" /> سند صرف دفعة للمورد: {selectedSupplier?.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <div className="space-y-1">
                <Label>مبلغ السداد (ريال) *</Label>
                <Input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} />
              </div>

              <div className="space-y-1">
                <Label>تاريخ السند</Label>
                <Input type="date" value={paymentForm.voucher_date} onChange={(e) => setPaymentForm({ ...paymentForm, voucher_date: e.target.value })} />
              </div>

              <div className="space-y-1">
                <Label>طريقة الدفع</Label>
                <Select value={paymentForm.payment_method} onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقداً من الصندوق الرئيسية</SelectItem>
                    <SelectItem value="bank">تحويل بنكي direct bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>البيان / ملاحظات</Label>
                <Input value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} placeholder="سداد مستحقات حجز تذاكر طيران..." />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setOpenPaymentModal(false)}>إلغاء</Button>
              <Button
                onClick={() => paySupplierMutation.mutate({ suppId: selectedSupplier.id, payload: paymentForm })}
                disabled={paySupplierMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
              >
                تأكيد الصرف وترحيل القيد
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Statement of Account Sheet */}
        <Sheet open={openStatementSheet} onOpenChange={setOpenStatementSheet}>
          <SheetContent side="left" className="w-full sm:max-w-xl font-sans overflow-y-auto" dir="rtl">
            <SheetHeader>
              <SheetTitle className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" /> كشف حساب المورد: {statementData?.supplier?.name}
              </SheetTitle>
              <SheetDescription className="text-xs">
                ملخص كامل للخدمات المشتراة وسندات الدفع مع رصيد الحساب الجاري
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 mt-6 text-sm">
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl text-center text-xs">
                <div>
                  <div className="text-slate-500">إجمالي المشتريات</div>
                  <div className="font-bold text-slate-800">{statementData?.summary?.totalPurchases?.toLocaleString()} ريال</div>
                </div>
                <div>
                  <div className="text-slate-500">إجمالي المدفوعات</div>
                  <div className="font-bold text-emerald-700">{statementData?.summary?.totalPayments?.toLocaleString()} ريال</div>
                </div>
                <div>
                  <div className="text-slate-500">الرصيد المتبقي</div>
                  <div className="font-bold text-amber-800">{statementData?.summary?.balance?.toLocaleString()} ريال</div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-xs text-slate-700">سجل الدفعات وسندات الصرف:</h4>
                {statementData?.payments?.length === 0 ? (
                  <div className="text-xs text-slate-400 py-4 text-center">لا توجد سندات دفع سابقة.</div>
                ) : (
                  statementData?.payments?.map((p: any) => (
                    <div key={p.id} className="p-3 bg-white border rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-slate-800">{p.voucher_number}</div>
                        <div className="text-slate-500">{p.voucher_date} - {p.notes || "دفعة نقدية"}</div>
                      </div>
                      <div className="font-bold text-emerald-700 font-mono">-{p.amount?.toLocaleString()} ريال</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </AdminLayout>
  );
}
