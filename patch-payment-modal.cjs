const fs = require('fs');

let code = fs.readFileSync('artifacts/pos-system/src/pages/accounting.tsx', 'utf8');

const startMarker = '{/* MODAL 14: DEDICATED PAYMENT VOUCHER (سند الصرف المستقل - مطابق للصورة) */}';
const endMarker = '<ReportViewerModal';

const regex = new RegExp(`(${startMarker})[\\s\\S]*?(?=\\s*${endMarker})`);

const newModal = `${startMarker}
        {/* ───────────────────────────────────────────────────────────── */}
        <Dialog open={showPaymentDlg} onOpenChange={setShowPaymentDlg}>
          <DialogContent className="max-w-[1100px] max-h-[95vh] overflow-y-auto bg-[#f0f4f8] p-2 text-xs" dir="rtl">
            
            {/* Header: Title, Date, ID */}
            <div className="flex items-center justify-between border-b border-slate-300 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700">رقم السند</label>
                <Input className="w-20 h-7 text-xs font-bold bg-white text-center border-slate-300 rounded-none text-red-600" value="1" readOnly />
                <label className="text-xs font-bold text-slate-700 ml-2">التاريخ</label>
                <Input type="date" className="w-32 h-7 text-xs bg-white border-slate-300 rounded-none" value="2026-08-02" readOnly />
              </div>
              <h2 className="text-lg font-bold text-red-700">سند صــــرف</h2>
              <div className="w-40"></div> {/* Spacer for center alignment */}
            </div>

            {/* Top Container: Two columns */}
            <div className="grid grid-cols-2 gap-4 bg-white p-3 border border-slate-300 rounded shadow-sm">
              
              {/* Right Column */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="w-24 text-left font-bold text-slate-700">اسم الصندوق <span className="text-red-500">*</span></label>
                  <Select value={paymentForm.safe_id || "1"} onValueChange={v => setPaymentForm({ ...paymentForm, safe_id: v })}>
                    <SelectTrigger className="flex-1 h-7 text-xs border-slate-300 rounded-none bg-slate-50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {safes.map((s: any) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input className="w-12 h-7 text-xs text-center font-bold bg-slate-200 border-slate-300 rounded-none" value="1" readOnly />
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="w-24 text-left font-bold text-slate-700">عملة الحساب <span className="text-red-500">*</span></label>
                  <Select defaultValue="YER">
                    <SelectTrigger className="flex-1 h-7 text-xs border-slate-300 rounded-none bg-yellow-200 text-slate-900 font-bold focus-visible:ring-0"><SelectValue placeholder="ريال يمني" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YER">ريال يمني</SelectItem>
                      <SelectItem value="SAR">ريال سعودي</SelectItem>
                      <SelectItem value="USD">دولار أمريكي</SelectItem>
                    </SelectContent>
                  </Select>
                  <label className="text-slate-500 text-[10px] ml-1">س.ص</label>
                  <Input className="w-16 h-7 text-xs text-center font-bold bg-white border-slate-300 rounded-none" value="1" readOnly />
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="w-24 text-left font-bold text-red-700">المبلغ رقماً <span className="text-red-500">*</span></label>
                  <Input 
                    type="number" 
                    className="flex-1 h-7 text-sm font-black text-red-700 bg-pink-50 border-slate-300 rounded-none text-right" 
                    value={paymentForm.amount || "240450"} 
                    onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} 
                  />
                  <span className="w-8 text-center text-[10px] font-bold text-slate-500">ر.ي</span>
                </div>
              </div>

              {/* Left Column */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="w-28 text-left font-bold text-slate-700">اسم المحصل</label>
                  <Select defaultValue="1">
                    <SelectTrigger className="flex-1 h-7 text-xs border-slate-300 rounded-none bg-slate-50"><SelectValue placeholder="محمد احمد" /></SelectTrigger>
                    <SelectContent><SelectItem value="1">محمد احمد</SelectItem></SelectContent>
                  </Select>
                  <Input className="w-12 h-7 text-xs text-center font-bold bg-slate-200 border-slate-300 rounded-none" value="1" readOnly />
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="w-28 text-left font-bold text-slate-700">تصنيف الحركة</label>
                  <Input className="flex-1 h-7 text-xs bg-slate-50 border-slate-300 rounded-none" value="صرف سلفة نقدي" readOnly />
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="w-28 text-left font-bold text-slate-700">مركز التكلفة</label>
                  <Input className="flex-1 h-7 text-xs bg-slate-50 border-slate-300 rounded-none" value="الفرع الرئيسي" readOnly />
                  <Input className="w-12 h-7 text-xs text-center font-bold bg-slate-200 border-slate-300 rounded-none" value="1" readOnly />
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="w-28 text-left font-bold text-slate-700">رمز الحركة</label>
                  <Input className="w-24 h-7 text-xs bg-slate-50 border-slate-300 rounded-none text-center" value="صرف" readOnly />
                  <label className="text-slate-500 text-[10px] ml-1">مرجع</label>
                  <Input className="w-24 h-7 text-xs bg-slate-50 border-slate-300 rounded-none text-center" value="1" readOnly />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-28 text-left font-bold text-slate-700">تاريخ الاستحقاق</label>
                  <Input type="date" className="w-32 h-7 text-xs bg-white border-slate-300 rounded-none" value="2026-08-10" readOnly />
                </div>
              </div>
              
            </div>

            {/* Middle Section: Word amount, receiver, explanation */}
            <div className="space-y-2 mt-3 bg-white p-3 border border-slate-300 rounded shadow-sm">
              <div className="flex items-center gap-2">
                <label className="w-24 text-left font-bold text-slate-700">المبلغ كتابة</label>
                <Input className="flex-1 h-7 text-xs font-bold bg-amber-50 text-amber-900 border-slate-300 rounded-none" value={paymentForm.amount ? tafqeet(Number(paymentForm.amount), "YER") : "مائتان وأربعون ألف وأربعمائة وخمسون ريال يمني"} readOnly />
              </div>
              
              <div className="flex items-center gap-2">
                <label className="w-24 text-left font-bold text-slate-700">اسم المستلم <span className="text-red-500">*</span></label>
                <Input className="flex-1 h-7 text-xs font-bold bg-purple-100 text-purple-900 border-slate-300 rounded-none" value={paymentForm.received_from || "الموظف ابراهيم محمد الشاوش"} onChange={e => setPaymentForm({...paymentForm, received_from: e.target.value})} />
              </div>

              <div className="flex items-center gap-2">
                <label className="w-24 text-left font-bold text-slate-700">البيان / الشرح</label>
                <Input className="flex-1 h-7 text-xs font-bold bg-white border-slate-300 rounded-none" value={paymentForm.payment_against || "عليكم سلفة نقداً"} onChange={e => setPaymentForm({...paymentForm, payment_against: e.target.value})} />
              </div>
            </div>

            {/* Bottom Tabs & Table */}
            <div className="mt-3 bg-white border border-slate-300 rounded shadow-sm">
              <Tabs defaultValue="details">
                <div className="border-b border-slate-300 bg-slate-100 flex overflow-x-auto">
                  <TabsList className="bg-transparent h-8 w-full justify-start rounded-none p-0">
                    <TabsTrigger value="details" className="h-8 rounded-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-red-600 text-[11px] font-bold px-6">تفاصيل حسابات السند</TabsTrigger>
                    <TabsTrigger value="other" className="h-8 rounded-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-red-600 text-[11px] font-bold px-6">تفاصيل أخرى</TabsTrigger>
                    <TabsTrigger value="installments" className="h-8 rounded-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-red-600 text-[11px] font-bold px-6">خاص بالأقساط</TabsTrigger>
                    <TabsTrigger value="attachments" className="h-8 rounded-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-red-600 text-[11px] font-bold px-6">المرفقات</TabsTrigger>
                    <TabsTrigger value="options" className="h-8 rounded-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-red-600 text-[11px] font-bold px-6">خيارات السند</TabsTrigger>
                    <TabsTrigger value="notes" className="h-8 rounded-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-red-600 text-[11px] font-bold px-6">ملاحظات مالية</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="details" className="p-0 m-0">
                  <div className="overflow-x-auto min-h-[150px]">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-200 text-slate-800 border-b border-slate-300">
                        <tr>
                          <th className="p-2 border-l border-slate-300 font-bold w-12 text-center">م</th>
                          <th className="p-2 border-l border-slate-300 font-bold w-24">مبلغ القيد</th>
                          <th className="p-2 border-l border-slate-300 font-bold flex-1">البيان</th>
                          <th className="p-2 border-l border-slate-300 font-bold w-20">العملة</th>
                          <th className="p-2 border-l border-slate-300 font-bold w-48">اسم الحساب</th>
                          <th className="p-2 font-bold w-24">المبلغ</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="p-1.5 border-l border-slate-200 text-center text-slate-500 font-bold">1</td>
                          <td className="p-1.5 border-l border-slate-200"><Input className="h-7 text-xs bg-white border-slate-200 rounded-none text-red-600 font-bold" value={paymentForm.amount || "240,450"} readOnly /></td>
                          <td className="p-1.5 border-l border-slate-200"><Input className="h-7 text-xs bg-white border-slate-200 rounded-none" value={paymentForm.payment_against || "عليكم سلفة نقداً"} readOnly /></td>
                          <td className="p-1.5 border-l border-slate-200"><Input className="h-7 text-xs bg-white border-slate-200 rounded-none text-center" value="ر.ي" readOnly /></td>
                          <td className="p-1.5 border-l border-slate-200">
                            <div className="flex items-center">
                              <Input className="h-7 text-xs bg-white border-slate-200 rounded-none flex-1 font-bold text-blue-700" value={paymentForm.received_from || "ابراهيم محمد الشاوش"} readOnly />
                            </div>
                          </td>
                          <td className="p-1.5"><Input className="h-7 text-xs bg-white border-slate-200 rounded-none font-bold" value={paymentForm.amount || "240,450"} readOnly /></td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="p-1.5 border-l border-slate-200 text-center text-slate-400">2</td>
                          <td className="p-1.5 border-l border-slate-200"><Input className="h-7 text-xs bg-slate-50 border-slate-200 rounded-none" disabled /></td>
                          <td className="p-1.5 border-l border-slate-200"><Input className="h-7 text-xs bg-slate-50 border-slate-200 rounded-none" disabled /></td>
                          <td className="p-1.5 border-l border-slate-200"><Input className="h-7 text-xs bg-slate-50 border-slate-200 rounded-none" disabled /></td>
                          <td className="p-1.5 border-l border-slate-200"><Input className="h-7 text-xs bg-slate-50 border-slate-200 rounded-none" disabled /></td>
                          <td className="p-1.5"><Input className="h-7 text-xs bg-slate-50 border-slate-200 rounded-none" disabled /></td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="p-1.5 border-l border-slate-200 text-center text-slate-400">3</td>
                          <td className="p-1.5 border-l border-slate-200"><Input className="h-7 text-xs bg-slate-50 border-slate-200 rounded-none" disabled /></td>
                          <td className="p-1.5 border-l border-slate-200"><Input className="h-7 text-xs bg-slate-50 border-slate-200 rounded-none" disabled /></td>
                          <td className="p-1.5 border-l border-slate-200"><Input className="h-7 text-xs bg-slate-50 border-slate-200 rounded-none" disabled /></td>
                          <td className="p-1.5 border-l border-slate-200"><Input className="h-7 text-xs bg-slate-50 border-slate-200 rounded-none" disabled /></td>
                          <td className="p-1.5"><Input className="h-7 text-xs bg-slate-50 border-slate-200 rounded-none" disabled /></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
                <TabsContent value="other" className="p-4 text-center text-slate-500">محتوى تفاصيل أخرى</TabsContent>
                <TabsContent value="installments" className="p-4 text-center text-slate-500">محتوى خاص بالأقساط</TabsContent>
                <TabsContent value="attachments" className="p-4 text-center text-slate-500">محتوى المرفقات</TabsContent>
                <TabsContent value="options" className="p-4 text-center text-slate-500">محتوى خيارات السند</TabsContent>
                <TabsContent value="notes" className="p-4 text-center text-slate-500">محتوى ملاحظات مالية</TabsContent>
              </Tabs>
            </div>

            {/* Bottom Toolbar */}
            <div className="bg-slate-200 border-t border-slate-300 p-2 mt-2 flex flex-wrap items-center justify-between shadow-sm rounded">
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 bg-white px-3 py-1 border border-slate-300 rounded-sm">
                  <span className="font-bold text-slate-600 text-xs">إجمالي السند:</span>
                  <span className="font-black text-red-700 text-sm">{paymentForm.amount || "240,450"}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-600">نموذج الطباعة</span>
                  <Select defaultValue="default">
                    <SelectTrigger className="h-7 w-32 text-[10px] bg-white border-slate-300 rounded-none"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">نموذج الطباعة الافتراضي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-700">
                  <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" defaultChecked /> طباعة المستفيد</label>
                  <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" defaultChecked /> طباعة الجهة</label>
                  <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" /> تأكيد الطباعة</label>
                  <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" /> طباعة رؤول</label>
                </div>
              </div>

              <div className="flex gap-1.5 mt-2 md:mt-0">
                <Button variant="outline" className="h-8 px-4 text-xs font-bold border-slate-400 bg-slate-50 text-slate-800 shadow-sm" onClick={() => setShowPaymentDlg(false)}>خروج</Button>
                <Button variant="outline" className="h-8 px-3 text-xs font-bold border-slate-400 bg-slate-50 text-blue-700 shadow-sm">EN</Button>
                <Button variant="outline" className="h-8 w-8 p-0 text-xs font-bold border-slate-400 bg-slate-50 text-slate-500 shadow-sm"><Info className="w-4 h-4" /></Button>
                <Button variant="outline" className="h-8 px-4 text-xs font-bold border-slate-400 bg-slate-50 text-red-600 shadow-sm">حذف</Button>
                <div className="flex items-center">
                  <Button variant="outline" className="h-8 w-8 p-0 text-xs font-bold border-slate-400 bg-slate-50 text-slate-800 shadow-sm rounded-none border-l-0">&gt;&gt;</Button>
                  <Button variant="outline" className="h-8 w-8 p-0 text-xs font-bold border-slate-400 bg-slate-50 text-slate-800 shadow-sm rounded-none border-l-0">&gt;</Button>
                  <Button variant="outline" className="h-8 w-8 p-0 text-xs font-bold border-slate-400 bg-slate-50 text-slate-800 shadow-sm rounded-none border-l-0">&lt;</Button>
                  <Button variant="outline" className="h-8 w-8 p-0 text-xs font-bold border-slate-400 bg-slate-50 text-slate-800 shadow-sm rounded-none">&lt;&lt;</Button>
                </div>
                <Button variant="outline" className="h-8 px-4 text-xs font-bold border-slate-400 bg-slate-50 text-slate-800 shadow-sm">بحث</Button>
                <Button variant="outline" className="h-8 px-4 text-xs font-bold border-slate-400 bg-slate-50 text-slate-800 shadow-sm">طباعة</Button>
                <Button className="h-8 px-6 text-xs font-bold bg-slate-100 border border-slate-400 text-slate-800 hover:bg-slate-200 shadow-sm" onClick={() => {
                  createVoucherMutation.mutate({ ...paymentForm, type: "payment" });
                  setShowPaymentDlg(false);
                  toast({ title: "تم حفظ وإصدار سند الصرف بنجاح" });
                }}>حفظ</Button>
                <Button variant="outline" className="h-8 px-4 text-xs font-bold border-slate-400 bg-slate-50 text-slate-800 shadow-sm" onClick={() => setPaymentForm({ amount: "", received_from: "", payment_against: "" })}>جديد</Button>
              </div>
              
            </div>

          </DialogContent>
        </Dialog>
        {/* ───────────────────────────────────────────────────────────── */}
`;

code = code.replace(regex, newModal);
fs.writeFileSync('artifacts/pos-system/src/pages/accounting.tsx', code);
console.log('Replaced Payment Voucher Modal');
