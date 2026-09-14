const fs = require('fs');
const file = 'artifacts/pos-system/src/pages/passengers.tsx';
let code = fs.readFileSync(file, 'utf-8');

const oldHeaders3 = `
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-xs font-bold border-b border-slate-200">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">الاسم بالعربي</th>
                      <th className="py-3 px-4">الاسم بالإنجليزي</th>
                      <th className="py-3 px-4">رقم الجواز</th>
                      <th className="py-3 px-4">الجنسية</th>
                      <th className="py-3 px-4">نوع التأشيرة</th>
                      <th className="py-3 px-4">رقم الهاتف</th>
                      <th className="py-3 px-4">العميل / الوكيل</th>
                      <th className="py-3 px-4 text-center">إجراءات</th>
                    </tr>
                  </thead>`;

const newHeaders3 = `
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-xs font-bold border-b border-slate-200">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">الاسم بالعربي</th>
                      <th className="py-3 px-4">الاسم بالإنجليزي</th>
                      <th className="py-3 px-4">رقم الجواز</th>
                      <th className="py-3 px-4">الجنسية</th>
                      <th className="py-3 px-4">نوع التأشيرة</th>
                      <th className="py-3 px-4 text-center">حالة المعتمر</th>
                      <th className="py-3 px-4 text-center">ملاحظات</th>
                      <th className="py-3 px-4">مدة السفر</th>
                      <th className="py-3 px-4">تاريخ الدخول</th>
                      <th className="py-3 px-4">رقم الهاتف</th>
                      <th className="py-3 px-4">العميل / الوكيل</th>
                      <th className="py-3 px-4 text-center">إجراءات</th>
                    </tr>
                  </thead>`;

code = code.replace(oldHeaders3, newHeaders3);

const oldCells3 = `
                        <td className="py-3 px-4 text-slate-600">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold border">
                            {p.visa_type || "تأشيرة عمره"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">{p.phone || "---"}</td>
                        <td className="py-3 px-4 text-slate-700 font-semibold">{p.customer_name || "---"}</td>`;

const newCells3 = `
                        <td className="py-3 px-4 text-slate-600">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold border">
                            {p.visa_type || "تأشيرة عمره"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={\`px-2 py-1 rounded text-[11px] font-bold \${p.travel_status === "داخل مكة" ? "bg-indigo-100 text-indigo-800" : p.travel_status === "غادر" ? "bg-emerald-100 text-emerald-800" : p.travel_status === "مخالف" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-600"}\`}>
                            {p.travel_status || "غير محدد"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-[11px] text-slate-500 max-w-[120px] truncate" title={p.notes}>
                          {p.notes || "---"}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800 text-center">
                          {p.program_duration_days ? \`\${p.program_duration_days} يوم\` : "---"}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 text-center">
                          {p.travel_date ? p.travel_date.replace(/-/g, "/") : "---"}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600" dir="ltr">{p.phone || "---"}</td>
                        <td className="py-3 px-4 text-slate-700 font-semibold">{p.customer_name || "---"}</td>`;

if (code.includes('                        <td className="py-3 px-4 font-mono text-slate-600">{p.phone || "---"}</td>')) {
    code = code.replace(oldCells3, newCells3);
    fs.writeFileSync(file, code);
    console.log("Success");
} else {
    console.log("Failed");
}
