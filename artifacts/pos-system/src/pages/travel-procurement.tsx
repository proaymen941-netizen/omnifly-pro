import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShoppingBag,
  Plus,
  Search,
  Users,
  Printer,
  FileText,
  DollarSign,
  CheckCircle2,
  Building2,
  CreditCard,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function TravelProcurementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const [openOrderModal, setOpenOrderModal] = useState(false);
  const [openInvoiceModal, setOpenInvoiceModal] = useState(false);
  const [openPrintModal, setOpenPrintModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Forms
  const [orderForm, setOrderForm] = useState({
    supplier_name: "شركة الخطوط السعودية (Saudia)",
    service_category: "تذاكر طيران",
    total_cost: 10000,
    expected_selling_price: 13000,
    notes: "طلب توريد تذاكر رحلات العطلة الصيفية"
  });

  const [invSupplierName, setInvSupplierName] = useState("شركة الخطوط السعودية (Saudia)");
  const [supplierRef, setSupplierRef] = useState("SDA-INV-8899");
  const [paymentMethod, setPaymentMethod] = useState("bank");
  const [invNotes, setInvNotes] = useState("");

  const [items, setItems] = useState<any[]>([
    {
      service_type: "flight",
      description: "باقة 10 تذاكر طيران خط الرياض - دبي",
      cost_price: 10000,
      fees: 0,
      selling_price: 13000
    }
  ]);

  const addItem = () => {
    setItems([
      ...items,
      {
        service_type: "hotel",
        description: "شراء كتلة غرف فنادق مكة لشهر رمضان",
        cost_price: 15000,
        fees: 500,
        selling_price: 20000
      }
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  // Queries
  const { data: procurementInvoices = [], isLoading } = useQuery({
    queryKey: ["/api/travel/procurement/invoices"],
    queryFn: async () => {
      const res = await fetch("/api/travel/procurement/invoices");
      return res.json();
    }
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/travel/suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/travel/suppliers");
      return res.json();
    }
  });

  // Mutations
  const createOrderMutation = useMutation({
    mutationFn: async (payload: any) => {
      const token = localStorage.getItem("pos_token") ?? "";
      const res = await fetch("/api/travel/procurement/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("فشل إرسال أمر الشراء");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "نجاح", description: "تم إنشاء أمر الشراء بنجاح ✅" });
      setOpenOrderModal(false);
    }
  });

  const createProcurementInvoiceMutation = useMutation({
    mutationFn: async (payload: any) => {
      const token = localStorage.getItem("pos_token") ?? "";
      const res = await fetch("/api/travel/procurement/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("فشل إدخال فاتورة الشراء");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/travel/procurement/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/travel/suppliers"] });
      toast({ title: "نجاح", description: "تم اعتماد فاتورة المشتريات وتحديث حساب المورد والقيود المحاسبية ✅" });
      setOpenInvoiceModal(false);
    }
  });

  const totalCost = (items || []).reduce((sum, i) => sum + Number(i.cost_price || 0), 0);
  const totalFees = (items || []).reduce((sum, i) => sum + Number(i.fees || 0), 0);
  const totalSelling = (items || []).reduce((sum, i) => sum + Number(i.selling_price || 0), 0);
  const expectedProfit = totalSelling - (totalCost + totalFees);

  const filtered = procurementInvoices.filter((pi: any) =>
    pi.pi_number?.toLowerCase().includes(search.toLowerCase()) ||
    pi.supplier_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans" dir="rtl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-8 h-8 text-teal-600" />
              <h1 className="text-2xl font-bold text-slate-800">إدارة مشتريات الخدمات والرحلات (Procurement System)</h1>
            </div>
            <p className="text-slate-500 text-sm mt-1">
              إدارة طلبات وأوامر الشراء وفواتير المشتريات من الموردين والوكلاء مع ربط الأرباح والقيود المزدوجة
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setOpenOrderModal(true)} variant="outline" className="gap-2">
              <FileText className="w-4 h-4 text-slate-600" /> أمر شراء جديد (PO)
            </Button>
            <Button onClick={() => setOpenInvoiceModal(true)} className="bg-teal-600 hover:bg-teal-700 text-white gap-2 font-medium">
              <Plus className="w-4 h-4" /> فاتورة مشتريات خدمات جديدة
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث برقم فاتورة المشتريات، اسم المورد..."
              className="pr-9"
            />
          </div>
        </div>

        {/* Procurement Invoices Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">رقم فاتورة المشتريات</th>
                  <th className="p-3.5">المورد والتاريخ</th>
                  <th className="p-3.5">طريقة السداد</th>
                  <th className="p-3.5">إجمالي التكلفة الشراء</th>
                  <th className="p-3.5">المبيعات المتوقعة</th>
                  <th className="p-3.5">الربح المتوقع</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5">خيارات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={8} className="text-center p-8 text-slate-400">جاري تحميل فواتير المشتريات...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center p-8 text-slate-400">لا توجد فواتير مشتريات مسجلة بعد</td></tr>
                ) : (
                  filtered.map((pi: any) => (
                    <tr key={pi.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-teal-700">{pi.pi_number}</td>
                      <td className="p-3.5 text-xs">
                        <div className="font-bold text-slate-800">{pi.supplier_name}</div>
                        <div className="text-slate-500">{pi.pi_date}</div>
                      </td>
                      <td className="p-3.5 text-xs font-bold text-slate-700">{pi.payment_method === 'bank' ? 'تحويل بنكي' : 'نقداً'}</td>
                      <td className="p-3.5 text-xs font-bold text-slate-800 font-mono">
                        {(pi.cost_subtotal + pi.fees_subtotal)?.toLocaleString()} ريال
                      </td>
                      <td className="p-3.5 text-xs font-bold text-emerald-700 font-mono">
                        {pi.selling_subtotal?.toLocaleString()} ريال
                      </td>
                      <td className="p-3.5 text-xs font-bold text-blue-700 font-mono">
                        +{pi.net_profit?.toLocaleString()} ريال
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">
                          مرحلة ومكتملة ✅
                        </span>
                      </td>
                      <td className="p-3.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1 border-slate-200"
                          onClick={() => { setSelectedInvoice(pi); setOpenPrintModal(true); }}
                        >
                          <Printer className="w-3.5 h-3.5" /> طباعة
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Create Purchase Order */}
        <Dialog open={openOrderModal} onOpenChange={setOpenOrderModal}>
          <DialogContent className="max-w-md font-sans" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">إنشاء أمر شراء خدمات (Purchase Order)</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div>
                <Label>المورد</Label>
                <Input value={orderForm.supplier_name} onChange={(e) => setOrderForm({ ...orderForm, supplier_name: e.target.value })} />
              </div>
              <div>
                <Label>التكلفة التقديرية (ريال)</Label>
                <Input type="number" value={orderForm.total_cost} onChange={(e) => setOrderForm({ ...orderForm, total_cost: Number(e.target.value) })} />
              </div>
              <div>
                <Label>سعر البيع المخطط (ريال)</Label>
                <Input type="number" value={orderForm.expected_selling_price} onChange={(e) => setOrderForm({ ...orderForm, expected_selling_price: Number(e.target.value) })} />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button onClick={() => createOrderMutation.mutate(orderForm)} className="bg-teal-600 text-white font-medium">
                حفظ أمر الشراء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Create Procurement Invoice */}
        <Dialog open={openInvoiceModal} onOpenChange={setOpenInvoiceModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto font-sans" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 text-teal-600" /> إدخال فاتورة مشتريات خدمات وتذاكر من المورد
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-sm mt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl">
                <div className="space-y-1">
                  <Label>المورد / الوكيل *</Label>
                  <Input value={invSupplierName} onChange={(e) => setInvSupplierName(e.target.value)} placeholder="اسم الشركة الموردة" />
                </div>
                <div className="space-y-1">
                  <Label>رقم فاتورة المورد المرجعي</Label>
                  <Input value={supplierRef} onChange={(e) => setSupplierRef(e.target.value)} placeholder="SDA-INV-1020" />
                </div>
                <div className="space-y-1">
                  <Label>طريقة الدفع للمورد</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">تحويل بنكي direct bank</SelectItem>
                      <SelectItem value="cash">نقداً من الخزينة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-800 text-sm">بنود الخدمات المشتراة:</h4>
                  <Button size="sm" onClick={addItem} variant="outline" className="text-xs gap-1">
                    <Plus className="w-3.5 h-3.5" /> إضافة بند مشتريات
                  </Button>
                </div>

                {items.map((item, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-5 gap-2 text-xs items-center">
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-[11px]">الوصف / الخدمة المشتراة</Label>
                      <Input className="h-8 text-xs" value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">سعر التكلفة الشراء</Label>
                      <Input className="h-8 text-xs font-mono font-bold" type="number" value={item.cost_price} onChange={(e) => updateItem(idx, "cost_price", Number(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">البيع المخطط</Label>
                      <Input className="h-8 text-xs font-mono font-bold text-emerald-700" type="number" value={item.selling_price} onChange={(e) => updateItem(idx, "selling_price", Number(e.target.value))} />
                    </div>
                    {items.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeItem(idx)} className="text-red-500 hover:bg-red-50 p-1 mt-5">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 bg-teal-50 p-3 rounded-xl text-center text-xs font-sans">
                <div>
                  <div className="text-slate-500">إجمالي الشراء</div>
                  <div className="font-bold text-slate-800">{totalCost.toLocaleString()} ريال</div>
                </div>
                <div>
                  <div className="text-slate-500">المبيعات المخططة</div>
                  <div className="font-bold text-emerald-800">{totalSelling.toLocaleString()} ريال</div>
                </div>
                <div>
                  <div className="text-slate-500 font-bold">الأرباح الصافية التقديرية</div>
                  <div className="font-bold text-blue-700">+{expectedProfit.toLocaleString()} ريال</div>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button variant="outline" onClick={() => setOpenInvoiceModal(false)}>إلغاء</Button>
              <Button
                onClick={() => createProcurementInvoiceMutation.mutate({
                  supplier_name: invSupplierName,
                  supplier_invoice_ref: supplierRef,
                  payment_method: paymentMethod,
                  notes: invNotes,
                  items
                })}
                disabled={createProcurementInvoiceMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700 text-white font-medium"
              >
                اعتماد وتنسيق القيود
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Printable Procurement Receipt Modal */}
        <Dialog open={openPrintModal} onOpenChange={setOpenPrintModal}>
          <DialogContent className="max-w-lg font-sans" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">فاتورة توريد وشراء خدمات سياحية</DialogTitle>
            </DialogHeader>

            <div id="printable-procurement" className="p-6 bg-white border border-slate-200 rounded-xl space-y-4 text-xs font-sans">
              <div className="text-center border-b pb-3">
                <h2 className="font-bold text-lg text-slate-800">فاتورة مشتريات خدمات - Procurement Receipt</h2>
                <div className="font-bold text-teal-700 font-mono mt-1">{selectedInvoice?.pi_number}</div>
              </div>

              <div className="space-y-2">
                <div><strong>اسم المورد:</strong> {selectedInvoice?.supplier_name}</div>
                <div><strong>مرجع المورد:</strong> {selectedInvoice?.supplier_invoice_ref || "غ/م"}</div>
                <div><strong>تاريخ التوريد:</strong> {selectedInvoice?.pi_date}</div>
              </div>

              <div className="border-t pt-3 flex justify-between font-bold text-sm text-slate-900">
                <span>إجمالي التكلفة الشراء:</span>
                <span className="text-teal-700">{selectedInvoice?.cost_subtotal?.toLocaleString()} ريال سعودي</span>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => window.print()} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
                <Printer className="w-4 h-4" /> طباعة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
