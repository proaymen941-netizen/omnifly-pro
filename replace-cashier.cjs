const fs = require('fs');
let content = fs.readFileSync('/app/applet/artifacts/pos-system/src/pages/cashier-statement.tsx', 'utf8');

if (!content.includes('import { PrintHeader } from "@/components/print-header";')) {
  content = content.replace(
    'import { Printer, Search, FileText } from "lucide-react";',
    'import { Printer, Search, FileText } from "lucide-react";\nimport { PrintHeader } from "@/components/print-header";'
  );
}

const target = `        {/* Printable Report Title */}
        <div className="hidden print:block text-center mb-6">
          <h2 className="text-2xl font-bold border-b-2 inline-block pb-2">تقرير حركة الصناديق والمبيعات اليومي</h2>
          <p className="mt-2 text-sm">من: {startDate} إلى: {endDate}</p>
        </div>`;

const replacement = `        {/* Printable Report Title */}
        <div className="hidden print:block mb-6">
          <PrintHeader 
            documentTitle="تقرير حركة الصناديق والمبيعات اليومي" 
            dateStr={\`من: \${startDate} إلى: \${endDate}\`}
          />
        </div>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('/app/applet/artifacts/pos-system/src/pages/cashier-statement.tsx', content, 'utf8');
  console.log('Cashier updated!');
} else {
  console.log('Not found');
}
