const fs = require('fs');
let file = fs.readFileSync('/app/applet/artifacts/pos-system/src/pages/document-print-settings.tsx', 'utf8');

const target = `            <CardContent className="space-y-4 pt-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">اسم المؤسسة / الشركة</label>
                <Input value={form.companyName} onChange={(e) => setField("companyName", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">العنوان الفرعي / الوصف</label>
                <Input value={form.companySubtitle} onChange={(e) => setField("companySubtitle", e.target.value)} />
              </div>`;

const replacement = `            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 border p-3 rounded-lg bg-slate-50">
                  <label className="text-xs font-bold text-slate-700 mb-1 block">بيانات الترويسة اليمنى (عربي)</label>
                  <Input placeholder="السطر الأول (مثال: معمل عبدالاسلام للخبز)" value={form.headerRightText1} onChange={(e) => setField("headerRightText1", e.target.value)} className="text-xs" />
                  <Input placeholder="السطر الثاني (مثال: عدن/المعلا)" value={form.headerRightText2} onChange={(e) => setField("headerRightText2", e.target.value)} className="text-xs" />
                  <Input placeholder="السطر الثالث (مثال: رقم هاتف)" value={form.headerRightText3} onChange={(e) => setField("headerRightText3", e.target.value)} className="text-xs" />
                </div>
                <div className="space-y-2 border p-3 rounded-lg bg-slate-50">
                  <label className="text-xs font-bold text-slate-700 mb-1 block">بيانات الترويسة اليسرى (عربي/إنجليزي)</label>
                  <Input placeholder="السطر الأول (مثال: قيس)" value={form.headerLeftText1} onChange={(e) => setField("headerLeftText1", e.target.value)} className="text-xs" />
                  <Input placeholder="السطر الثاني (مثال: عدن/المعلا)" value={form.headerLeftText2} onChange={(e) => setField("headerLeftText2", e.target.value)} className="text-xs" />
                  <Input placeholder="السطر الثالث (مثال: رقم هاتف)" value={form.headerLeftText3} onChange={(e) => setField("headerLeftText3", e.target.value)} className="text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">اسم المؤسسة / الشركة (الافتراضي)</label>
                  <Input value={form.companyName} onChange={(e) => setField("companyName", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">العنوان الفرعي / الوصف</label>
                  <Input value={form.companySubtitle} onChange={(e) => setField("companySubtitle", e.target.value)} />
                </div>
              </div>`;

if(file.includes(target)) {
  file = file.replace(target, replacement);
  fs.writeFileSync('/app/applet/artifacts/pos-system/src/pages/document-print-settings.tsx', file, 'utf8');
  console.log('UI Replaced successfully!');
} else {
  console.log('Target UI string not found.');
}
