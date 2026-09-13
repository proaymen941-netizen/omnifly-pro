const fs = require('fs');
let code = fs.readFileSync('artifacts/pos-system/src/pages/accounting.tsx', 'utf8');

const strToFind = `<Button size="sm" onClick={() => handlePrintFinancial(\\'pl\\')} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-6 gap-1 font-bold shadow"><Printer className="w-3.5 h-3.5" /> طباعة ميزانية / أرباح</Button>`;
const strToReplace = `<Button size="sm" onClick={() => handlePrintFinancial('pl')} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-6 gap-1 font-bold shadow"><Printer className="w-3.5 h-3.5" /> طباعة ميزانية / أرباح</Button>`;

code = code.replace(strToFind, strToReplace);
fs.writeFileSync('artifacts/pos-system/src/pages/accounting.tsx', code);
