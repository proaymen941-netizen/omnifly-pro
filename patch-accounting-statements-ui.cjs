const fs = require('fs');
let code = fs.readFileSync('artifacts/pos-system/src/pages/accounting.tsx', 'utf8');

// 1. Add states for new filters
code = code.replace(
  'const [stmtEndDate, setStmtEndDate] = useState<string>("");',
  `const [stmtEndDate, setStmtEndDate] = useState<string>("");
  const [stmtCurrency, setStmtCurrency] = useState<string>("all");
  const [stmtCostCenter, setStmtCostCenter] = useState<string>("all");
  const [stmtBranch, setStmtBranch] = useState<string>("1");
  const [stmtYear, setStmtYear] = useState<string>("2026");`
);

// 2. Replace the UI of TabsContent value="statements"
const oldStatementsUIStart = '<TabsContent value="statements" className="space-y-6 m-0">';
const oldStatementsUIEnd = '{/* TAB 8: ASSETS (الأصول) */}';

const searchRegex = new RegExp(`(${oldStatementsUIStart})[\\s\\S]*?(${oldStatementsUIEnd})`);

const newStatementsUI = `
          <TabsContent value="statements" className="space-y-4 m-0">
            <Card className="bg-white border-blue-200/50 shadow-md">
              <CardHeader className="bg-slate-50/80 border-b border-slate-200 py-3 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base text-slate-800 font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  كشف حساب
                </CardTitle>
                <div className="flex gap-2">
                  <Button onClick={() => handlePrintStatement()} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-bold px-6 shadow-md shadow-blue-500/20 h-9">
                    <Eye className="w-4 h-4" />
                    مشاهدة / استعراض
                  </Button>
                  <Button onClick={() => handlePrintStatement()} className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 gap-2 font-bold px-6 h-9">
                    <Printer className="w-4 h-4" />
                    طباعة
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* FILTER GRID MATCHING DESIGN */}
                <div className="bg-[#f0f4f8] p-3 border-b border-slate-200 text-xs">
                  <div className="grid grid-cols-12 gap-x-4 gap-y-2">
                    
                    {/* Left Column (Inputs) */}
                    <div className="col-span-12 lg:col-span-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="w-24 font-bold text-slate-700 text-left">اسم الحساب</label>
                        <div className="flex-1">
                          <SearchableSelect
                            options={
                              statementPartyType === "user"
                                ? systemUsers
                                    .filter((u: any) => u.role !== 'developer' && u.username !== 'developer' && !String(u.name || '').includes('مطور'))
                                    .map((u: any) => ({
                                      value: String(u.id),
                                      label: u.name,
                                      sublabel: u.role === 'admin' ? 'مدير نظام' : u.role === 'accountant' ? 'محاسب' : u.role === 'manager' ? 'مدير فرع' : 'كاشير',
                                      badge: u.username
                                    }))
                                : statementPartyType === "customer"
                                ? customers.map((c: any) => ({
                                    value: String(c.id),
                                    label: c.name,
                                    sublabel: c.phone || "بدون رقم هاتف",
                                    badge: c.balance ? \`رصيد: \${c.balance}\` : undefined
                                  }))
                                : statementPartyType === "supplier"
                                ? suppliers.map((s: any) => ({
                                    value: String(s.id),
                                    label: s.name,
                                    sublabel: s.phone || "بدون رقم هاتف",
                                    badge: s.balance ? \`رصيد: \${s.balance}\` : undefined
                                  }))
                                : statementPartyType === "employee"
                                ? employees.map((e: any) => ({
                                    value: String(e.id),
                                    label: e.name,
                                  }))
                                : [
                                    ...accounts.map((a: any) => ({ value: String(a.id), label: \`\${a.code} - \${a.name}\`, sublabel: 'حساب رئيسي', badge: 'دليل الحسابات' })),
                                    ...subAccounts.map((sa: any) => ({ value: \`sub_\${sa.id}\`, label: \`\${sa.code} - \${sa.name}\`, sublabel: \`تفريعة من \${sa.parent_account_id}\`, badge: 'حساب فرعي' }))
                                  ]
                            }
                            value={selectedPartyId}
                            onChange={(val: any) => setSelectedPartyId(val)}
                            placeholder="اختر الحساب..."
                          />
                        </div>
                        <Select value={statementPartyType} onValueChange={(v: any) => { setStatementPartyType(v); setSelectedPartyId(""); }}>
                          <SelectTrigger className="w-32 h-8 text-xs bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="account">دليل الحسابات</SelectItem>
                            <SelectItem value="customer">عميل (ذمم مدينة)</SelectItem>
                            <SelectItem value="supplier">مورد (ذمم دائنة)</SelectItem>
                            <SelectItem value="employee">موظف (سلف وعهد)</SelectItem>
                            <SelectItem value="user">مستخدم / كاشير</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="w-24 font-bold text-slate-700 text-left">عملة الحساب</label>
                        <Select value={stmtCurrency} onValueChange={setStmtCurrency}>
                          <SelectTrigger className="flex-1 h-8 text-xs bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">كل العملات</SelectItem>
                            <SelectItem value="SAR">ريال سعودي</SelectItem>
                            <SelectItem value="YER">ريال يمني</SelectItem>
                            <SelectItem value="USD">دولار أمريكي</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1 w-32 border border-slate-300 bg-white rounded px-2 h-8">
                          <input type="checkbox" id="chk-all-acc" />
                          <label htmlFor="chk-all-acc" className="text-xs text-slate-600">الى حساب</label>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="w-24 font-bold text-slate-700 text-left">من تاريخ</label>
                        <div className="flex-1 flex gap-2">
                          <Input type="date" className="h-8 text-xs bg-white" value={stmtStartDate} onChange={e => setStmtStartDate(e.target.value)} />
                          <span className="flex items-center">الى</span>
                          <Input type="date" className="h-8 text-xs bg-white" value={stmtEndDate} onChange={e => setStmtEndDate(e.target.value)} />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-200 mt-2">
                        <label className="w-24 font-bold text-slate-700 text-left">خيارات</label>
                        <div className="flex-1 flex flex-wrap gap-x-4 gap-y-1 items-center">
                          <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" /> استبعاد قيود الاقفال</label>
                          <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" /> استبعاد الرصيد السابق</label>
                          <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" /> استبعاد الافتتاحي</label>
                          <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" /> تجميع البيان حسب الحركة</label>
                        </div>
                      </div>
                    </div>

                    {/* Middle Column */}
                    <div className="col-span-12 lg:col-span-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="w-24 font-bold text-slate-700 text-left">اسم الحركة</label>
                        <Input className="h-8 text-xs bg-white" placeholder="الكل" />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="w-24 font-bold text-slate-700 text-left">اسم الجهة</label>
                        <Input className="h-8 text-xs bg-white" placeholder="" />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="w-24 font-bold text-slate-700 text-left">اسم المستفيد</label>
                        <Input className="h-8 text-xs bg-white" placeholder="" />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 font-bold text-slate-700 w-24 text-left">
                          <input type="checkbox" />
                          تاريخ الحق
                        </label>
                        <div className="flex-1 flex gap-2">
                          <Input type="date" className="h-8 text-xs bg-white" />
                          <span className="flex items-center">الى</span>
                          <Input type="date" className="h-8 text-xs bg-white" />
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="col-span-12 lg:col-span-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="w-24 font-bold text-slate-700 text-left">رقم الفرع</label>
                        <Select value={stmtBranch} onValueChange={setStmtBranch}>
                          <SelectTrigger className="flex-1 h-8 text-xs bg-white"><SelectValue/></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 - وكالة الطيور المهاجرة</SelectItem>
                            <SelectItem value="2">2 - وكالة الحجر الأسود</SelectItem>
                          </SelectContent>
                        </Select>
                        <input type="checkbox" defaultChecked />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="w-24 font-bold text-slate-700 text-left">رقم القسم</label>
                        <Select defaultValue="all"><SelectTrigger className="flex-1 h-8 text-xs bg-white"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">الكل</SelectItem></SelectContent></Select>
                        <input type="checkbox" defaultChecked />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="w-24 font-bold text-slate-700 text-left">مركز التكلفة</label>
                        <Select value={stmtCostCenter} onValueChange={setStmtCostCenter}>
                          <SelectTrigger className="flex-1 h-8 text-xs bg-white"><SelectValue/></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">الكل</SelectItem>
                          </SelectContent>
                        </Select>
                        <input type="checkbox" defaultChecked />
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <label className="w-24 font-bold text-blue-700 text-left">رمز الحركة</label>
                        <Input className="flex-1 h-8 text-xs bg-white" />
                        <label className="font-bold text-blue-700 mx-2">السنة المالية</label>
                        <Select value={stmtYear} onValueChange={setStmtYear}>
                          <SelectTrigger className="w-20 h-8 text-xs bg-white font-bold"><SelectValue/></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2025">2025</SelectItem>
                            <SelectItem value="2026">2026</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="outline" className="h-8 px-2 text-xs font-bold">EN</Button>
                      </div>
                    </div>

                  </div>
                </div>

                {/* TABS FOR REPORT TYPES */}
                <div className="flex bg-white border-b border-slate-200 overflow-x-auto text-sm font-bold">
                  <div className="px-6 py-2 border-b-2 border-blue-600 text-blue-700 cursor-pointer hover:bg-slate-50">كشف تفصيلي</div>
                  <div className="px-6 py-2 text-slate-600 cursor-pointer hover:bg-slate-50">كشف إجمالي</div>
                  <div className="px-6 py-2 text-slate-600 cursor-pointer hover:bg-slate-50">ملاحظات الحساب</div>
                  <div className="px-6 py-2 text-slate-600 cursor-pointer hover:bg-slate-50">خيارات اضافية</div>
                </div>

                {/* TABLE PREVIEW PORTION */}
                <div className="overflow-x-auto min-h-[300px]">
                  <table className="w-full text-xs text-right whitespace-nowrap">
                    <thead className="bg-slate-100 border-b border-slate-300 text-slate-700">
                      <tr>
                        <th className="p-2 border-l border-slate-200">البيان</th>
                        <th className="p-2 border-l border-slate-200 text-center">رقم الحركة</th>
                        <th className="p-2 border-l border-slate-200">المستند</th>
                        <th className="p-2 border-l border-slate-200">التاريخ</th>
                        <th className="p-2 border-l border-slate-200 text-center">الرصيد</th>
                        <th className="p-2 border-l border-slate-200 text-center">دائن</th>
                        <th className="p-2 border-l border-slate-200 text-center">مدين</th>
                        <th className="p-2 text-center w-10">م</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Opening Balance */}
                      <tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-2 border-l border-slate-200 font-bold text-slate-600 text-center" colSpan={4}>الرصيد الافتتاحي</td>
                        <td className="p-2 border-l border-slate-200 font-bold text-center" dir="ltr">{fmt(statementData?.previousBalance)}</td>
                        <td className="p-2 border-l border-slate-200 text-center text-red-600 font-bold">0.00</td>
                        <td className="p-2 border-l border-slate-200 text-center text-emerald-600 font-bold">0.00</td>
                        <td className="p-2 text-center text-slate-400">-</td>
                      </tr>
                      {/* Transactions */}
                      {statementData?.transactions?.length > 0 ? statementData.transactions.map((tx: any, idx: number) => {
                        return (
                          <tr key={idx} className={\`border-b border-slate-100 hover:bg-emerald-50/40 \${idx % 2 === 0 ? 'bg-emerald-50/10' : ''}\`}>
                            <td className="p-2 border-l border-slate-200 truncate max-w-[200px]" title={tx.statement}>{tx.statement || "بدون بيان"}</td>
                            <td className="p-2 border-l border-slate-200 text-center">{tx.id || tx.reference_id || "-"}</td>
                            <td className="p-2 border-l border-slate-200">{tx.type === 'debit' ? "سند قيد/صرف" : "سند قيد/قبض"}</td>
                            <td className="p-2 border-l border-slate-200 font-mono text-slate-600">{new Date(tx.date).toLocaleDateString("en-GB")}</td>
                            <td className="p-2 border-l border-slate-200 font-bold text-center" dir="ltr">
                              {fmt(tx.runningBalance)} {tx.runningBalance > 0 ? "م" : tx.runningBalance < 0 ? "د" : ""}
                            </td>
                            <td className="p-2 border-l border-slate-200 text-center text-red-600 font-mono" dir="ltr">{tx.type === 'credit' ? fmt(tx.amount) : "0.00"}</td>
                            <td className="p-2 border-l border-slate-200 text-center text-emerald-600 font-mono" dir="ltr">{tx.type === 'debit' ? fmt(tx.amount) : "0.00"}</td>
                            <td className="p-2 text-center text-slate-500 font-mono">{idx + 1}</td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-500">
                            لا توجد حركات مالية لهذا الحساب في الفترة المحددة
                          </td>
                        </tr>
                      )}
                      {/* Totals */}
                      <tr className="bg-emerald-100/50 border-t-2 border-emerald-300 font-bold">
                        <td colSpan={4} className="p-2 text-center text-slate-700">الإجماليات</td>
                        <td className="p-2 text-center font-black text-slate-900 border-l border-emerald-200" dir="ltr">
                           {fmt(statementData?.currentBalance)}
                        </td>
                        <td className="p-2 text-center text-red-700 border-l border-emerald-200" dir="ltr">
                           {fmt(statementData?.transactions?.filter((t:any) => t.type === 'credit').reduce((a:number,b:any) => a + Number(b.amount), 0))}
                        </td>
                        <td className="p-2 text-center text-emerald-700 border-l border-emerald-200" dir="ltr">
                           {fmt(statementData?.transactions?.filter((t:any) => t.type === 'debit').reduce((a:number,b:any) => a + Number(b.amount), 0))}
                        </td>
                        <td className="p-2"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* BOTTOM FOOTER LIKE DESKTOP APP */}
                <div className="bg-slate-100 p-2 border-t border-slate-300 flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button variant="outline" className="h-8 bg-white text-xs font-bold px-4">تصدير</Button>
                    <Button variant="outline" className="h-8 bg-white text-xs font-bold px-4">كشف جديد</Button>
                    <Button variant="outline" className="h-8 bg-white text-xs font-bold px-4">خيارات</Button>
                    <Button variant="outline" className="h-8 bg-white text-blue-700 border-blue-200 font-bold px-4">مصادقة</Button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="h-8 bg-white text-xs font-bold px-4">طباعة نموذج</Button>
                    <Button onClick={() => handlePrintStatement()} className="h-8 bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold px-8">طباعة / عرض</Button>
                  </div>
                </div>

              </CardContent>
            </Card>
          </TabsContent>
          `;

code = code.replace(searchRegex, newStatementsUI + "\n          {/* TAB 8: ASSETS (الأصول) */}");
fs.writeFileSync('artifacts/pos-system/src/pages/accounting.tsx', code);
console.log('Replaced Statements UI');
