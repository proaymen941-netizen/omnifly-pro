const fs = require('fs');
let code = fs.readFileSync('artifacts/pos-system/src/lib/printUtils.ts', 'utf8');

const newGenerateTrial = `
export function generateTrialBalanceA4Html({ accounts, startDate, endDate }: any) {
  const fromDate = startDate ? new Date(startDate).toLocaleDateString('en-GB') : "01/01/2026";
  const toDate = endDate ? new Date(endDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');

  let totalOpenDebit = 0; let totalOpenCredit = 0;
  let totalPeriodDebit = 0; let totalPeriodCredit = 0;
  let totalEndDebit = 0; let totalEndCredit = 0;

  const rowsHtml = accounts.map((acc:any) => {
    const obd = Number(acc.opening_debit || 0);
    const obc = Number(acc.opening_credit || 0);
    const pd = Number(acc.period_debit || (acc.balance > 0 ? acc.balance : 0));
    const pc = Number(acc.period_credit || (acc.balance < 0 ? Math.abs(acc.balance) : 0));
    const ed = obd + pd;
    const ec = obc + pc;
    
    totalOpenDebit += obd; totalOpenCredit += obc;
    totalPeriodDebit += pd; totalPeriodCredit += pc;
    totalEndDebit += ed; totalEndCredit += ec;

    return \`
      <tr>
        <td style="border: 1px solid #000; padding: 5px;" dir="ltr">\${Number(ec).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
        <td style="border: 1px solid #000; padding: 5px;" dir="ltr">\${Number(ed).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
        <td style="border: 1px solid #000; padding: 5px;" dir="ltr">\${Number(pc).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
        <td style="border: 1px solid #000; padding: 5px;" dir="ltr">\${Number(pd).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
        <td style="border: 1px solid #000; padding: 5px;" dir="ltr">\${Number(obc).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
        <td style="border: 1px solid #000; padding: 5px;" dir="ltr">\${Number(obd).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right;">\${acc.name}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right;">\${acc.code || acc.id || '-'}</td>
      </tr>
    \`;
  }).join('');

  return \`
  <div style="font-family: 'Tajawal', sans-serif; max-width: 100%; margin: 0 auto;">
    <h2 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 20px;">ميزان المراجعة</h2>
    
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; font-size: 14px; font-weight: bold;">
      <div>ص 1</div>
      <div>من تاريخ \${fromDate} &nbsp;&nbsp;&nbsp; الى تاريخ \${toDate}</div>
      <div></div>
    </div>

    <table style="width: 100%; border: 2px solid #000; border-collapse: collapse; text-align: center; font-size: 13px;">
      <thead>
        <tr style="background-color: #fed7aa;">
          <th style="border: 1px solid #000; padding: 5px;" colspan="2">الرصيد</th>
          <th style="border: 1px solid #000; padding: 5px;" colspan="2">الرصيد خلال الفترة</th>
          <th style="border: 1px solid #000; padding: 5px;" colspan="2">الرصيد الافتتاحي</th>
          <th style="border: 1px solid #000; padding: 5px;" rowspan="2">اسم الحساب</th>
          <th style="border: 1px solid #000; padding: 5px;" rowspan="2">رقم الحساب</th>
        </tr>
        <tr style="background-color: #fed7aa;">
          <th style="border: 1px solid #000; padding: 5px;">دائن</th>
          <th style="border: 1px solid #000; padding: 5px;">مدين</th>
          <th style="border: 1px solid #000; padding: 5px;">دائن</th>
          <th style="border: 1px solid #000; padding: 5px;">مدين</th>
          <th style="border: 1px solid #000; padding: 5px;">دائن</th>
          <th style="border: 1px solid #000; padding: 5px;">مدين</th>
        </tr>
      </thead>
      <tbody>
        \${rowsHtml}
        <tr style="background-color: #fed7aa; font-weight: bold;">
          <td style="border: 1px solid #000; padding: 5px;" dir="ltr">\${Number(totalEndCredit).toLocaleString()}</td>
          <td style="border: 1px solid #000; padding: 5px;" dir="ltr">\${Number(totalEndDebit).toLocaleString()}</td>
          <td style="border: 1px solid #000; padding: 5px;" dir="ltr">\${Number(totalPeriodCredit).toLocaleString()}</td>
          <td style="border: 1px solid #000; padding: 5px;" dir="ltr">\${Number(totalPeriodDebit).toLocaleString()}</td>
          <td style="border: 1px solid #000; padding: 5px;" dir="ltr">\${Number(totalOpenCredit).toLocaleString()}</td>
          <td style="border: 1px solid #000; padding: 5px;" dir="ltr">\${Number(totalOpenDebit).toLocaleString()}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: center;" colspan="2">إجماليات</td>
        </tr>
      </tbody>
    </table>
    
    <div style="font-size: 14px; margin-top: 5px; text-align: right;">0</div>

    <div style="margin-top: 50px; position: relative;">
      <div style="position: absolute; left: 10px; top: 0px; font-weight: bold; text-align: center;">
        المختص<br/>
        التوقيع
      </div>
    </div>
  </div>
  \`;
}
`;

code += newGenerateTrial;
fs.writeFileSync('artifacts/pos-system/src/lib/printUtils.ts', code);
console.log('Appended generateTrialBalanceA4Html');
