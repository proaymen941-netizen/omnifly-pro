import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ticket, Plus, Search, Edit2, Trash2, Printer, CheckCircle2, AlertCircle, RefreshCw, XCircle, DollarSign, Plane, Send } from "lucide-react";

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

const STATUS_BADGES: Record<string, { label: string; class: string }> = {
  confirmed: { label: "مؤكد", class: "bg-blue-100 text-blue-800 border-blue-200" },
  issued: { label: "مصدرة", class: "bg-green-100 text-green-800 border-green-200" },
  pending_issue: { label: "بانتظار الإصدار", class: "bg-amber-100 text-amber-800 border-amber-200" },
  cancelled: { label: "ملغاة", class: "bg-red-100 text-red-800 border-red-200" },
  refunded: { label: "مسترجعة", class: "bg-purple-100 text-purple-800 border-purple-200" },
  reissued: { label: "معاد إصدارها", class: "bg-indigo-100 text-indigo-800 border-indigo-200" }
};

export default function TravelBookingsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const [voucherModalBooking, setVoucherModalBooking] = useState<any | null>(null);

  const [form, setForm] = useState({
    booking_number: "",
    service_type: "flight",
    customer_id: "",
    passenger_id: "",
    airline_supplier: "الخطوط السعودية (Saudia)",
    flight_number: "",
    origin_city: "",
    destination_city: "",
    departure_date: "",
    return_date: "",
    ticket_number: "",
    pnr: "",
    status: "confirmed",
    issue_date: new Date().toISOString().slice(0, 10),
    cost_price: "",
    selling_price: "",
    payment_status: "paid",
    payment_method: "cash",
    notes: ""
  });

  const { data: bookings = [], isLoading } = useQuery<any[]>({
    queryKey: ["travel-bookings", search, statusFilter],
    queryFn: () => {
      const q = new URLSearchParams();
      if (search) q.set("search", search);
      if (statusFilter) q.set("status", statusFilter);
      return fetchWithAuth(`/api/travel/bookings?${q.toString()}`);
    }
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["customers-list"],
    queryFn: () => fetchWithAuth("/api/customers")
  });

  const { data: passengers = [] } = useQuery<any[]>({
    queryKey: ["travel-passengers-list"],
    queryFn: () => fetchWithAuth("/api/travel/passengers")
  });

  const { data: airlines = [] } = useQuery<any[]>({
    queryKey: ["travel-airlines-list"],
    queryFn: () => fetchWithAuth("/api/travel/airlines")
  });

  const [quickAirlineModal, setQuickAirlineModal] = useState(false);
  const [quickAirlineForm, setQuickAirlineForm] = useState({
    name_ar: "",
    name_en: "",
    iata_code: "",
    country: "السعودية"
  });

  const addAirlineMutation = useMutation({
    mutationFn: (data: any) => fetchWithAuth("/api/travel/airlines", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (newA: any) => {
      qc.invalidateQueries({ queryKey: ["travel-airlines-list"] });
      setQuickAirlineModal(false);
      setForm(f => ({ ...f, airline_supplier: `${newA.name_ar} (${newA.name_en || newA.iata_code})` }));
      setQuickAirlineForm({ name_ar: "", name_en: "", iata_code: "", country: "السعودية" });
    }
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingBooking) {
        return fetchWithAuth(`/api/travel/bookings/${editingBooking.id}`, { method: "PUT", body: JSON.stringify(data) });
      }
      return fetchWithAuth("/api/travel/bookings", { method: "POST", body: JSON.stringify(data) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["travel-bookings"] });
      setModalOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetchWithAuth(`/api/travel/bookings/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["travel-bookings"] });
    }
  });

  const resetForm = () => {
    setEditingBooking(null);
    setForm({
      booking_number: `TKT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      service_type: "flight",
      customer_id: "",
      passenger_id: "",
      airline_supplier: "الخطوط السعودية (Saudia)",
      flight_number: "",
      origin_city: "",
      destination_city: "",
      departure_date: "",
      return_date: "",
      ticket_number: "",
      pnr: "",
      status: "confirmed",
      issue_date: new Date().toISOString().slice(0, 10),
      cost_price: "0",
      selling_price: "0",
      payment_status: "paid",
      payment_method: "cash",
      notes: ""
    });
  };

  const handleEdit = (bk: any) => {
    setEditingBooking(bk);
    setForm({
      booking_number: bk.booking_number || "",
      service_type: bk.service_type || "flight",
      customer_id: bk.customer_id ? String(bk.customer_id) : "",
      passenger_id: bk.passenger_id ? String(bk.passenger_id) : "",
      airline_supplier: bk.airline_supplier || "",
      flight_number: bk.flight_number || "",
      origin_city: bk.origin_city || "",
      destination_city: bk.destination_city || "",
      departure_date: bk.departure_date || "",
      return_date: bk.return_date || "",
      ticket_number: bk.ticket_number || "",
      pnr: bk.pnr || "",
      status: bk.status || "confirmed",
      issue_date: bk.issue_date || new Date().toISOString().slice(0, 10),
      cost_price: String(bk.cost_price || 0),
      selling_price: String(bk.selling_price || 0),
      payment_status: bk.payment_status || "paid",
      payment_method: bk.payment_method || "cash",
      notes: bk.notes || ""
    });
    setModalOpen(true);
  };

  const changeStatus = (bk: any, newStatus: string) => {
    fetchWithAuth(`/api/travel/bookings/${bk.id}`, {
      method: "PUT",
      body: JSON.stringify({ ...bk, status: newStatus })
    }).then(() => {
      qc.invalidateQueries({ queryKey: ["travel-bookings"] });
    });
  };

  const costVal = Number(form.cost_price || 0);
  const sellVal = Number(form.selling_price || 0);
  const commVal = sellVal - costVal;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
              <Ticket className="w-7 h-7 text-primary" />
              حجوزات وإصدار تذاكر الطيران (Flight Bookings)
            </h1>
            <p className="text-sm text-muted-foreground">
              إدارة التذاكر، إدخال الـ PNR، حساب عمولة المكتب تلقائياً وإصدار قسيمة السفر للعميل
            </p>
          </div>
          <Button onClick={() => { resetForm(); setModalOpen(true); }} className="bg-primary hover:bg-primary/90 gap-2 font-bold">
            <Plus className="w-4 h-4" /> حجز تذكرة طيران جديدة
          </Button>
        </div>

        {/* Search & Filter Bar */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute right-3 top-3 text-muted-foreground" />
              <Input
                placeholder="ابحث برقم التذكرة، الـ PNR، اسم العميل أو المسافر..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full sm:w-48"
            >
              <option value="">جميع الحالات</option>
              <option value="confirmed">مؤكد</option>
              <option value="issued">مصدرة</option>
              <option value="pending_issue">بانتظار الإصدار</option>
              <option value="cancelled">ملغاة</option>
              <option value="refunded">مسترجعة</option>
              <option value="reissued">معاد إصدارها</option>
            </select>
          </div>
        </Card>

        {/* Bookings Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">جدول التذاكر والحجوزات ({bookings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">جاري تحميل الحجوزات...</div>
            ) : bookings.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">لا توجد حجوزات مطابقة للبحث</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b text-slate-700 font-bold">
                      <th className="p-3">رقم الحجز/PNR</th>
                      <th className="p-3">العميل / المسافر</th>
                      <th className="p-3">شركة الطيران / الرحلة</th>
                      <th className="p-3">المسار (من - إلى)</th>
                      <th className="p-3">رقم التذكرة</th>
                      <th className="p-3">التكلفة / سعر البيع</th>
                      <th className="p-3">عمولة المكتب</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((bk) => {
                      const badge = STATUS_BADGES[bk.status] || { label: bk.status, class: "bg-slate-100" };
                      return (
                        <tr key={bk.id} className="border-b hover:bg-slate-50 transition-colors">
                          <td className="p-3">
                            <div className="font-bold font-mono text-primary">{bk.booking_number}</div>
                            {bk.pnr && (
                              <div className="text-xs font-mono bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded inline-block font-semibold">
                                PNR: {bk.pnr}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{bk.customer_name || "عميل عام"}</div>
                            <div className="text-xs text-muted-foreground">👤 {bk.passenger_name_ar || bk.passenger_name_en || "نفس العميل"}</div>
                          </td>
                          <td className="p-3 text-xs">
                            <div className="font-semibold text-slate-800">{bk.airline_supplier || "غير محدد"}</div>
                            <div className="font-mono text-muted-foreground">{bk.flight_number || "-"}</div>
                          </td>
                          <td className="p-3 text-xs">
                            <div className="font-bold">{bk.origin_city || "-"} ⬅️ {bk.destination_city || "-"}</div>
                            <div className="text-[11px] text-muted-foreground">📅 المغادرة: {bk.departure_date || "-"}</div>
                          </td>
                          <td className="p-3 font-mono text-xs font-semibold">
                            {bk.ticket_number || "-"}
                          </td>
                          <td className="p-3 font-mono text-xs">
                            <div className="text-muted-foreground">شراء: {Number(bk.cost_price || 0).toLocaleString()}</div>
                            <div className="font-bold text-slate-900">بيع: {Number(bk.selling_price || 0).toLocaleString()}</div>
                          </td>
                          <td className="p-3 font-mono text-xs font-bold text-emerald-700 bg-emerald-50/50">
                            +{Number(bk.commission || 0).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 text-xs font-bold rounded-full border ${badge.class}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-700 hover:bg-slate-100" title="طباعة الفاتورة / القسيمة" onClick={() => setVoucherModalBooking(bk)}>
                                <Printer className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" title="تعديل الحجز" onClick={() => handleEdit(bk)}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              {bk.status !== "issued" && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" title="تأكيد وإصدار التذكرة" onClick={() => changeStatus(bk, "issued")}>
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:bg-red-50"
                                title="حذف الحجز"
                                onClick={() => {
                                  if (confirm(`هل أنت تأكد من حذف الحجز "${bk.booking_number}"؟`)) {
                                    deleteMutation.mutate(bk.id);
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

        {/* Booking Form Modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBooking ? "تعديل حجز تذكرة الطيران" : "إضافة حجز تذكرة طيران جديد"}</DialogTitle>
              <DialogDescription>
                تعبئة بيانات الحجز والتذكرة، تحديد الـ PNR وحساب عمولة المكتب تلقائياً
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
                  <label className="text-xs font-bold text-slate-700">العميل الدافع / الحجاز *</label>
                  <select
                    required
                    value={form.customer_id}
                    onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">-- اختر العميل --</option>
                    {customers.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phone || c.customer_type})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">المسافر الفعلي (Passenger)</label>
                  <select
                    value={form.passenger_id}
                    onChange={e => setForm(f => ({ ...f, passenger_id: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">-- اختر المسافر (أو اتركه ليكون بنفس اسم العميل) --</option>
                    {passengers.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name_ar} - {p.name_en} ({p.passport_number})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">شركة الطيران / المورد (Airline) *</label>
                    <button
                      type="button"
                      onClick={() => setQuickAirlineModal(true)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> إضافة شركة طيران جديدة
                    </button>
                  </div>
                  <select
                    required
                    value={form.airline_supplier}
                    onChange={e => setForm(f => ({ ...f, airline_supplier: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium"
                  >
                    <option value="">-- اختر شركة الطيران من الدليل --</option>
                    {airlines.map((a: any) => (
                      <option key={a.id} value={`${a.name_ar} (${a.name_en || a.iata_code})`}>
                        ✈️ {a.name_ar} {a.name_en ? `- ${a.name_en}` : ''} [{a.iata_code}] {a.country ? `(${a.country})` : ''}
                      </option>
                    ))}
                    {form.airline_supplier && !airlines.some((a: any) => `${a.name_ar} (${a.name_en || a.iata_code})` === form.airline_supplier || a.name_ar === form.airline_supplier) && (
                      <option value={form.airline_supplier}>{form.airline_supplier}</option>
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">رقم الرحلة (Flight No.)</label>
                  <Input
                    placeholder="مثال: SV-112"
                    value={form.flight_number}
                    onChange={e => setForm(f => ({ ...f, flight_number: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">مدينة المغادرة (Origin)</label>
                  <Input
                    placeholder="مثال: الرياض (RUH)"
                    value={form.origin_city}
                    onChange={e => setForm(f => ({ ...f, origin_city: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">مدينة الوصول (Destination)</label>
                  <Input
                    placeholder="مثال: دبي (DXB) / القاهرة (CAI)"
                    value={form.destination_city}
                    onChange={e => setForm(f => ({ ...f, destination_city: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">تاريخ المغادرة</label>
                  <Input
                    type="date"
                    value={form.departure_date}
                    onChange={e => setForm(f => ({ ...f, departure_date: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">تاريخ العودة (في حالة ذهاب وإياد)</label>
                  <Input
                    type="date"
                    value={form.return_date}
                    onChange={e => setForm(f => ({ ...f, return_date: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">رمز الحجز PNR</label>
                  <Input
                    placeholder="مثال: PNR-X78Y90"
                    value={form.pnr}
                    onChange={e => setForm(f => ({ ...f, pnr: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">رقم التذكرة الإلكترونية (E-Ticket No.)</label>
                  <Input
                    placeholder="مثال: 065-2415896321"
                    value={form.ticket_number}
                    onChange={e => setForm(f => ({ ...f, ticket_number: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">تكلفة التذكرة من المورد (Cost)</label>
                  <Input
                    type="number"
                    value={form.cost_price}
                    onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">سعر البيع للعميل (Selling Price)</label>
                  <Input
                    type="number"
                    value={form.selling_price}
                    onChange={e => setForm(f => ({ ...f, selling_price: e.target.value }))}
                  />
                </div>
              </div>

              {/* Commission Live Display */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                <span className="text-sm font-bold text-emerald-800">صافي عمولة المكتب المتوقعة:</span>
                <span className="text-lg font-mono font-bold text-emerald-700">
                  {commVal.toLocaleString()} ريال
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">حالة الحجز والتذكرة</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="confirmed">حجز مؤكد</option>
                    <option value="issued">تذكرة مصدرة</option>
                    <option value="pending_issue">بانتظار الإصدار</option>
                    <option value="cancelled">ملغاة</option>
                    <option value="refunded">مسترجعة</option>
                    <option value="reissued">معاد إصدارها</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">طريقة الدفع</label>
                  <select
                    value={form.payment_method}
                    onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="cash">نقداً (الصندوق)</option>
                    <option value="card">شبكة / مدى</option>
                    <option value="bank_transfer">تحويل بنكي</option>
                    <option value="credit">آجل (حساب شركة)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">ملاحظات وشروط الحجز</label>
                <textarea
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="أي ملاحظات تتعلق بوزن الأمتعة، شروط الترجيع أو إعادة الإصدار..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={saveMutation.isPending} className="bg-primary hover:bg-primary/90 font-bold">
                  {saveMutation.isPending ? "جاري الحفظ..." : "حفظ بيانات الحجز"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Voucher / Invoice Print Dialog */}
        <Dialog open={Boolean(voucherModalBooking)} onOpenChange={open => !open && setVoucherModalBooking(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>قسيمة حجز تذكرة طيران (Flight Ticket Voucher)</DialogTitle>
              <DialogDescription>معاينة قسيمة السفر الجاهزة للطباعة أو الإرسال للعميل عبر الواتساب</DialogDescription>
            </DialogHeader>

            {voucherModalBooking && (
              <div className="space-y-4 border p-4 rounded-lg bg-slate-50 text-slate-900" id="print-area">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h2 className="text-xl font-bold text-primary">شركة أومني لسفريات والسياحة</h2>
                    <p className="text-xs text-muted-foreground">تأكيد حجز وتذكرة طيران إلكترونية</p>
                  </div>
                  <div className="text-left font-mono">
                    <p className="text-xs font-bold">رقم الحجز: {voucherModalBooking.booking_number}</p>
                    <p className="text-xs text-muted-foreground">PNR: {voucherModalBooking.pnr || "N/A"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="font-bold">العميل:</span> {voucherModalBooking.customer_name}</div>
                  <div><span className="font-bold">المسافر:</span> {voucherModalBooking.passenger_name_ar || voucherModalBooking.passenger_name_en || "نفس العميل"}</div>
                  <div><span className="font-bold">شركة الطيران:</span> {voucherModalBooking.airline_supplier}</div>
                  <div><span className="font-bold">رقم الرحلة:</span> {voucherModalBooking.flight_number || "-"}</div>
                  <div><span className="font-bold">من:</span> {voucherModalBooking.origin_city}</div>
                  <div><span className="font-bold">إلى:</span> {voucherModalBooking.destination_city}</div>
                  <div><span className="font-bold">تاريخ المغادرة:</span> {voucherModalBooking.departure_date}</div>
                  <div><span className="font-bold">رقم التذكرة:</span> {voucherModalBooking.ticket_number || "-"}</div>
                </div>

                <div className="border-t pt-2 flex items-center justify-between font-bold text-sm">
                  <span>إجمالي المبلغ المطلوب:</span>
                  <span className="text-primary font-mono">{Number(voucherModalBooking.selling_price || 0).toLocaleString()} ريال</span>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setVoucherModalBooking(null)}>إغلاق</Button>
              <Button onClick={() => window.print()} className="bg-primary hover:bg-primary/90 font-bold gap-2">
                <Printer className="w-4 h-4" /> طباعة القسيمة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Quick Airline Modal */}
        <Dialog open={quickAirlineModal} onOpenChange={setQuickAirlineModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plane className="w-5 h-5 text-blue-600" />
                إضافة شركة طيران جديدة
              </DialogTitle>
              <DialogDescription>
                تسجيل شركة طيران جديدة في الدليل لاستخدامها في كافة الحجوزات
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={e => {
                e.preventDefault();
                addAirlineMutation.mutate(quickAirlineForm);
              }}
              className="space-y-3 py-2"
            >
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">اسم شركة الطيران بالعربي *</label>
                <Input
                  required
                  placeholder="مثال: الخطوط الملكية المغربية / طيران ناس"
                  value={quickAirlineForm.name_ar}
                  onChange={e => setQuickAirlineForm(f => ({ ...f, name_ar: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">الاسم بالإنجليزية (English Name)</label>
                <Input
                  placeholder="e.g. Royal Air Maroc"
                  value={quickAirlineForm.name_en}
                  onChange={e => setQuickAirlineForm(f => ({ ...f, name_en: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">رمز IATA (حرفين) *</label>
                  <Input
                    required
                    maxLength={3}
                    placeholder="e.g. AT / XY"
                    value={quickAirlineForm.iata_code}
                    onChange={e => setQuickAirlineForm(f => ({ ...f, iata_code: e.target.value.toUpperCase() }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">دولة المقر</label>
                  <Input
                    placeholder="مثال: السعودية / المغرب"
                    value={quickAirlineForm.country}
                    onChange={e => setQuickAirlineForm(f => ({ ...f, country: e.target.value }))}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setQuickAirlineModal(false)}>إلغاء</Button>
                <Button type="submit" disabled={addAirlineMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                  {addAirlineMutation.isPending ? "جاري الحفظ..." : "حفظ واختيار الشركة"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
