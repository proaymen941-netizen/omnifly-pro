const fs = require('fs');
let content = fs.readFileSync('/app/applet/artifacts/pos-system/src/pages/accounting.tsx', 'utf8');

const target = `<div className="flex justify-between items-center border-b pb-3">
                  <div className="flex items-center gap-3">
                    <img src={docForm.logoUrl || omnisystemLogo} alt="Logo" className="w-12 h-12 object-contain" />
                    <div>
                      <h2 className="font-black text-sm text-slate-900">{docForm.companyName}</h2>
                      <p className="text-[10px] text-slate-500">{docForm.companySubtitle}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <Badge className={viewVoucher.type === "receipt" ? "bg-emerald-600 text-white text-sm font-bold px-3 py-1" : "bg-rose-600 text-white text-sm font-bold px-3 py-1"}>
                      {viewVoucher.type === "receipt" ? "سند قبض" : "سند صرف"}
                    </Badge>
                    <p className="text-xs font-mono font-bold mt-1">#{viewVoucher.voucher_number}</p>
                  </div>
                </div>`;

const replacement = `<PrintHeader 
                  documentTitle={viewVoucher.type === "receipt" ? "سند قبض" : "سند صرف"}
                  documentSubtitle={\`رقم السند: #\${viewVoucher.voucher_number}\`}
                />`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('/app/applet/artifacts/pos-system/src/pages/accounting.tsx', content, 'utf8');
  console.log('Voucher updated!');
} else {
  console.log('Not found');
}
