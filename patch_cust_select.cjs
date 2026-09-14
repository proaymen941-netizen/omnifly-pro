const fs = require('fs');
const file = 'artifacts/pos-system/src/pages/customers.tsx';
let code = fs.readFileSync(file, 'utf-8');

// 1. Remove required from account_code select and change the default option
code = code.replace(
    /<select\n\s*required\n\s*value=\{form\.account_code\}/,
    '<select\n                    value={form.account_code}'
);
code = code.replace(
    '<option value="">-- اختر الحساب الفرعي من دليل الحسابات --</option>',
    '<option value="">✨ إنشاء حساب جديد ومستقل للعميل تلقائياً (تابع للمكتب مباشرة)</option>'
);

// 2. We should let them choose "affiliation_type" explicitly in the form
const affiliationHtml = `
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">نوع الارتباط / التبعية *</label>
                  <select
                    value={form.affiliation_type}
                    onChange={e => setForm(f => ({ ...f, affiliation_type: e.target.value, account_code: "" }))}
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-xs font-bold text-slate-900"
                  >
                    <option value="direct">🏢 عميل مباشر (تابع للمكتب)</option>
                    <option value="agency">🏬 عميل يتبع مكتب / وكيل وسيط</option>
                  </select>
                </div>
                {form.affiliation_type === 'agency' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">الوكيل / المكتب الوسيط *</label>
                  <select
                    value={form.office_id || "NEW_OFFICE"}
                    onChange={e => handleSelectOffice(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-xs font-bold text-slate-900"
                  >
                    <option value="" disabled>-- اختر المكتب --</option>
                    {offices.map((o: any) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                    <option value="NEW_OFFICE" className="font-bold text-primary">+ إضافة مكتب جديد</option>
                  </select>
                </div>
                )}
              </div>
`;

code = code.replace(
    '              {/* Dynamic Chart of Accounts sub-account linkage selection */}',
    affiliationHtml + '\n              {/* Dynamic Chart of Accounts sub-account linkage selection */}'
);

// 3. Prevent auto-selecting account if affiliation_type is direct? 
// In useEffect:
code = code.replace(
    /if \(!hasValidCode\) \{\s*\/\/ Default to the first direct child\s*const defaultSub = subAccounts\.find/,
    `if (!hasValidCode && form.affiliation_type === "agency") {
        // Default to the first direct child
        const defaultSub = subAccounts.find`
);

fs.writeFileSync(file, code);
