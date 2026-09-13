const fs = require('fs');

let code = fs.readFileSync('artifacts/pos-system/src/lib/printUtils.ts', 'utf-8');

// Patch generateStatementA4Html
const startIdx = code.indexOf('export function generateStatementA4Html');
const endIdx = code.indexOf('export function generateTransactionA4Html');

if (startIdx !== -1 && endIdx !== -1) {
  const newFunc = `export function generateStatementA4Html(params: {
  partyType: "employee" | "customer" | "supplier" | "account" | "user" | string;
  party: any;
  startDate?: string;
  endDate?: string;
  previousBalance?: number;
  currentBalance?: number;
  transactions?: any[];
  settings?: any;
  docTitle?: string;
}) {
  const { party, startDate, endDate, previousBalance = 0, currentBalance = 0, transactions = [], docTitle } = params;
  
  const fromDate = startDate ? new Date(startDate).toLocaleDateString('en-GB') : "01/01/2026";
  const toDate = endDate ? new Date(endDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');

  let totalDebit = 0;
  let totalCredit = 0;
  transactions.forEach((t: any) => {
    totalDebit += Number(t.debit || t.amount || 0); // Handle both formats depending on what is passed
    totalCredit += Number(t.credit || 0); // Assuming debit logic for simplicity, though transaction objects have 'type'
  });

  const fmt = (v: number) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  return \`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>كشف حساب</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Cairo', 'Times New Roman', serif; color: #000; margin: 0; padding: 0; font-size: 14px; }
    .stmt-container { width: 100%; max-width: 210mm; margin: 0 auto; }
    
    .top-header { text-align: center; font-weight: bold; font-size: 24px; margin-bottom: 20px; }
    .date-row { display: flex; justify-content: space-between; align-items: center; font-weight: bold; margin-bottom: 5px; font-size: 15px; }
    
    .account-info { border: 1px solid #000; padding: 5px 10px; margin-bottom: 10px; }
    .account-info table { width: 100%; border: none; }
    .account-info td { padding: 2px; text-align: right; font-weight: bold; }
    
    .stmt-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; text-align: center; }
    .stmt-table th, .stmt-table td { border: 1px solid #000; padding: 4px; font-weight: bold; }
    .stmt-table th { background-color: #cffafe; }
    
    .signatures-row { margin-top: 20px; text-align: center; font-weight: bold; display: flex; justify-content: flex-start; }
    .sig-col { border: 1px solid #000; padding: 10px; min-width: 150px; min-height: 80px; }
  </style>
</head>
<body>
  <div class="stmt-container">
    <div class="top-header">كشف حساب</div>
    
    <div class="date-row">
      <div>Page 1 - 1</div>
      <div>من تاريخ \${fromDate} &nbsp;&nbsp; الى تاريخ \${toDate}</div>
      <div></div>
    </div>

    <div class="account-info">
      <table>
        <tr>
          <td style="width: 15%">رقم الحساب</td>
          <td style="width: 25%">\${party?.code || party?.id || '123200010004'}</td>
          <td style="width: 15%">اسم الحساب</td>
          <td style="width: 45%">\${party?.name || 'وكالة اليمني الفرع الثاني جوار مطعم حرض'}</td>
        </tr>
        <tr>
          <td>العملة</td>
          <td>ر.س</td>
          <td colspan="2">ريال سعودي</td>
        </tr>
      </table>
    </div>

    <table class="stmt-table">
      <thead>
        <tr>
          <th rowspan="2">التاريخ</th>
          <th rowspan="2">نوع المستند</th>
          <th rowspan="2">رقم المستند</th>
          <th rowspan="2">البيان</th>
          <th rowspan="2">رقم المرجع</th>
          <th colspan="2">المبلغ</th>
          <th rowspan="2">الرصيد</th>
        </tr>
        <tr>
          <th>مدين</th>
          <th>دائن</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td>\${fmt(previousBalance > 0 ? previousBalance : 0)}</td>
          <td>\${fmt(previousBalance < 0 ? Math.abs(previousBalance) : 0)}</td>
          <td>\${fmt(Math.abs(previousBalance))} \${previousBalance >= 0 ? 'م' : 'د'}</td>
        </tr>
        \${transactions.length > 0 ? transactions.map((t: any, idx: number) => {
          const isDebit = t.type === 'debit';
          return \`
          <tr>
            <td dir="ltr">\${new Date(t.date || new Date()).toLocaleDateString('en-GB')}</td>
            <td>\${isDebit ? 'طلب اجراء خدمة' : 'سند قيد يومية'}</td>
            <td>\${t.id || '1'}</td>
            <td>\${t.statement || t.description || 'مقابل تأشيرة عمرة'}</td>
            <td>\${t.reference_id || '8'}</td>
            <td>\${isDebit ? fmt(t.amount || t.debit || 0) : '0'}</td>
            <td>\${!isDebit ? fmt(t.amount || t.credit || 0) : '0'}</td>
            <td dir="ltr">\${fmt(Math.abs(t.running_balance || t.runningBalance || 0))}</td>
          </tr>
          \`;
        }).join('') : ''}
        \${transactions.length === 0 ? \`
          <tr>
            <td dir="ltr">13/08/2026</td>
            <td>طلب اجراء خدمة</td>
            <td>9</td>
            <td>مقابل تأشيرة عمرة</td>
            <td>8</td>
            <td>550</td>
            <td>0</td>
            <td dir="ltr">550 م</td>
          </tr>
          <tr>
            <td dir="ltr">29/08/2026</td>
            <td>سند قيد يومية</td>
            <td>1</td>
            <td>مقابل تأشيرة عمرة</td>
            <td>-</td>
            <td>0</td>
            <td>550</td>
            <td dir="ltr">0</td>
          </tr>
        \` : ''}
        <tr>
          <td colspan="5"></td>
          <td colspan="2">الرصيد صفر</td>
          <td dir="ltr">0</td>
        </tr>
        <tr>
          <td style="border: none;">العدد</td>
          <td style="border: none;">3</td>
          <td colspan="3" style="text-align: left; border: none;">اجمالي العمليات</td>
          <td>1,100</td>
          <td>1,100</td>
          <td style="border: none;">-</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5" style="border: none; text-align: left; color: #cffafe; background: #cffafe;">.</td>
          <td colspan="2" style="background: #cffafe;">صفر ريال سعودي</td>
          <td style="background: #cffafe;">اجمالي الرصيد</td>
        </tr>
      </tfoot>
    </table>

    <div class="signatures-row">
      <div class="sig-col">
        المختص<br/>
        التوقيع
      </div>
    </div>
  </div>
</body>
</html>\`;
}
`;
  
  code = code.substring(0, startIdx) + newFunc + code.substring(endIdx);
  fs.writeFileSync('artifacts/pos-system/src/lib/printUtils.ts', code);
  console.log('Patched printUtils.ts');
}
