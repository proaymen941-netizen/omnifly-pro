const fs = require('fs');
const file = 'artifacts/pos-system/src/lib/printUtils.ts';
let code = fs.readFileSync(file, 'utf-8');

const oldTableHeaders = `
      <thead>
        <tr>
          <th class="col-name text-right">اسم المعتمر</th>
          <th class="col-center">رقم الجواز</th>
          <th class="col-center">النوع</th>
          <th class="col-center">مده السفر<br/>(فترة البرنامج)</th>
          <th class="col-center">تاريخ الدخول<br/>(السفر)</th>
          <th class="col-center">الأيام المتبقية<br/>على الخروج</th>
          <th class="col-center">تاريخ الخروج<br/>المتوقع</th>
        </tr>
      </thead>`;

const newTableHeaders = `
      <thead>
        <tr>
          <th class="col-name text-right">اسم المعتمر</th>
          <th class="col-center">رقم الجواز</th>
          <th class="col-center">النوع</th>
          <th class="col-center">الحالة</th>
          <th class="col-center">الملاحظات</th>
          <th class="col-center">مده السفر<br/>(فترة البرنامج)</th>
          <th class="col-center">تاريخ الدخول<br/>(السفر)</th>
          <th class="col-center">الأيام المتبقية<br/>على الخروج</th>
          <th class="col-center">تاريخ الخروج<br/>المتوقع</th>
        </tr>
      </thead>`;

code = code.replace(oldTableHeaders, newTableHeaders);

const oldRowBodyStr = `
    return \`
      <tr>
        <td class="col-name">\${pName}</td>
        <td class="col-center font-mono">\${pPassport}</td>
        <td class="col-center">\${pType}</td>
        <td class="col-center font-bold">\${pDuration}</td>
        <td class="col-center font-mono">\${pEntryDate || "---"}</td>
        <td class="col-center font-bold \${isDanger ? 'bg-danger text-white' : isWarning ? 'bg-warning text-black' : ''}">
          \${pRemaining}
        </td>
        <td class="col-center font-mono">\${pExitDate || "---"}</td>
      </tr>
    \`;`;

const newRowBodyStr = `
    const pStatus = p.travel_status || "---";
    const pNotes = p.notes || "---";
    return \`
      <tr>
        <td class="col-name">\${pName}</td>
        <td class="col-center font-mono">\${pPassport}</td>
        <td class="col-center">\${pType}</td>
        <td class="col-center">\${pStatus}</td>
        <td class="col-center" style="max-width: 100px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="\${pNotes}">\${pNotes}</td>
        <td class="col-center font-bold">\${pDuration}</td>
        <td class="col-center font-mono">\${pEntryDate || "---"}</td>
        <td class="col-center font-bold \${isDanger ? 'bg-danger text-white' : isWarning ? 'bg-warning text-black' : ''}">
          \${pRemaining}
        </td>
        <td class="col-center font-mono">\${pExitDate || "---"}</td>
      </tr>
    \`;`;

code = code.replace(oldRowBodyStr, newRowBodyStr);

fs.writeFileSync(file, code);
