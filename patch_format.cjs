const fs = require('fs');
const file = 'artifacts/pos-system/src/pages/passengers.tsx';
let code = fs.readFileSync(file, 'utf-8');

if (!code.includes('const [whatsappFormat, setWhatsappFormat]')) {
    code = code.replace(
        'const [targetPaxForWhatsApp, setTargetPaxForWhatsApp] = useState<any | null>(null);',
        'const [targetPaxForWhatsApp, setTargetPaxForWhatsApp] = useState<any | null>(null);\n  const [whatsappFormat, setWhatsappFormat] = useState<"text" | "pdf">("text");'
    );
}

// Add the selector in the UI
const uiSelectorHtml = `
                    <div className="mb-4">
                      <label className="text-xs font-bold text-slate-700 mb-1 block">صيغة إرسال الواتساب</label>
                      <select 
                        value={whatsappFormat} 
                        onChange={e => setWhatsappFormat(e.target.value as "text" | "pdf")}
                        className="w-full p-2 border border-slate-300 rounded-md text-xs font-bold"
                      >
                        <option value="text">رسالة نصية تفصيلية (Text)</option>
                        <option value="pdf">ملف مرفق (PDF)</option>
                      </select>
                    </div>
`;

code = code.replace(
    '                {whatsappSendMode === \'manual\' ? (',
    '                {whatsappSendMode === \'manual\' ? (\n                  <>\n' + uiSelectorHtml
);

code = code.replace(
    '                  <>\n                    <div>\n                      <label className="text-xs font-bold text-slate-700 mb-1 block">رقم هاتف المستلم (واتساب) *</label>',
    '                    <div>\n                      <label className="text-xs font-bold text-slate-700 mb-1 block">رقم هاتف المستلم (واتساب) *</label>'
);

fs.writeFileSync(file, code);
