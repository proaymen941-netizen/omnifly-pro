const fs = require('fs');

let code = fs.readFileSync('artifacts/pos-system/src/pages/accounting.tsx', 'utf8');

// The start and end of the Right Pane
const startMarker = '{/* Right Pane: Comprehensive Onyx Pro Form & Multi-Entity Linker */}';
const endMarker = '{/* MODAL: SUB-ACCOUNT FOR EXISTING ACCOUNT */}';

// We need to replace everything between these two markers
const regex = new RegExp(`(${startMarker})[\\s\\S]*?(?=\\s*${endMarker})`);

const newRightPane = `${startMarker}
              <div className="lg:col-span-7 bg-[#f0f4f8] border border-slate-300 shadow-inner rounded p-2 flex flex-col justify-between">
                
                {/* Form Wrapper */}
                <div className="space-y-3 bg-white p-4 border border-slate-300 shadow-sm rounded">
                  
                  {/* Row 1: Account Name */}
                  <div className="flex items-center gap-2">
                    <label className="w-32 text-left font-bold text-slate-800 text-xs shrink-0">اسم الحساب <span className="text-red-500">*</span></label>
                    <Input className="flex-1 h-7 text-xs border-slate-300 focus-visible:ring-0 rounded-none bg-slate-50" value={accountForm.name} onChange={e => setAccountForm({ ...accountForm, name: e.target.value })} />
                  </div>
                  
                  {/* Row 2: Foreign Name */}
                  <div className="flex items-center gap-2">
                    <label className="w-32 text-left font-bold text-slate-800 text-xs shrink-0">الاسم الاجنبي <span className="text-red-500">*</span></label>
                    <Input className="flex-1 h-7 text-xs border-slate-300 focus-visible:ring-0 rounded-none bg-slate-50" value={accountForm.name_en || ""} onChange={e => setAccountForm({ ...accountForm, name_en: e.target.value })} />
                  </div>
                  
                  {/* Row 3: Tax Account */}
                  <div className="flex items-center gap-2">
                    <label className="w-32 text-left font-bold text-slate-800 text-xs shrink-0">لحساب الضريبي <span className="text-red-500">*</span></label>
                    <Input className="flex-1 h-7 text-xs border-slate-300 focus-visible:ring-0 rounded-none bg-slate-50" />
                  </div>
                  
                  {/* Row 4: Level + Checkboxes */}
                  <div className="flex items-center gap-2">
                    <label className="w-32 text-left font-bold text-slate-800 text-xs shrink-0">المستوى/الرتبة <span className="text-red-500">*</span></label>
                    <Input className="w-16 h-7 text-xs border-slate-300 focus-visible:ring-0 rounded-none bg-green-100 text-center font-bold" value={accountForm.level || 4} readOnly />
                    
                    <div className="flex-1 flex justify-center gap-4 bg-slate-100 p-1 border border-slate-200">
                      <label className="flex items-center gap-1 text-xs font-bold text-slate-800 cursor-pointer">
                        <input type="checkbox" className="rounded-sm" /> اضافة ضمنية
                      </label>
                      <label className="flex items-center gap-1 text-xs font-bold text-slate-800 cursor-pointer">
                        <input type="checkbox" className="rounded-sm" /> اضافة تلقائي
                      </label>
                      <label className="flex items-center gap-1 text-xs font-bold text-red-600 cursor-pointer">
                        <input type="checkbox" className="rounded-sm" /> ايقاف التعامل
                      </label>
                    </div>
                  </div>
                  
                  {/* Row 5: Parent Account */}
                  <div className="flex items-center gap-2">
                    <label className="w-32 text-left font-bold text-slate-800 text-xs shrink-0">ضمن الحساب الرئيسي <span className="text-red-500">*</span></label>
                    <Input className="w-16 h-7 text-xs border-slate-300 focus-visible:ring-0 rounded-none bg-slate-50 text-center" value={accountForm.parent_code || "0"} readOnly />
                    <Input className="flex-1 h-7 text-xs border-slate-300 focus-visible:ring-0 rounded-none bg-slate-200 cursor-not-allowed" value={accountForm.parent_name || "-"} readOnly />
                  </div>

                  {/* Middle Section: Movement Account & Note Box */}
                  <div className="flex gap-4">
                    
                    {/* Right half (Labels and inputs) */}
                    <div className="flex-1 space-y-3">
                      
                      {/* Account Status */}
                      <div className="flex items-center gap-2">
                        <label className="w-32 text-left font-bold text-blue-700 text-sm shrink-0">حالة الحساب</label>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id="movement-chk" checked={!accountForm.is_parent} onChange={e => setAccountForm({ ...accountForm, is_parent: !e.target.checked })} />
                          <label htmlFor="movement-chk" className="text-xs font-bold text-slate-700">حساب حركي</label>
                        </div>
                      </div>

                      {/* Account Number */}
                      <div className="flex items-center gap-2">
                        <label className="w-32 text-left font-bold text-slate-800 text-xs shrink-0">رقم الحساب <span className="text-red-500">*</span></label>
                        <Input className="flex-1 h-7 text-xs border-slate-300 focus-visible:ring-0 rounded-none bg-slate-50 font-mono text-left" dir="ltr" value={accountForm.code} onChange={e => setAccountForm({ ...accountForm, code: e.target.value })} />
                      </div>

                      {/* Serial Number */}
                      <div className="flex items-center gap-2">
                        <label className="w-32 text-left font-bold text-slate-800 text-xs shrink-0">رقم التسلسل <span className="text-red-500">*</span></label>
                        <Input className="flex-1 h-7 text-xs border-slate-300 focus-visible:ring-0 rounded-none bg-yellow-100 font-mono text-center font-bold" value={accountForm.id || "1"} readOnly />
                      </div>

                    </div>

                    {/* Left half (Note box and Extra fields) */}
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex-1 border border-slate-400 bg-slate-50 p-2 text-[10px] leading-tight text-slate-800">
                        <span className="font-bold">حساب حركي:-</span> هو الحساب الذي يمكن التعامل به من خلال حركات النظام المختلفة وامكانية ارتباطه بحسابات تحليلية<br/><br/>
                        اما الحساب الغير حركي فهو حساب اجمالي ولا يمكن التعامل معه وانما يتأثر اجمالا بالحسابات الحركية التي تنتمي اليه
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <label className="flex items-center gap-1 text-xs font-bold text-slate-700 cursor-pointer">
                          <input type="checkbox" /> مرتبط بمركز تكلفة
                        </label>
                        <label className="text-xs font-bold text-slate-700 mr-2">رمز الحساب</label>
                        <Input className="w-8 h-6 p-0 text-center text-xs border-slate-300 rounded-none" value="3" readOnly />
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <label className="text-xs font-bold text-slate-700">الموازنة التقديرية</label>
                        <Input className="flex-1 h-6 p-0 text-center text-xs border-slate-300 rounded-none bg-yellow-100 font-bold" value="0" readOnly />
                      </div>
                    </div>

                  </div>

                  <hr className="border-slate-300 my-2" />

                  {/* Bottom Selects */}
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center gap-2">
                      <label className="w-32 text-left font-bold text-slate-800 text-xs shrink-0">تبويب الحساب <span className="text-red-500">*</span></label>
                      <Select value={accountForm.type || "expense"} onValueChange={v => setAccountForm({ ...accountForm, type: v })}>
                        <SelectTrigger className="flex-1 h-7 text-xs border-slate-300 focus-visible:ring-0 rounded-none bg-slate-300 text-slate-800 font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asset">أصول - Asset</SelectItem>
                          <SelectItem value="liability">خصوم - Liability</SelectItem>
                          <SelectItem value="equity">حقوق ملكية - Equity</SelectItem>
                          <SelectItem value="revenue">إيرادات - Revenue</SelectItem>
                          <SelectItem value="expense">مصروفات - Expense</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="w-32 text-left font-bold text-slate-800 text-xs shrink-0">طبيعة الحساب <span className="text-red-500">*</span></label>
                      <Select value={["asset", "expense", "cogs"].includes(accountForm.type) ? "debit" : "credit"}>
                        <SelectTrigger className="flex-1 h-7 text-xs border-slate-300 focus-visible:ring-0 rounded-none bg-slate-300 text-slate-800 font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="debit">مدين - Debit</SelectItem>
                          <SelectItem value="credit">دائن - Credit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="w-32 text-left font-bold text-slate-800 text-xs shrink-0">نوع الحساب</label>
                      <Select>
                        <SelectTrigger className="flex-1 h-7 text-xs border-slate-300 focus-visible:ring-0 rounded-none bg-green-100"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="none">--</SelectItem></SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="w-32 text-left font-bold text-slate-800 text-xs shrink-0">تصنيف الحساب</label>
                      <Select>
                        <SelectTrigger className="flex-1 h-7 text-xs border-slate-300 focus-visible:ring-0 rounded-none bg-orange-100 text-orange-900 font-bold"><SelectValue placeholder="تصنيف الحسابات" /></SelectTrigger>
                        <SelectContent><SelectItem value="none">--</SelectItem></SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="w-32 text-left font-bold text-slate-800 text-xs shrink-0">المجموعة</label>
                      <div className="flex-1 flex gap-2">
                        <Input className="w-16 h-7 text-xs border-slate-300 focus-visible:ring-0 rounded-none text-center" value="0" readOnly />
                        <Select>
                          <SelectTrigger className="flex-1 h-7 text-xs border-slate-300 focus-visible:ring-0 rounded-none bg-slate-200 text-slate-800 font-bold"><SelectValue placeholder="المجموعات F8" /></SelectTrigger>
                          <SelectContent><SelectItem value="none">--</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Bottom Toolbar */}
                <div className="bg-slate-200 border-t border-slate-300 p-2 mt-4 flex items-center justify-between shadow-sm">
                  <Button variant="outline" className="h-8 px-4 text-xs font-bold border-slate-400 bg-slate-50 text-slate-800 shadow-sm" onClick={() => setActiveTab("dashboard")}>خروج</Button>
                  
                  <div className="flex gap-1.5">
                    <Button variant="outline" className="h-8 w-8 p-0 text-xs font-bold border-slate-400 bg-slate-50 text-slate-800 shadow-sm">؟</Button>
                    <Button variant="outline" className="h-8 px-3 text-xs font-bold border-slate-400 bg-slate-50 text-blue-700 shadow-sm">EN</Button>
                    <Button variant="outline" className="h-8 px-4 text-xs font-bold border-slate-400 bg-slate-50 text-blue-700 shadow-sm">فحص</Button>
                    <Button variant="outline" className="h-8 px-4 text-xs font-bold border-slate-400 bg-slate-50 text-slate-800 shadow-sm">خيارات</Button>
                    <Button variant="outline" className="h-8 px-4 text-xs font-bold border-slate-400 bg-slate-50 text-slate-800 shadow-sm">تصدير</Button>
                    <Button variant="outline" className="h-8 px-4 text-xs font-bold border-slate-400 bg-slate-50 text-slate-800 shadow-sm">استيراد من اكسيل</Button>
                    <Button variant="outline" className="h-8 w-8 p-0 text-xs font-bold border-slate-400 bg-slate-50 text-slate-800 shadow-sm">&gt;</Button>
                    <Button variant="outline" className="h-8 w-8 p-0 text-xs font-bold border-slate-400 bg-slate-50 text-slate-800 shadow-sm">&lt;</Button>
                    <Button variant="outline" className="h-8 px-4 text-xs font-bold border-slate-400 bg-slate-50 text-red-600 shadow-sm">حذف</Button>
                    <Button variant="outline" className="h-8 px-4 text-xs font-bold border-slate-400 bg-slate-50 text-slate-800 shadow-sm">بحث</Button>
                    <Button variant="outline" className="h-8 px-4 text-xs font-bold border-slate-400 bg-slate-50 text-slate-800 shadow-sm">طباعة</Button>
                    <Button onClick={() => handleSaveAccount()} className="h-8 px-4 text-xs font-bold bg-slate-100 border border-slate-400 text-slate-800 hover:bg-slate-200 shadow-sm">حفظ</Button>
                    <Button onClick={() => setAccountForm({ ...accountForm, id: undefined, name: "", code: "", is_parent: false })} className="h-8 px-4 text-xs font-bold bg-slate-100 border border-slate-400 text-slate-800 hover:bg-slate-200 shadow-sm">جديد</Button>
                  </div>
                </div>

              </div>
`;

code = code.replace(regex, newRightPane);
fs.writeFileSync('artifacts/pos-system/src/pages/accounting.tsx', code);
console.log('Replaced Chart of Accounts Right Pane');
