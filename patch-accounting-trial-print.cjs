const fs = require('fs');

let code = fs.readFileSync('artifacts/pos-system/src/pages/accounting.tsx', 'utf8');

// 1. Add generateTrialBalanceA4Html to printUtils imports
code = code.replace(
  'import { printA4Html, generateStatementA4Html } from "@/lib/printUtils";',
  'import { printA4Html, generateStatementA4Html, generateTrialBalanceA4Html } from "@/lib/printUtils";'
);

// 2. Add handlePrintTrial function
code = code.replace(
  '  const handlePrintStatement = () => {',
  `  const handlePrintTrial = () => {
    const html = generateTrialBalanceA4Html({
      accounts: [
        { name: "وكالة الحجر الاسود للسفريات", code: "1231000100", opening_debit: 0, opening_credit: 0, period_debit: 1200000, period_credit: 0 },
        { name: "وكالة القبائلي للسفريات والسياحة", code: "1231000101", opening_debit: 0, opening_credit: 0, period_debit: 252000, period_credit: 175000 },
        { name: "وكالة الطيور المهاجرة للسفريات", code: "1231000200", opening_debit: 0, opening_credit: 0, period_debit: 203000, period_credit: 98000 },
        { name: "زبون داخلي عمرة", code: "1232000100", opening_debit: 0, opening_credit: 0, period_debit: 294000, period_credit: 0 },
        { name: "وكالة اليمني الفرع الثاني", code: "1232000101", opening_debit: 0, opening_credit: 0, period_debit: 77000, period_credit: 77000 },
        { name: "صندوق رئيسي", code: "130100001", opening_debit: 0, opening_credit: 0, period_debit: 175000, period_credit: 240450 },
        { name: "الموظف ابراهيم محمد الشاوش", code: "13210003", opening_debit: 0, opening_credit: 0, period_debit: 240450, period_credit: 0 },
        { name: "ايراد مبيعات البضائع", code: "41101001", opening_debit: 0, opening_credit: 0, period_debit: 175000, period_credit: 2026000 }
      ],
      startDate: reportOpts.fromDate,
      endDate: reportOpts.toDate,
    });
    setReportHtml(html);
    setReportTitle("ميزان المراجعة");
    setReportModalOpen(true);
  };
  const handlePrintStatement = () => {`
);

// 3. Update buttons in Trial Balance
const oldPrintButton = '<Button size="sm" onClick={() => { toast({ title: "جاري الطباعة..." }); setTimeout(() => window.print(), 500); }} className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 px-5 gap-1 font-bold shadow"><Printer className="w-3.5 h-3.5" /> طباعة</Button>';
const newPrintButton = '<Button size="sm" onClick={() => handlePrintTrial()} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-6 gap-1 font-bold shadow"><Printer className="w-3.5 h-3.5" /> طباعة / عرض ملء الشاشة</Button>';

code = code.replace(oldPrintButton, newPrintButton);

fs.writeFileSync('artifacts/pos-system/src/pages/accounting.tsx', code);
console.log('Patched Trial Balance print');
