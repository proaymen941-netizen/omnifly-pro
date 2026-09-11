const fs = require('fs');
let code = fs.readFileSync('artifacts/pos-system/src/pages/accounting.tsx', 'utf8');

if (!code.includes('ReportViewerModal')) {
  // Add import
  code = code.replace(
    'import JournalVoucherModal from "@/components/accounting/JournalVoucherModal";',
    'import JournalVoucherModal from "@/components/accounting/JournalVoucherModal";\nimport { ReportViewerModal } from "@/components/ReportViewerModal";'
  );

  // Add states
  code = code.replace(
    'const [docForm, setDocForm] = useState({',
    'const [reportModalOpen, setReportModalOpen] = useState(false);\n  const [reportHtml, setReportHtml] = useState("");\n  const [reportTitle, setReportTitle] = useState("");\n  const [statementCurrency, setStatementCurrency] = useState("all");\n\n  const [docForm, setDocForm] = useState({'
  );

  // Add Modal at the end inside AdminLayout
  code = code.replace(
    '</AdminLayout>',
    `
      <ReportViewerModal 
        isOpen={reportModalOpen} 
        onClose={() => setReportModalOpen(false)} 
        htmlContent={reportHtml} 
        title={reportTitle} 
      />
    </AdminLayout>`
  );
  
  // Also we need to modify print functions to show the modal instead of calling printA4Html right away
  // Look for: printA4Html(html, `كشف حساب معتمد - ${statementData.party.name}`);
  code = code.replace(
    /printA4Html\(html, `كشف حساب معتمد - \$\{statementData\.party\.name\}`\);/g,
    `setReportHtml(html);\n    setReportTitle(\`كشف حساب معتمد - \${statementData.party.name}\`);\n    setReportModalOpen(true);`
  );

  // Trial Balance print
  // Look for: printA4Html(html, `ميزان المراجعة`);
  code = code.replace(
    /printA4Html\(html, `ميزان المراجعة(.*?)`\);/g,
    `setReportHtml(html);\n    setReportTitle(\`ميزان المراجعة$1\`);\n    setReportModalOpen(true);`
  );

  // Financial print
  // Look for: printA4Html(html, `القوائم المالية الختامية`);
  code = code.replace(
    /printA4Html\(html, `(تقرير .*?)`\);/g,
    `setReportHtml(html);\n    setReportTitle(\`$1\`);\n    setReportModalOpen(true);`
  );
  
  fs.writeFileSync('artifacts/pos-system/src/pages/accounting.tsx', code);
  console.log('Patched accounting.tsx for modal');
}
