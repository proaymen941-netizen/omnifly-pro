const fs = require('fs');

let code = fs.readFileSync('artifacts/pos-system/src/lib/printUtils.ts', 'utf8');

const generateStatementStart = 'export function generateStatementA4Html';
const generateStatementEnd = 'export function generateTrialBalanceA4Html';

const regex = new RegExp(`(${generateStatementStart})[\\s\\S]*?(?=${generateStatementEnd})`);

const newGenerateStatement = `export function generateStatementA4Html({
  partyType, party, startDate, endDate, previousBalance, currentBalance, transactions, settings, docTitle
}: any) {
  const accountName = party ? party.name : "غير محدد";
  const accountNumber = party ? (party.code || party.id || "---") : "---";
  
  // Calculate Totals
  const totalDebit = transactions.filter((t:any) => t.type === 'debit').reduce((sum:number, t:any) => sum + Number(t.amount), 0);
  const totalCredit = transactions.filter((t:any) => t.type === 'credit').reduce((sum:number, t:any) => sum + Number(t.amount), 0);
  
  const fromDate = startDate ? new Date(startDate).toLocaleDateString('en-GB') : "01/01/2026";
  const toDate = endDate ? new Date(endDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');

  let html = \`
  <div style="font-family: 'Tajawal', sans-serif; max-width: 100%; margin: 0 auto;">
    
    <h2 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 20px;">كشف حساب</h2>
    
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 10px; font-size: 14px; font-weight: bold;">
      <div>Page 1 - 1</div>
      <div>من تاريخ \${fromDate} &nbsp;&nbsp;&nbsp; الى تاريخ \${toDate}</div>
      <div></div>
    </div>

    <table style="width: 100%; border: 1px solid #000; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; font-weight: bold;">
      <tr>
        <td style="padding: 5px 10px; text-align: center; border: 1px solid #000;" colspan="2">\${accountName}</td>
        <td style="padding: 5px 10px; text-align: center; border: 1px solid #000;">\${accountNumber}</td>
        <td style="padding: 5px 10px; text-align: right; width: 100px; border: 1px solid #000;">رقم الحساب</td>
      </tr>
      <tr>
        <td style="padding: 5px 10px; text-align: center; border: 1px solid #000;" colspan="3">ريال سعودي</td>
        <td style="padding: 5px 10px; text-align: right; border: 1px solid #000;">العملة</td>
      </tr>
    </table>

    <table style="width: 100%; border: 1px solid #000; border-collapse: collapse; text-align: center; font-size: 14px;">
      <thead>
        <tr style="background-color: #cffafe;">
          <th style="border: 1px solid #000; padding: 5px;" rowspan="2">الرصيد</th>
          <th style="border: 1px solid #000; padding: 5px;" colspan="2">المبلغ</th>
          <th style="border: 1px solid #000; padding: 5px;" rowspan="2">رقم المرجع</th>
          <th style="border: 1px solid #000; padding: 5px;" rowspan="2">البيان</th>
          <th style="border: 1px solid #000; padding: 5px;" rowspan="2">رقم المستند</th>
          <th style="border: 1px solid #000; padding: 5px;" rowspan="2">نوع المستند</th>
          <th style="border: 1px solid #000; padding: 5px;" rowspan="2">التاريخ</th>
        </tr>
        <tr style="background-color: #cffafe;">
          <th style="border: 1px solid #000; padding: 5px;">دائن</th>
          <th style="border: 1px solid #000; padding: 5px;">مدين</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border: 1px solid #000; padding: 5px;" dir="ltr">\${Number(previousBalance || 0).toLocaleString()} م</td>
          <td style="border: 1px solid #000; padding: 5px;">0</td>
          <td style="border: 1px solid #000; padding: 5px;" dir="ltr">\${Number(previousBalance || 0).toLocaleString()}</td>
          <td style="border: 1px solid #000; padding: 5px;">-</td>
          <td style="border: 1px solid #000; padding: 5px;">الرصيد الافتتاحي</td>
          <td style="border: 1px solid #000; padding: 5px;">-</td>
          <td style="border: 1px solid #000; padding: 5px;">قيد افتتاحي</td>
          <td style="border: 1px solid #000; padding: 5px;">\${fromDate}</td>
        </tr>
        \${transactions.map((tx:any) => \`
          <tr>
            <td style="border: 1px solid #000; padding: 5px;" dir="ltr">
              \${Number(tx.runningBalance || 0) !== 0 ? Number(Math.abs(tx.runningBalance)).toLocaleString() : "0"}
              \${tx.runningBalance > 0 ? " م" : tx.runningBalance < 0 ? " د" : ""}
            </td>
            <td style="border: 1px solid #000; padding: 5px;" dir="ltr">\${tx.type === 'credit' ? Number(tx.amount).toLocaleString() : "0"}</td>
            <td style="border: 1px solid #000; padding: 5px;" dir="ltr">\${tx.type === 'debit' ? Number(tx.amount).toLocaleString() : "0"}</td>
            <td style="border: 1px solid #000; padding: 5px;">\${tx.reference_id || "-"}</td>
            <td style="border: 1px solid #000; padding: 5px;">\${tx.statement || "-"}</td>
            <td style="border: 1px solid #000; padding: 5px;">\${tx.id || "-"}</td>
            <td style="border: 1px solid #000; padding: 5px;">\${tx.type === 'debit' ? 'سند قيد يومية' : 'سند قيد يومية'}</td>
            <td style="border: 1px solid #000; padding: 5px;">\${new Date(tx.date).toLocaleDateString('en-GB')}</td>
          </tr>
        \`).join('')}
        <tr>
          <td style="border: 1px solid #000; padding: 5px;">0</td>
          <td style="border: 1px solid #000; padding: 5px;" dir="ltr">\${(previousBalance||0) + totalDebit}</td>
          <td style="border: 1px solid #000; padding: 5px;" dir="ltr">\${(previousBalance||0) + totalDebit}</td>
          <td style="border: 1px solid #000; padding: 5px; font-weight: bold;" colspan="4">الرصيد صفر</td>
          <td style="border: 1px solid #000; padding: 5px;"></td>
        </tr>
        <tr>
          <td style="border: 1px solid #000; padding: 5px;">-</td>
          <td style="border: 1px solid #000; padding: 5px; font-weight: bold;" dir="ltr">\${Number(totalCredit).toLocaleString()}</td>
          <td style="border: 1px solid #000; padding: 5px; font-weight: bold;" dir="ltr">\${Number(totalDebit + (previousBalance||0)).toLocaleString()}</td>
          <td style="border: 1px solid #000; padding: 5px; font-weight: bold;" colspan="4">إجمالي العمليات</td>
          <td style="border: 1px solid #000; padding: 5px; font-weight: bold;">العدد \${transactions.length + 1}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #000; padding: 5px;">0</td>
          <td style="border: 1px solid #000; padding: 5px;" colspan="5">صفر ريال سعودي</td>
          <td style="border: 1px solid #000; padding: 5px; font-weight: bold; background-color: #cffafe;" colspan="2">إجمالي الرصيد</td>
        </tr>
      </tbody>
    </table>

    <div style="border: 1px solid #000; min-height: 80px; margin-top: 20px; padding: 10px; position: relative;">
      <div style="position: absolute; right: 10px; top: 10px; font-weight: bold; text-align: center;">
        المختص<br/>
        التوقيع
      </div>
    </div>
  </div>
  \`;

  return html;
}

`;

code = code.replace(regex, newGenerateStatement);
fs.writeFileSync('artifacts/pos-system/src/lib/printUtils.ts', code);
console.log('Replaced generateStatementA4Html');
