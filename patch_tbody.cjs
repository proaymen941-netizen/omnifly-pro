const fs = require('fs');
const file = 'artifacts/pos-system/src/pages/passengers.tsx';
let code = fs.readFileSync(file, 'utf-8');

const oldBlock = `
                            <td className="py-3 px-4 font-mono font-bold text-slate-700">
                              {p.passport_number || "---"}
                            </td>
                            <td className="py-3 px-4 text-slate-600">{p.nationality || "يمني"}</td>
                            <td className="py-3 px-4 font-mono text-slate-600">{p.phone || "---"}</td>
                            <td className="py-3 px-4 text-slate-600">
                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-bold">
                                {p.visa_type || "تأشيرة عمره"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-slate-800">
                              <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md font-mono text-xs font-extrabold border border-slate-200">
                                {p.program_duration_days || 90} يوم
                              </span>
                            </td>`;

const newBlock = `
                            <td className="py-3 px-4 font-mono font-bold text-slate-700">
                              {p.passport_number || "---"}
                            </td>
                            <td className="py-3 px-4 text-slate-600">{p.nationality || "---"}</td>
                            <td className="py-3 px-4 font-mono text-slate-600" dir="ltr">{p.phone || "---"}</td>
                            <td className="py-3 px-4 text-slate-600">
                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-bold">
                                {p.visa_type || "تأشيرة عمره"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={\`px-2 py-1 rounded-md text-[11px] font-bold \${p.travel_status === "داخل مكة" ? "bg-indigo-100 text-indigo-800" : p.travel_status === "غادر" ? "bg-emerald-100 text-emerald-800" : p.travel_status === "مخالف" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-600"}\`}>
                                {p.travel_status || "غير محدد"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-[11px] text-slate-500 max-w-[120px] truncate" title={p.notes}>
                              {p.notes || "---"}
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-slate-800">
                              <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md font-mono text-xs font-extrabold border border-slate-200">
                                {p.program_duration_days || 90} يوم
                              </span>
                            </td>`;

if (code.includes('                            <td className="py-3 px-4 text-slate-600">{p.nationality || "يمني"}</td>')) {
  code = code.replace(oldBlock, newBlock);
  fs.writeFileSync(file, code);
  console.log("Success");
} else {
  console.log("Block not found!");
}
