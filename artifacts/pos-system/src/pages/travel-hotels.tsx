import { useState, useRef } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Hotel,
  Plus,
  Search,
  Edit2,
  Trash2,
  Printer,
  CheckCircle2,
  AlertCircle,
  Building2,
  DollarSign,
  Calendar,
  User,
  Users,
  MapPin,
  FileText,
  CreditCard,
  Wallet,
  ShieldCheck,
  Star,
  BedDouble,
  ArrowRightLeft,
  Filter,
  Download,
  Eye,
  Info,
  Phone,
  Sparkles
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

const ROOM_TYPES = [
  "غرفة مفردة (Single Room)",
  "غرفة مزدوجة (Double Room)",
  "غرفة توأم (Twin Beds)",
  "غرفة ثلاثية (Triple Room)",
  "غرفة رباعية (Quad Room)",
  "جناح جونيور (Junior Suite)",
  "جناح تنفيذي (Executive Suite)",
  "جناح عائلي (Family Suite)",
  "جناح ملكي (Royal Suite)",
  "شقة فندقية غرفة وصالة (1BHK)",
  "شقة فندقية غرفتين وصالة (2BHK)",
  "فيلا خاصة مع مسبح (Private Villa)",
  "استوديو فندقي (Studio Apartment)"
];

const MEAL_PLANS = [
  "إقامة فقط (Room Only - RO)",
  "إفطار شامل (Bed & Breakfast - BB)",
  "نصف إقامة - إفطار وعشاء (Half Board - HB)",
  "إقامة كاملة - 3 وجبات (Full Board - FB)",
  "شامل كلياً (All Inclusive - AI)",
  "شامل فائق Ultra All Inclusive"
];

const PAYMENT_METHODS = [
  { id: "cash", label: "نقداً (Cash)", icon: DollarSign },
  { id: "credit", label: "آجل / على الحساب (On Credit)", icon: FileText },
  { id: "bank_transfer", label: "تحويل بنكي (Bank Transfer)", icon: ArrowRightLeft },
  { id: "pos", label: "بطاقة شبكة / مدى (POS Card)", icon: CreditCard },
  { id: "cheque", label: "شيك بنكي (Bank Cheque)", icon: FileText },
  { id: "wallet", label: "خصم من المحفظة (Wallet)", icon: Wallet }
];

const CURRENCIES = [
  { id: "SAR", label: "ريال سعودي (SAR)", symbol: "ر.س" },
  { id: "USD", label: "دولار أمريكي (USD)", symbol: "$" },
  { id: "YER", label: "ريال يمني (YER)", symbol: "ر.ي" }
];

