const fs = require('fs');
const file = 'artifacts/pos-system/src/pages/passengers.tsx';
let code = fs.readFileSync(file, 'utf-8');

// Add "رقم الهاتف" to the first table
code = code.replace(
    '<th className="py-3 px-4">اسم المعتمر</th>',
    '<th className="py-3 px-4">اسم المعتمر</th>\n                      <th className="py-3 px-4">الجنسية</th>\n                      <th className="py-3 px-4">رقم الهاتف</th>'
);

code = code.replace(
    '<td colSpan={9}',
    '<td colSpan={11}'
);

code = code.replace(
    '<td className="py-3 px-4 font-mono font-bold text-slate-700">\n                              {p.passport_number || "---"}\n                            </td>',
    '<td className="py-3 px-4 font-mono font-bold text-slate-700">\n                              {p.passport_number || "---"}\n                            </td>\n                            <td className="py-3 px-4 text-slate-600">{p.nationality || "يمني"}</td>\n                            <td className="py-3 px-4 font-mono text-slate-600">{p.phone || "---"}</td>'
);

fs.writeFileSync(file, code);
