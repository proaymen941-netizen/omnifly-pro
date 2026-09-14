const fs = require('fs');
const file = 'artifacts/pos-system/src/pages/passengers.tsx';
let code = fs.readFileSync(file, 'utf-8');

if (!code.includes('const [statsModalType, setStatsModalType]')) {
    code = code.replace(
        'const [reportDate, setReportDate] = useState<string>(new Date().toISOString().slice(0, 10));',
        `const [reportDate, setReportDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [statsModalType, setStatsModalType] = useState<"totalUmrah" | "urgent" | "warning" | "totalPassengers" | null>(null);
  
  const statsModalData = useMemo(() => {
    switch(statsModalType) {
      case "totalUmrah": return umrahPassengers;
      case "urgent": return umrahPassengers.filter(p => {
        const rem = p.remaining_days !== null && p.remaining_days !== undefined ? Number(p.remaining_days) : null;
        return rem !== null && rem <= 3 && rem >= 0;
      });
      case "warning": return umrahPassengers.filter(p => {
        const rem = p.remaining_days !== null && p.remaining_days !== undefined ? Number(p.remaining_days) : null;
        return rem !== null && rem > 3 && rem <= 10;
      });
      case "totalPassengers": return passengers;
      default: return [];
    }
  }, [statsModalType, umrahPassengers, passengers]);`
    );
}

code = code.replace(
    '<Card className="border-slate-200 shadow-sm hover:shadow transition-shadow">\n            <CardContent className="p-4 flex items-center justify-between">\n              <div>\n                <p className="text-xs font-bold text-slate-500">إجمالي معتمري مكة (البرنامج)</p>',
    '<Card className="border-slate-200 shadow-sm hover:shadow transition-shadow cursor-pointer hover:border-emerald-300" onClick={() => setStatsModalType("totalUmrah")}>\n            <CardContent className="p-4 flex items-center justify-between">\n              <div>\n                <p className="text-xs font-bold text-slate-500">إجمالي معتمري مكة (البرنامج)</p>'
);

code = code.replace(
    '<Card className="border-red-200 bg-red-50/40 shadow-sm hover:shadow transition-shadow">\n            <CardContent className="p-4 flex items-center justify-between">\n              <div>\n                <p className="text-xs font-bold text-red-600">إنذار خروج عاجل (≤ 3 أيام)</p>',
    '<Card className="border-red-200 bg-red-50/40 shadow-sm hover:shadow transition-shadow cursor-pointer hover:border-red-400" onClick={() => setStatsModalType("urgent")}>\n            <CardContent className="p-4 flex items-center justify-between">\n              <div>\n                <p className="text-xs font-bold text-red-600">إنذار خروج عاجل (≤ 3 أيام)</p>'
);

code = code.replace(
    '<Card className="border-amber-200 bg-amber-50/40 shadow-sm hover:shadow transition-shadow">\n            <CardContent className="p-4 flex items-center justify-between">\n              <div>\n                <p className="text-xs font-bold text-amber-600">اقتراب موعد الخروج (4 - 10 أيام)</p>',
    '<Card className="border-amber-200 bg-amber-50/40 shadow-sm hover:shadow transition-shadow cursor-pointer hover:border-amber-400" onClick={() => setStatsModalType("warning")}>\n            <CardContent className="p-4 flex items-center justify-between">\n              <div>\n                <p className="text-xs font-bold text-amber-600">اقتراب موعد الخروج (4 - 10 أيام)</p>'
);

code = code.replace(
    '<Card className="border-slate-200 shadow-sm hover:shadow transition-shadow">\n            <CardContent className="p-4 flex items-center justify-between">\n              <div>\n                <p className="text-xs font-bold text-slate-500">إجمالي المسافرين بالنظام</p>',
    '<Card className="border-slate-200 shadow-sm hover:shadow transition-shadow cursor-pointer hover:border-blue-300" onClick={() => setStatsModalType("totalPassengers")}>\n            <CardContent className="p-4 flex items-center justify-between">\n              <div>\n                <p className="text-xs font-bold text-slate-500">إجمالي المسافرين بالنظام</p>'
);

// Append the Dialog before the closing div of the page

const dialogHtml = `
        <Dialog open={!!statsModalType} onOpenChange={(open) => !open && setStatsModalType(null)}>
          <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-800">
                {statsModalType === "totalUmrah" && "إجمالي معتمري مكة (البرنامج)"}
                {statsModalType === "urgent" && "المعتمرون الذين اقترب موعد خروجهم (إنذار عاجل)"}
                {statsModalType === "warning" && "المعتمرون الذين اقترب موعد خروجهم (تنبيه مسبق)"}
                {statsModalType === "totalPassengers" && "إجمالي المسافرين بالنظام"}
                <span className="mr-2 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">{statsModalData.length} مسافر</span>
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm text-right border-collapse whitespace-nowrap">
                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 shadow-sm z-10">
                  <tr>
                    <th className="py-3 px-4 border-b border-slate-200">الرقم</th>
                    <th className="py-3 px-4 border-b border-slate-200">اسم المسافر</th>
                    <th className="py-3 px-4 border-b border-slate-200">الجنسية</th>
                    <th className="py-3 px-4 border-b border-slate-200">رقم الجواز</th>
                    <th className="py-3 px-4 border-b border-slate-200">الهاتف</th>
                    <th className="py-3 px-4 border-b border-slate-200">نوع التأشيرة</th>
                    <th className="py-3 px-4 border-b border-slate-200">الأيام المتبقية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {statsModalData.map((p, idx) => {
                    const remaining = p.remaining_days !== null && p.remaining_days !== undefined ? Number(p.remaining_days) : null;
                    const alertBadge = remaining !== null && remaining <= 3 
                      ? <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-[10px] font-bold">عاجل</span>
                      : remaining !== null && remaining <= 10 
                      ? <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold">قريباً</span>
                      : null;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-500 text-xs">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                          {p.name_ar || p.name_en} {alertBadge}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{p.nationality || "---"}</td>
                        <td className="py-3 px-4 font-mono text-slate-700">{p.passport_number || "---"}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{p.phone || "---"}</td>
                        <td className="py-3 px-4 text-slate-600 text-xs">{p.visa_type || "---"}</td>
                        <td className="py-3 px-4">
                          {remaining !== null ? (
                            <span className={\`font-bold \${remaining <= 3 ? "text-rose-600" : remaining <= 10 ? "text-amber-600" : "text-emerald-600"}\`}>
                              {remaining} يوم
                            </span>
                          ) : (
                            <span className="text-slate-400">---</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <DialogFooter className="mt-4 pt-3 border-t">
              <Button onClick={() => setStatsModalType(null)} variant="outline">إغلاق</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
`;

code = code.replace(
    '        <ReportViewerModal',
    dialogHtml + '\n        <ReportViewerModal'
);

fs.writeFileSync(file, code);
