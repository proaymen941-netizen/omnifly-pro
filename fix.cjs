const fs = require('fs');

function applyToBookings() {
  let code = fs.readFileSync('artifacts/pos-system/src/pages/travel-bookings.tsx', 'utf8');

  // Replace airlines fetch
  code = code.replace(
    'queryKey: ["travel-airlines-list"],\n    queryFn: () => fetchWithAuth("/api/travel/airlines")',
    'queryKey: ["travel-airlines-list"],\n    queryFn: () => fetchWithAuth("/api/travel/sub-accounts/21100")'
  );

  // Remove quick airline modal state & mutation
  code = code.replace(/const \[quickAirlineModal, setQuickAirlineModal\] = useState\(false\);\s*const \[quickAirlineForm, setQuickAirlineForm\] = useState\(\{[\s\S]*?\}\);\s*const addAirlineMutation = useMutation\(\{[\s\S]*?\}\);/m, '');

  // Replace form state
  code = code.replace(
    /const \[form, setForm\] = useState\(\{[\s\S]*?notes: ""\n  \}\);/m,
    `const [form, setForm] = useState({
    booking_number: "",
    service_type: "flight",
    customer_id: "",
    passenger_id: "",
    airline_supplier: "",
    supplier_id: "",
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
    supplier_currency: "SAR",
    supplier_statement: "قيمة تذكرة طيران",
    selling_price: "0",
    customer_currency: "SAR",
    customer_statement: "قيمة تذكرة طيران",
    agency_commission: "0",
    commission_currency: "SAR",
    payment_status: "paid",
    payment_method: "cash",
    notes: ""
  });`
  );

  // Replace resetForm
  code = code.replace(
    /const resetForm = \(\) => \{[\s\S]*?notes: ""\n    \}\);\n  \};/m,
    `const resetForm = () => {
    setEditingBooking(null);
    setForm({
      booking_number: \`TKT-\${new Date().getFullYear()}-\${Math.floor(1000 + Math.random() * 9000)}\`,
      service_type: "flight",
      customer_id: "",
      passenger_id: "",
      airline_supplier: "",
      supplier_id: "",
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
      supplier_currency: "SAR",
      supplier_statement: "قيمة تذكرة طيران",
      selling_price: "0",
      customer_currency: "SAR",
      customer_statement: "قيمة تذكرة طيران",
      agency_commission: "0",
      commission_currency: "SAR",
      payment_status: "paid",
      payment_method: "cash",
      notes: ""
    });
  };`
  );

  // Replace handleEdit
  code = code.replace(
    /const handleEdit = \(bk: any\) => \{[\s\S]*?notes: bk\.notes \|\| ""\n    \}\);\n    setModalOpen\(true\);\n  \};/m,
    `const handleEdit = (bk: any) => {
    setEditingBooking(bk);
    setForm({
      booking_number: bk.booking_number || "",
      service_type: bk.service_type || "flight",
      customer_id: bk.customer_id ? String(bk.customer_id) : "",
      passenger_id: bk.passenger_id ? String(bk.passenger_id) : "",
      airline_supplier: bk.airline_supplier || "",
      supplier_id: bk.supplier_id ? String(bk.supplier_id) : "",
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
      supplier_currency: bk.supplier_currency || "SAR",
      supplier_statement: bk.supplier_statement || "قيمة تذكرة طيران",
      selling_price: String(bk.selling_price || 0),
      customer_currency: bk.customer_currency || "SAR",
      customer_statement: bk.customer_statement || "قيمة تذكرة طيران",
      agency_commission: String(bk.agency_commission || 0),
      commission_currency: bk.commission_currency || "SAR",
      payment_status: bk.payment_status || "paid",
      payment_method: bk.payment_method || "cash",
      notes: bk.notes || ""
    });
    setModalOpen(true);
  };`
  );

  // Replace Form UI block
  const startStr = '<div className="space-y-4 py-4">';
  const endStr = '{/* Commission Live Display */}';
  const startIdx = code.indexOf(startStr);
  const endIdx = code.indexOf(endStr);

  if (startIdx !== -1 && endIdx !== -1) {
    const newUI = `<div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* الطرف الأول: العميل */}
                <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                    <span className="font-bold text-xs text-emerald-950 flex items-center gap-1">
                      <span>👤</span>
                      <span>الطرف الأول: العميل (المدين / الدافع) *</span>
                    </span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">العميل (Customer) *</label>
                    <select
                      required
                      value={form.customer_id}
                      onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">-- اختر العميل --</option>
                      {customers.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
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
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">مبلغ البيع (Selling) *</label>
                      <Input
                        required type="number"
                        value={form.selling_price}
                        onChange={e => {
                          const selling = Number(e.target.value) || 0;
                          const cost = Number(form.cost_price) || 0;
                          setForm(f => ({ ...f, selling_price: e.target.value, agency_commission: String(selling - cost) }));
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">عملة العميل</label>
                      <select
                        value={form.customer_currency}
                        onChange={e => setForm(f => ({ ...f, customer_currency: e.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="SAR">ريال سعودي (SAR)</option>
                        <option value="USD">دولار أمريكي (USD)</option>
                        <option value="YER">ريال يمني (YER)</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">البيان الخاص بالعميل (وصف الفاتورة)</label>
                    <Input
                      placeholder="مثال: قيمة تذكرة طيران ذهاب وعودة"
                      value={form.customer_statement}
                      onChange={e => setForm(f => ({ ...f, customer_statement: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">طريقة الدفع للعميل *</label>
                    <select
                      value={form.payment_method}
                      onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="cash">نقداً (Cash)</option>
                      <option value="bank_transfer">حوالة بنكية</option>
                      <option value="card">بطاقة (شبكة)</option>
                      <option value="credit">آجل / ذمم (Credit)</option>
                    </select>
                  </div>
                </div>

                {/* الطرف الثاني: الطيران / المورد */}
                <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                    <span className="font-bold text-xs text-blue-950 flex items-center gap-1">
                      <span>✈️</span>
                      <span>الطرف الثاني: شركة الطيران / المورد (الدائن) *</span>
                    </span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">شركة الطيران / المورد (من دليل الحسابات) *</label>
                    <select
                      required
                      value={form.supplier_id}
                      onChange={e => {
                        const sup = airlines.find((a: any) => String(a.id) === e.target.value);
                        setForm(f => ({ 
                          ...f, 
                          supplier_id: e.target.value,
                          airline_supplier: sup ? sup.name : "" 
                        }));
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium"
                    >
                      <option value="">-- اختر المورد (الذمم الدائنة للطيران) --</option>
                      {airlines.map((a: any) => (
                        <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">رقم الرحلة (Flight No.)</label>
                      <Input
                        placeholder="مثال: SV-112"
                        value={form.flight_number}
                        onChange={e => setForm(f => ({ ...f, flight_number: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">PNR (رقم الحجز)</label>
                      <Input
                        placeholder="e.g. 6ABCD7"
                        value={form.pnr}
                        onChange={e => setForm(f => ({ ...f, pnr: e.target.value.toUpperCase() }))}
                        className="uppercase font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">مبلغ التكلفة (Cost) *</label>
                      <Input
                        required type="number"
                        value={form.cost_price}
                        onChange={e => {
                          const cost = Number(e.target.value) || 0;
                          const selling = Number(form.selling_price) || 0;
                          setForm(f => ({ ...f, cost_price: e.target.value, agency_commission: String(selling - cost) }));
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">عملة المورد</label>
                      <select
                        value={form.supplier_currency}
                        onChange={e => setForm(f => ({ ...f, supplier_currency: e.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="SAR">ريال سعودي (SAR)</option>
                        <option value="USD">دولار أمريكي (USD)</option>
                        <option value="YER">ريال يمني (YER)</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">البيان الخاص بالمورد (في كشف الحساب)</label>
                    <Input
                      placeholder="مثال: تكلفة تذكرة طيران"
                      value={form.supplier_statement}
                      onChange={e => setForm(f => ({ ...f, supplier_statement: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: مسار وتاريخ الرحلة */}
              <div className="p-3 border rounded-lg bg-slate-50 space-y-3">
                <div className="font-bold text-xs text-slate-800 pb-1 border-b">مسار الرحلة والتواريخ</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">مدينة المغادرة</label>
                    <Input
                      placeholder="الرياض"
                      value={form.origin_city}
                      onChange={e => setForm(f => ({ ...f, origin_city: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">مدينة الوصول</label>
                    <Input
                      placeholder="القاهرة"
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
                    <label className="text-xs font-bold text-slate-700">تاريخ العودة</label>
                    <Input
                      type="date"
                      value={form.return_date}
                      onChange={e => setForm(f => ({ ...f, return_date: e.target.value }))}
                    />
                  </div>
                </div>
              </div>\n              `;
    
    code = code.substring(0, startIdx) + newUI + code.substring(endIdx);
  } else {
    console.log("Could not find start/end for form UI in bookings");
  }

  // Remove QuickAirline Modal HTML
  const modalStart = code.indexOf('{/* Quick Airline Modal */}');
  if (modalStart !== -1) {
    const modalEnd = code.indexOf('</Dialog>', modalStart) + 9;
    code = code.substring(0, modalStart) + code.substring(modalEnd);
  }

  fs.writeFileSync('artifacts/pos-system/src/pages/travel-bookings.tsx', code);
}

