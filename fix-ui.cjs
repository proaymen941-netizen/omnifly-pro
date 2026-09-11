const fs = require('fs');

let code = fs.readFileSync('artifacts/pos-system/src/pages/travel-bookings.tsx', 'utf8');

const searchStart = '<form\\s+onSubmit=\\{e => \\{[\\s\\S]*?className="space-y-4 py-2"\\s*>';
const searchEnd = '\\{/\\* Commission Live Display \\*/}';

const regex = new RegExp(`(${searchStart})[\\s\\S]*?(${searchEnd})`);
const match = code.match(regex);

if (match) {
  const newUI = `
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
              </div>
`;
  code = code.replace(regex, `$1\n${newUI}\n$2`);
  
  // also add action buttons at the bottom if requested
  // I will append F10, F3, F4 action buttons below the main table container.
  
  fs.writeFileSync('artifacts/pos-system/src/pages/travel-bookings.tsx', code);
  console.log("Successfully replaced form UI");
} else {
  console.log("Regex didn't match.");
}
