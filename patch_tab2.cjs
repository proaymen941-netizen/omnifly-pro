const fs = require('fs');
const file = 'artifacts/pos-system/src/pages/passengers.tsx';
let code = fs.readFileSync(file, 'utf-8');

const oldTab2Headers = `
                    <tr className="border-b-[1.5px] border-black bg-white">
                      <th className="border-[1.5px] border-black py-2.5 px-3 font-bold text-right">اسم المعتمر</th>
                      <th className="border-[1.5px] border-black py-2.5 px-3 font-bold">رقم الجواز</th>
                      <th className="border-[1.5px] border-black py-2.5 px-3 font-bold">النوع</th>
                      <th className="border-[1.5px] border-black py-2.5 px-2 font-bold leading-tight">مده السفر<br/>(فترة البرنامج)</th>
                      <th className="border-[1.5px] border-black py-2.5 px-2 font-bold leading-tight">تاريخ الدخول<br/>(السفر)</th>
                      <th className="border-[1.5px] border-black py-2.5 px-2 font-bold leading-tight">الأيام المتبقية<br/>على الخروج</th>
                      <th className="border-[1.5px] border-black py-2.5 px-2 font-bold leading-tight">تاريخ الخروج<br/>المتوقع</th>
                    </tr>`;

const newTab2Headers = `
                    <tr className="border-b-[1.5px] border-black bg-white">
                      <th className="border-[1.5px] border-black py-2.5 px-3 font-bold text-right">اسم المعتمر</th>
                      <th className="border-[1.5px] border-black py-2.5 px-3 font-bold">رقم الجواز</th>
                      <th className="border-[1.5px] border-black py-2.5 px-3 font-bold">النوع</th>
                      <th className="border-[1.5px] border-black py-2.5 px-3 font-bold">الحالة</th>
                      <th className="border-[1.5px] border-black py-2.5 px-3 font-bold">الملاحظات</th>
                      <th className="border-[1.5px] border-black py-2.5 px-2 font-bold leading-tight">مده السفر<br/>(فترة البرنامج)</th>
                      <th className="border-[1.5px] border-black py-2.5 px-2 font-bold leading-tight">تاريخ الدخول<br/>(السفر)</th>
                      <th className="border-[1.5px] border-black py-2.5 px-2 font-bold leading-tight">الأيام المتبقية<br/>على الخروج</th>
                      <th className="border-[1.5px] border-black py-2.5 px-2 font-bold leading-tight">تاريخ الخروج<br/>المتوقع</th>
                    </tr>`;

code = code.replace(oldTab2Headers, newTab2Headers);

const oldTab2Cells = `
                          <tr key={p.id} className="border-b-[1.5px] border-black">
                            <td className="border-[1.5px] border-black py-2.5 px-3 font-bold text-right text-black">{p.name_ar || p.name_en}</td>
                            <td className="border-[1.5px] border-black py-2.5 px-3 font-mono font-bold text-black">{p.passport_number || "---"}</td>
                            <td className="border-[1.5px] border-black py-2.5 px-3 text-black">{p.visa_type || "تأشيرة عمره"}</td>
                            <td className="border-[1.5px] border-black py-2.5 px-2 font-bold text-black">{p.program_duration_days || 90}</td>
                            <td className="border-[1.5px] border-black py-2.5 px-2 font-mono text-black">{(p.travel_date || "---").replace(/-/g, "/")}</td>
                            <td className="border-[1.5px] border-black py-2.5 px-2 font-bold text-black">{remaining}</td>
                            <td className="border-[1.5px] border-black py-2.5 px-2 font-mono text-black">{(p.expected_exit_date || "---").replace(/-/g, "/")}</td>
                          </tr>`;

const newTab2Cells = `
                          <tr key={p.id} className="border-b-[1.5px] border-black">
                            <td className="border-[1.5px] border-black py-2.5 px-3 font-bold text-right text-black">{p.name_ar || p.name_en}</td>
                            <td className="border-[1.5px] border-black py-2.5 px-3 font-mono font-bold text-black">{p.passport_number || "---"}</td>
                            <td className="border-[1.5px] border-black py-2.5 px-3 text-black">{p.visa_type || "تأشيرة عمره"}</td>
                            <td className="border-[1.5px] border-black py-2.5 px-3 font-bold text-black">{p.travel_status || "---"}</td>
                            <td className="border-[1.5px] border-black py-2.5 px-3 text-black max-w-[100px] truncate">{p.notes || "---"}</td>
                            <td className="border-[1.5px] border-black py-2.5 px-2 font-bold text-black">{p.program_duration_days || 90}</td>
                            <td className="border-[1.5px] border-black py-2.5 px-2 font-mono text-black">{(p.travel_date || "---").replace(/-/g, "/")}</td>
                            <td className="border-[1.5px] border-black py-2.5 px-2 font-bold text-black">{remaining}</td>
                            <td className="border-[1.5px] border-black py-2.5 px-2 font-mono text-black">{(p.expected_exit_date || "---").replace(/-/g, "/")}</td>
                          </tr>`;

code = code.replace(oldTab2Cells, newTab2Cells);

const oldColSpan = '<td colSpan={7} className="border-[1.5px] border-black py-6 text-slate-500">لا يوجد بيانات للعرض</td>';
const newColSpan = '<td colSpan={9} className="border-[1.5px] border-black py-6 text-slate-500">لا يوجد بيانات للعرض</td>';
code = code.replace(oldColSpan, newColSpan);

fs.writeFileSync(file, code);
