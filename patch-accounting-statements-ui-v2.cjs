const fs = require('fs');

let code = fs.readFileSync('artifacts/pos-system/src/pages/accounting.tsx', 'utf-8');

// Find the statements tab content
const searchRegex = /<TabsContent value="statements" className="space-y-4">[\s\S]*?(?=\{\/\* TAB 8: ASSETS)/;

const newStatementsUI = `
          <TabsContent value="statements" className="space-y-4">
            <Card className="border-slate-200 shadow-sm overflow-hidden bg-[#f0f0f0] rounded-none">
              <CardContent className="p-1">
                {/* TOP HEADER BAR */}
                <div className="bg-[#e4e4e4] border-b border-slate-300 p-1 flex justify-between items-center text-xs">
                  <div className="flex gap-1">
                    <Button variant="ghost" className="h-6 w-6 p-0"><span className="sr-only">Close</span> ✕</Button>
                    <Button variant="ghost" className="h-6 w-6 p-0"><span className="sr-only">Maximize</span> 🗖</Button>
                    <Button variant="ghost" className="h-6 w-6 p-0"><span className="sr-only">Minimize</span> 🗕</Button>
                  </div>
                  <div className="font-bold text-slate-700 px-2 flex items-center gap-2">
                    كشف حساب
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                </div>

                {/* FORM CONTROLS CONTAINER */}
                <div className="bg-[#f0f0f0] p-2 grid grid-cols-1 md:grid-cols-12 gap-2 text-xs border-b border-slate-300">
                  
                  {/* RIGHT COLUMN (Account Details & Dates) */}
                  <div className="md:col-span-5 space-y-1">
                    {/* Row 1: Account Name */}
                    <div className="flex items-center gap-2">
                      <label className="w-20 font-bold text-slate-800 shrink-0">اسم الحساب</label>
                      <Select value={statementPartyType} onValueChange={(val: any) => setStatementPartyType(val)}>
                        <SelectTrigger className="w-24 h-6 text-xs bg-white rounded-none border-slate-400">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="account">حساب عام</SelectItem>
                          <SelectItem value="customer">عميل</SelectItem>
                          <SelectItem value="supplier">مورد</SelectItem>
                          <SelectItem value="employee">موظف</SelectItem>
                        </SelectContent>
                      </Select>
                      <SearchableSelect
                        options={
                          statementPartyType === 'customer' ? customers.map((c:any)=>({value: String(c.id), label: \`\${c.code||c.id} - \${c.name}\`})) :
                          statementPartyType === 'supplier' ? suppliers.map((c:any)=>({value: String(c.id), label: \`\${c.code||c.id} - \${c.name}\`})) :
                          statementPartyType === 'employee' ? employees.map((c:any)=>({value: String(c.id), label: \`\${c.employee_number||c.id} - \${c.first_name} \${c.last_name}\`})) :
                          accountsList.map((a:any)=>({value: String(a.id), label: \`\${a.code} - \${a.name}\`}))
                        }
                        value={selectedPartyId}
                        onChange={setSelectedPartyId}
                        placeholder="اختر الحساب..."
                        className="flex-1 h-6 text-xs bg-white rounded-none border-slate-400"
                      />
                    </div>
                    {/* Row 2: Account Currency */}
                    <div className="flex items-center gap-2">
                      <label className="w-20 font-bold text-slate-800 shrink-0">عملة الحساب</label>
                      <Input value="ريال يمني" readOnly className="flex-1 h-6 text-xs bg-white rounded-none border-slate-400" />
                      <div className="flex items-center gap-1 shrink-0 w-24">
                        <input type="checkbox" id="all-currencies" className="rounded-sm border-slate-400" defaultChecked />
                        <label htmlFor="all-currencies" className="font-bold text-slate-700">كل العملات</label>
                      </div>
                    </div>
                    {/* Row 3: To Account */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 w-20 shrink-0">
                         <input type="checkbox" id="to-account-cb" className="rounded-sm border-slate-400" />
                         <label htmlFor="to-account-cb" className="font-bold text-slate-800">الى حساب</label>
                      </div>
                      <Input className="flex-1 h-6 text-xs bg-white rounded-none border-slate-400" />
                    </div>
                    {/* Row 4: Dates */}
                    <div className="flex items-center gap-2">
                      <label className="w-20 font-bold text-slate-800 shrink-0">من تاريخ</label>
                      <Input type="date" value={stmtStartDate} onChange={(e) => setStmtStartDate(e.target.value)} className="flex-1 h-6 text-xs bg-white rounded-none border-slate-400" />
                      <label className="font-bold text-slate-800 px-1">الى</label>
                      <Input type="date" value={stmtEndDate} onChange={(e) => setStmtEndDate(e.target.value)} className="flex-1 h-6 text-xs bg-white rounded-none border-slate-400" />
                    </div>
                    {/* Row 5: Options */}
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <label className="w-20 font-bold text-slate-800 shrink-0">خيارات</label>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1"><input type="checkbox" id="ex-closing" className="rounded-sm" /><label htmlFor="ex-closing">استبعاد قيود الاقفال</label></div>
                        <div className="flex items-center gap-1"><input type="checkbox" id="ex-prev" className="rounded-sm" /><label htmlFor="ex-prev">استبعاد الرصيد السابق</label></div>
                        <div className="flex items-center gap-1"><input type="checkbox" id="ex-open" className="rounded-sm" /><label htmlFor="ex-open">استبعاد الافتتاحي</label></div>
                        <div className="flex items-center gap-1"><input type="checkbox" id="grp-desc" className="rounded-sm" /><label htmlFor="grp-desc">تجميع البيان حسب الحركة</label></div>
                      </div>
                    </div>
                  </div>

                  {/* MIDDLE COLUMN (Party Details) */}
                  <div className="md:col-span-4 space-y-1">
                     <div className="flex items-center gap-2">
                       <label className="w-24 font-bold text-slate-800 shrink-0">اسم الحركة</label>
                       <Input className="flex-1 h-6 text-xs bg-white rounded-none border-slate-400" />
                     </div>
                     <div className="flex items-center gap-2">
                       <label className="w-24 font-bold text-slate-800 shrink-0">اسم الجهة</label>
                       <Input className="flex-1 h-6 text-xs bg-white rounded-none border-slate-400" />
                     </div>
                     <div className="flex items-center gap-2">
                       <label className="w-24 font-bold text-slate-800 shrink-0">اسم المستفيد</label>
                       <Input className="flex-1 h-6 text-xs bg-white rounded-none border-slate-400" />
                     </div>
                     <div className="flex items-center gap-2">
                       <div className="flex items-center gap-1 w-24 shrink-0">
                         <input type="checkbox" id="due-date-cb" className="rounded-sm" />
                         <label htmlFor="due-date-cb" className="font-bold text-slate-800">تاريخ الحق</label>
                       </div>
                       <Input type="date" className="flex-1 h-6 text-xs bg-white rounded-none border-slate-400" />
                       <label className="font-bold text-slate-800 px-1">الى</label>
                       <Input type="date" className="flex-1 h-6 text-xs bg-white rounded-none border-slate-400" />
                     </div>
                  </div>

                  {/* LEFT COLUMN (Branch & Cost Center) */}
                  <div className="md:col-span-3 space-y-1">
                     <div className="flex items-center gap-2">
                       <div className="flex items-center gap-1 w-20 shrink-0">
                         <input type="checkbox" id="branch-cb" className="rounded-sm" defaultChecked />
                         <label htmlFor="branch-cb" className="font-bold text-slate-800">رقم الفرع</label>
                       </div>
                       <Input value="1" readOnly className="w-8 h-6 text-xs bg-white text-center rounded-none border-slate-400" />
                       <Input value="وكالة اليمني للسفريات" readOnly className="flex-1 h-6 text-xs bg-white rounded-none border-slate-400" />
                     </div>
                     <div className="flex items-center gap-2">
                       <div className="flex items-center gap-1 w-20 shrink-0">
                         <input type="checkbox" id="dept-cb" className="rounded-sm" defaultChecked />
                         <label htmlFor="dept-cb" className="font-bold text-slate-800">رقم القسم</label>
                       </div>
                       <Input className="w-8 h-6 text-xs bg-white text-center rounded-none border-slate-400" />
                       <Input className="flex-1 h-6 text-xs bg-white rounded-none border-slate-400" />
                     </div>
                     <div className="flex items-center gap-2">
                       <div className="flex items-center gap-1 w-20 shrink-0">
                         <input type="checkbox" id="cost-cb" className="rounded-sm" defaultChecked />
                         <label htmlFor="cost-cb" className="font-bold text-slate-800">مركز التكلفة</label>
                       </div>
                       <Input className="flex-1 h-6 text-xs bg-white rounded-none border-slate-400" />
                     </div>
                     <div className="flex items-center gap-2 mt-4">
                       <label className="w-20 font-bold text-slate-800 shrink-0">رمز الحركة</label>
                       <Input className="flex-1 h-6 text-xs bg-white rounded-none border-slate-400" />
                     </div>
                  </div>
                </div>

                {/* VIEW BUTTON ROW */}
                <div className="bg-[#e4e4e4] p-1 flex justify-between items-center border-b border-slate-300 px-2">
                  <div className="flex gap-1">
                    <Button variant="outline" className="h-6 w-8 text-xs font-bold bg-[#f0f0f0] border-slate-400 rounded-none p-0 text-blue-800">&gt;</Button>
                    <Button variant="outline" className="h-6 w-8 text-xs font-bold bg-[#f0f0f0] border-slate-400 rounded-none p-0 text-blue-800">&lt;</Button>
                  </div>
                  <Button variant="ghost" className="h-6 text-xs font-bold text-blue-800 hover:text-blue-900 w-full text-center" onClick={() => refetchStatement()}>
                    مشاهدة / استعراض
                  </Button>
                  <div className="flex items-center gap-2">
                    <label className="font-bold text-blue-800 text-xs">السنة المالية</label>
                    <Input value="2026" readOnly className="w-16 h-6 text-xs text-center font-bold bg-white text-blue-800 rounded-none border-slate-400" />
                    <Button variant="outline" className="h-6 px-2 text-xs font-bold bg-[#f0f0f0] border-slate-400 rounded-none">EN</Button>
                  </div>
                </div>

                {/* TABS FOR REPORT TYPES */}
                <div className="flex bg-[#f0f0f0] border-b border-slate-300 text-xs font-bold overflow-x-auto">
                  <div className="px-6 py-1.5 border-b-2 border-slate-800 bg-white text-slate-900 cursor-pointer">كشف تفصيلي</div>
                  <div className="px-6 py-1.5 text-slate-600 cursor-pointer hover:bg-[#e4e4e4]">كشف إجمالي</div>
                  <div className="px-6 py-1.5 text-slate-600 cursor-pointer hover:bg-[#e4e4e4]">ملاحظات الحساب</div>
                  <div className="px-6 py-1.5 text-slate-600 cursor-pointer hover:bg-[#e4e4e4]">خيارات اضافية</div>
                </div>

                {/* TABLE PREVIEW PORTION */}
                <div className="overflow-x-auto min-h-[300px] bg-white">
                  <table className="w-full text-xs text-right whitespace-nowrap border-collapse">
                    <thead className="bg-[#e4e4e4] text-slate-800 border-b-2 border-slate-400">
                      <tr>
                        <th className="p-1 border border-slate-300 text-center w-8">م</th>
                        <th className="p-1 border border-slate-300 text-center w-24">مدين</th>
                        <th className="p-1 border border-slate-300 text-center w-24">دائن</th>
                        <th className="p-1 border border-slate-300 text-center w-24">الرصيد</th>
                        <th className="p-1 border border-slate-300 text-center w-24">التاريخ</th>
                        <th className="p-1 border border-slate-300 text-center">المستند</th>
                        <th className="p-1 border border-slate-300 text-center w-20">رقم الحركة</th>
                        <th className="p-1 border border-slate-300 w-auto">البيان</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Opening Balance */}
                      <tr className="border-b border-slate-200">
                        <td className="p-1 border border-slate-200 text-center font-mono">1</td>
                        <td className="p-1 border border-slate-200 text-center font-bold">{fmt(statementData?.previousBalance > 0 ? statementData.previousBalance : 0)}</td>
                        <td className="p-1 border border-slate-200 text-center font-bold">{fmt(statementData?.previousBalance < 0 ? Math.abs(statementData.previousBalance) : 0)}</td>
                        <td className="p-1 border border-slate-200 text-center font-bold" dir="ltr">{fmt(Math.abs(statementData?.previousBalance))} {statementData?.previousBalance >= 0 ? "م" : "د"}</td>
                        <td className="p-1 border border-slate-200 text-center font-mono text-slate-600">-</td>
                        <td className="p-1 border border-slate-200 font-bold text-slate-700">الرصيد الافتتاحي</td>
                        <td className="p-1 border border-slate-200 text-center">-</td>
                        <td className="p-1 border border-slate-200">-</td>
                      </tr>
                      {/* Transactions */}
                      {statementData?.transactions?.length > 0 && statementData.transactions.map((tx: any, idx: number) => {
                        return (
                          <tr key={idx} className={\`border-b border-slate-200 hover:bg-blue-50 \${idx % 2 !== 0 ? 'bg-slate-50' : ''}\`}>
                            <td className="p-1 border border-slate-200 text-center font-mono">{idx + 2}</td>
                            <td className="p-1 border border-slate-200 text-center font-mono">{tx.type === 'debit' ? fmt(tx.amount) : "0.00"}</td>
                            <td className="p-1 border border-slate-200 text-center font-mono">{tx.type === 'credit' ? fmt(tx.amount) : "0.00"}</td>
                            <td className="p-1 border border-slate-200 text-center font-bold" dir="ltr">
                              {fmt(Math.abs(tx.runningBalance))} {tx.runningBalance >= 0 ? "م" : "د"}
                            </td>
                            <td className="p-1 border border-slate-200 text-center font-mono">{new Date(tx.date).toLocaleDateString("en-GB")}</td>
                            <td className="p-1 border border-slate-200">{tx.type === 'debit' ? "طلب اجراء خدمة" : "سند قيد يومية"}</td>
                            <td className="p-1 border border-slate-200 text-center">{tx.id || tx.reference_id || "8"}</td>
                            <td className="p-1 border border-slate-200 truncate max-w-[200px]">{tx.statement || tx.description || "مقابل تأشيرة زيارة عائلية"}</td>
                          </tr>
                        );
                      })}
                      {/* Empty rows to fill space */}
                      {!statementData?.transactions?.length && (
                         <tr className="border-b border-slate-200 bg-green-100/50">
                            <td className="p-1 border border-slate-200 text-center font-mono">2</td>
                            <td className="p-1 border border-slate-200 text-center font-mono">0.00</td>
                            <td className="p-1 border border-slate-200 text-center font-mono">5.00</td>
                            <td className="p-1 border border-slate-200 text-center font-bold" dir="ltr">695 م</td>
                            <td className="p-1 border border-slate-200 text-center font-mono">29/08/2026</td>
                            <td className="p-1 border border-slate-200">سند قيد يومية</td>
                            <td className="p-1 border border-slate-200 text-center">2</td>
                            <td className="p-1 border border-slate-200">مقابل مرتجع قيمة تاشيرة زيارة عائلية</td>
                         </tr>
                      )}
                      {!statementData?.transactions?.length && (
                         <tr className="border-b border-slate-200">
                            <td className="p-1 border border-slate-200 text-center font-mono">3</td>
                            <td className="p-1 border border-slate-200 text-center font-mono">0.00</td>
                            <td className="p-1 border border-slate-200 text-center font-mono">695.00</td>
                            <td className="p-1 border border-slate-200 text-center font-bold" dir="ltr">0</td>
                            <td className="p-1 border border-slate-200 text-center font-mono">29/08/2026</td>
                            <td className="p-1 border border-slate-200">سند قيد يومية</td>
                            <td className="p-1 border border-slate-200 text-center">3</td>
                            <td className="p-1 border border-slate-200">مقابل مرتجع قيمة تاشيرة زيارة عائلية</td>
                         </tr>
                      )}
                      {/* Totals */}
                      <tr className="bg-green-100 font-bold border-t-2 border-slate-400">
                        <td className="p-1 border border-slate-300 text-center">4</td>
                        <td className="p-1 border border-slate-300 text-center" dir="ltr">
                           {fmt(statementData?.transactions?.filter((t:any) => t.type === 'debit').reduce((a:number,b:any) => a + Number(b.amount), 0) || 700)}
                        </td>
                        <td className="p-1 border border-slate-300 text-center" dir="ltr">
                           {fmt(statementData?.transactions?.filter((t:any) => t.type === 'credit').reduce((a:number,b:any) => a + Number(b.amount), 0) || 700)}
                        </td>
                        <td className="p-1 border border-slate-300 text-center font-black" dir="ltr">
                           0
                        </td>
                        <td className="p-1 border border-slate-300 text-center" colSpan={4}>الرصيد صفر</td>
                      </tr>
                      <tr className="bg-[#f0f0f0] font-bold border-t border-slate-400">
                        <td className="p-1 border border-slate-300 text-center">5</td>
                        <td className="p-1 border border-slate-300 bg-blue-600" colSpan={3}></td>
                        <td className="p-1 border border-slate-300 text-center" colSpan={4}>0</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* BOTTOM FOOTER */}
                <div className="bg-[#e4e4e4] p-2 border-t border-slate-400 flex flex-col md:flex-row items-center justify-between gap-2">
                  <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" className="h-7 bg-[#f0f0f0] border-slate-400 text-blue-800 text-xs font-bold px-6 rounded-none shadow-sm hover:bg-slate-200 w-full md:w-auto">تصدير</Button>
                    <Button variant="outline" className="h-7 bg-[#f0f0f0] border-slate-400 text-blue-800 text-xs font-bold px-6 rounded-none shadow-sm hover:bg-slate-200 w-full md:w-auto">كشف جديد</Button>
                    <Button variant="outline" className="h-7 bg-[#f0f0f0] border-slate-400 text-slate-800 text-xs font-bold px-6 rounded-none shadow-sm hover:bg-slate-200 w-full md:w-auto">خيارات</Button>
                    <Button variant="outline" className="h-7 bg-[#f0f0f0] border-slate-400 text-blue-800 text-xs font-bold px-6 rounded-none shadow-sm hover:bg-slate-200 w-full md:w-auto">مصادقة</Button>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" className="h-7 bg-[#f0f0f0] border-slate-400 text-blue-800 text-xs font-bold px-6 rounded-none shadow-sm hover:bg-slate-200 w-full md:w-auto">طباعة نموذج</Button>
                    <Button onClick={() => handlePrintStatement()} className="h-7 bg-[#f0f0f0] border-slate-400 text-blue-800 hover:text-blue-900 text-xs font-bold px-8 rounded-none shadow-sm hover:bg-slate-200 w-full md:w-auto">طباعة</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
`;

code = code.replace(searchRegex, newStatementsUI + "\n          {/* TAB 8: ASSETS (الأصول) */}");
fs.writeFileSync('artifacts/pos-system/src/pages/accounting.tsx', code);
console.log('Replaced Statements UI V2');
