const fs = require('fs');

let code = fs.readFileSync('artifacts/pos-system/src/lib/printUtils.ts', 'utf8');

const newGenerateFinancial = `
export function generateFinancialA4Html({ type, startDate, endDate }: any) {
  const isPL = type === 'pl';
  const title = isPL ? "قائمة الأرباح والخسائر" : "الميزانية العمومية";
  
  const fromDate = startDate ? new Date(startDate).toLocaleDateString('en-GB') : "01/01/2026";
  const toDate = endDate ? new Date(endDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');

  let rowsHtml = '';
  if (isPL) {
    rowsHtml = \`
      <tr style="background-color: #f1f5f9; font-weight: bold;"><td colspan="2" style="border: 1px solid #000; padding: 5px; text-align: right;">الإيرادات</td></tr>
      <tr><td style="border: 1px solid #000; padding: 5px; text-align: right;">إيرادات مبيعات البضائع</td><td style="border: 1px solid #000; padding: 5px;" dir="ltr">2,026,000.00</td></tr>
      <tr><td style="border: 1px solid #000; padding: 5px; text-align: right;">إيرادات الخدمات والحجوزات</td><td style="border: 1px solid #000; padding: 5px;" dir="ltr">850,500.00</td></tr>
      <tr style="font-weight: bold;"><td style="border: 1px solid #000; padding: 5px; text-align: left;">إجمالي الإيرادات</td><td style="border: 1px solid #000; padding: 5px;" dir="ltr">2,876,500.00</td></tr>
      
      <tr style="background-color: #f1f5f9; font-weight: bold;"><td colspan="2" style="border: 1px solid #000; padding: 5px; text-align: right;">المصروفات</td></tr>
      <tr><td style="border: 1px solid #000; padding: 5px; text-align: right;">تكلفة البضاعة المباعة</td><td style="border: 1px solid #000; padding: 5px;" dir="ltr">1,200,000.00</td></tr>
      <tr><td style="border: 1px solid #000; padding: 5px; text-align: right;">مصروفات عمومية وإدارية</td><td style="border: 1px solid #000; padding: 5px;" dir="ltr">450,000.00</td></tr>
      <tr><td style="border: 1px solid #000; padding: 5px; text-align: right;">مصروفات رواتب وأجور</td><td style="border: 1px solid #000; padding: 5px;" dir="ltr">280,000.00</td></tr>
      <tr style="font-weight: bold;"><td style="border: 1px solid #000; padding: 5px; text-align: left;">إجمالي المصروفات</td><td style="border: 1px solid #000; padding: 5px;" dir="ltr">1,930,000.00</td></tr>
      
      <tr style="background-color: #cffafe; font-weight: bold; font-size: 16px;"><td style="border: 1px solid #000; padding: 5px; text-align: left;">صافي الربح / (الخسارة)</td><td style="border: 1px solid #000; padding: 5px; color: #16a34a;" dir="ltr">946,500.00</td></tr>
    \`;
  } else {
    rowsHtml = \`
      <tr style="background-color: #f1f5f9; font-weight: bold;"><td colspan="2" style="border: 1px solid #000; padding: 5px; text-align: right;">الأصول</td></tr>
      <tr><td style="border: 1px solid #000; padding: 5px; text-align: right;">الأصول المتداولة (النقدية والبنوك)</td><td style="border: 1px solid #000; padding: 5px;" dir="ltr">3,450,000.00</td></tr>
      <tr><td style="border: 1px solid #000; padding: 5px; text-align: right;">الذمم المدينة (العملاء)</td><td style="border: 1px solid #000; padding: 5px;" dir="ltr">1,250,000.00</td></tr>
      <tr><td style="border: 1px solid #000; padding: 5px; text-align: right;">الأصول الثابتة (صافي)</td><td style="border: 1px solid #000; padding: 5px;" dir="ltr">2,800,000.00</td></tr>
      <tr style="font-weight: bold;"><td style="border: 1px solid #000; padding: 5px; text-align: left;">إجمالي الأصول</td><td style="border: 1px solid #000; padding: 5px;" dir="ltr">7,500,000.00</td></tr>
      
      <tr style="background-color: #f1f5f9; font-weight: bold;"><td colspan="2" style="border: 1px solid #000; padding: 5px; text-align: right;">الخصوم وحقوق الملكية</td></tr>
      <tr><td style="border: 1px solid #000; padding: 5px; text-align: right;">الذمم الدائنة (الموردين)</td><td style="border: 1px solid #000; padding: 5px;" dir="ltr">2,100,000.00</td></tr>
      <tr><td style="border: 1px solid #000; padding: 5px; text-align: right;">أرصدة دائنة أخرى</td><td style="border: 1px solid #000; padding: 5px;" dir="ltr">453,500.00</td></tr>
      <tr><td style="border: 1px solid #000; padding: 5px; text-align: right;">رأس المال</td><td style="border: 1px solid #000; padding: 5px;" dir="ltr">4,000,000.00</td></tr>
      <tr><td style="border: 1px solid #000; padding: 5px; text-align: right;">أرباح مرحلة (صافي ربح الفترة)</td><td style="border: 1px solid #000; padding: 5px;" dir="ltr">946,500.00</td></tr>
      <tr style="font-weight: bold;"><td style="border: 1px solid #000; padding: 5px; text-align: left;">إجمالي الخصوم وحقوق الملكية</td><td style="border: 1px solid #000; padding: 5px;" dir="ltr">7,500,000.00</td></tr>
    \`;
  }

  return \`
  <div style="font-family: 'Tajawal', sans-serif; max-width: 100%; margin: 0 auto;">
    <h2 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 20px;">\${title}</h2>
    
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; font-size: 14px; font-weight: bold;">
      <div>ص 1</div>
      <div>من تاريخ \${fromDate} &nbsp;&nbsp;&nbsp; الى تاريخ \${toDate}</div>
      <div></div>
    </div>

    <table style="width: 100%; border: 2px solid #000; border-collapse: collapse; text-align: center; font-size: 14px;">
      <thead>
        <tr style="background-color: \${isPL ? '#dcfce7' : '#e0e7ff'};">
          <th style="border: 1px solid #000; padding: 10px; width: 70%;">البيان</th>
          <th style="border: 1px solid #000; padding: 10px; width: 30%;">القيمة (ريال)</th>
        </tr>
      </thead>
      <tbody>
        \${rowsHtml}
      </tbody>
    </table>

    <div style="margin-top: 50px; position: relative;">
      <div style="position: absolute; left: 10px; top: 0px; font-weight: bold; text-align: center;">
        المحاسب<br/>
        التوقيع
      </div>
      <div style="position: absolute; right: 10px; top: 0px; font-weight: bold; text-align: center;">
        المدير المالي<br/>
        التوقيع
      </div>
    </div>
  </div>
  \`;
}
`;

code += newGenerateFinancial;
fs.writeFileSync('artifacts/pos-system/src/lib/printUtils.ts', code);
console.log('Added generateFinancialA4Html');
