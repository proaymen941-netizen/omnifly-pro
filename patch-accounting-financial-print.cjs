const fs = require('fs');

let code = fs.readFileSync('artifacts/pos-system/src/pages/accounting.tsx', 'utf8');

// 1. Add generateFinancialA4Html to printUtils imports
code = code.replace(
  'import { printA4Html, generateStatementA4Html, generateTrialBalanceA4Html } from "@/lib/printUtils";',
  'import { printA4Html, generateStatementA4Html, generateTrialBalanceA4Html, generateFinancialA4Html } from "@/lib/printUtils";'
);

// 2. Add handlePrintFinancial function
code = code.replace(
  '  const handlePrintTrial = () => {',
  `  const handlePrintFinancial = (type: 'pl' | 'bs') => {
    const html = generateFinancialA4Html({
      type,
      startDate: reportOpts.fromDate,
      endDate: reportOpts.toDate,
    });
    setReportHtml(html);
    setReportTitle(type === 'pl' ? "الأرباح والخسائر" : "الميزانية العمومية");
    setReportModalOpen(true);
  };
  const handlePrintTrial = () => {`
);

// 3. Update buttons in Financials
const oldFinancialsPrintButton = '<Button size="sm" onClick={() => { toast({ title: "جاري الطباعة..." }); setTimeout(() => window.print(), 500); }} className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 px-5 gap-1 font-bold shadow"><Printer className="w-3.5 h-3.5" /> طباعة</Button>';
const newFinancialsPrintButton = '<Button size="sm" onClick={() => handlePrintFinancial(\\\'pl\\\')} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-6 gap-1 font-bold shadow"><Printer className="w-3.5 h-3.5" /> طباعة ميزانية / أرباح</Button>';

code = code.replace(oldFinancialsPrintButton, newFinancialsPrintButton);

fs.writeFileSync('artifacts/pos-system/src/pages/accounting.tsx', code);
console.log('Patched Financials print');