const STATUS_BADGES: Record<string, { label: string; class: string }> = {
  confirmed: { label: "مؤكد", class: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  issued: { label: "مصدرة القسيمة", class: "bg-blue-100 text-blue-800 border-blue-300" },
  pending: { label: "قيد الانتظار", class: "bg-amber-100 text-amber-800 border-amber-300" },
  cancelled: { label: "ملغى", class: "bg-red-100 text-red-800 border-red-300" },
  refunded: { label: "مسترجع", class: "bg-purple-100 text-purple-800 border-purple-300" }
};

const PAYMENT_STATUS_BADGES: Record<string, { label: string; class: string }> = {
  paid: { label: "مدفوع بالكامل", class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  partial: { label: "مدفوع جزئياً", class: "bg-amber-50 text-amber-700 border-amber-200" },
  unpaid: { label: "غير مدفوع (آجل)", class: "bg-rose-50 text-rose-700 border-rose-200" }
};

export default function TravelHotelsPage() {
  const qc = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // States for Search & Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");

  // Selection & Modals
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const [previewBooking, setPreviewBooking] = useState<any | null>(null);
  const [quickHotelModal, setQuickHotelModal] = useState(false);
  const [quickCustomerModal, setQuickCustomerModal] = useState(false);

  // Quick New Hotel in Catalog Form
  const [quickHotelForm, setQuickHotelForm] = useState({
    name_ar: "",
    name_en: "",
    country: "السعودية",
    city: "مكة المكرمة",
    star_rating: "5",
    supplier_name: "حجوزات الفنادق المباشرة",
    default_commission_percent: "10"
  });

  // Quick Customer Form
  const [quickCustomerForm, setQuickCustomerForm] = useState({
    name: "",
    phone: "",
    customer_type: "individual"
  });

  // Main Booking Form (نظام الطرفين)
  const [form, setForm] = useState({
    booking_ref: "",
    voucher_number: "",
    confirmation_number: "",
    // الطرف الأول: العميل
    customer_id: "",
    customer_name: "",
    passenger_id: "",
    guest_name: "",
    guest_phone: "",
    guest_passport: "",
    selling_price: "",
    customer_currency: "SAR",
    customer_days: "1",
    customer_statement: "",
    // الطرف الثاني: الفندق / المورد
    hotel_db_id: "",
    hotel_name: "",
    country: "السعودية",
    city: "مكة المكرمة",
    city_country: "مكة المكرمة، السعودية",
    cost_price: "",
    supplier_currency: "SAR",
    supplier_days: "1",
    supplier_statement: "",
    // تفاصيل الغرفة والإقامة
    room_type: "غرفة مزدوجة (Double Room)",
    rooms_count: "1",
    guests_count: "2",
    meal_plan: "إفطار شامل (Bed & Breakfast - BB)",
    check_in: "",
    check_out: "",
    nights: "1",
    // العمولة والأرباح
    commission: "",
    commission_currency: "SAR",
    commission_statement: "",
    // الدفع والتحصيل
    payment_method: "cash",
    payment_status: "paid",
    paid_amount: "",
    remaining_balance: "0",
    status: "confirmed",
    issue_date: new Date().toISOString().slice(0, 10),
    notes: ""
  });

  // 1. Fetch Bookings
  const { data: bookings = [], isLoading } = useQuery<any[]>({
    queryKey: ["travel-hotels", search, statusFilter, paymentFilter],
    queryFn: () => {
      const q = new URLSearchParams();
      if (search) q.set("search", search);
      if (statusFilter) q.set("status", statusFilter);
      if (paymentFilter) q.set("payment_status", paymentFilter);
      return fetchWithAuth(`/api/travel/hotels?${q.toString()}`);
    }
  });

  // 2. Fetch Customers List
  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["customers-list"],
    queryFn: () => fetchWithAuth("/api/customers")
  });

  // 3. Fetch Passengers List
  const { data: passengers = [] } = useQuery<any[]>({
    queryKey: ["travel-passengers-list"],
    queryFn: () => fetchWithAuth("/api/travel/passengers")
  });

  // 4. Fetch Hotels Catalog (دليل الفنادق)
  const { data: hotelsCatalog = [] } = useQuery<any[]>({
    queryKey: ["travel-hotels-db-list"],
    queryFn: () => fetchWithAuth("/api/travel/hotels-db")
  });

  // Calculations
  const sellVal = Number(form.selling_price || 0);
  const costVal = Number(form.cost_price || 0);
  const commVal = sellVal - costVal;

  // Auto calculate nights when check_in and check_out are selected
  const handleDateChange = (type: "in" | "out", val: string) => {
    const nextIn = type === "in" ? val : form.check_in;
    const nextOut = type === "out" ? val : form.check_out;

    let calculatedNights = Number(form.nights || 1);
    if (nextIn && nextOut) {
      const d1 = new Date(nextIn);
      const d2 = new Date(nextOut);
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        calculatedNights = diffDays;
      }
    }

    setForm(f => ({
      ...f,
      [type === "in" ? "check_in" : "check_out"]: val,
      nights: String(calculatedNights),
      customer_days: String(calculatedNights),
      supplier_days: String(calculatedNights)
    }));
  };

  // When selecting a hotel from catalog
  const handleHotelSelect = (hotelIdStr: string) => {
    if (!hotelIdStr) {
      setForm(f => ({ ...f, hotel_db_id: "", hotel_name: "", city_country: "", country: "", city: "" }));
      return;
    }
    const found = hotelsCatalog.find((h: any) => String(h.id) === hotelIdStr);
    if (found) {
      const cityCountry = `${found.city || ''}، ${found.country || ''}`.trim();
      setForm(f => ({
        ...f,
        hotel_db_id: String(found.id),
        hotel_name: found.name_ar,
        country: found.country || "",
        city: found.city || "",
        city_country: cityCountry,
        supplier_statement: f.supplier_statement || `حجز فندقي لدى ${found.name_ar} (${cityCountry})`
      }));
    }
  };

  // When selecting a customer
  const handleCustomerSelect = (customerIdStr: string) => {
    if (!customerIdStr) {
      setForm(f => ({ ...f, customer_id: "", customer_name: "" }));
      return;
    }
    const found = customers.find((c: any) => String(c.id) === customerIdStr);
    if (found) {
      setForm(f => ({
        ...f,
        customer_id: String(found.id),
        customer_name: found.name,
        guest_name: f.guest_name || found.name,
        guest_phone: f.guest_phone || found.phone || "",
        customer_statement: f.customer_statement || `حجز إقامة فندقية للعميل ${found.name}`
      }));
    }
  };

  // Reset form
  const resetForm = () => {
    setEditingBooking(null);
    setForm({
      booking_ref: `HTL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      voucher_number: `VCH-${Math.floor(100000 + Math.random() * 900000)}`,
      confirmation_number: "",
      customer_id: "",
      customer_name: "",
      passenger_id: "",
      guest_name: "",
      guest_phone: "",
      guest_passport: "",
      selling_price: "0",
      customer_currency: "SAR",
      customer_days: "1",
      customer_statement: "",
      hotel_db_id: "",
      hotel_name: "",
      country: "السعودية",
      city: "مكة المكرمة",
      city_country: "مكة المكرمة، السعودية",
      cost_price: "0",
      supplier_currency: "SAR",
      supplier_days: "1",
      supplier_statement: "",
      room_type: "غرفة مزدوجة (Double Room)",
      rooms_count: "1",
      guests_count: "2",
      meal_plan: "إفطار شامل (Bed & Breakfast - BB)",
      check_in: "",
      check_out: "",
      nights: "1",
      commission: "0",
      commission_currency: "SAR",
      commission_statement: "",
      payment_method: "cash",
      payment_status: "paid",
      paid_amount: "0",
      remaining_balance: "0",
      status: "confirmed",
      issue_date: new Date().toISOString().slice(0, 10),
      notes: ""
    });
  };

  // Open Edit
  const handleEdit = (bk: any) => {
    setEditingBooking(bk);
    setSelectedBookingId(bk.id);
    setForm({
      booking_ref: bk.booking_ref || "",
      voucher_number: bk.voucher_number || "",
      confirmation_number: bk.confirmation_number || "",
      customer_id: bk.customer_id ? String(bk.customer_id) : "",
      customer_name: bk.customer_name || "",
      passenger_id: bk.passenger_id ? String(bk.passenger_id) : "",
      guest_name: bk.guest_name || bk.customer_name || "",
      guest_phone: bk.guest_phone || bk.customer_phone || "",
      guest_passport: bk.guest_passport || bk.passenger_passport || "",
      selling_price: String(bk.selling_price || 0),
      customer_currency: bk.customer_currency || "SAR",
      customer_days: String(bk.customer_days || bk.nights || 1),
      customer_statement: bk.customer_statement || "",
      hotel_db_id: bk.hotel_db_id ? String(bk.hotel_db_id) : "",
      hotel_name: bk.hotel_name || "",
      country: bk.country || "",
      city: bk.city || "",
      city_country: bk.city_country || "",
      cost_price: String(bk.cost_price || 0),
      supplier_currency: bk.supplier_currency || "SAR",
      supplier_days: String(bk.supplier_days || bk.nights || 1),
      supplier_statement: bk.supplier_statement || "",
      room_type: bk.room_type || "غرفة مزدوجة (Double Room)",
      rooms_count: String(bk.rooms_count || 1),
      guests_count: String(bk.guests_count || 2),
      meal_plan: bk.meal_plan || "إفطار شامل (Bed & Breakfast - BB)",
      check_in: bk.check_in || "",
      check_out: bk.check_out || "",
      nights: String(bk.nights || 1),
      commission: String(bk.commission || (Number(bk.selling_price || 0) - Number(bk.cost_price || 0))),
      commission_currency: bk.commission_currency || bk.customer_currency || "SAR",
      commission_statement: bk.commission_statement || "",
      payment_method: bk.payment_method || "cash",
      payment_status: bk.payment_status || "paid",
      paid_amount: String(bk.paid_amount || bk.selling_price || 0),
      remaining_balance: String(bk.remaining_balance || 0),
      status: bk.status || "confirmed",
      issue_date: bk.issue_date || new Date().toISOString().slice(0, 10),
      notes: bk.notes || ""
    });
    setModalOpen(true);
  };

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingBooking) {
        return fetchWithAuth(`/api/travel/hotels/${editingBooking.id}`, { method: "PUT", body: JSON.stringify(data) });
      }
      return fetchWithAuth("/api/travel/hotels", { method: "POST", body: JSON.stringify(data) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["travel-hotels"] });
      setModalOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetchWithAuth(`/api/travel/hotels/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["travel-hotels"] });
      if (selectedBookingId) setSelectedBookingId(null);
    }
  });

  const quickHotelMutation = useMutation({
    mutationFn: (data: any) => fetchWithAuth("/api/travel/hotels-db", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (newH: any) => {
      qc.invalidateQueries({ queryKey: ["travel-hotels-db-list"] });
      setQuickHotelModal(false);
      setForm(f => ({
        ...f,
        hotel_db_id: String(newH.id),
        hotel_name: newH.name_ar,
        country: newH.country,
        city: newH.city,
        city_country: `${newH.city}، ${newH.country}`
      }));
      setQuickHotelForm({
        name_ar: "",
        name_en: "",
        country: "السعودية",
        city: "مكة المكرمة",
        star_rating: "5",
        supplier_name: "حجوزات الفنادق المباشرة",
        default_commission_percent: "10"
      });
    }
  });

  const quickCustomerMutation = useMutation({
    mutationFn: (data: any) => fetchWithAuth("/api/customers", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (newC: any) => {
      qc.invalidateQueries({ queryKey: ["customers-list"] });
      setQuickCustomerModal(false);
      setForm(f => ({
        ...f,
        customer_id: String(newC.id),
        customer_name: newC.name,
        guest_name: newC.name,
        guest_phone: newC.phone || ""
      }));
      setQuickCustomerForm({ name: "", phone: "", customer_type: "individual" });
    }
  });

  // Selected Booking details for bottom bar actions
  const selectedBooking = bookings.find((b: any) => b.id === selectedBookingId) || (bookings.length > 0 ? bookings[0] : null);

  // Filtered Bookings for display
  const filteredBookings = bookings.filter((b: any) => {
    if (currencyFilter && (b.customer_currency !== currencyFilter && b.supplier_currency !== currencyFilter)) {
      return false;
    }
    return true;
  });

  // Financial Stats Totals
  const totalSalesSAR = filteredBookings.filter(b => (b.customer_currency || 'SAR') === 'SAR').reduce((acc, b) => acc + Number(b.selling_price || 0), 0);
  const totalCostSAR = filteredBookings.filter(b => (b.supplier_currency || 'SAR') === 'SAR').reduce((acc, b) => acc + Number(b.cost_price || 0), 0);
  const totalCommSAR = totalSalesSAR - totalCostSAR;

  const totalSalesUSD = filteredBookings.filter(b => b.customer_currency === 'USD').reduce((acc, b) => acc + Number(b.selling_price || 0), 0);
  const totalCostUSD = filteredBookings.filter(b => b.supplier_currency === 'USD').reduce((acc, b) => acc + Number(b.cost_price || 0), 0);
  const totalCommUSD = totalSalesUSD - totalCostUSD;

  // Trigger search focus
  const handleFocusSearch = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  };

  return (
    <AdminLayout>
      <div className="space-y-5 pb-24">
        {/* Header Title & Top Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl border border-indigo-800/40">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-500/30">
                <Hotel className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  حجوزات الفنادق والإقامة السياحية (Hotel Bookings)
                  <span className="text-xs bg-amber-500/30 text-amber-200 px-2.5 py-0.5 rounded-full font-mono border border-amber-400/30">
                    نظام الطرفين 2-Party Accounting
                  </span>
                </h1>
                <p className="text-xs text-slate-300 mt-1">
                  إدارة شاملة لحجوزات الفنادق والمنتجعات والشقق الفندقية، محاسبة الطرفين (العميل والمورد)، وتعدد العملات وسندات الإقامة
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                resetForm();
                setModalOpen(true);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black gap-2 shadow-lg shadow-amber-500/20 px-5"
            >
              <Plus className="w-5 h-5" />
              إضافة حجز فندقي جديد
            </Button>
          </div>
        </div>

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-slate-900 text-white border-slate-800 shadow-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">إجمالي الحجوزات</p>
                <p className="text-2xl font-black font-mono mt-1 text-white">{filteredBookings.length}</p>
                <p className="text-[11px] text-slate-400">حجز إقامة مسجل</p>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                <BedDouble className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-950/80 text-white border-emerald-800/50 shadow-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-300 font-medium">مبيعات العملاء (طرف 1)</p>
                <p className="text-xl font-black font-mono mt-1 text-emerald-400">
                  {totalSalesSAR.toLocaleString()} <span className="text-xs font-sans">SAR</span>
                </p>
                {totalSalesUSD > 0 && (
                  <p className="text-xs text-emerald-300/80 font-mono">
                    + {totalSalesUSD.toLocaleString()} USD
                  </p>
                )}
              </div>
              <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-xl">
                <DollarSign className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 text-white border-slate-800 shadow-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">تكلفة الفنادق (طرف 2)</p>
                <p className="text-xl font-black font-mono mt-1 text-slate-200">
                  {totalCostSAR.toLocaleString()} <span className="text-xs font-sans">SAR</span>
                </p>
                {totalCostUSD > 0 && (
                  <p className="text-xs text-slate-400 font-mono">
                    + {totalCostUSD.toLocaleString()} USD
                  </p>
                )}
              </div>
              <div className="p-3 bg-slate-800 text-slate-300 rounded-xl">
                <Building2 className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-950/80 text-white border-amber-800/50 shadow-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-300 font-medium">صافي عمولات وأرباح المكتب</p>
                <p className="text-xl font-black font-mono mt-1 text-amber-400">
                  +{totalCommSAR.toLocaleString()} <span className="text-xs font-sans">SAR</span>
                </p>
                {totalCommUSD > 0 && (
                  <p className="text-xs text-amber-300/80 font-mono">
                    + {totalCommUSD.toLocaleString()} USD
                  </p>
                )}
              </div>
              <div className="p-3 bg-amber-500/20 text-amber-300 rounded-xl">
                <Sparkles className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter Bar */}
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 absolute right-3 top-3 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="ابحث برقم الحجز، القسيمة، اسم العميل، اسم الفندق، أو المدينة..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pr-9 font-medium"
                />
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium"
                >
                  <option value="">-- كل حالات الحجز --</option>
                  <option value="confirmed">مؤكد Confirmed</option>
                  <option value="issued">مصدرة القسيمة Issued</option>
                  <option value="pending">قيد الانتظار Pending</option>
                  <option value="cancelled">ملغى Cancelled</option>
                  <option value="refunded">مسترجع Refunded</option>
                </select>
              </div>

              <div>
                <select
                  value={paymentFilter}
                  onChange={e => setPaymentFilter(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium"
                >
                  <option value="">-- كل حالات السداد --</option>
                  <option value="paid">مدفوع بالكامل</option>
                  <option value="partial">مدفوع جزئياً</option>
                  <option value="unpaid">غير مدفوع (آجل)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Hotels Table */}
        <Card className="shadow-md border-slate-200 overflow-hidden">
          <CardHeader className="bg-slate-50 border-b pb-3 pt-4 px-6 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Hotel className="w-5 h-5 text-amber-600" />
                سجل حجوزات الفنادق والإقامة ({filteredBookings.length})
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 font-semibold text-slate-600">
                💡 انقر على أي سطر لتحديده وتطبيق الأزرار السفلية
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-muted-foreground">جاري تحميل بيانات الفنادق...</div>
            ) : filteredBookings.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Hotel className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-base font-bold text-slate-700">لا توجد حجوزات فندقية مطابقة</p>
                <p className="text-xs text-muted-foreground">ابدأ بتسجيل أول حجز فندقي بنظام الطرفين عبر الزر أعلاه أو بالأسفل</p>
                <Button onClick={() => { resetForm(); setModalOpen(true); }} className="bg-amber-500 text-slate-950 font-bold gap-2">
                  <Plus className="w-4 h-4" /> تسجيل حجز فندقي جديد
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b text-slate-700 text-xs font-bold">
                      <th className="p-3 w-10 text-center">#</th>
                      <th className="p-3">رقم الحجز / القسيمة</th>
                      <th className="p-3">الطرف الأول (العميل والنزيل)</th>
                      <th className="p-3">الطرف الثاني (الفندق والمورد)</th>
                      <th className="p-3">تفاصيل الإقامة والغرف</th>
                      <th className="p-3">التواريخ والليالي</th>
                      <th className="p-3 text-center">المالية (بيع / تكلفة / ربح)</th>
                      <th className="p-3">طريقة الدفع والحالة</th>
                      <th className="p-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredBookings.map((h: any, idx: number) => {
                      const isSelected = selectedBookingId === h.id;
                      const statusBadge = STATUS_BADGES[h.status] || { label: h.status, class: "bg-slate-100" };
                      const paymentBadge = PAYMENT_STATUS_BADGES[h.payment_status] || { label: h.payment_status, class: "bg-slate-100" };
                      const sell = Number(h.selling_price || 0);
                      const cost = Number(h.cost_price || 0);
                      const comm = Number(h.commission || (sell - cost));

                      return (
                        <tr
                          key={h.id}
                          onClick={() => setSelectedBookingId(h.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? "bg-amber-50/90 font-medium border-l-4 border-l-amber-500" : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="p-3 text-center font-mono text-xs text-slate-500">
                            {idx + 1}
                          </td>

                          {/* Booking Ref & Voucher */}
                          <td className="p-3">
                            <div className="font-bold font-mono text-amber-700 text-sm">
                              {h.booking_ref}
                            </div>
                            {h.voucher_number && (
                              <div className="text-[11px] font-mono text-slate-500 font-medium">
                                سند: {h.voucher_number}
                              </div>
                            )}
                            {h.confirmation_number && (
                              <div className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono mt-0.5 inline-block">
                                تأكيد: {h.confirmation_number}
                              </div>
                            )}
                          </td>

                          {/* Party 1: Customer & Guest */}
                          <td className="p-3">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-blue-600" />
                              {h.customer_name || h.guest_name || "عميل عام"}
                            </div>
                            {h.guest_name && h.guest_name !== h.customer_name && (
                              <div className="text-xs text-muted-foreground">
                                النزيل: {h.guest_name}
                              </div>
                            )}
                            {h.customer_statement && (
                              <div className="text-[11px] text-blue-700 bg-blue-50/70 rounded px-1.5 py-0.5 mt-1 truncate max-w-[200px]" title={h.customer_statement}>
                                📝 {h.customer_statement}
                              </div>
                            )}
                          </td>

                          {/* Party 2: Hotel & Supplier */}
                          <td className="p-3">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <Hotel className="w-3.5 h-3.5 text-amber-600" />
                              {h.hotel_name}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {h.city_country || h.city || "غير محدد"}
                            </div>
                            {h.supplier_statement && (
                              <div className="text-[11px] text-amber-800 bg-amber-50/70 rounded px-1.5 py-0.5 mt-1 truncate max-w-[200px]" title={h.supplier_statement}>
                                🏨 {h.supplier_statement}
                              </div>
                            )}
                          </td>

                          {/* Room Details */}
                          <td className="p-3 text-xs">
                            <div className="font-semibold text-slate-800">{h.room_type || "غرفة مزدوجة"}</div>
                            <div className="text-muted-foreground">
                              {h.rooms_count || 1} غرفة • {h.guests_count || 2} نزيل
                            </div>
                            <div className="text-[11px] text-indigo-700 font-medium">
                              🍽️ {h.meal_plan ? h.meal_plan.split('(')[0] : 'إفطار شامل'}
                            </div>
                          </td>

                          {/* Dates & Nights */}
                          <td className="p-3 text-xs">
                            <div className="font-mono font-bold text-slate-900">
                              {h.nights || h.customer_days || 1} ليالي / {h.customer_days || h.nights || 1} أيام
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                              دخول: {h.check_in || "-"}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              خروج: {h.check_out || "-"}
                            </div>
                          </td>

                          {/* Financials (Two-Party) */}
                          <td className="p-3 text-xs font-mono">
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-center space-y-0.5">
                              <div className="text-emerald-700 font-bold">
                                بيع: {sell.toLocaleString()} {h.customer_currency || 'SAR'}
                              </div>
                              <div className="text-slate-500 text-[11px]">
                                تكلفة: {cost.toLocaleString()} {h.supplier_currency || 'SAR'}
                              </div>
                              <div className="text-amber-700 font-black text-[11px] border-t pt-0.5">
                                عمولة: +{comm.toLocaleString()} {h.commission_currency || h.customer_currency || 'SAR'}
                              </div>
                            </div>
                          </td>

                          {/* Payment & Status */}
                          <td className="p-3 space-y-1">
                            <div className="flex items-center gap-1">
                              <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full border ${statusBadge.class}`}>
                                {statusBadge.label}
                              </span>
                            </div>
                            <div>
                              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${paymentBadge.class}`}>
                                {paymentBadge.label}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {PAYMENT_METHODS.find(p => p.id === h.payment_method)?.label?.split('(')[0] || h.payment_method || 'نقداً'}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-700 hover:bg-slate-200"
                                title="معاينة وطباعة القسيمة"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewBooking(h);
                                }}
                              >
                                <Printer className="w-4 h-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                title="تعديل الحجز"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(h);
                                }}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:bg-red-50"
                                title="حذف الحجز"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`هل أنت متأكد من حذف الحجز الفندقي "${h.booking_ref} - ${h.hotel_name}"؟`)) {
                                    deleteMutation.mutate(h.id);
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

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* FIXED BOTTOM ACTION BAR (شريط الأزرار التفاعلية السفلية المطلوب) */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-300 shadow-2xl px-4 py-3">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            {/* Left side: Selection indicator */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 font-medium">
              {selectedBooking ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>المعاملة المحددة:</span>
                  <span className="font-bold font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded border">
                    {selectedBooking.booking_ref} ({selectedBooking.hotel_name})
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">لم يتم تحديد معاملة من الجدول</span>
              )}
            </div>

            {/* Right side: Action Buttons Group */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              {/* 1. زر إضافة معاملة جديدة */}
              <Button
                onClick={() => {
                  resetForm();
                  setModalOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                إضافة حجز جديد ➕
              </Button>

              {/* 2. زر طباعة (استعراض) المعاملات السابقة */}
              <Button
                onClick={() => {
                  if (selectedBooking) {
                    setPreviewBooking(selectedBooking);
                  } else {
                    alert("يرجى اختيار معاملة من الجدول لاستعراضها وطباعتها");
                  }
                }}
                disabled={!selectedBooking}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                طباعة (استعراض) المعاملة 🖨️
              </Button>

              {/* 3. زر البحث عن المعاملات السابقة */}
              <Button
                onClick={handleFocusSearch}
                variant="outline"
                className="border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs gap-1.5"
              >
                <Search className="w-4 h-4 text-blue-600" />
                البحث عن المعاملات 🔍
              </Button>

              {/* 4. زر تعديل المعاملة */}
              <Button
                onClick={() => {
                  if (selectedBooking) {
                    handleEdit(selectedBooking);
                  } else {
                    alert("يرجى اختيار معاملة من الجدول لتعديلها");
                  }
                }}
                disabled={!selectedBooking}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 shadow-sm"
              >
                <Edit2 className="w-4 h-4" />
                تعديل المعاملة ✏️
              </Button>

              {/* 5. زر حذف المعاملة */}
              <Button
                onClick={() => {
                  if (selectedBooking) {
                    if (confirm(`هل أنت متأكد من حذف الحجز الفندقي "${selectedBooking.booking_ref} - ${selectedBooking.hotel_name}"؟`)) {
                      deleteMutation.mutate(selectedBooking.id);
                    }
                  } else {
                    alert("يرجى اختيار معاملة من الجدول لحذفها");
                  }
                }}
                disabled={!selectedBooking || deleteMutation.isPending}
                variant="destructive"
                className="font-bold text-xs gap-1.5 shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                حذف المعاملة 🗑️
              </Button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* MAIN HOTEL BOOKING MODAL (نظام الطرفين المتكامل) */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
            <DialogHeader className="border-b pb-3">
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Hotel className="w-5 h-5 text-amber-600" />
                {editingBooking ? "تعديل حجز فندقي (نظام الطرفين)" : "إضافة حجز فندقي جديد (نظام الطرفين المتكامل)"}
              </DialogTitle>
              <DialogDescription>
                تعبئة بيانات الطرف الأول (العميل والنزيل ومبلغ البيع) والطرف الثاني (الفندق ومبلغ التكلفة) وتفاصيل الغرف وحساب العمولات تلقائياً
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={e => {
                e.preventDefault();
                saveMutation.mutate(form);
              }}
              className="space-y-5 py-2"
            >
              {/* Top Reference Numbers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">رقم مرجع الحجز (Booking Ref)</label>
                  <Input
                    required
                    value={form.booking_ref}
                    onChange={e => setForm(f => ({ ...f, booking_ref: e.target.value }))}
                    className="font-mono font-bold text-amber-700 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">رقم سند القسيمة (Voucher No.)</label>
                  <Input
                    value={form.voucher_number}
                    onChange={e => setForm(f => ({ ...f, voucher_number: e.target.value }))}
                    className="font-mono bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">رقم تأكيد الفندق (Confirmation No.)</label>
                  <Input
                    placeholder="مثال: HTL-CONF-88912"
                    value={form.confirmation_number}
                    onChange={e => setForm(f => ({ ...f, confirmation_number: e.target.value }))}
                    className="font-mono bg-white"
                  />
                </div>
              </div>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* الطرف الأول: العميل والنزيل ومبلغ البيع */}
              {/* ───────────────────────────────────────────────────────────── */}
              <div className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50/30 space-y-4">
                <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      1
                    </span>
                    <h3 className="font-bold text-blue-950 text-sm">
                      الطرف الأول: بيانات العميل والنزيل ومبلغ البيع (Customer & Guest)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuickCustomerModal(true)}
                    className="text-xs text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> إضافة عميل جديد
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Customer Select */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">اختيار العميل الدافع (الحساب) *</label>
                    <select
                      required
                      value={form.customer_id}
                      onChange={e => handleCustomerSelect(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm font-medium"
                    >
                      <option value="">-- اختر العميل من الدليل --</option>
                      {customers.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          👤 {c.name} ({c.phone || c.customer_type || 'عميل'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Guest Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">اسم النزيل الفعلي (Guest Name) *</label>
                    <Input
                      required
                      placeholder="اسم النزيل كما بالجواز أو الهوية"
                      value={form.guest_name}
                      onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))}
                      className="bg-white"
                    />
                  </div>

                  {/* Guest Phone / Passport */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">رقم الهاتف / جواز السفر للنزيل</label>
                    <Input
                      placeholder="مثال: 0501234567 / P12345678"
                      value={form.guest_phone}
                      onChange={e => setForm(f => ({ ...f, guest_phone: e.target.value }))}
                      className="bg-white"
                    />
                  </div>
                </div>

                {/* Selling Financials & Statement */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-emerald-800">مبلغ البيع للعميل (Selling Price) *</label>
                    <Input
                      required
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={form.selling_price}
                      onChange={e => setForm(f => ({ ...f, selling_price: e.target.value }))}
                      className="font-mono font-bold text-emerald-700 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">عملة العميل</label>
                    <select
                      value={form.customer_currency}
                      onChange={e => setForm(f => ({ ...f, customer_currency: e.target.value, commission_currency: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm font-medium"
                    >
                      {CURRENCIES.map(cur => (
                        <option key={cur.id} value={cur.id}>{cur.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">عدد الأيام / الليالي (الطرف الأول)</label>
                    <Input
                      type="number"
                      min="1"
                      value={form.customer_days}
                      onChange={e => setForm(f => ({ ...f, customer_days: e.target.value, nights: e.target.value }))}
                      className="font-mono bg-white"
                    />
                  </div>
                </div>

                {/* Customer Statement */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">بيان وشرح الطرف الأول (Customer Statement)</label>
                  <Input
                    placeholder="مثال: قيمة حجز إقامة فندقية شاملة الإفطار والضرائب"
                    value={form.customer_statement}
                    onChange={e => setForm(f => ({ ...f, customer_statement: e.target.value }))}
                    className="bg-white"
                  />
                </div>
              </div>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* الطرف الثاني: اسم الفندق والمورد ومبلغ التكلفة */}
              {/* ───────────────────────────────────────────────────────────── */}
              <div className="p-4 rounded-xl border-2 border-amber-200 bg-amber-50/30 space-y-4">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
                      2
                    </span>
                    <h3 className="font-bold text-amber-950 text-sm">
                      الطرف الثاني: اسم الفندق والمورد ومبلغ التكلفة (Hotel & Cost)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuickHotelModal(true)}
                    className="text-xs text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> إضافة فندق للدليل
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Hotel Selector from Catalog */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-bold text-slate-700">اختيار اسم الفندق من الدليل (Hotels Catalog) *</label>
                    <select
                      required
                      value={form.hotel_db_id}
                      onChange={e => handleHotelSelect(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm font-medium"
                    >
                      <option value="">-- اختر الفندق أو المنتجع من الدليل (مثل دليل العملاء) --</option>
                      {hotelsCatalog.map((h: any) => (
                        <option key={h.id} value={h.id}>
                          🏨 {h.name_ar} {h.name_en ? `(${h.name_en})` : ''} - {h.city || ''} [{h.star_rating}★]
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Manual hotel name override if not in DB */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">اسم الفندق الظاهر *</label>
                    <Input
                      required
                      placeholder="اسم الفندق"
                      value={form.hotel_name}
                      onChange={e => setForm(f => ({ ...f, hotel_name: e.target.value }))}
                      className="bg-white font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">المدينة والدولة</label>
                    <Input
                      placeholder="مثال: مكة المكرمة، السعودية"
                      value={form.city_country}
                      onChange={e => setForm(f => ({ ...f, city_country: e.target.value }))}
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-rose-800">مبلغ التكلفة على الفندق (Cost Price) *</label>
                    <Input
                      required
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={form.cost_price}
                      onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))}
                      className="font-mono font-bold text-rose-700 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">عملة المورد / الفندق</label>
                    <select
                      value={form.supplier_currency}
                      onChange={e => setForm(f => ({ ...f, supplier_currency: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm font-medium"
                    >
                      {CURRENCIES.map(cur => (
                        <option key={cur.id} value={cur.id}>{cur.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Supplier Statement */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-1 md:col-span-3">
                    <label className="text-xs font-bold text-slate-700">بيان وشرح الطرف الثاني (Supplier Statement)</label>
                    <Input
                      placeholder="مثال: تكلفة حجز غرفة فندقية لدى المورد المباشر"
                      value={form.supplier_statement}
                      onChange={e => setForm(f => ({ ...f, supplier_statement: e.target.value }))}
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">عدد الأيام (الطرف الثاني)</label>
                    <Input
                      type="number"
                      min="1"
                      value={form.supplier_days}
                      onChange={e => setForm(f => ({ ...f, supplier_days: e.target.value }))}
                      className="font-mono bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* تفاصيل الغرفة والإقامة والتواريخ */}
              {/* ───────────────────────────────────────────────────────────── */}
              <div className="p-4 rounded-xl border bg-slate-50 space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-2">
                  <BedDouble className="w-4 h-4 text-indigo-600" />
                  تفاصيل الغرفة، نظام الوجبات وتواريخ الإقامة (Room & Stay Details)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">نوع الغرفة (Room Type) *</label>
                    <select
                      value={form.room_type}
                      onChange={e => setForm(f => ({ ...f, room_type: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm font-medium"
                    >
                      {ROOM_TYPES.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">عدد الغرف</label>
                    <Input
                      type="number"
                      min="1"
                      value={form.rooms_count}
                      onChange={e => setForm(f => ({ ...f, rooms_count: e.target.value }))}
                      className="bg-white font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">عدد النزلاء (Guests)</label>
                    <Input
                      type="number"
                      min="1"
                      value={form.guests_count}
                      onChange={e => setForm(f => ({ ...f, guests_count: e.target.value }))}
                      className="bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">نظام الوجبات (Meal Plan)</label>
                    <select
                      value={form.meal_plan}
                      onChange={e => setForm(f => ({ ...f, meal_plan: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm font-medium"
                    >
                      {MEAL_PLANS.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">تاريخ الدخول (Check-In) *</label>
                    <Input
                      required
                      type="date"
                      value={form.check_in}
                      onChange={e => handleDateChange("in", e.target.value)}
                      className="bg-white font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">تاريخ المغادرة (Check-Out) *</label>
                    <Input
                      required
                      type="date"
                      value={form.check_out}
                      onChange={e => handleDateChange("out", e.target.value)}
                      className="bg-white font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* عمولة المكتب وطريقة الدفع وحالة الحجز */}
              {/* ───────────────────────────────────────────────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Auto Calculated Commission */}
                <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/40 space-y-3">
                  <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    عمولة وأرباح المكتب المحتسبة تلقائياً
                  </h4>
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-amber-200">
                    <div>
                      <p className="text-xs text-muted-foreground">صافي ربح المعاملة (البيع - التكلفة):</p>
                      <p className="text-xl font-black font-mono text-amber-700">
                        {commVal.toLocaleString()} {form.customer_currency}
                      </p>
                    </div>
                    <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2 py-1 rounded">
                      {sellVal > 0 ? `${((commVal / sellVal) * 100).toFixed(1)}% هامش ربح` : '0%'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">بيان العمولة (Commission Statement)</label>
                    <Input
                      placeholder="عمولة وأتعاب حجز فندقي"
                      value={form.commission_statement}
                      onChange={e => setForm(f => ({ ...f, commission_statement: e.target.value }))}
                      className="bg-white text-xs"
                    />
                  </div>
                </div>

                {/* Payment & Booking Status */}
                <div className="p-4 rounded-xl border border-slate-300 bg-white space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    طريقة الدفع وحالة الحجز والسداد
                  </h4>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">طريقة الدفع *</label>
                      <select
                        value={form.payment_method}
                        onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs font-medium"
                      >
                        {PAYMENT_METHODS.map(pm => (
                          <option key={pm.id} value={pm.id}>{pm.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">حالة السداد *</label>
                      <select
                        value={form.payment_status}
                        onChange={e => setForm(f => ({ ...f, payment_status: e.target.value }))}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs font-medium"
                      >
                        <option value="paid">مدفوع بالكامل (Paid)</option>
                        <option value="partial">مدفوع جزئياً (Partial)</option>
                        <option value="unpaid">غير مدفوع / آجل (Unpaid)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">حالة الحجز (Status) *</label>
                      <select
                        value={form.status}
                        onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs font-bold text-emerald-800"
                      >
                        <option value="confirmed">مؤكد Confirmed</option>
                        <option value="issued">مصدرة القسيمة Issued</option>
                        <option value="pending">قيد الانتظار Pending</option>
                        <option value="cancelled">ملغى Cancelled</option>
                        <option value="refunded">مسترجع Refunded</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">تاريخ الإصدار</label>
                      <Input
                        type="date"
                        value={form.issue_date}
                        onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">ملاحظات وشروط خاصة بالحجز (Notes)</label>
                <Input
                  placeholder="مثال: سرير كبير، طابق علوي، تسجيل وصول متأخر، سرير إضافي للأطفال..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <DialogFooter className="gap-2 border-t pt-3">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 shadow-md"
                >
                  {saveMutation.isPending ? "جاري الحفظ..." : editingBooking ? "حفظ تعديلات الحجز" : "تأكيد وإصدار الحجز الفندقي"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* QUICK HOTEL TO CATALOG MODAL */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        <Dialog open={quickHotelModal} onOpenChange={setQuickHotelModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Hotel className="w-5 h-5 text-amber-600" />
                إضافة فندق جديد لدليل الفنادق
              </DialogTitle>
              <DialogDescription>
                إضافة فندق سريع ليظهر تلقائياً في قائمة الفنادق بجميع الحجوزات
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={e => {
                e.preventDefault();
                quickHotelMutation.mutate(quickHotelForm);
              }}
              className="space-y-3 py-2"
            >
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">اسم الفندق بالعربي *</label>
                <Input
                  required
                  placeholder="مثال: فندق هيلتون مكة للمؤتمرات"
                  value={quickHotelForm.name_ar}
                  onChange={e => setQuickHotelForm(f => ({ ...f, name_ar: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">الاسم بالإنجليزية (English Name)</label>
                <Input
                  placeholder="e.g. Makkah Hilton Convention Hotel"
                  value={quickHotelForm.name_en}
                  onChange={e => setQuickHotelForm(f => ({ ...f, name_en: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">الدولة *</label>
                  <Input
                    required
                    value={quickHotelForm.country}
                    onChange={e => setQuickHotelForm(f => ({ ...f, country: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">المدينة *</label>
                  <Input
                    required
                    value={quickHotelForm.city}
                    onChange={e => setQuickHotelForm(f => ({ ...f, city: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">تصنيف النجوم (Stars)</label>
                  <select
                    value={quickHotelForm.star_rating}
                    onChange={e => setQuickHotelForm(f => ({ ...f, star_rating: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium"
                  >
                    <option value="5">5 نجوم فاخر ★★★★★</option>
                    <option value="4">4 نجوم ممتاز ★★★★</option>
                    <option value="3">3 نجوم جيد ★★★</option>
                    <option value="2">نجمتان ★★</option>
                    <option value="7">7 نجوم فائق الفخامة ★★★★★★★</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">المورد المباشر</label>
                  <Input
                    value={quickHotelForm.supplier_name}
                    onChange={e => setQuickHotelForm(f => ({ ...f, supplier_name: e.target.value }))}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setQuickHotelModal(false)}>إلغاء</Button>
                <Button type="submit" disabled={quickHotelMutation.isPending} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                  {quickHotelMutation.isPending ? "جاري الحفظ..." : "حفظ واختيار الفندق"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* QUICK CUSTOMER MODAL */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        <Dialog open={quickCustomerModal} onOpenChange={setQuickCustomerModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                إضافة عميل جديد سريع
              </DialogTitle>
            </DialogHeader>

            <form
              onSubmit={e => {
                e.preventDefault();
                quickCustomerMutation.mutate(quickCustomerForm);
              }}
              className="space-y-3 py-2"
            >
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">اسم العميل / النزيل *</label>
                <Input
                  required
                  placeholder="الاسم الكامل"
                  value={quickCustomerForm.name}
                  onChange={e => setQuickCustomerForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">رقم الهاتف / الواتساب</label>
                <Input
                  placeholder="05XXXXXXXX"
                  value={quickCustomerForm.phone}
                  onChange={e => setQuickCustomerForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setQuickCustomerModal(false)}>إلغاء</Button>
                <Button type="submit" disabled={quickCustomerMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                  {quickCustomerMutation.isPending ? "جاري الحفظ..." : "حفظ واختيار العميل"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* PRINT / PREVIEW VOUCHER MODAL (استعراض وطباعة سند وسند حجز الفندق) */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        <Dialog open={Boolean(previewBooking)} onOpenChange={open => !open && setPreviewBooking(null)}>
          <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-600" />
                قسيمة وسند تأكيد الحجز الفندقي (Hotel Booking Voucher)
              </DialogTitle>
              <DialogDescription>
                معاينة قسيمة الحجز الفندقي المعتمدة الجاهزة للطباعة أو التصدير أو الإرسال للعميل
              </DialogDescription>
            </DialogHeader>

            {previewBooking && (
              <div className="space-y-4 p-5 rounded-xl border bg-white text-slate-900 shadow-sm" id="hotel-voucher-print">
                {/* Voucher Header */}
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="space-y-0.5">
                    <h2 className="text-xl font-black text-slate-900">شركة أومني للسفريات والسياحة</h2>
                    <p className="text-xs text-muted-foreground">قسم الحجوزات الفندقية والإقامة السياحية المعتمدة</p>
                    <p className="text-[11px] text-slate-500 font-mono">HOTEL ACCOMMODATION CONFIRMATION VOUCHER</p>
                  </div>
                  <div className="text-left font-mono">
                    <div className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                      مرجع: {previewBooking.booking_ref}
                    </div>
                    {previewBooking.voucher_number && (
                      <div className="text-[11px] text-slate-600 mt-1 font-bold">
                        سند رقم: {previewBooking.voucher_number}
                      </div>
                    )}
                    {previewBooking.confirmation_number && (
                      <div className="text-[11px] text-emerald-700 font-bold">
                        تأكيد الفندق: {previewBooking.confirmation_number}
                      </div>
                    )}
                  </div>
                </div>

                {/* Hotel Box */}
                <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-amber-950 flex items-center gap-1.5">
                        <Hotel className="w-4 h-4 text-amber-600" />
                        {previewBooking.hotel_name}
                      </h3>
                      <p className="text-xs text-amber-800 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {previewBooking.city_country || previewBooking.city}
                      </p>
                    </div>
                    <span className="text-xs font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded">
                      حجز مؤكد Confirmed
                    </span>
                  </div>
                </div>

                {/* Grid details */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border">
                  <div>
                    <span className="text-muted-foreground font-semibold">العميل الدافع:</span>{" "}
                    <span className="font-bold text-slate-900">{previewBooking.customer_name || "عميل عام"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">اسم النزيل الأساسي:</span>{" "}
                    <span className="font-bold text-slate-900">{previewBooking.guest_name || previewBooking.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">تاريخ الدخول (Check-In):</span>{" "}
                    <span className="font-mono font-bold text-slate-900">{previewBooking.check_in || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">تاريخ المغادرة (Check-Out):</span>{" "}
                    <span className="font-mono font-bold text-slate-900">{previewBooking.check_out || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">مدة الإقامة:</span>{" "}
                    <span className="font-bold text-indigo-700">{previewBooking.nights || 1} ليالي ({previewBooking.customer_days || previewBooking.nights || 1} أيام)</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">نوع الغرفة:</span>{" "}
                    <span className="font-bold text-slate-900">{previewBooking.room_type || "مزدوجة"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">عدد الغرف والنزلاء:</span>{" "}
                    <span className="font-bold">{previewBooking.rooms_count || 1} غرفة • {previewBooking.guests_count || 2} نزيل</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">نظام الوجبات:</span>{" "}
                    <span className="font-bold text-emerald-800">{previewBooking.meal_plan || "إفطار شامل"}</span>
                  </div>
                </div>

                {/* Statements */}
                {previewBooking.customer_statement && (
                  <div className="text-xs p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg">
                    <span className="font-bold text-blue-900">بيان العميل:</span> {previewBooking.customer_statement}
                  </div>
                )}

                {/* Financial Total */}
                <div className="p-3 bg-slate-900 text-white rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">إجمالي المبلغ المستحق للعميل:</p>
                    <p className="text-lg font-black font-mono text-emerald-400">
                      {Number(previewBooking.selling_price || 0).toLocaleString()} {previewBooking.customer_currency || 'SAR'}
                    </p>
                  </div>
                  <div className="text-left text-xs text-slate-300">
                    <p>طريقة الدفع: <span className="font-bold text-white">{PAYMENT_METHODS.find(p => p.id === previewBooking.payment_method)?.label?.split('(')[0] || 'نقداً'}</span></p>
                    <p>حالة السداد: <span className="font-bold text-emerald-300">{previewBooking.payment_status === 'paid' ? 'مدفوع بالكامل' : previewBooking.payment_status}</span></p>
                  </div>
                </div>

                {/* Footer notes */}
                <div className="text-[11px] text-muted-foreground border-t pt-2 space-y-1">
                  <p>• مواعيد تسجيل الدخول المعتادة بالفندق تبدأ من الساعة 02:00 ظهراً، وتسجيل المغادرة حتى الساعة 12:00 ظهراً.</p>
                  <p>• يرجى إبراز هذا السند مع أصل جواز السفر أو الهوية الوطنية عند الاستقبال في الفندق.</p>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setPreviewBooking(null)}>
                إغلاق
              </Button>
              <Button onClick={() => window.print()} className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2">
                <Printer className="w-4 h-4" /> طباعة القسيمة فوراً
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
