import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bus, Plus, Search, Edit2, Trash2, CheckCircle2, Clock, AlertCircle,
  FileText, CheckSquare, Printer, MessageCircle, UserPlus, Calendar,
  DollarSign, Building2, Eye, ShieldCheck, Share2, ArrowUpDown, RefreshCw,
  Coins, Download, FileSpreadsheet, MapPin, Tag, CreditCard, ChevronRight,
  User, Phone, Hash, Luggage, Navigation, Check, X, Filter
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

// Available Currencies
const CURRENCIES = [
  { code: "SAR", symbol: "ر.س", label: "ريال سعودي (SAR)", flag: "🇸🇦", rateToSar: 1 },
  { code: "USD", symbol: "$", label: "دولار أمريكي (USD)", flag: "🇺🇸", rateToSar: 3.75 },
  { code: "YER", symbol: "ر.ي", label: "ريال يمني (YER)", flag: "🇾🇪", rateToSar: 0.00263 }
];

// Bus Service Types
const BUS_SERVICE_TYPES = [
  "حافلة VIP فاخرة",
  "درجة أولى رجال أعمال",
  "حافلة سرير نوم (Sleeper)",
  "حافلة بولمان سياحية عادية",
  "حافلة دولية مباشرة",
  "ميني باص HiAce سياحي",
  "حافلة كوستر Coaster",
  "سيارة نقل بري خاصة (ليموزين دولي)"
];

// Popular Bus Routes & Stations
const POPULAR_CITIES = [
  "الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام", "الخبر",
  "أبها", "خميس مشيط", "جازان", "تبوك", "حائل", "نجران", "الطائف", "ينبع",
  "صنعاء", "عدن", "تعز", "المكلا", "سيئون", "الغيضة", "مأرب",
  "دبي", "أبوظبي", "الشارقة", "المنامة", "الكويت", "مسقط", "صلالة", "عمان", "القاهرة"
];

const BUS_STATUS: Record<string, { label: string; class: string; icon: string }> = {
  confirmed: { label: "مؤكدة ومصدرة ✅", class: "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold", icon: "✅" },
  pending: { label: "قيد الحجز والتأكيد ⏳", class: "bg-blue-100 text-blue-900 border-blue-300", icon: "⏳" },
  waiting_payment: { label: "بانتظار السداد ⚠️", class: "bg-amber-100 text-amber-900 border-amber-300 font-semibold", icon: "⚠️" },
  completed: { label: "منفذة / مكتملة 🏁", class: "bg-indigo-100 text-indigo-900 border-indigo-300", icon: "🏁" },
  cancelled: { label: "ملغاة ❌", class: "bg-red-100 text-red-900 border-red-300", icon: "❌" },
  refunded: { label: "مسترجعة 🔄", class: "bg-purple-100 text-purple-900 border-purple-300", icon: "🔄" }
};