function applyToBusTickets() {
  let code = fs.readFileSync('artifacts/pos-system/src/pages/travel-bus-tickets.tsx', 'utf8');
  
  // Replace transport-companies with sub-accounts
  code = code.replace(
    'queryKey: ["travel-transport-companies"],\n    queryFn: () => fetchWithAuth("/api/travel/transport-companies")',
    'queryKey: ["travel-transport-companies"],\n    queryFn: () => fetchWithAuth("/api/travel/sub-accounts/21100")'
  );

  // Remove quick company modal block
  code = code.replace(/const \[quickCompanyModalOpen, setQuickCompanyModalOpen\] = useState\(false\);\s*const \[quickCompanyForm, setQuickCompanyForm\] = useState\(\{[\s\S]*?\}\);\s*const quickCompanyMutation = useMutation\(\{[\s\S]*?\}\);/m, '');

  // Update supplier_id logic
  // Update select logic for Transport Company in UI
  code = code.replace(/\{companies\.map\(\(c: any\) => \(\s*<option key=\{c\.id\} value=\{c\.id\}>\{c\.name\} - \{c\.address \|\| ""\}<\/option>\s*\)\)\}/m, 
  `{companies.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                      ))}`);
                      
  // Delete Quick Company Modal HTML
  const modalStart = code.indexOf('{/* MODAL: QUICK ADD TRANSPORT COMPANY (الطرف الثاني - شركة النقل البري بدليل الحسابات) */}');
  if (modalStart !== -1) {
    const modalEnd = code.indexOf('</Dialog>', modalStart) + 9;
    code = code.substring(0, modalStart) + code.substring(modalEnd);
  }
  
  // Remove the button that opens the modal
  code = code.replace(/<button[^>]*onClick=\{[^}]*setQuickCompanyModalOpen\(true\)[^}]*\}[^>]*>[\s\S]*?<\/button>/m, '');

  fs.writeFileSync('artifacts/pos-system/src/pages/travel-bus-tickets.tsx', code);
}

applyToBookings();
applyToBusTickets();

