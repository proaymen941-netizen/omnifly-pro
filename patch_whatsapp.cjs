const fs = require('fs');
const file = 'artifacts/pos-system/src/pages/passengers.tsx';
let code = fs.readFileSync(file, 'utf-8');

if (!code.includes('const [whatsappFormat, setWhatsappFormat]')) {
    code = code.replace(
        'const [whatsAppAutoSendMode, setWhatsAppAutoSendMode] = useState(false);',
        'const [whatsAppAutoSendMode, setWhatsAppAutoSendMode] = useState(false);\n  const [whatsappFormat, setWhatsappFormat] = useState("text");'
    );
}

code = code.replace(
    '  const handleSendWhatsApp = () => {\n    if (!whatsappAuthorized) {',
    `  const handleSendWhatsApp = () => {\n    if (!whatsappAuthorized) {\n      setWhatsappPermissionModalOpen(true);\n      return;\n    }\n\n    if (whatsappFormat === "pdf") {\n       handleExportToPdf(targetPaxForWhatsApp ? [targetPaxForWhatsApp] : (selectedCustomerId ? filteredPassengers : umrahPassengers));\n       return;\n    }`
);

// Add radio buttons to dialog
const optionsHtml = `
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <label className="text-xs font-bold text-slate-700 mb-2 block">تنسيق الإرسال</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm cursor-pointer font-semibold text-slate-700">
                    <input type="radio" value="text" checked={whatsappFormat === "text"} onChange={(e) => setWhatsappFormat(e.target.value)} className="w-4 h-4 text-emerald-600 focus:ring-emerald-500" />
                    إرسال رسالة نصية تفصيلية
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer font-semibold text-slate-700">
                    <input type="radio" value="pdf" checked={whatsappFormat === "pdf"} onChange={(e) => setWhatsappFormat(e.target.value)} className="w-4 h-4 text-emerald-600 focus:ring-emerald-500" />
                    إنشاء وتصدير كشف PDF
                  </label>
                </div>
              </div>
`;

code = code.replace(
    '<div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-4">',
    optionsHtml + '\n              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-4">'
);

// Hide text editor if pdf is selected
code = code.replace(
    '<div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-4">',
    '<div className={`bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-4 ${whatsappFormat === "pdf" ? "opacity-50 pointer-events-none" : ""}`}>'
);

fs.writeFileSync(file, code);