const PAYMENT_METHODS: Record<string, { label: string; badge: string }> = {
  cash: { label: "نقداً (Cash)", badge: "bg-green-50 text-green-700 border-green-200" },
  credit: { label: "آجل / على الحساب (Credit)", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  bank_transfer: { label: "تحويل بنكي (Bank)", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  pos: { label: "شبكة / مدى (POS)", badge: "bg-purple-50 text-purple-700 border-purple-200" },
  cheque: { label: "شيك بنكي (Cheque)", badge: "bg-slate-50 text-slate-700 border-slate-200" },
  wallet: { label: "محفظة / رصيد (Wallet)", badge: "bg-cyan-50 text-cyan-700 border-cyan-200" }
};

export default function TravelBusTicketsPage() {
  const qc = useQueryClient();

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [tripTypeFilter, setTripTypeFilter] = useState("all");

  // Selected Booking for Bottom Actions
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any | null>(null);

  // Quick Customer modal
  const [quickCustomerModalOpen, setQuickCustomerModalOpen] = useState(false);
  const [quickCustomerForm, setQuickCustomerForm] = useState({ name: "", phone: "", customer_type: "individual", affiliation_type: "direct" });

  // Quick Passenger modal
  const [quickPassengerModalOpen, setQuickPassengerModalOpen] = useState(false);
  const [quickPassengerForm, setQuickPassengerForm] = useState({ name_ar: "", name_en: "", passport_number: "", phone: "", nationality: "سعودي" });

  // Quick Transport Company modal (الطرف الثاني - شركة النقل البري)
  const [quickCompanyModalOpen, setQuickCompanyModalOpen] = useState(false);
  const [quickCompanyForm, setQuickCompanyForm] = useState({ name: "", phone: "", email: "", contact_person: "", address: "", balance: 0, notes: "" });

  // Print voucher / ticket modal
  const [printBooking, setPrintBooking] = useState<any | null>(null);

  // Main Form State
  const [form, setForm] = useState({
    booking_number: "",
    ticket_number: "",
    pnr_number: "",
    trip_type: "one_way",
    bus_type: "حافلة VIP فاخرة",
    bus_number: "",
    seat_number: "",

    // الطرف الأول: العميل (المدين / المستفيد)
    customer_id: "",
    customer_name: "",
    passenger_id: "",
    passenger_name: "",
    passenger_phone: "",
    passenger_national_id: "",
    selling_price: "350",
    customer_currency: "SAR",
    customer_statement: "",

    // الطرف الثاني: شركة النقل البري (الدائن / المورد)
    company_id: "",
    company_name: "",
    cost_price: "280",
    supplier_currency: "SAR",
    supplier_statement: "",

    // عمولة المكتب والربح
    agency_commission: "70",
    commission_currency: "SAR",
    commission_statement: "",
    exchange_rate: "1",

    // مسار ومحطات الرحلة
    origin_city: "الرياض",
    origin_station: "محطة العزيزية الرئيسية",
    destination_city: "جدة",
    destination_station: "محطة البلد المركزية",
    departure_date: new Date().toISOString().slice(0, 10),
    departure_time: "08:00",
    boarding_time: "07:30",
    arrival_date: new Date().toISOString().slice(0, 10),
    arrival_time: "18:00",
    return_departure_date: "",
    luggage_weight: "30",
    luggage_pieces: "2",

    // الدفع والحالة
    payment_method: "cash",
    payment_status: "paid",
    paid_amount: "350",
    remaining_balance: "0",
    status: "confirmed",
    issue_date: new Date().toISOString().slice(0, 10),
    notes: ""
  });

  // Queries
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<any[]>({
    queryKey: ["travel-bus-bookings", search, statusFilter, companyFilter, currencyFilter, paymentFilter, tripTypeFilter],
    queryFn: () => {
      const q = new URLSearchParams();
      if (search) q.set("search", search);
      if (statusFilter && statusFilter !== "all") q.set("status", statusFilter);
      if (companyFilter && companyFilter !== "all") q.set("company_id", companyFilter);
      if (currencyFilter && currencyFilter !== "all") q.set("currency", currencyFilter);
      if (paymentFilter && paymentFilter !== "all") q.set("payment_method", paymentFilter);
      if (tripTypeFilter && tripTypeFilter !== "all") q.set("trip_type", tripTypeFilter);
      return fetchWithAuth(`/api/travel/bus-bookings?${q.toString()}`);
    }
  });

  const { data: statsData } = useQuery<any>({
    queryKey: ["travel-bus-bookings-stats"],
    queryFn: () => fetchWithAuth("/api/travel/bus-bookings/stats")
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["customers-list"],
    queryFn: () => fetchWithAuth("/api/customers")
  });

  const { data: passengers = [] } = useQuery<any[]>({
    queryKey: ["travel-passengers-list"],
    queryFn: () => fetchWithAuth("/api/travel/passengers")
  });

  const { data: transportCompanies = [] } = useQuery<any[]>({
    queryKey: ["travel-transport-companies"],
    queryFn: () => fetchWithAuth("/api/travel/transport-companies")
  });

  // Selected Booking Object
  const selectedBooking = useMemo(() => {
    if (!selectedBookingId) return bookings[0] || null;
    return bookings.find(b => b.id === selectedBookingId) || bookings[0] || null;
  }, [selectedBookingId, bookings]);

  // Financial Auto-Calculation Helper
  const handleSellingPriceChange = (val: string) => {
    const sell = Number(val) || 0;
    const cost = Number(form.cost_price) || 0;
    const comm = sell - cost;
    const paid = form.payment_status === "paid" ? String(sell) : form.paid_amount;
    const rem = form.payment_status === "paid" ? "0" : String(Math.max(0, sell - (Number(paid) || 0)));

    setForm(prev => ({
      ...prev,
      selling_price: val,
      agency_commission: String(comm),
      paid_amount: paid,
      remaining_balance: rem,
      customer_statement: prev.customer_statement || `قيمة تذكرة نقل بري (${prev.origin_city} -> ${prev.destination_city})`
    }));
  };

  const handleCostPriceChange = (val: string) => {
    const cost = Number(val) || 0;
    const sell = Number(form.selling_price) || 0;
    const comm = sell - cost;
    setForm(prev => ({
      ...prev,
      cost_price: val,
      agency_commission: String(comm),
      supplier_statement: prev.supplier_statement || `تكلفة حجز مقعد حافلة نقل بري`
    }));
  };

  const handleCurrencyChange = (curr: string) => {
    setForm(prev => ({
      ...prev,
      customer_currency: curr,
      supplier_currency: curr,
      commission_currency: curr
    }));
  };

  const handleCustomerSelect = (custId: string) => {
    const cust = customers.find(c => String(c.id) === custId);
    if (cust) {
      setForm(prev => ({
        ...prev,
        customer_id: custId,
        customer_name: cust.name,
        passenger_name: prev.passenger_name || cust.name,
        passenger_phone: prev.passenger_phone || cust.phone || "",
        customer_statement: `قيمة تذكرة نقل بري للعميل: ${cust.name}`
      }));
    } else {
      setForm(prev => ({ ...prev, customer_id: custId }));
    }
  };

  const handlePassengerSelect = (passId: string) => {
    const pass = passengers.find(p => String(p.id) === passId);
    if (pass) {
      setForm(prev => ({
        ...prev,
        passenger_id: passId,
        passenger_name: pass.name_ar,
        passenger_phone: pass.phone || prev.passenger_phone,
        passenger_national_id: pass.passport_number || pass.national_id || ""
      }));
    } else {
      setForm(prev => ({ ...prev, passenger_id: passId }));
    }
  };

  const handleCompanySelect = (compId: string) => {
    const comp = transportCompanies.find(c => String(c.id) === compId);
    if (comp) {
      setForm(prev => ({
        ...prev,
        company_id: compId,
        company_name: comp.name,
        supplier_statement: `تكلفة تذكرة نقل بري طرف: ${comp.name}`
      }));
    } else {
      setForm(prev => ({ ...prev, company_id: compId }));
    }
  };

  // Mutations
  const saveBookingMutation = useMutation({
    mutationFn: (payload: any) => {
      if (editingBooking) {
        return fetchWithAuth(`/api/travel/bus-bookings/${editingBooking.id}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      }
      return fetchWithAuth("/api/travel/bus-bookings", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["travel-bus-bookings"] });
      qc.invalidateQueries({ queryKey: ["travel-bus-bookings-stats"] });
      setModalOpen(false);
      if (data?.id) setSelectedBookingId(data.id);
      resetForm();
    }
  });

  const deleteBookingMutation = useMutation({
    mutationFn: (id: number) => fetchWithAuth(`/api/travel/bus-bookings/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["travel-bus-bookings"] });
      qc.invalidateQueries({ queryKey: ["travel-bus-bookings-stats"] });
      setSelectedBookingId(null);
    }
  });

  const quickCustomerMutation = useMutation({
    mutationFn: (payload: any) => fetchWithAuth("/api/customers", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: (newCust: any) => {
      qc.invalidateQueries({ queryKey: ["customers-list"] });
      setQuickCustomerModalOpen(false);
      setForm(prev => ({
        ...prev,
        customer_id: String(newCust.id),
        customer_name: newCust.name,
        passenger_name: prev.passenger_name || newCust.name,
        passenger_phone: prev.passenger_phone || newCust.phone || ""
      }));
      setQuickCustomerForm({ name: "", phone: "", customer_type: "individual", affiliation_type: "direct" });
    }
  });

  const quickPassengerMutation = useMutation({
    mutationFn: (payload: any) => fetchWithAuth("/api/travel/passengers", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: (newPass: any) => {
      qc.invalidateQueries({ queryKey: ["travel-passengers-list"] });
      setQuickPassengerModalOpen(false);
      setForm(prev => ({
        ...prev,
        passenger_id: String(newPass.id),
        passenger_name: newPass.name_ar,
        passenger_phone: newPass.phone || prev.passenger_phone,
        passenger_national_id: newPass.passport_number || ""
      }));
      setQuickPassengerForm({ name_ar: "", name_en: "", passport_number: "", phone: "", nationality: "سعودي" });
    }
  });

  const quickCompanyMutation = useMutation({
    mutationFn: (payload: any) => fetchWithAuth("/api/travel/transport-companies", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: (newComp: any) => {
      qc.invalidateQueries({ queryKey: ["travel-transport-companies"] });
      setQuickCompanyModalOpen(false);
      setForm(prev => ({
        ...prev,
        company_id: String(newComp.id),
        company_name: newComp.name,
        supplier_statement: `تكلفة حجز مقعد لدى ${newComp.name}`
      }));
      setQuickCompanyForm({ name: "", phone: "", email: "", contact_person: "", address: "", balance: 0, notes: "" });
    }
  });

  const resetForm = () => {
    setEditingBooking(null);
    setForm({
      booking_number: `BUS-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      ticket_number: `TKT-BUS-${Math.floor(100000 + Math.random() * 900000)}`,
      pnr_number: `PNR-LND-${Math.floor(1000 + Math.random() * 9000)}`,
      trip_type: "one_way",
      bus_type: "حافلة VIP فاخرة",
      bus_number: "",
      seat_number: "",

      customer_id: "",
      customer_name: "",
      passenger_id: "",
      passenger_name: "",
      passenger_phone: "",
      passenger_national_id: "",
      selling_price: "350",
      customer_currency: "SAR",
      customer_statement: "قيمة تذكرة نقل بري (الرياض -> جدة)",

      company_id: "",
      company_name: "",
      cost_price: "280",
      supplier_currency: "SAR",
      supplier_statement: "تكلفة حجز مقعد حافلة نقل بري",

      agency_commission: "70",
      commission_currency: "SAR",
      commission_statement: "عمولة وربح حجز تذكرة نقل بري",
      exchange_rate: "1",

      origin_city: "الرياض",
      origin_station: "محطة العزيزية الرئيسية",
      destination_city: "جدة",
      destination_station: "محطة البلد المركزية",
      departure_date: new Date().toISOString().slice(0, 10),
      departure_time: "08:00",
      boarding_time: "07:30",
      arrival_date: new Date().toISOString().slice(0, 10),
      arrival_time: "18:00",
      return_departure_date: "",
      luggage_weight: "30",
      luggage_pieces: "2",

      payment_method: "cash",
      payment_status: "paid",
      paid_amount: "350",
      remaining_balance: "0",
      status: "confirmed",
      issue_date: new Date().toISOString().slice(0, 10),
      notes: ""
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleEdit = (bk: any) => {
    setEditingBooking(bk);
    setForm({
      booking_number: bk.booking_number || "",
      ticket_number: bk.ticket_number || "",
      pnr_number: bk.pnr_number || "",
      trip_type: bk.trip_type || "one_way",
      bus_type: bk.bus_type || "حافلة VIP فاخرة",
      bus_number: bk.bus_number || "",
      seat_number: bk.seat_number || "",

      customer_id: bk.customer_id ? String(bk.customer_id) : "",
      customer_name: bk.customer_name || bk.customer_name_joined || "",
      passenger_id: bk.passenger_id ? String(bk.passenger_id) : "",
      passenger_name: bk.passenger_name || bk.passenger_name_joined || "",
      passenger_phone: bk.passenger_phone || bk.passenger_phone_joined || "",
      passenger_national_id: bk.passenger_national_id || bk.passenger_passport_joined || "",
      selling_price: String(bk.selling_price || 0),
      customer_currency: bk.customer_currency || "SAR",
      customer_statement: bk.customer_statement || "",

      company_id: bk.company_id ? String(bk.company_id) : "",
      company_name: bk.company_name || bk.company_name_joined || "",
      cost_price: String(bk.cost_price || 0),
      supplier_currency: bk.supplier_currency || "SAR",
      supplier_statement: bk.supplier_statement || "",

      agency_commission: String(bk.agency_commission || 0),
      commission_currency: bk.commission_currency || "SAR",
      commission_statement: bk.commission_statement || "",
      exchange_rate: String(bk.exchange_rate || 1),

      origin_city: bk.origin_city || "",
      origin_station: bk.origin_station || "",
      destination_city: bk.destination_city || "",
      destination_station: bk.destination_station || "",
      departure_date: bk.departure_date || "",
      departure_time: bk.departure_time || "",
      boarding_time: bk.boarding_time || "",
      arrival_date: bk.arrival_date || "",
      arrival_time: bk.arrival_time || "",
      return_departure_date: bk.return_departure_date || "",
      luggage_weight: String(bk.luggage_weight || 30),
      luggage_pieces: String(bk.luggage_pieces || 2),

      payment_method: bk.payment_method || "cash",
      payment_status: bk.payment_status || "paid",
      paid_amount: String(bk.paid_amount || 0),
      remaining_balance: String(bk.remaining_balance || 0),
      status: bk.status || "confirmed",
      issue_date: bk.issue_date || new Date().toISOString().slice(0, 10),
      notes: bk.notes || ""
    });
    setModalOpen(true);
  };

  const handlePrint = (bk: any) => {
    setPrintBooking(bk);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!bookings.length) return;
    const headers = [
      "رقم الحجز", "رقم التذكرة", "رقم PNR", "العميل", "المسافر", "شركة النقل البري",
      "مسار الرحلة", "تاريخ التحرك", "نوع الباص", "رقم المقعد",
      "سعر البيع", "عملة البيع", "بيان العميل",
      "سعر التكلفة", "عملة التكلفة", "بيان شركة النقل",
      "عمولة المكتب", "بيان العمولة",
      "طريقة الدفع", "حالة الدفع", "الحالة"
    ];

    const rows = bookings.map(b => [
      b.booking_number,
      b.ticket_number,
      b.pnr_number,
      b.customer_name || b.customer_name_joined || "-",
      b.passenger_name || b.passenger_name_joined || "-",
      b.company_name || b.company_name_joined || "-",
      `${b.origin_city || ""} -> ${b.destination_city || ""}`,
      `${b.departure_date || ""} ${b.departure_time || ""}`,
      b.bus_type || "-",
      b.seat_number || "-",
      b.selling_price || 0,
      b.customer_currency || "SAR",
      `"${(b.customer_statement || "").replace(/"/g, '""')}"`,
      b.cost_price || 0,
      b.supplier_currency || "SAR",
      `"${(b.supplier_statement || "").replace(/"/g, '""')}"`,
      b.agency_commission || 0,
      `"${(b.commission_statement || "").replace(/"/g, '""')}"`,
      PAYMENT_METHODS[b.payment_method]?.label || b.payment_method,
      b.payment_status === "paid" ? "مدفوع" : "آجل",
      BUS_STATUS[b.status]?.label || b.status
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `حجوزات_تذاكر_النقل_البري_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pb-28 text-right" dir="rtl">
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-l from-emerald-900 via-teal-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl border border-emerald-700/30">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 backdrop-blur-md rounded-xl border border-emerald-400/30 text-emerald-300">
                <Bus className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  حجوزات وتذاكر النقل البري والباصات
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 font-mono">
                    Land Transport Tickets
                  </span>
                </h1>
                <p className="text-sm text-emerald-100/80">
                  إدارة شاملة لحجوزات الحافلات وخطوط النقل البري بنظام الطرفين (العميل والشركة)، وتعدد العملات، وتتبع العمولات وبيانات المحطات.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              id="btn-add-bus-booking-top"
              onClick={handleOpenAdd}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold gap-2 shadow-lg shadow-emerald-500/25 border border-emerald-400/30 px-5 py-2.5 h-auto text-base"
            >
              <Plus className="w-5 h-5" />
              إضافة حجز تذكرة جديد ➕
            </Button>
            <Button
              id="btn-add-transport-company-top"
              onClick={() => setQuickCompanyModalOpen(true)}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-medium gap-2"
            >
              <Building2 className="w-4 h-4 text-emerald-300" />
              إضافة شركة نقل بري 🏢
            </Button>
            <Button
              id="btn-export-bus-bookings-csv"
              onClick={handleExportCSV}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-medium gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-300" />
              تصدير كشف Excel 📊
            </Button>
            <Button
              id="btn-refresh-bus-bookings"
              onClick={() => {
                qc.invalidateQueries({ queryKey: ["travel-bus-bookings"] });
                qc.invalidateQueries({ queryKey: ["travel-bus-bookings-stats"] });
              }}
              variant="ghost"
              className="text-emerald-200 hover:text-white hover:bg-white/10 p-2.5"
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Currency Financial Stats Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Total Volume */}
          <Card className="border-emerald-200/60 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-emerald-800">إجمالي تذاكر النقل البري</p>
                  <h3 className="text-3xl font-black text-emerald-950 mt-1">{statsData?.total_count || bookings.length}</h3>
                  <p className="text-xs text-emerald-700 mt-1 font-medium">حجز مسجل بالنظام</p>
                </div>
                <div className="p-3.5 bg-emerald-100 text-emerald-800 rounded-2xl">
                  <Bus className="w-7 h-7" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SAR Financials */}
          {(() => {
            const sarStat = statsData?.currency_stats?.find((s: any) => s.currency === "SAR") || {
              total_sales: bookings.filter(b => (b.customer_currency || "SAR") === "SAR").reduce((acc, b) => acc + (b.selling_price || 0), 0),
              total_cost: bookings.filter(b => (b.customer_currency || "SAR") === "SAR").reduce((acc, b) => acc + (b.cost_price || 0), 0),
              total_commission: bookings.filter(b => (b.customer_currency || "SAR") === "SAR").reduce((acc, b) => acc + (b.agency_commission || 0), 0)
            };
            return (
              <Card className="border-blue-200/60 shadow-sm bg-gradient-to-br from-blue-50 to-white">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">🇸🇦</span>
                        <p className="text-xs font-bold text-blue-900">الريال السعودي (SAR)</p>
                      </div>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xl font-black text-blue-950">{Number(sarStat.total_sales || 0).toLocaleString()}</span>
                        <span className="text-xs text-blue-700 font-bold">ر.س مبيعات</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs pt-1 border-t border-blue-100">
                        <span className="text-slate-600">التكلفة: <b className="text-slate-900">{Number(sarStat.total_cost || 0).toLocaleString()}</b></span>
                        <span className="text-emerald-700 font-bold">العمولة: <b>{Number(sarStat.total_commission || 0).toLocaleString()}</b></span>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-100 text-blue-800 rounded-2xl">
                      <DollarSign className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* USD Financials */}
          {(() => {
            const usdStat = statsData?.currency_stats?.find((s: any) => s.currency === "USD") || {
              total_sales: bookings.filter(b => b.customer_currency === "USD").reduce((acc, b) => acc + (b.selling_price || 0), 0),
              total_cost: bookings.filter(b => b.customer_currency === "USD").reduce((acc, b) => acc + (b.cost_price || 0), 0),
              total_commission: bookings.filter(b => b.customer_currency === "USD").reduce((acc, b) => acc + (b.agency_commission || 0), 0)
            };
            return (
              <Card className="border-teal-200/60 shadow-sm bg-gradient-to-br from-teal-50 to-white">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">🇺🇸</span>
                        <p className="text-xs font-bold text-teal-900">الدولار الأمريكي (USD)</p>
                      </div>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xl font-black text-teal-950">${Number(usdStat.total_sales || 0).toLocaleString()}</span>
                        <span className="text-xs text-teal-700 font-bold">مبيعات</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs pt-1 border-t border-teal-100">
                        <span className="text-slate-600">التكلفة: <b className="text-slate-900">${Number(usdStat.total_cost || 0).toLocaleString()}</b></span>
                        <span className="text-emerald-700 font-bold">العمولة: <b>${Number(usdStat.total_commission || 0).toLocaleString()}</b></span>
                      </div>
                    </div>
                    <div className="p-3 bg-teal-100 text-teal-800 rounded-2xl">
                      <Coins className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* YER Financials */}
          {(() => {
            const yerStat = statsData?.currency_stats?.find((s: any) => s.currency === "YER") || {
              total_sales: bookings.filter(b => b.customer_currency === "YER").reduce((acc, b) => acc + (b.selling_price || 0), 0),
              total_cost: bookings.filter(b => b.customer_currency === "YER").reduce((acc, b) => acc + (b.cost_price || 0), 0),
              total_commission: bookings.filter(b => b.customer_currency === "YER").reduce((acc, b) => acc + (b.agency_commission || 0), 0)
            };
            return (
              <Card className="border-amber-200/60 shadow-sm bg-gradient-to-br from-amber-50 to-white">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">🇾🇪</span>
                        <p className="text-xs font-bold text-amber-900">الريال اليمني (YER)</p>
                      </div>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xl font-black text-amber-950">{Number(yerStat.total_sales || 0).toLocaleString()}</span>
                        <span className="text-xs text-amber-700 font-bold">ر.ي مبيعات</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs pt-1 border-t border-amber-100">
                        <span className="text-slate-600">التكلفة: <b className="text-slate-900">{Number(yerStat.total_cost || 0).toLocaleString()}</b></span>
                        <span className="text-emerald-700 font-bold">العمولة: <b>{Number(yerStat.total_commission || 0).toLocaleString()}</b></span>
                      </div>
                    </div>
                    <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl">
                      <CreditCard className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>

        {/* Filter and Search Box */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
              {/* Search Bar */}
              <div className="lg:col-span-2 relative">
                <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                <Input
                  id="input-search-bus-bookings"
                  placeholder="بحث برقم التذكرة، الحجز، العميل، شركة النقل، المسار، المقعد..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pr-9 bg-slate-50 border-slate-200 text-sm"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  id="select-status-filter"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">جميع الحالات (All Statuses)</option>
                  <option value="confirmed">مؤكدة ومصدرة ✅</option>
                  <option value="pending">قيد الحجز والتأكيد ⏳</option>
                  <option value="waiting_payment">بانتظار السداد ⚠️</option>
                  <option value="completed">منفذة / مكتملة 🏁</option>
                  <option value="cancelled">ملغاة ❌</option>
                  <option value="refunded">مسترجعة 🔄</option>
                </select>
              </div>

              {/* Company Filter (الطرف الثاني) */}
              <div>
                <select
                  id="select-company-filter"
                  value={companyFilter}
                  onChange={e => setCompanyFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">جميع شركات النقل البري (الطرف الثاني)</option>
                  {transportCompanies.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Currency Filter */}
              <div>
                <select
                  id="select-currency-filter"
                  value={currencyFilter}
                  onChange={e => setCurrencyFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">جميع العملات (All Currencies)</option>
                  <option value="SAR">🇸🇦 ريال سعودي (SAR)</option>
                  <option value="USD">🇺🇸 دولار أمريكي (USD)</option>
                  <option value="YER">🇾🇪 ريال يمني (YER)</option>
                </select>
              </div>

              {/* Payment Method Filter */}
              <div>
                <select
                  id="select-payment-filter"
                  value={paymentFilter}
                  onChange={e => setPaymentFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">جميع طرق الدفع (Payment Methods)</option>
                  <option value="cash">نقداً (Cash)</option>
                  <option value="credit">آجل / على الحساب (Credit)</option>
                  <option value="bank_transfer">تحويل بنكي (Bank Transfer)</option>
                  <option value="pos">شبكة / مدى (POS)</option>
                  <option value="cheque">شيك بنكي (Cheque)</option>
                  <option value="wallet">خصم من المحفظة (Wallet)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bus Bookings Table List */}
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <Bus className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-slate-900 text-base">قائمة معاملات وحجوزات تذاكر النقل البري</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                {bookings.length} معاملة
              </span>
            </div>
            <p className="text-xs text-slate-500">
              * انقر على أي سطر لتحديده وتطبيق إجراءات الطباعة أو التعديل السريعة
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 text-xs font-bold border-b border-slate-200">
                  <th className="py-3.5 px-4">رقم المعاملة / التذكرة</th>
                  <th className="py-3.5 px-4">الطرف الأول (العميل والمسافر)</th>
                  <th className="py-3.5 px-4">الطرف الثاني (شركة النقل البري)</th>
                  <th className="py-3.5 px-4">مسار الرحلة والمواعيد</th>
                  <th className="py-3.5 px-4">تفاصيل الحافلة والمقعد</th>
                  <th className="py-3.5 px-4">المبالغ ونظام الطرفين والعمولة</th>
                  <th className="py-3.5 px-4">طريقة وحالة الدفع</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {bookingsLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-7 h-7 animate-spin text-emerald-600" />
                        <span>جاري تحميل بيانات تذاكر النقل البري...</span>
                      </div>
                    </td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="p-4 bg-slate-50 rounded-full text-slate-300">
                          <Bus className="w-10 h-10" />
                        </div>
                        <p className="text-base font-medium text-slate-600">لا توجد حجوزات تذاكر نقل بري مطابقة للبحث</p>
                        <Button
                          id="btn-empty-add-bus"
                          onClick={handleOpenAdd}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold"
                        >
                          <Plus className="w-4 h-4" />
                          إضافة أول حجز نقل بري الآن ➕
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  bookings.map((bk: any) => {
                    const isSelected = selectedBookingId === bk.id;
                    const statusObj = BUS_STATUS[bk.status] || { label: bk.status, class: "bg-slate-100 text-slate-800" };
                    const payMethodObj = PAYMENT_METHODS[bk.payment_method] || { label: bk.payment_method, badge: "bg-slate-100 text-slate-800" };

                    return (
                      <tr
                        key={bk.id}
                        id={`bus-row-${bk.id}`}
                        onClick={() => setSelectedBookingId(bk.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-emerald-50/80 border-r-4 border-emerald-600 font-medium"
                            : "hover:bg-slate-50/80"
                        }`}
                      >
                        {/* Booking & Ticket Number */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <span className="font-mono font-bold text-slate-900 text-sm block">
                              {bk.booking_number}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-emerald-700 font-mono">
                              <Tag className="w-3 h-3" />
                              <span>{bk.ticket_number || "TKT-PENDING"}</span>
                            </div>
                            {bk.pnr_number && (
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                                PNR: {bk.pnr_number}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* First Party: Customer & Passenger */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-blue-600" />
                              <span>{bk.customer_name || bk.customer_name_joined || "عميل نقدي"}</span>
                            </div>
                            {(bk.passenger_name || bk.passenger_name_joined) && (
                              <p className="text-xs text-slate-600">
                                الراكب: <span className="font-semibold text-slate-800">{bk.passenger_name || bk.passenger_name_joined}</span>
                              </p>
                            )}
                            {(bk.passenger_phone || bk.customer_phone_joined) && (
                              <p className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                                <Phone className="w-3 h-3" />
                                {bk.passenger_phone || bk.customer_phone_joined}
                              </p>
                            )}
                            {bk.customer_statement && (
                              <p className="text-[11px] text-blue-800 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-100 line-clamp-1 max-w-[200px]" title={bk.customer_statement}>
                                📝 {bk.customer_statement}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Second Party: Transport Company */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{bk.company_name || bk.company_name_joined || "شركة نقل بري"}</span>
                            </div>
                            {bk.company_phone_joined && (
                              <p className="text-xs text-slate-500 font-mono">
                                📞 {bk.company_phone_joined}
                              </p>
                            )}
                            {bk.supplier_statement && (
                              <p className="text-[11px] text-emerald-800 bg-emerald-50/80 px-2 py-0.5 rounded border border-emerald-100 line-clamp-1 max-w-[200px]" title={bk.supplier_statement}>
                                🏷️ {bk.supplier_statement}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Route & Schedule */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 font-bold text-slate-900 text-xs">
                              <span className="text-blue-700">{bk.origin_city || "الرياض"}</span>
                              <span className="text-slate-400">⬅️</span>
                              <span className="text-emerald-700">{bk.destination_city || "جدة"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {bk.departure_date}
                              </span>
                              {bk.departure_time && (
                                <span className="flex items-center gap-1 font-mono text-slate-700 font-semibold">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {bk.departure_time}
                                </span>
                              )}
                            </div>
                            {bk.trip_type === "round_trip" && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                                🔁 ذهاب وعودة {bk.return_departure_date ? `(${bk.return_departure_date})` : ""}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Bus & Seat */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1 text-xs">
                            <span className="font-semibold text-slate-800 block">
                              {bk.bus_type || "حافلة VIP"}
                            </span>
                            <div className="flex items-center gap-2">
                              {bk.seat_number && (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold border border-emerald-200">
                                  مقعد: {bk.seat_number}
                                </span>
                              )}
                              {bk.bus_number && (
                                <span className="text-slate-600 font-mono">
                                  باص: {bk.bus_number}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Luggage className="w-3 h-3" />
                              أمتعة: {bk.luggage_weight || 30} كجم ({bk.luggage_pieces || 2} حقيبة)
                            </span>
                          </div>
                        </td>

                        {/* Financials & Two-Party Accounting & Commission */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-600">سعر البيع (العميل):</span>
                              <span className="font-bold text-blue-900 font-mono">
                                {Number(bk.selling_price || 0).toLocaleString()} {bk.customer_currency || "SAR"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-slate-500">
                              <span>التكلفة (الشركة):</span>
                              <span className="font-mono">
                                {Number(bk.cost_price || 0).toLocaleString()} {bk.supplier_currency || bk.customer_currency || "SAR"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                              <span className="font-bold text-emerald-700">عمولة المكتب:</span>
                              <span className="font-black text-emerald-700 font-mono">
                                +{Number(bk.agency_commission || 0).toLocaleString()} {bk.commission_currency || bk.customer_currency || "SAR"}
                              </span>
                            </div>
                            {bk.commission_statement && (
                              <p className="text-[10px] text-emerald-700 italic truncate max-w-[180px]" title={bk.commission_statement}>
                                {bk.commission_statement}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Payment Method & Status */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <span className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium ${payMethodObj.badge}`}>
                              {payMethodObj.label}
                            </span>
                            <div>
                              {bk.payment_status === "paid" ? (
                                <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                                  <Check className="w-3 h-3" /> مدفوع بالكامل
                                </span>
                              ) : (
                                <span className="text-xs text-amber-700 font-bold flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> آجل ({Number(bk.remaining_balance || bk.selling_price || 0).toLocaleString()} {bk.customer_currency})
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-block text-xs px-2.5 py-1 rounded-full border font-bold ${statusObj.class}`}>
                            {statusObj.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                            <Button
                              id={`btn-print-bus-${bk.id}`}
                              size="sm"
                              variant="ghost"
                              onClick={() => handlePrint(bk)}
                              className="text-emerald-700 hover:bg-emerald-50 h-8 w-8 p-0"
                              title="طباعة واستعراض التذكرة"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Button
                              id={`btn-edit-bus-${bk.id}`}
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(bk)}
                              className="text-blue-700 hover:bg-blue-50 h-8 w-8 p-0"
                              title="تعديل المعاملة"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              id={`btn-delete-bus-${bk.id}`}
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من حذف حجز التذكرة رقم ${bk.booking_number}؟`)) {
                                  deleteBookingMutation.mutate(bk.id);
                                }
                              }}
                              className="text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                              title="حذف المعاملة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* BOTTOM FIXED ACTIONS BAR - Explicitly requested by user:
            "مع اضافه نهاية الشاشه ازرار طباعه المعاملة (استعراض) وزر اضافه معامله جديد وزر البحث عن معاملات سابقه وزر تعديل المعامله" */}
        <div className="fixed bottom-0 right-0 left-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-2xl p-4 z-40">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <Bus className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-500 block">المعاملة المحددة حالياً:</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {selectedBooking ? `${selectedBooking.booking_number} - (${selectedBooking.passenger_name || selectedBooking.customer_name})` : "لم يتم تحديد معاملة"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Button: Add New Booking */}
              <Button
                id="btn-bottom-add-booking"
                onClick={handleOpenAdd}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 px-5 shadow-md shadow-emerald-600/20"
              >
                <Plus className="w-4 h-4" />
                إضافة معاملة جديدة ➕
              </Button>

              {/* Button: Edit Booking */}
              <Button
                id="btn-bottom-edit-booking"
                disabled={!selectedBooking}
                onClick={() => selectedBooking && handleEdit(selectedBooking)}
                variant="outline"
                className="border-blue-300 text-blue-800 hover:bg-blue-50 font-bold gap-2"
              >
                <Edit2 className="w-4 h-4" />
                تعديل المعاملة ✏️
              </Button>

              {/* Button: Print / Preview Booking */}
              <Button
                id="btn-bottom-print-booking"
                disabled={!selectedBooking}
                onClick={() => selectedBooking && handlePrint(selectedBooking)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold gap-2 shadow-md"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                طباعة المعاملة (استعراض) 🖨️
              </Button>

              {/* Button: Search / Filter Focus */}
              <Button
                id="btn-bottom-search-booking"
                onClick={() => {
                  const input = document.getElementById("input-search-bus-bookings");
                  input?.focus();
                  window.scrollTo({ top: 180, behavior: "smooth" });
                }}
                variant="outline"
                className="border-slate-300 text-slate-700 hover:bg-slate-100 font-bold gap-2"
              >
                <Search className="w-4 h-4 text-slate-500" />
                البحث عن معاملات سابقة 🔍
              </Button>
            </div>
          </div>
        </div>

        {/* MODAL: ADD / EDIT BUS TICKET BOOKING (نظام الطرفين المتكامل) */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto text-right" dir="rtl">
            <DialogHeader className="border-b pb-3 text-right">
              <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2 text-right">
                <Bus className="w-6 h-6 text-emerald-600" />
                {editingBooking ? `تعديل حجز تذكرة نقل بري (${editingBooking.booking_number})` : "تسجيل حجز تذكرة نقل بري جديدة (نظام الطرفين)"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 text-right">
                أدخل تفاصيل الطرف الأول (العميل والمسافر)، والطرف الثاني (شركة النقل البري)، ومبالغ التكلفة والبيع والعمولة، ومسار وتوقيت الحافلة.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Currency Selector Bar */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-emerald-700" />
                  <span className="text-sm font-bold text-emerald-950">عملة التعامل بالمعاملة:</span>
                </div>
                <div className="flex items-center gap-2">
                  {CURRENCIES.map(c => (
                    <Button
                      key={c.code}
                      type="button"
                      size="sm"
                      variant={form.customer_currency === c.code ? "default" : "outline"}
                      onClick={() => handleCurrencyChange(c.code)}
                      className={form.customer_currency === c.code ? "bg-emerald-700 text-white font-bold" : "bg-white text-slate-700"}
                    >
                      <span>{c.flag}</span>
                      <span>{c.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Section 1: Trip & Bus Identification */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  بيانات التذكرة والحافلة الأساسية
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">رقم المعاملة (Booking Ref)</label>
                    <Input
                      value={form.booking_number}
                      onChange={e => setForm({ ...form, booking_number: e.target.value })}
                      className="font-mono text-sm bg-white"
                      placeholder="BUS-2026-XXXX"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">رقم التذكرة (Ticket No.)</label>
                    <Input
                      value={form.ticket_number}
                      onChange={e => setForm({ ...form, ticket_number: e.target.value })}
                      className="font-mono text-sm bg-white"
                      placeholder="TKT-BUS-XXXXXX"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">رقم البوليصة / PNR</label>
                    <Input
                      value={form.pnr_number}
                      onChange={e => setForm({ ...form, pnr_number: e.target.value })}
                      className="font-mono text-sm bg-white"
                      placeholder="PNR-LND-XXXX"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">نوع الرحلة</label>
                    <select
                      value={form.trip_type}
                      onChange={e => setForm({ ...form, trip_type: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm"
                    >
                      <option value="one_way">ذهاب فقط (One-Way)</option>
                      <option value="round_trip">ذهاب وعودة (Round-Trip)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">نوع الحافلة والخدمة</label>
                    <select
                      value={form.bus_type}
                      onChange={e => setForm({ ...form, bus_type: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm"
                    >
                      {BUS_SERVICE_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">رقم الحافلة / الباص (Bus No.)</label>
                    <Input
                      value={form.bus_number}
                      onChange={e => setForm({ ...form, bus_number: e.target.value })}
                      className="font-mono text-sm bg-white"
                      placeholder="مثال: باص 102 أو ر ي ض 550"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">رقم المقعد / المقاعد (Seat No.)</label>
                    <Input
                      value={form.seat_number}
                      onChange={e => setForm({ ...form, seat_number: e.target.value })}
                      className="font-mono text-sm bg-white"
                      placeholder="مثال: 12A أو 05-06"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: FIRST PARTY (الطرف الأول: العميل والمسافر) */}
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-700" />
                    الطرف الأول: العميل والمسافر (سعر البيع وبيان العميل)
                  </h4>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setQuickCustomerModalOpen(true)}
                      className="text-xs h-7 gap-1 border-blue-300 text-blue-800 bg-white"
                    >
                      <UserPlus className="w-3 h-3" />
                      + إضافة عميل جديد
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setQuickPassengerModalOpen(true)}
                      className="text-xs h-7 gap-1 border-blue-300 text-blue-800 bg-white"
                    >
                      <UserPlus className="w-3 h-3" />
                      + إضافة مسافر جديد
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Select Customer */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">العميل (الحساب المدين)</label>
                    <select
                      value={form.customer_id}
                      onChange={e => handleCustomerSelect(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-blue-300 bg-white text-sm"
                    >
                      <option value="">-- اختر العميل --</option>
                      {customers.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.phone || "بدون هاتف"})</option>
                      ))}
                    </select>
                  </div>

                  {/* Select Passenger */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">المسافر / الراكب</label>
                    <select
                      value={form.passenger_id}
                      onChange={e => handlePassengerSelect(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-blue-300 bg-white text-sm"
                    >
                      <option value="">-- اختر المسافر (أو اكتبه أدناه) --</option>
                      {passengers.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name_ar} ({p.passport_number || p.phone || ""})</option>
                      ))}
                    </select>
                  </div>

                  {/* Passenger Phone */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">هاتف الراكب للتواصل</label>
                    <Input
                      value={form.passenger_phone}
                      onChange={e => setForm({ ...form, passenger_phone: e.target.value })}
                      placeholder="05XXXXXXXX"
                      className="font-mono text-sm bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Passenger Name direct text */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">اسم المسافر بالكامل (كما في الهوية)</label>
                    <Input
                      value={form.passenger_name}
                      onChange={e => setForm({ ...form, passenger_name: e.target.value })}
                      placeholder="الاسم الثلاثي أو الرباعي"
                      className="text-sm bg-white"
                    />
                  </div>

                  {/* Passenger National ID / Passport */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">رقم الهوية الوطنية / الإقامة / الجواز</label>
                    <Input
                      value={form.passenger_national_id}
                      onChange={e => setForm({ ...form, passenger_national_id: e.target.value })}
                      placeholder="10XXXXXXXX أو رقم الجواز"
                      className="font-mono text-sm bg-white"
                    />
                  </div>

                  {/* Selling Price */}
                  <div>
                    <label className="text-xs font-bold text-blue-900 mb-1 block">
                      مبلغ التذكرة على العميل (سعر البيع) *
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="any"
                        value={form.selling_price}
                        onChange={e => handleSellingPriceChange(e.target.value)}
                        className="font-mono font-bold text-base text-blue-950 bg-white border-blue-400 pl-14"
                      />
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-blue-700">
                        {form.customer_currency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Customer Statement (خانة البيان للعميل) */}
                <div>
                  <label className="text-xs font-bold text-blue-900 mb-1 block">
                    خانة البيان والشرح المحاسبي للعميل (Statement) *
                  </label>
                  <Input
                    value={form.customer_statement}
                    onChange={e => setForm({ ...form, customer_statement: e.target.value })}
                    placeholder="مثال: قيمة تذكرة نقل بري VIP من الرياض إلى مكة المكرمة شاملة الضيافة"
                    className="text-sm bg-white border-blue-300"
                  />
                </div>
              </div>

              {/* Section 3: SECOND PARTY (الطرف الثاني: شركة النقل البري) */}
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-700" />
                    الطرف الثاني: شركة النقل البري (سعر التكلفة وبيان الشركة)
                  </h4>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setQuickCompanyModalOpen(true)}
                    className="text-xs h-7 gap-1 border-emerald-300 text-emerald-800 bg-white"
                  >
                    <Plus className="w-3 h-3" />
                    + إضافة شركة نقل بري كدليل
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Select Company */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">شركة النقل البري (الحساب الدائن / المورد) *</label>
                    <select
                      value={form.company_id}
                      onChange={e => handleCompanySelect(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-emerald-300 bg-white text-sm font-semibold text-emerald-950"
                    >
                      <option value="">-- اختر شركة النقل البري --</option>
                      {transportCompanies.map((comp: any) => (
                        <option key={comp.id} value={comp.id}>{comp.name} {comp.phone ? `(${comp.phone})` : ""}</option>
                      ))}
                    </select>
                  </div>

                  {/* Cost Price */}
                  <div>
                    <label className="text-xs font-bold text-emerald-900 mb-1 block">
                      سعر التكلفة من شركة النقل البري *
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="any"
                        value={form.cost_price}
                        onChange={e => handleCostPriceChange(e.target.value)}
                        className="font-mono font-bold text-base text-slate-900 bg-white border-emerald-400 pl-14"
                      />
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-emerald-700">
                        {form.supplier_currency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Supplier Statement (خانة البيان لشركة النقل) */}
                <div>
                  <label className="text-xs font-bold text-emerald-900 mb-1 block">
                    خانة البيان والشرح المحاسبي لشركة النقل البري (Statement) *
                  </label>
                  <Input
                    value={form.supplier_statement}
                    onChange={e => setForm({ ...form, supplier_statement: e.target.value })}
                    placeholder="مثال: تكلفة إصدار مقعد باص سابتكو VIP رحلة رقم 901"
                    className="text-sm bg-white border-emerald-300"
                  />
                </div>
              </div>

              {/* Section 4: AGENCY COMMISSION & PROFIT (عمولة المكتب الخاص بنا) */}
              <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 space-y-3">
                <h4 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-700" />
                  عمولة وأرباح المكتب الخاص بنا (Agency Commission)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-amber-900 mb-1 block">مبلغ العمولة / الربح (Commission) *</label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="any"
                        value={form.agency_commission}
                        onChange={e => setForm({ ...form, agency_commission: e.target.value })}
                        className="font-mono font-bold text-base text-emerald-700 bg-white border-amber-400 pl-14"
                      />
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-amber-800">
                        {form.commission_currency}
                      </span>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-amber-900 mb-1 block">خانة بيان العمولة والشرح المحاسبي</label>
                    <Input
                      value={form.commission_statement}
                      onChange={e => setForm({ ...form, commission_statement: e.target.value })}
                      placeholder="مثال: عمولة وأرباح إصدار تذكرة نقل بري طرف مكتب السعادة"
                      className="text-sm bg-white border-amber-300"
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Route & Stations Details (مسار الرحلة والمحطات) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-emerald-600" />
                  تفاصيل المسار والمحطات والمواعيد
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {/* Origin City */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">مدينة الانطلاق (From City)</label>
                    <Input
                      value={form.origin_city}
                      onChange={e => setForm({ ...form, origin_city: e.target.value })}
                      list="cities-list"
                      placeholder="الرياض"
                      className="text-sm bg-white"
                    />
                  </div>

                  {/* Origin Station */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">محطة / موقف الانطلاق</label>
                    <Input
                      value={form.origin_station}
                      onChange={e => setForm({ ...form, origin_station: e.target.value })}
                      placeholder="محطة العزيزية الرئيسية"
                      className="text-sm bg-white"
                    />
                  </div>

                  {/* Destination City */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">مدينة الوصول (To City)</label>
                    <Input
                      value={form.destination_city}
                      onChange={e => setForm({ ...form, destination_city: e.target.value })}
                      list="cities-list"
                      placeholder="جدة"
                      className="text-sm bg-white"
                    />
                  </div>

                  {/* Destination Station */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">محطة / موقف الوصول</label>
                    <Input
                      value={form.destination_station}
                      onChange={e => setForm({ ...form, destination_station: e.target.value })}
                      placeholder="محطة البلد المركزية"
                      className="text-sm bg-white"
                    />
                  </div>
                </div>

                <datalist id="cities-list">
                  {POPULAR_CITIES.map(c => <option key={c} value={c} />)}
                </datalist>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">تاريخ السفر والتحرك *</label>
                    <Input
                      type="date"
                      value={form.departure_date}
                      onChange={e => setForm({ ...form, departure_date: e.target.value })}
                      className="text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">توقيت التحرك (Departure Time)</label>
                    <Input
                      type="time"
                      value={form.departure_time}
                      onChange={e => setForm({ ...form, departure_time: e.target.value })}
                      className="text-sm bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">وقت التواجد بالمحطة (Boarding)</label>
                    <Input
                      type="time"
                      value={form.boarding_time}
                      onChange={e => setForm({ ...form, boarding_time: e.target.value })}
                      className="text-sm bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">تاريخ العودة (إن وجد)</label>
                    <Input
                      type="date"
                      value={form.return_departure_date}
                      onChange={e => setForm({ ...form, return_departure_date: e.target.value })}
                      className="text-sm bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">الوزن المسموح للأمتعة (كجم)</label>
                    <Input
                      type="number"
                      value={form.luggage_weight}
                      onChange={e => setForm({ ...form, luggage_weight: e.target.value })}
                      className="font-mono text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">عدد الحقائب المسموحة</label>
                    <Input
                      type="number"
                      value={form.luggage_pieces}
                      onChange={e => setForm({ ...form, luggage_pieces: e.target.value })}
                      className="font-mono text-sm bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section 6: Payment Methods & Status */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  طريقة الدفع، وحالة السداد، والحالة العامة
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {/* Payment Method */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">طريقة الدفع *</label>
                    <select
                      value={form.payment_method}
                      onChange={e => setForm({ ...form, payment_method: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm"
                    >
                      <option value="cash">نقداً (Cash)</option>
                      <option value="credit">آجل / على الحساب (On Credit)</option>
                      <option value="bank_transfer">تحويل بنكي / إيداع (Bank Transfer)</option>
                      <option value="pos">شبكة / بطاقة مدى (POS)</option>
                      <option value="cheque">شيك بنكي (Cheque)</option>
                      <option value="wallet">خصم من المحفظة (Wallet)</option>
                    </select>
                  </div>

                  {/* Payment Status */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">حالة الدفع</label>
                    <select
                      value={form.payment_status}
                      onChange={e => {
                        const ps = e.target.value;
                        const sell = Number(form.selling_price) || 0;
                        setForm({
                          ...form,
                          payment_status: ps,
                          paid_amount: ps === "paid" ? String(sell) : ps === "unpaid" ? "0" : form.paid_amount,
                          remaining_balance: ps === "paid" ? "0" : ps === "unpaid" ? String(sell) : form.remaining_balance
                        });
                      }}
                      className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm"
                    >
                      <option value="paid">مدفوع بالكامل (Fully Paid)</option>
                      <option value="unpaid">آجل / غير مدفوع (Unpaid)</option>
                      <option value="partial">مدفوع جزئياً (Partial)</option>
                    </select>
                  </div>

                  {/* Booking Status */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">حالة التذكرة</label>
                    <select
                      value={form.status}
                      onChange={e => setForm({ ...form, status: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm font-semibold"
                    >
                      <option value="confirmed">مؤكدة ومصدرة ✅</option>
                      <option value="pending">قيد الحجز والتأكيد ⏳</option>
                      <option value="waiting_payment">بانتظار السداد ⚠️</option>
                      <option value="completed">منفذة / مكتملة 🏁</option>
                      <option value="cancelled">ملغاة ❌</option>
                      <option value="refunded">مسترجعة 🔄</option>
                    </select>
                  </div>

                  {/* Issue Date */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">تاريخ الإصدار</label>
                    <Input
                      type="date"
                      value={form.issue_date}
                      onChange={e => setForm({ ...form, issue_date: e.target.value })}
                      className="text-sm bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ملاحظات وشروط خاصة بالتذكرة</label>
                  <Input
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder="أي تعليمات خاصة بالراكب، نقطة التجمع، سياسة الإلغاء، إلخ..."
                    className="text-sm bg-white"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 border-t pt-3 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                صافي الربح المتوقع: <b className="text-emerald-700 font-mono">+{Number(form.agency_commission || 0).toLocaleString()} {form.commission_currency}</b>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  id="btn-cancel-modal"
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                >
                  إلغاء
                </Button>
                <Button
                  id="btn-save-bus-booking"
                  type="button"
                  onClick={() => saveBookingMutation.mutate(form)}
                  disabled={saveBookingMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
                >
                  {saveBookingMutation.isPending && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {editingBooking ? "حفظ التعديلات ✅" : "حفظ وإصدار الحجز ➕"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL: QUICK ADD CUSTOMER */}
        <Dialog open={quickCustomerModalOpen} onOpenChange={setQuickCustomerModalOpen}>
          <DialogContent className="max-w-md text-right" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2 text-right">
                <UserPlus className="w-5 h-5 text-blue-600" />
                إضافة عميل جديد سريعاً
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 text-right">
                إضافة عميل إلى دليل الحسابات وربطه فوراً بهذه المعاملة.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">اسم العميل *</label>
                <Input
                  value={quickCustomerForm.name}
                  onChange={e => setQuickCustomerForm({ ...quickCustomerForm, name: e.target.value })}
                  placeholder="مثال: خالد محمد الشمري"
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">رقم الجوال *</label>
                <Input
                  value={quickCustomerForm.phone}
                  onChange={e => setQuickCustomerForm({ ...quickCustomerForm, phone: e.target.value })}
                  placeholder="05XXXXXXXX"
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setQuickCustomerModalOpen(false)}>إلغاء</Button>
              <Button
                id="btn-save-quick-customer"
                onClick={() => {
                  if (!quickCustomerForm.name.trim()) return alert("يرجى إدخال اسم العميل");
                  quickCustomerMutation.mutate(quickCustomerForm);
                }}
                disabled={quickCustomerMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                {quickCustomerMutation.isPending && <RefreshCw className="w-4 h-4 animate-spin" />}
                حفظ وإدراج ➕
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL: QUICK ADD PASSENGER */}
        <Dialog open={quickPassengerModalOpen} onOpenChange={setQuickPassengerModalOpen}>
          <DialogContent className="max-w-md text-right" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2 text-right">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                إضافة مسافر / راكب جديد
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 text-right">
                تسجيل بيانات الراكب في سجل المسافرين.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">الاسم بالعربية *</label>
                <Input
                  value={quickPassengerForm.name_ar}
                  onChange={e => setQuickPassengerForm({ ...quickPassengerForm, name_ar: e.target.value })}
                  placeholder="الاسم الثلاثي أو الرباعي"
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">رقم الجوال</label>
                <Input
                  value={quickPassengerForm.phone}
                  onChange={e => setQuickPassengerForm({ ...quickPassengerForm, phone: e.target.value })}
                  placeholder="05XXXXXXXX"
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">رقم الهوية / الجواز</label>
                <Input
                  value={quickPassengerForm.passport_number}
                  onChange={e => setQuickPassengerForm({ ...quickPassengerForm, passport_number: e.target.value })}
                  placeholder="10XXXXXXXX أو A12345678"
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setQuickPassengerModalOpen(false)}>إلغاء</Button>
              <Button
                id="btn-save-quick-passenger"
                onClick={() => {
                  if (!quickPassengerForm.name_ar.trim()) return alert("يرجى إدخال اسم المسافر");
                  quickPassengerMutation.mutate(quickPassengerForm);
                }}
                disabled={quickPassengerMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {quickPassengerMutation.isPending && <RefreshCw className="w-4 h-4 animate-spin" />}
                حفظ وإدراج ➕
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL: QUICK ADD TRANSPORT COMPANY (الطرف الثاني - شركة النقل البري بدليل الحسابات) */}
        <Dialog open={quickCompanyModalOpen} onOpenChange={setQuickCompanyModalOpen}>
          <DialogContent className="max-w-lg text-right" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2 text-right">
                <Building2 className="w-5 h-5 text-emerald-600" />
                إضافة شركة نقل بري (الطرف الثاني) بدليل الحسابات
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 text-right">
                تسجيل شركة نقل بري جديدة (مثل سابتكو، النور، الرويشان، البراق، إلخ) للتعامل معها وتصدير التذاكر.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">اسم شركة النقل البري *</label>
                <Input
                  value={quickCompanyForm.name}
                  onChange={e => setQuickCompanyForm({ ...quickCompanyForm, name: e.target.value })}
                  placeholder="مثال: الشركة السعودية للنقل الجماعي (سابتكو) أو شركة الرويشان"
                  className="text-sm font-semibold"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">رقم الهاتف / الاتصال</label>
                  <Input
                    value={quickCompanyForm.phone}
                    onChange={e => setQuickCompanyForm({ ...quickCompanyForm, phone: e.target.value })}
                    placeholder="92000XXXX أو 05XXXXXXXX"
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">البريد الإلكتروني</label>
                  <Input
                    value={quickCompanyForm.email}
                    onChange={e => setQuickCompanyForm({ ...quickCompanyForm, email: e.target.value })}
                    placeholder="booking@transport.com"
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">الشخص المسؤول / المنسق</label>
                  <Input
                    value={quickCompanyForm.contact_person}
                    onChange={e => setQuickCompanyForm({ ...quickCompanyForm, contact_person: e.target.value })}
                    placeholder="اسم مدير المبيعات أو المنسق"
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">العنوان / المدينة / المحطة</label>
                  <Input
                    value={quickCompanyForm.address}
                    onChange={e => setQuickCompanyForm({ ...quickCompanyForm, address: e.target.value })}
                    placeholder="الرياض - محطة النقل الدولية"
                    className="text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">ملاحظات وشروط التعامل</label>
                <Input
                  value={quickCompanyForm.notes}
                  onChange={e => setQuickCompanyForm({ ...quickCompanyForm, notes: e.target.value })}
                  placeholder="أي معلومات إضافية عن سياسة الحجز والعمولة..."
                  className="text-sm"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setQuickCompanyModalOpen(false)}>إلغاء</Button>
              <Button
                id="btn-save-quick-company"
                onClick={() => {
                  if (!quickCompanyForm.name.trim()) return alert("يرجى إدخال اسم شركة النقل البري");
                  quickCompanyMutation.mutate(quickCompanyForm);
                }}
                disabled={quickCompanyMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {quickCompanyMutation.isPending && <RefreshCw className="w-4 h-4 animate-spin" />}
                حفظ وإدراج الشركة 🏢
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL: PRINT / PREVIEW OFFICIAL BUS TICKET & VOUCHER */}
        <Dialog open={!!printBooking} onOpenChange={open => !open && setPrintBooking(null)}>
          <DialogContent className="max-w-3xl text-right max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader className="text-right border-b pb-3 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Printer className="w-5 h-5 text-emerald-600" />
                  معاينة وطباعة تذكرة وسند النقل البري الرسمي
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  تذكرة نقل بري معتمدة مع كافة بيانات الطرفين، والمقعد، والمحطات، والمبالغ المالية.
                </DialogDescription>
              </div>
              <Button
                onClick={() => window.print()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs"
              >
                <Printer className="w-4 h-4" />
                طباعة الآن
              </Button>
            </DialogHeader>

            {printBooking && (
              <div id="printable-bus-ticket" className="p-6 bg-white border border-slate-300 rounded-2xl space-y-6 shadow-sm font-sans text-slate-800">
                {/* Agency Header */}
                <div className="flex items-center justify-between border-b-2 border-emerald-600 pb-4">
                  <div className="space-y-1">
                    <h2 className="text-xl font-black text-emerald-950 flex items-center gap-2">
                      <Bus className="w-6 h-6 text-emerald-600" />
                      وكالة السعادة للسفريات والسياحة والنقل البري
                    </h2>
                    <p className="text-xs text-slate-500">
                      خدمات النقل الدولي والداخلي | ترخيص سياحي رقم: 778899 | الرقم الضريبي: 300998811200003
                    </p>
                  </div>
                  <div className="text-left font-mono text-xs text-slate-600">
                    <p className="font-bold text-slate-900 text-sm">{printBooking.booking_number}</p>
                    <p>التاريخ: {printBooking.issue_date || new Date().toISOString().slice(0, 10)}</p>
                  </div>
                </div>

                {/* Ticket Title Banner */}
                <div className="bg-gradient-to-l from-emerald-800 to-teal-800 text-white p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-emerald-200 block">OFFICIAL BOARDING PASS & BUS TICKET</span>
                    <h3 className="text-lg font-black text-white">تذكرة نقل بري وبطاقة صعود الحافلة</h3>
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-xs text-emerald-200 block">رقم التذكرة Ticket No</span>
                    <span className="text-base font-black text-white">{printBooking.ticket_number || "TKT-BUS-VALID"}</span>
                  </div>
                </div>

                {/* Route Callout */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-around text-center">
                  <div>
                    <span className="text-xs text-slate-500 block">محطة الانطلاق (From)</span>
                    <span className="text-base font-black text-blue-900">{printBooking.origin_city}</span>
                    <p className="text-xs text-slate-600">{printBooking.origin_station || "المحطة الرئيسية"}</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                      {printBooking.trip_type === "round_trip" ? "ذهاب وعودة 🔁" : "رحلة مباشرة ⬅️"}
                    </span>
                    <span className="text-lg text-slate-400 my-1">━━━━ 🚌 ━━━━</span>
                    <span className="text-xs text-slate-500 font-mono">
                      {printBooking.bus_type}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">محطة الوصول (To)</span>
                    <span className="text-base font-black text-emerald-900">{printBooking.destination_city}</span>
                    <p className="text-xs text-slate-600">{printBooking.destination_station || "المحطة المركزية"}</p>
                  </div>
                </div>

                {/* Two Parties Details */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Party 1: Customer */}
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5 text-xs">
                    <h5 className="font-bold text-blue-950 flex items-center gap-1.5 text-sm border-b border-blue-200 pb-1">
                      <User className="w-4 h-4 text-blue-600" />
                      الطرف الأول: بيانات الراكب والعميل
                    </h5>
                    <p><b>اسم الراكب:</b> {printBooking.passenger_name || printBooking.customer_name || "عميل نقدي"}</p>
                    <p><b>العميل المتعاقد:</b> {printBooking.customer_name || "-"}</p>
                    <p><b>رقم الهوية / الجواز:</b> <span className="font-mono">{printBooking.passenger_national_id || "-"}</span></p>
                    <p><b>رقم الهاتف:</b> <span className="font-mono">{printBooking.passenger_phone || "-"}</span></p>
                    <p className="text-blue-900 bg-blue-100/60 p-1.5 rounded font-medium mt-1">
                      <b>البيان:</b> {printBooking.customer_statement || "قيمة تذكرة نقل بري"}
                    </p>
                  </div>

                  {/* Party 2: Company */}
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5 text-xs">
                    <h5 className="font-bold text-emerald-950 flex items-center gap-1.5 text-sm border-b border-emerald-200 pb-1">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      الطرف الثاني: شركة النقل البري الناقلة
                    </h5>
                    <p><b>اسم شركة النقل:</b> {printBooking.company_name || printBooking.company_name_joined || "الناقل المعتمد"}</p>
                    <p><b>رقم الحافلة:</b> <span className="font-mono font-bold">{printBooking.bus_number || "حسب الجدولة"}</span></p>
                    <p><b>رقم المقعد المخصص:</b> <span className="font-mono font-black text-emerald-800 text-sm bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">{printBooking.seat_number || "حر"}</span></p>
                    <p><b>الأمتعة المسموحة:</b> {printBooking.luggage_weight || 30} كجم ({printBooking.luggage_pieces || 2} حقيبة)</p>
                    <p className="text-emerald-900 bg-emerald-100/60 p-1.5 rounded font-medium mt-1">
                      <b>بيان الناقل:</b> {printBooking.supplier_statement || "تكلفة حجز مقعد حافلة نقل بري"}
                    </p>
                  </div>
                </div>

                {/* Schedule & Financial Summary */}
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="p-3 bg-slate-50 border rounded-xl">
                    <span className="text-slate-500 block">تاريخ السفر</span>
                    <span className="font-bold text-slate-900 text-sm block mt-0.5">{printBooking.departure_date}</span>
                    <span className="text-emerald-700 font-mono font-bold">التحرك: {printBooking.departure_time || "08:00"}</span>
                  </div>
                  <div className="p-3 bg-slate-50 border rounded-xl">
                    <span className="text-slate-500 block">وقت الحضور بالمحطة</span>
                    <span className="font-black text-red-700 text-sm block mt-0.5">{printBooking.boarding_time || "قبل الرحلة بـ 30 دقيقة"}</span>
                    <span className="text-slate-500">للصعود وشحن الأمتعة</span>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl">
                    <span className="text-emerald-800 font-semibold block">إجمالي المبلغ المطلوب</span>
                    <span className="font-black text-emerald-950 text-base block mt-0.5">
                      {Number(printBooking.selling_price || 0).toLocaleString()} {printBooking.customer_currency || "SAR"}
                    </span>
                    <span className="text-[11px] text-emerald-700 font-bold">
                      {printBooking.payment_status === "paid" ? "✅ مدفوع بالكامل" : "⚠️ آجل على الحساب"}
                    </span>
                  </div>
                </div>

                {/* Terms and conditions */}
                <div className="text-[11px] text-slate-500 space-y-1 border-t pt-3">
                  <p className="font-bold text-slate-700">شروط وأحكام النقل البري:</p>
                  <p>1. يجب التواجد في محطة الانطلاق قبل موعد الرحلة بنصف ساعة على الأقل لتسليم الأمتعة واستلام بطاقة الصعود.</p>
                  <p>2. يُشترط إبراز أصل الهوية الوطنية أو الإقامة أو جواز السفر ساري المفعول لجميع الركاب قبل الصعود.</p>
                  <p>3. في حال الإلغاء أو الاسترجاع، يخضع الطلب لسياسة شركة النقل البري الناقلة.</p>
                </div>

                {/* Footer Signatures */}
                <div className="flex items-center justify-between pt-4 border-t text-xs font-semibold text-slate-600">
                  <div>توقيع وختم الوكالة: __________________</div>
                  <div>الموظف المصدر: {printBooking.issued_by || "مدير النظام"}</div>
                  <div>توقيع الراكب / المستلم: __________________</div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
