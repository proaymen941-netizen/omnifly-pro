export function printGenericDocument(title: string, data: any, settings: any) {
  const s = settings || {};
  const accentColor = s.accentColor || "#1e293b";
  const bizName = s.companyName || "OmniSystem Pro";
  const subtitle = s.companySubtitle || "";
  const logo = (s.printLogo !== "false" && s.logoUrl) ? `<img src="${s.logoUrl}" style="max-height:80px;object-fit:contain;" alt="Logo" />` : "";
  
  let contentHtml = "";

  if (data) {
    if (data.supplier && data.invoices) {
      // Specialized layout for Supplier Statement
      contentHtml += `
        <div style="margin-bottom:20px; padding:15px; border:1px solid #e2e8f0; border-radius:8px; background:#f8fafc;">
          <table style="width:100%; font-size:12px;">
            <tr>
              <td><strong>اسم المورد:</strong> ${data.supplier.name}</td>
              <td><strong>كود المورد:</strong> ${data.supplier.code || '---'}</td>
              <td><strong>الهاتف:</strong> ${data.supplier.phone || '---'}</td>
              <td><strong>الرصيد الحالي:</strong> <span style="color:${data.supplier.balance > 0 ? '#16a34a' : data.supplier.balance < 0 ? '#dc2626' : '#000'}; font-weight:bold; font-size:14px;" dir="ltr">${Number(data.supplier.balance).toFixed(2)} ر.س</span></td>
            </tr>
          </table>
        </div>
        <h3 style="color:${accentColor}; border-bottom:2px solid ${accentColor}; padding-bottom:5px; margin-bottom:15px;">حركة الفواتير</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>تاريخ الفاتورة</th>
              <th>رقم الفاتورة</th>
              <th>المبلغ</th>
              <th>الملاحظات</th>
            </tr>
          </thead>
          <tbody>
            ${data.invoices.length > 0 ? data.invoices.map((inv: any) => `
              <tr>
                <td>${new Date(inv.invoice_date || inv.created_at).toLocaleDateString('ar-SA')}</td>
                <td>${inv.invoice_number || inv.id}</td>
                <td style="font-weight:bold" dir="ltr">${Number(inv.total).toFixed(2)}</td>
                <td>${inv.notes || '---'}</td>
              </tr>
            `).join('') : `<tr><td colspan="4" style="text-align:center;">لا توجد فواتير</td></tr>`}
          </tbody>
        </table>
      `;
    } else {
      // Generic Layout for anything else (like Purchase Orders, Receipts, etc)
      contentHtml += `<div style="margin-bottom:20px; padding:15px; border:1px solid #e2e8f0; border-radius:8px; background:#f8fafc;">`;
      
      const tableRows: string[] = [];
      const arraysToRender: {title: string, items: any[]}[] = [];

      Object.entries(data).forEach(([key, value]) => {
        // Exclude system keys
        if (key === 'id' || key === 'created_at' || key === 'updated_at') return;

        if (Array.isArray(value)) {
          arraysToRender.push({ title: key, items: value });
        } else if (typeof value === 'object' && value !== null) {
          tableRows.push(`<tr><td style="font-weight:bold; width:150px;">${key}</td><td><pre style="margin:0;font-family:inherit;">${JSON.stringify(value)}</pre></td></tr>`);
        } else {
          tableRows.push(`<tr><td style="font-weight:bold; width:150px;">${key}</td><td>${value}</td></tr>`);
        }
      });

      if (tableRows.length > 0) {
        contentHtml += `<table style="width:100%; font-size:12px; line-height:2;"><tbody>${tableRows.join('')}</tbody></table>`;
      }
      contentHtml += `</div>`;

      // Render Arrays as Tables
      arraysToRender.forEach(arr => {
        if (arr.items.length === 0) return;
        contentHtml += `<h3 style="color:${accentColor}; border-bottom:2px solid ${accentColor}; padding-bottom:5px; margin-bottom:15px;">${arr.title}</h3>`;
        contentHtml += `<table class="data-table"><thead><tr>`;
        const headers = Object.keys(arr.items[0] || {}).filter(k => k !== 'id' && !k.endsWith('_id'));
        headers.forEach(h => {
          contentHtml += `<th>${h}</th>`;
        });
        contentHtml += `</tr></thead><tbody>`;
        arr.items.forEach((item: any) => {
          contentHtml += `<tr>`;
          headers.forEach(h => {
            const v = item[h];
            contentHtml += `<td>${typeof v === 'object' ? JSON.stringify(v) : v}</td>`;
          });
          contentHtml += `</tr>`;
        });
        contentHtml += `</tbody></table>`;
      });
    }
  }

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
    body { font-family: 'Cairo', sans-serif; color: #000; margin: 0; padding: 30px; font-size: 13px; line-height: 1.6; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid ${accentColor}; padding-bottom: 20px; margin-bottom: 30px; }
    .header-right { text-align: right; flex: 1; }
    .header-center { text-align: center; flex: 1; }
    .header-left { text-align: left; flex: 1; }
    .biz-name { font-weight: 900; font-size: 24px; color: ${accentColor}; margin-bottom: 5px; }
    .biz-sub { font-weight: 700; font-size: 14px; color: #475569; }
    .doc-title { font-size: 18px; font-weight: 900; background: ${accentColor}; color: #fff; padding: 6px 24px; border-radius: 20px; display: inline-block; margin-top: 10px; }
    .data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .data-table th, .data-table td { border: 1px solid #cbd5e1; padding: 10px; text-align: right; }
    .data-table th { background-color: #f8fafc; color: #0f172a; font-weight: 900; }
    .footer { display: flex; justify-content: space-between; border-top: 2px solid ${accentColor}; padding-top: 20px; margin-top: 50px; font-weight: bold; font-size: 12px; color: #475569; }
    .signatures { display: flex; justify-content: space-between; margin-top: 80px; text-align: center; }
    .sig-box { width: 25%; }
    .sig-line { border-top: 1px solid #000; padding-top: 5px; font-weight: bold; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-right">
      <div class="biz-name">${bizName}</div>
      <div class="biz-sub">${subtitle}</div>
    </div>
    <div class="header-center">
      ${logo}
      <br/>
      <div class="doc-title">${title}</div>
    </div>
    <div class="header-left">
      <div style="font-weight:bold;">تاريخ الإصدار:</div>
      <div>${new Date().toLocaleDateString('ar-SA')}</div>
    </div>
  </div>

  <div style="text-align:center; font-weight:bold; font-size:16px; margin-bottom:30px; color:#334155;">
    ${title.includes('مورد') || title.includes('عميل') ? (s.customerHeaderText || '') : (s.reportHeaderText || '')}
  </div>

  ${contentHtml}

  <div class="signatures">
    <div class="sig-box"><div class="sig-line">توقيع المستلم / المعتمد</div></div>
    <div class="sig-box"><div class="sig-line">الختم الرسمي</div></div>
    <div class="sig-box"><div class="sig-line">توقيع الإدارة / المحاسب</div></div>
  </div>

  <div class="footer">
    <div>${s.reportFooterText || 'تمت الطباعة بواسطة OmniSystem Pro'}</div>
    <div>${s.voucherFooterText || ''}</div>
  </div>
</body>
</html>
  `;

  const printWin = window.open("", "_blank");
  if (!printWin) {
    fallbackIframePrint(html);
    return;
  }
  printWin.document.write(html);
  printWin.document.close();
  printWin.focus();
  setTimeout(() => {
    printWin.print();
  }, 600);
}

/**
 * Universal A4 Printing Helper
 * Opens print window or falls back to hidden iframe to prevent popup-blocker failures.
 */
export function printA4Html(htmlContent: string, title: string = "مستند A4 معتمد") {
  // If the content already contains a full html document, make sure we clean any duplicate or broken print scripts
  let cleanContent = htmlContent;
  
  const fullHtml = cleanContent.includes("<!DOCTYPE html>") ? cleanContent : `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800;900&display=swap');
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Tajawal', 'Cairo', 'Segoe UI', Tahoma, sans-serif;
      color: #0f172a;
      background: #ffffff !important;
      margin: 0;
      padding: 10px;
      font-size: 10pt;
      line-height: 1.4;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .no-print { display: none !important; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th, td { border: 1px solid #94a3b8 !important; padding: 6px 8px !important; text-align: right !important; }
    th { background-color: #f1f5f9 !important; font-weight: bold !important; color: #0f172a !important; }
    @media print {
      body { padding: 0 !important; background: #fff !important; }
    }
  </style>
</head>
<body>
  ${cleanContent}
</body>
</html>`;

  // Always use iframe printing in sandboxed/iframe preview environments to prevent blank popup window issues
  fallbackIframePrint(fullHtml);
}

function fallbackIframePrint(html: string) {
  let iframe = document.getElementById("print-a4-hidden-iframe") as HTMLIFrameElement;
  if (iframe) {
    iframe.remove();
  }
  
  iframe = document.createElement("iframe");
  iframe.id = "print-a4-hidden-iframe";
  iframe.style.position = "fixed";
  iframe.style.top = "0";
  iframe.style.left = "0";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.zIndex = "-99999";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    
    // Give fonts and layout a solid frame to render before triggering print
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error("Print invocation error:", e);
      }
    }, 450);
  }
}

export function generateStatementA4Html(params: {
  partyType: "employee" | "customer" | "supplier" | "account" | "user" | string;
  party: any;
  startDate?: string;
  endDate?: string;
  previousBalance?: number;
  currentBalance?: number;
  transactions?: any[];
  settings?: any;
  docTitle?: string;
  currency?: string;
  currencySummaries?: any;
}) {
  const { partyType, party, startDate, endDate, previousBalance = 0, currentBalance = 0, transactions = [], settings = {}, docTitle, currency = "all", currencySummaries } = params;
  
  const fromDate = startDate ? new Date(startDate).toLocaleDateString('ar-EG') : "بداية التعامل";
  const toDate = endDate ? new Date(endDate).toLocaleDateString('ar-EG') : new Date().toLocaleDateString('ar-EG');
  const issueDateStr = new Date().toLocaleDateString('ar-EG');
  const issueTimeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  let totalDebit = 0;
  let totalCredit = 0;
  transactions.forEach((t: any) => {
    totalDebit += Number(t.debit || 0);
    totalCredit += Number(t.credit || 0);
  });

  const fmt = (v: number) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const companyName = settings?.company_name || settings?.companyName || "OmniFly Pro — إدارة الطيران والعمليات المحاسبية";
  const companyPhone = settings?.phone || settings?.companyPhone || "";
  const companyAddress = settings?.address || settings?.companyAddress || "";

  // ─────────────────────────────────────────────────────────────
  // 1. DEDICATED COMPREHENSIVE EMPLOYEE STATEMENT (كشف حساب تفصيلي شامل للموظف)
  // ─────────────────────────────────────────────────────────────
  if (partyType === "employee") {
    const empName = party?.name || "الموظف";
    const empNumber = party?.employee_number || `#${party?.id || '---'}`;
    const empPosition = party?.position || "موظف";
    const empDepartment = party?.department_name || "القسم العام";
    const empBasicSalary = party?.basic_salary || 0;
    const empPhone = party?.phone || "---";
    const empHireDate = party?.hire_date ? new Date(party.hire_date).toLocaleDateString('ar-EG') : "---";
    const empStatus = party?.active !== false && party?.active !== 0 ? "على رأس العمل (نشط)" : "غير نشط / منتهي العقد";

    // Helper to format movement type for employees
    const getEmployeeMovementType = (t: any) => {
      if (t.source === "hr_loan") return "سلفة نقدية / عهدة";
      if (t.source === "hr_penalty") return "خصم جزاء ومخالفة";
      if (t.source === "hr_absence") return "خصم غياب";
      if (t.source === "hr_delay") return "خصم تأخير دوام";
      if (t.source === "hr_unpaid_leave") return "خصم إجازة غير مدفوعة";
      if (t.source === "hr_overtime") return "مستحق عمل إضافي";
      if (t.source === "hr_entitlement") return "استحقاق / مكافأة";
      if (t.source === "meal_deduction") return "خصم وجبات طعام";
      if (t.source === "salary_earned" || t.source === "salary_accrued") return "استحقاق راتب أساسي";
      if (t.source === "voucher") return t.debit > 0 ? "سند صرف / دفعة نقدية" : "سند قبض مالي";
      if (t.source === "manual") return "قيد تسوية يدوي";
      return t.debit > 0 ? "استقطاع / سلفة" : "استحقاق / راتب";
    };

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>كشف حساب تفصيلي شامل للموظف - ${empName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800;900&display=swap');
    @page { 
      size: A4 portrait; 
      margin: 12mm 10mm 15mm 10mm; 
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: 'Tajawal', 'Cairo', 'Segoe UI', Tahoma, sans-serif; 
      color: #0f172a; 
      background: #ffffff; 
      font-size: 12.5px; 
      line-height: 1.4; 
      padding: 10px;
    }
    .emp-stmt-container { width: 100%; max-width: 210mm; margin: 0 auto; }
    
    /* Header */
    .emp-header { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      border-bottom: 2px solid #0f172a; 
      padding-bottom: 12px; 
      margin-bottom: 14px; 
    }
    .emp-brand h1 { font-size: 20px; font-weight: 900; color: #0f172a; }
    .emp-brand p { font-size: 11px; color: #64748b; margin-top: 2px; }
    
    .emp-doc-badge { 
      text-align: center; 
      background: #f1f5f9; 
      border: 1.5px solid #0f172a; 
      border-radius: 6px; 
      padding: 6px 16px; 
    }
    .emp-doc-badge h2 { font-size: 16px; font-weight: 900; color: #0f172a; }
    .emp-doc-badge span { font-size: 11px; font-weight: 700; color: #3b82f6; }
    
    .emp-meta { text-align: left; font-size: 11px; color: #334155; line-height: 1.5; }
    
    /* Profile Grid */
    .emp-profile-box { 
      background: #f8fafc; 
      border: 1.5px solid #cbd5e1; 
      border-radius: 6px; 
      padding: 10px 14px; 
      margin-bottom: 14px; 
    }
    .emp-profile-title { 
      font-size: 12px; 
      font-weight: 800; 
      color: #1e293b; 
      margin-bottom: 8px; 
      border-bottom: 1px dashed #cbd5e1; 
      padding-bottom: 4px;
      display: flex;
      justify-content: space-between;
    }
    .emp-profile-grid { 
      display: grid; 
      grid-template-columns: repeat(4, 1fr); 
      gap: 8px 14px; 
      font-size: 12px; 
    }
    .emp-info-item { display: flex; flex-direction: column; }
    .emp-info-label { font-size: 10.5px; color: #64748b; font-weight: 600; }
    .emp-info-value { font-size: 12px; font-weight: 800; color: #0f172a; }

    /* KPI Summary Cards */
    .emp-kpi-row { 
      display: grid; 
      grid-template-columns: repeat(4, 1fr); 
      gap: 10px; 
      margin-bottom: 14px; 
    }
    .emp-kpi-card { 
      border: 1px solid #cbd5e1; 
      border-radius: 6px; 
      padding: 8px 10px; 
      text-align: center; 
      background: #ffffff; 
    }
    .emp-kpi-card.highlight { 
      background: #eff6ff; 
      border-color: #3b82f6; 
    }
    .emp-kpi-card.due { 
      background: #ecfdf5; 
      border-color: #10b981; 
    }
    .emp-kpi-label { font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 4px; }
    .emp-kpi-val { font-size: 15px; font-weight: 900; font-family: monospace; }
    .emp-kpi-sub { font-size: 10px; color: #64748b; font-weight: 600; }

    /* Transactions Table */
    table.emp-table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-bottom: 15px; 
      font-size: 11.5px; 
      border: 1.5px solid #0f172a; 
    }
    table.emp-table th { 
      background: #0f172a; 
      color: #ffffff; 
      padding: 7px 6px; 
      font-weight: 800; 
      text-align: center; 
      border: 1px solid #334155; 
    }
    table.emp-table td { 
      padding: 6px 8px; 
      border: 1px solid #cbd5e1; 
      vertical-align: middle; 
    }
    table.emp-table tr:nth-child(even) { background-color: #f8fafc; }
    .td-center { text-align: center; }
    .td-num { font-family: monospace; font-weight: 700; text-align: center; }
    .td-credit { color: #047857; font-weight: 800; }
    .td-debit { color: #b91c1c; font-weight: 800; }
    .td-balance { color: #1e3a8a; font-weight: 900; font-size: 12px; }

    /* Summary Row in Table */
    .table-summary-row { background: #f1f5f9 !important; font-weight: 800; border-top: 2px solid #0f172a; }

    /* Signatures Section */
    .emp-signatures { 
      display: grid; 
      grid-template-columns: repeat(4, 1fr); 
      gap: 12px; 
      margin-top: 25px; 
      page-break-inside: avoid; 
    }
    .emp-sig-box { 
      border: 1px solid #94a3b8; 
      border-radius: 6px; 
      padding: 8px; 
      text-align: center; 
      min-height: 85px; 
      display: flex; 
      flex-direction: column; 
      justify-content: space-between; 
      background: #fafafa;
    }
    .emp-sig-title { font-size: 11px; font-weight: 800; color: #1e293b; }
    .emp-sig-line { border-bottom: 1px dashed #64748b; margin-top: 30px; }
    .emp-sig-note { font-size: 9.5px; color: #64748b; margin-top: 4px; }

    /* Bottom Disclaimer */
    .emp-footer-note { 
      margin-top: 15px; 
      padding-top: 8px; 
      border-top: 1px solid #e2e8f0; 
      display: flex; 
      justify-content: space-between; 
      font-size: 10px; 
      color: #64748b; 
    }
  </style>
</head>
<body>
  <div class="emp-stmt-container">
    <!-- Header -->
    <div class="emp-header">
      <div class="emp-brand">
        <h1>${companyName}</h1>
        <p>${companyAddress ? companyAddress + ' • ' : ''}إدارة الموارد البشرية والرواتب ${companyPhone ? '• ' + companyPhone : ''}</p>
      </div>

      <div class="emp-doc-badge">
        <h2>كشف حساب تفصيلي ومسير مستحقات موظف</h2>
        <span>الفترة من: ${fromDate} إلى: ${toDate}</span>
      </div>

      <div class="emp-meta">
        <div><strong>تاريخ الاستخراج:</strong> ${issueDateStr}</div>
        <div><strong>وقت الطباعة:</strong> ${issueTimeStr}</div>
        <div><strong>حالة الحساب:</strong> ${currentBalance >= 0 ? '<span style="color:#059669; font-weight:bold;">رصيد مستحق للموظف</span>' : '<span style="color:#dc2626; font-weight:bold;">رصيد متبقي على الموظف</span>'}</div>
      </div>
    </div>

    <!-- Employee Profile Info Box -->
    <div class="emp-profile-box">
      <div class="emp-profile-title">
        <span>👤 الملف الشخصي والبيانات الوظيفية للموظف</span>
        <span style="color: #2563eb;">رقم كشف الحساب: STMT-EMP-${party?.id || '00'}-${Date.now().toString().slice(-4)}</span>
      </div>
      <div class="emp-profile-grid">
        <div class="emp-info-item">
          <span class="emp-info-label">اسم الموظف الثلاثي:</span>
          <span class="emp-info-value">${empName}</span>
        </div>
        <div class="emp-info-item">
          <span class="emp-info-label">الرقم الوظيفي (الكود):</span>
          <span class="emp-info-value font-mono">${empNumber}</span>
        </div>
        <div class="emp-info-item">
          <span class="emp-info-label">المسمى الوظيفي:</span>
          <span class="emp-info-value">${empPosition}</span>
        </div>
        <div class="emp-info-item">
          <span class="emp-info-label">الإدارة / القسم التابع له:</span>
          <span class="emp-info-value">${empDepartment}</span>
        </div>
        <div class="emp-info-item">
          <span class="emp-info-label">الراتب الأساسي الشهري:</span>
          <span class="emp-info-value font-mono" style="color:#2563eb;">${fmt(empBasicSalary)} ريال</span>
        </div>
        <div class="emp-info-item">
          <span class="emp-info-label">رقم الهاتف / التواصل:</span>
          <span class="emp-info-value font-mono">${empPhone}</span>
        </div>
        <div class="emp-info-item">
          <span class="emp-info-label">تاريخ التعيين / المباشرة:</span>
          <span class="emp-info-value font-mono">${empHireDate}</span>
        </div>
        <div class="emp-info-item">
          <span class="emp-info-label">الحالة الوظيفية:</span>
          <span class="emp-info-value">${empStatus}</span>
        </div>
      </div>
    </div>

    <!-- Financial KPI Summary Cards -->
    <div class="emp-kpi-row">
      <div class="emp-kpi-card">
        <div class="emp-kpi-label">الرصيد الافتتاحي السابق</div>
        <div class="emp-kpi-val text-slate-700">${fmt(previousBalance)} <small style="font-size:10px;">ريال</small></div>
        <div class="emp-kpi-sub">ما قبل تاريخ ${fromDate}</div>
      </div>

      <div class="emp-kpi-card highlight">
        <div class="emp-kpi-label" style="color:#1d4ed8;">إجمالي الاستحقاقات والرواتب (+)</div>
        <div class="emp-kpi-val text-blue-700 font-bold">${fmt(totalCredit)} <small style="font-size:10px;">ريال</small></div>
        <div class="emp-kpi-sub">رواتب، مكافآت، وبدلات مستحقة</div>
      </div>

      <div class="emp-kpi-card" style="background: #fef2f2; border-color:#f87171;">
        <div class="emp-kpi-label" style="color:#b91c1c;">إجمالي الاستقطاعات والسلف (-)</div>
        <div class="emp-kpi-val text-rose-700 font-bold">${fmt(totalDebit)} <small style="font-size:10px;">ريال</small></div>
        <div class="emp-kpi-sub">سلف، عهد، جزاءات، وغياب</div>
      </div>

      <div class="emp-kpi-card due">
        <div class="emp-kpi-label" style="color:#047857;">صافي الرصيد المستحق النهائي</div>
        <div class="emp-kpi-val text-emerald-800 font-extrabold">${fmt(currentBalance)} <small style="font-size:10px;">ريال</small></div>
        <div class="emp-kpi-sub">${currentBalance >= 0 ? 'مستحق الدفع للموظف' : 'متبقي ذمة على الموظف'}</div>
      </div>
    </div>

    <!-- Detailed Transactions Table -->
    <table class="emp-table">
      <thead>
        <tr>
          <th style="width: 4%;">م</th>
          <th style="width: 10%;">التاريخ</th>
          <th style="width: 16%;">نوع الحركة / السند</th>
          <th style="width: 27%;">البيان والشرح التفصيلي</th>
          <th style="width: 11%;">المستحق (دائن +)</th>
          <th style="width: 11%;">المستقطع (مدين -)</th>
          <th style="width: 11%;">الرصيد التراكمي</th>
          <th style="width: 10%;">الملاحظات</th>
        </tr>
      </thead>
      <tbody>
        <!-- Previous Balance Row -->
        <tr style="background-color: #f1f5f9;">
          <td class="td-center font-mono">0</td>
          <td class="td-center font-mono">${fromDate}</td>
          <td class="td-center font-bold" style="color: #475569;">رصيد افتتاحي سابق</td>
          <td style="font-weight: 600; color: #475569;">الرصيد المدور ما قبل بداية الفترة المحددة</td>
          <td class="td-num td-credit">${previousBalance > 0 ? fmt(previousBalance) : '—'}</td>
          <td class="td-num td-debit">${previousBalance < 0 ? fmt(Math.abs(previousBalance)) : '—'}</td>
          <td class="td-num td-balance" dir="ltr">${fmt(previousBalance)}</td>
          <td class="td-center text-slate-400">مدور</td>
        </tr>

        <!-- Transaction Rows -->
        ${transactions.length > 0 ? transactions.map((t: any, idx: number) => {
          const mType = getEmployeeMovementType(t);
          const isCred = Number(t.credit || 0) > 0;
          const isDeb = Number(t.debit || 0) > 0;
          return `
          <tr>
            <td class="td-center font-mono">${idx + 1}</td>
            <td class="td-center font-mono" dir="ltr">${(t.date || '').slice(0, 10)}</td>
            <td class="td-center font-bold" style="color: #1e293b;">
              <span style="display:inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; background: ${isCred ? '#dbeafe' : '#fee2e2'}; color: ${isCred ? '#1e40af' : '#991b1b'};">
                ${mType}
              </span>
            </td>
            <td style="font-weight: 600;">${t.description || 'حركة مالية'}</td>
            <td class="td-num td-credit">${isCred ? fmt(t.credit) : '—'}</td>
            <td class="td-num td-debit">${isDeb ? fmt(t.debit) : '—'}</td>
            <td class="td-num td-balance" dir="ltr">${fmt(t.running_balance ?? t.runningBalance ?? 0)}</td>
            <td class="td-center" style="font-size: 10.5px; color: #64748b;">${t.notes || '—'}</td>
          </tr>
          `;
        }).join('') : `
          <tr>
            <td colspan="8" style="text-align: center; padding: 25px; font-weight: bold; color: #64748b; background: #f8fafc;">
              لا توجد حركات أو مسيرات مالية مسجلة لهذا الموظف خلال الفترة المحددة
            </td>
          </tr>
        `}

        <!-- Totals Row -->
        <tr class="table-summary-row">
          <td colspan="4" style="text-align: left; padding: 8px 12px; font-size: 12px;">
            <strong>إجمالي حركة الفترة الحالية:</strong> (${transactions.length} حركات)
          </td>
          <td class="td-num td-credit" style="font-size: 12.5px;">${fmt(totalCredit)}</td>
          <td class="td-num td-debit" style="font-size: 12.5px;">${fmt(totalDebit)}</td>
          <td class="td-num td-balance" style="font-size: 13px;" dir="ltr">${fmt(currentBalance)}</td>
          <td class="td-center font-bold">${currentBalance >= 0 ? 'مستحق' : 'متبقي'}</td>
        </tr>
      </tbody>
    </table>

    <!-- Official Signatures Box -->
    <div class="emp-signatures">
      <div class="emp-sig-box">
        <div class="emp-sig-title">إعداد ومراجعة شؤون الموظفين</div>
        <div class="emp-sig-line"></div>
        <div class="emp-sig-note">التوقيع والتاريخ</div>
      </div>

      <div class="emp-sig-box">
        <div class="emp-sig-title">المحاسب المالي المختص</div>
        <div class="emp-sig-line"></div>
        <div class="emp-sig-note">التوقيع والتاريخ</div>
      </div>

      <div class="emp-sig-box">
        <div class="emp-sig-title">اعتماد المدير العام / المالي</div>
        <div class="emp-sig-line"></div>
        <div class="emp-sig-note">الختم والتوقيع الرسمي</div>
      </div>

      <div class="emp-sig-box" style="border-color: #3b82f6; background: #eff6ff;">
        <div class="emp-sig-title" style="color: #1d4ed8;">إقرار وتوقيع الموظف بالاستلام</div>
        <div class="emp-sig-line" style="border-color: #3b82f6;"></div>
        <div class="emp-sig-note" style="color: #1d4ed8;">أقر بصحة الرصيد ومطابقته</div>
      </div>
    </div>

    <!-- Footer Disclaimer -->
    <div class="emp-footer-note">
      <div>هذا الكشف وثيقة مالية رسمية معتمدة من نظام ${companyName}، وأي شطب أو تعديل يدوي يلغي صحتها.</div>
      <div>صفحة 1 من 1 • كشف حساب موظف تفصيلي شامل</div>
    </div>
  </div>
</body>
</html>`;
  }

  // ─────────────────────────────────────────────────────────────
  // 2. STANDARD GENERAL STATEMENT (عملاء وموردين وحسابات عامة)
  // ─────────────────────────────────────────────────────────────
  const partyTitle = partyType === "customer" ? "العميل" : partyType === "supplier" ? "المورد" : "الحساب";
  const partyName = party?.name || "حساب عام";
  const partyCode = party?.code || party?.id || "—";
  const partyPhone = party?.phone || "—";

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>كشف حساب معتمد - ${partyName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800;900&display=swap');
    @page { size: A4 portrait; margin: 12mm 10mm 15mm 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Tajawal', 'Cairo', sans-serif; color: #000; margin: 0; padding: 10px; font-size: 13px; }
    .stmt-container { width: 100%; max-width: 210mm; margin: 0 auto; }
    
    .stmt-top-header { text-align: center; font-weight: 900; font-size: 22px; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
    .date-row { display: flex; justify-content: space-between; align-items: center; font-weight: bold; margin-bottom: 10px; font-size: 13px; }
    
    .account-info { border: 1.5px solid #000; padding: 8px 12px; margin-bottom: 12px; background: #fafafa; }
    .account-info table { width: 100%; border: none; }
    .account-info td { padding: 3px 6px; text-align: right; font-weight: bold; }
    
    .stmt-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; text-align: center; font-size: 12px; }
    .stmt-table th, .stmt-table td { border: 1px solid #000; padding: 6px 4px; font-weight: bold; }
    .stmt-table th { background-color: #f1f5f9; color: #000; }
    
    .signatures-row { margin-top: 25px; text-align: center; font-weight: bold; display: flex; justify-content: space-between; gap: 15px; }
    .sig-col { border: 1px solid #000; padding: 10px; flex: 1; min-height: 80px; display: flex; flex-direction: column; justify-content: space-between; }
    .sig-line { border-bottom: 1px dashed #000; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="stmt-container">
    <div class="stmt-top-header">
      <div>${companyName}</div>
      <div style="font-size: 17px; font-weight: 800; color: #2563eb; margin-top: 4px;">كشف حساب تفصيلي معتمد</div>
    </div>
    
    <div class="date-row">
      <div>الفترة: من تاريخ ${fromDate} &nbsp;&nbsp; إلى تاريخ ${toDate}</div>
      <div>تاريخ الاستخراج: ${issueDateStr}</div>
    </div>

    <div class="account-info">
      <table>
        <tr>
          <td style="width: 15%;">رقم ${partyTitle}:</td>
          <td style="width: 35%; font-family: monospace;">${partyCode}</td>
          <td style="width: 15%;">اسم ${partyTitle}:</td>
          <td style="width: 35%; font-size: 14px;">${partyName}</td>
        </tr>
        <tr>
          <td>رقم الهاتف:</td>
          <td style="font-family: monospace;">${partyPhone}</td>
          <td>العملة المعتمدة:</td>
          <td>${currency === "all" ? "الكل (جميع العملات)" : currency === "SAR" ? "ريال سعودي (SAR)" : currency === "YER" ? "ريال يمني (YER)" : currency === "USD" ? "دولار أمريكي (USD)" : currency}</td>
        </tr>
      </table>
    </div>

    <table class="stmt-table">
      <thead>
        <tr>
          <th style="width: 5%;">م</th>
          <th style="width: 12%;">التاريخ</th>
          <th style="width: 35%;">البيان والشرح</th>
          <th style="width: 12%;">رقم المرجع / السند</th>
          <th style="width: 12%;">مدين</th>
          <th style="width: 12%;">دائن</th>
          <th style="width: 12%;">الرصيد</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background: #f8fafc;">
          <td style="font-family: monospace;">0</td>
          <td style="font-family: monospace;">${fromDate}</td>
          <td style="text-align: right; padding-right: 8px;">الرصيد الافتتاحي السابق</td>
          <td>—</td>
          <td>${previousBalance > 0 ? `${fmt(previousBalance)} ${currency !== "all" ? currency : ""}` : '—'}</td>
          <td>${previousBalance < 0 ? `${fmt(Math.abs(previousBalance))} ${currency !== "all" ? currency : ""}` : '—'}</td>
          <td dir="ltr">${fmt(previousBalance)} ${currency !== "all" ? currency : ""}</td>
        </tr>
        ${transactions.length > 0 ? transactions.map((t: any, idx: number) => {
          const curStr = t.currency || "SAR";
          return `
          <tr>
            <td style="font-family: monospace;">${idx + 1}</td>
            <td dir="ltr" style="font-family: monospace;">${(t.date || '').slice(0, 10)}</td>
            <td style="text-align: right; padding-right: 8px;">${t.description || t.statement || 'حركة مالية'}</td>
            <td style="font-family: monospace;">${t.reference_id || t.id || '—'}</td>
            <td>${Number(t.debit || 0) > 0 ? `${fmt(t.debit)} ${curStr}` : '—'}</td>
            <td>${Number(t.credit || 0) > 0 ? `${fmt(t.credit)} ${curStr}` : '—'}</td>
            <td dir="ltr">${fmt(t.running_balance ?? t.runningBalance ?? 0)} ${curStr}</td>
          </tr>
          `;
        }).join('') : `
          <tr>
            <td colspan="7" style="padding: 20px; color: #64748b;">لا توجد حركات مالية مسجلة خلال الفترة المحددة</td>
          </tr>
        `}
        <tr style="background-color: #f1f5f9; font-weight: bold;">
          <td colspan="4" style="text-align: left; padding: 8px;">إجمالي العمليات:</td>
          <td>${currency !== "all" ? `${fmt(totalDebit)} ${currency}` : '—'}</td>
          <td>${currency !== "all" ? `${fmt(totalCredit)} ${currency}` : '—'}</td>
          <td dir="ltr" style="font-size: 13px; font-weight: 900; color: #1e3a8a;">${currency !== "all" ? `${fmt(currentBalance)} ${currency}` : '—'}</td>
        </tr>
      </tbody>
    </table>

    ${currency === "all" && currencySummaries ? `
    <div style="margin-top: 20px; border: 1.5px solid #000; padding: 10px; background: #fafafa; border-radius: 4px; font-size: 11px;">
      <div style="font-weight: 900; font-size: 13px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 4px; color: #1e3a8a;">
        إجمالي العمليات والأرصدة حسب العملات:
      </div>
      <table style="width: 100%; border-collapse: collapse; text-align: right;">
        <thead>
          <tr style="border-bottom: 1px solid #000; font-weight: bold; background-color: #e2e8f0;">
            <th style="padding: 4px; text-align: right; width: 40%;">العملة</th>
            <th style="padding: 4px; text-align: center; width: 20%;">إجمالي مدين</th>
            <th style="padding: 4px; text-align: center; width: 20%;">إجمالي دائن</th>
            <th style="padding: 4px; text-align: center; width: 20%;">صافي الرصيد المستحق</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(currencySummaries).map(([cur, summary]: [string, any]) => {
            if (summary.totalDebit === 0 && summary.totalCredit === 0) return '';
            const curLabel = cur === 'SAR' ? 'ريال سعودي (SAR)' : cur === 'YER' ? 'ريال يمني (YER)' : 'دولار أمريكي (USD)';
            return `
            <tr style="border-bottom: 1px dashed #cbd5e1; font-weight: bold;">
              <td style="padding: 5px 4px; color: #1e3a8a;">${curLabel}</td>
              <td style="padding: 5px 4px; text-align: center; font-family: monospace; color: #047857;">${fmt(summary.totalDebit)}</td>
              <td style="padding: 5px 4px; text-align: center; font-family: monospace; color: #b91c1c;">${fmt(summary.totalCredit)}</td>
              <td style="padding: 5px 4px; text-align: center; font-family: monospace; font-size: 12px; color: ${summary.balance < 0 ? '#b91c1c' : '#047857'};" dir="ltr">${fmt(summary.balance)}</td>
            </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <div class="signatures-row">
      <div class="sig-col">
        <div>المحاسب المختص</div>
        <div class="sig-line"></div>
      </div>
      <div class="sig-col">
        <div>المدير المالي</div>
        <div class="sig-line"></div>
      </div>
      <div class="sig-col">
        <div>توقيع واستلام ${partyTitle}</div>
        <div class="sig-line"></div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────
// 3. PASSENGERS & PASSPORTS DIRECTORY A4 HTML (سجل المسافرين والجوازات)
// ─────────────────────────────────────────────────────────────
export function generatePassengersDirectoryA4Html(
  passengers: any[],
  options?: {
    customerName?: string;
    reportDate?: string;
    companyName?: string;
    filterTitle?: string;
  }
): string {
  const customerName = options?.customerName || "كافة العملاء والوكلاء";
  const reportDate = options?.reportDate || new Date().toISOString().slice(0, 10).replace(/-/g, "/");
  const companyName = options?.companyName || "OmniFly Pro — نظام إدارة المسافرين والجوازات";

  const rowsHtml = passengers.map((p, idx) => {
    const pNameAr = p.name_ar || p.name || "---";
    const pNameEn = p.name_en || "---";
    const pPassport = p.passport_number || "---";
    const pNationality = p.nationality || "يمني";
    const pVisa = p.visa_type || "تأشيرة عمره";
    const pPhone = p.phone || "---";
    const pAgency = p.customer_name || customerName;
    const pTravelDate = (p.travel_date || "---").replace(/-/g, "/");
    const pExitDate = (p.expected_exit_date || "---").replace(/-/g, "/");

    return `
      <tr>
        <td class="col-center font-mono">${idx + 1}</td>
        <td class="col-name font-bold">${pNameAr}</td>
        <td class="col-name font-mono">${pNameEn}</td>
        <td class="col-center font-mono font-bold">${pPassport}</td>
        <td class="col-center">${pNationality}</td>
        <td class="col-center">${pVisa}</td>
        <td class="col-center font-mono">${pPhone}</td>
        <td class="col-center font-semibold">${pAgency}</td>
        <td class="col-center font-mono">${pTravelDate}</td>
        <td class="col-center font-mono">${pExitDate}</td>
      </tr>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>سجل بيانات المسافرين والجوازات - ${customerName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800;900&display=swap');
    @page {
      size: A4 landscape;
      margin: 10mm 10mm 12mm 10mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Tajawal', 'Cairo', sans-serif;
      background: #ffffff;
      color: #0f172a;
      direction: rtl;
      font-size: 11.5px;
      line-height: 1.4;
      padding: 8px;
    }
    .dir-container { width: 100%; margin: 0 auto; }
    .dir-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .dir-title h1 { font-size: 18px; font-weight: 900; color: #0f172a; }
    .dir-title p { font-size: 11px; color: #475569; }
    .dir-badge {
      background: #f1f5f9;
      border: 1.5px solid #0f172a;
      border-radius: 6px;
      padding: 4px 14px;
      text-align: center;
    }
    .dir-badge h2 { font-size: 14px; font-weight: 900; }
    .dir-badge span { font-size: 10.5px; color: #2563eb; font-weight: 700; }

    .dir-stats {
      display: flex;
      gap: 15px;
      margin-bottom: 10px;
      background: #f8fafc;
      padding: 6px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
    }

    table.dir-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      border: 1.5px solid #0f172a;
    }
    table.dir-table th {
      background: #0f172a;
      color: #ffffff;
      padding: 6px 4px;
      font-weight: bold;
      text-align: center;
      border: 1px solid #334155;
    }
    table.dir-table td {
      padding: 5px 6px;
      border: 1px solid #cbd5e1;
      text-align: right;
    }
    table.dir-table tr:nth-child(even) { background-color: #f8fafc; }
    .col-center { text-align: center !important; }
    .col-name { font-weight: 700; }

    .dir-footer {
      display: flex;
      justify-content: space-between;
      margin-top: 15px;
      padding-top: 6px;
      border-top: 1px solid #cbd5e1;
      font-size: 10px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="dir-container">
    <div class="dir-header">
      <div class="dir-title">
        <h1>${companyName}</h1>
        <p>إدارة المسافرين والجوازات • السجل العام المعتمد للرحلات والتأشيرات</p>
      </div>

      <div class="dir-badge">
        <h2>سجل المسافرين ووثائق الجوازات (A4 PDF)</h2>
        <span>الجهة / الوكيل: ${customerName}</span>
      </div>

      <div style="font-size: 10.5px; text-align: left;">
        <div><strong>تاريخ التصدير:</strong> ${reportDate}</div>
        <div><strong>إجمالي السجلات:</strong> ${passengers.length} مسافر</div>
      </div>
    </div>

    <div class="dir-stats">
      <div>📊 إجمالي عدد المسافرين: <span style="color:#2563eb;">${passengers.length}</span></div>
      <div>📅 تاريخ الاستخراج: <span>${reportDate}</span></div>
      <div>🏢 العميل / الوكالة المعتمدة: <span>${customerName}</span></div>
    </div>

    <table class="dir-table">
      <thead>
        <tr>
          <th style="width: 3%;">#</th>
          <th style="width: 16%;">الاسم بالعربي</th>
          <th style="width: 16%;">الاسم بالإنجليزي</th>
          <th style="width: 10%;">رقم الجواز</th>
          <th style="width: 8%;">الجنسية</th>
          <th style="width: 10%;">نوع التأشيرة</th>
          <th style="width: 9%;">رقم الهاتف</th>
          <th style="width: 12%;">الوكيل / العميل</th>
          <th style="width: 8%;">تاريخ الدخول</th>
          <th style="width: 8%;">الخروج المتوقع</th>
        </tr>
      </thead>
      <tbody>
        ${passengers.length > 0 ? rowsHtml : `
          <tr>
            <td colspan="10" class="col-center" style="padding: 20px; color: #64748b; font-weight: bold;">
              لا توجد سجلات مسافرين مسجلة تطابق معايير البحث
            </td>
          </tr>
        `}
      </tbody>
    </table>

    <div class="dir-footer">
      <div>تم استخراج وتصدير هذا الملف كنسخة PDF معتمدة من نظام OmniFly Pro</div>
      <div>صفحة 1 من 1 • سجل الجوازات والمسافرين</div>
      <div>ختم وتوقيع قسم التأشيرات والعمليات: __________________</div>
    </div>
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────
// 4. SINGLE PASSENGER PASSPORT CARD A4/A5 HTML (استمارة وبيانات المسافر)
// ─────────────────────────────────────────────────────────────
export function generateSinglePassengerCardA4Html(
  p: any,
  options?: { companyName?: string }
): string {
  const companyName = options?.companyName || "OmniFly Pro — نظام إدارة المسافرين والجوازات";
  const pNameAr = p.name_ar || p.name || "---";
  const pNameEn = p.name_en || "---";
  const pPassport = p.passport_number || "---";
  const pNationality = p.nationality || "يمني";
  const pVisa = p.visa_type || "تأشيرة عمره";
  const pPhone = p.phone || "---";
  const pAgency = p.customer_name || "الفرع الرئيسي";
  const pTravelDate = (p.travel_date || "---").replace(/-/g, "/");
  const pExitDate = (p.expected_exit_date || "---").replace(/-/g, "/");
  const pDuration = p.program_duration_days || p.duration_days || 90;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>بطاقة مسافر وجواز سفر - ${pNameAr}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800;900&display=swap');
    @page { size: A4 portrait; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Tajawal', 'Cairo', sans-serif; color: #0f172a; padding: 15px; font-size: 13px; }
    .card-box { border: 2px solid #0f172a; border-radius: 8px; padding: 18px; max-width: 650px; margin: 0 auto; }
    .card-header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 15px; }
    .card-header h1 { font-size: 18px; font-weight: 900; }
    .card-header h2 { font-size: 15px; color: #2563eb; font-weight: 800; margin-top: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px; }
    .item { border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 4px; background: #f8fafc; }
    .item-label { font-size: 11px; color: #64748b; font-weight: bold; }
    .item-val { font-size: 14px; font-weight: 900; color: #0f172a; margin-top: 2px; }
    .barcode-box { text-align: center; border-top: 1.5px dashed #cbd5e1; padding-top: 15px; margin-top: 15px; }
    .barcode-sim { font-family: monospace; letter-spacing: 4px; font-size: 16px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="card-box">
    <div class="card-header">
      <h1>${companyName}</h1>
      <h2>استمارة وبطاقة بيانات المسافر والجواز</h2>
      <p style="font-size: 11px; color: #64748b;">وثيقة بيانات رسمية معتمدة لحامل الجواز</p>
    </div>

    <div class="grid">
      <div class="item">
        <div class="item-label">اسم المسافر بالعربي:</div>
        <div class="item-val">${pNameAr}</div>
      </div>
      <div class="item">
        <div class="item-label">اسم المسافر بالإنجليزي:</div>
        <div class="item-val font-mono">${pNameEn}</div>
      </div>
      <div class="item">
        <div class="item-label">رقم جواز السفر:</div>
        <div class="item-val font-mono" style="color:#2563eb;">${pPassport}</div>
      </div>
      <div class="item">
        <div class="item-label">الجنسية:</div>
        <div class="item-val">${pNationality}</div>
      </div>
      <div class="item">
        <div class="item-label">نوع التأشيرة / الخدمة:</div>
        <div class="item-val">${pVisa}</div>
      </div>
      <div class="item">
        <div class="item-label">مدة البرنامج (أيام):</div>
        <div class="item-val font-mono">${pDuration} يوم</div>
      </div>
      <div class="item">
        <div class="item-label">تاريخ الدخول / السفر:</div>
        <div class="item-val font-mono">${pTravelDate}</div>
      </div>
      <div class="item">
        <div class="item-label">تاريخ الخروج المتوقع:</div>
        <div class="item-val font-mono">${pExitDate}</div>
      </div>
      <div class="item">
        <div class="item-label">الوكيل / العميل التابع له:</div>
        <div class="item-val">${pAgency}</div>
      </div>
      <div class="item">
        <div class="item-label">رقم الهاتف / التواصل:</div>
        <div class="item-val font-mono">${pPhone}</div>
      </div>
    </div>

    <div class="barcode-box">
      <div class="barcode-sim">||| | ||||| || |||||| | |||| ||| ${pPassport} |||</div>
      <p style="font-size: 10px; color: #64748b; margin-top: 6px;">تم التصدير كملف PDF معتمد • نظام إدارة المسافرين والجوازات</p>
    </div>
  </div>
</body>
</html>`;
}

export function generateTransactionA4Html(params: {
  visa: any;
  settings?: any;
  docTitle?: string;
}) {
  const { visa, settings = {}, docTitle } = params;
  const s = settings || {};

  const bizName = s.companyName || "OmniFly Pro - للسفريات والسياحة";
  const subtitle = s.companySubtitle || "خدمات التأشيرات وحجوزات السفر الدولية";
  const showLogo = s.printLogo !== "false";
  const logo = (showLogo && s.logoUrl) ? `<img src="${s.logoUrl}" style="max-height:85px;max-width:180px;object-fit:contain;" alt="Logo" />` : "";
  const accentColor = s.accentColor || "#0f172a";

  const appNum = visa.service_voucher_no || visa.application_number || visa.visa_number || `VSA-${visa.id}`;
  const title = docTitle || "سند قيد واستلام معاملة خدمات سفر وتأشيرات";

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'cash': return '💵 نقداً (الصندوق)';
      case 'credit': return '⏳ آجل (حساب العميل / ذمم)';
      case 'bank': return '💳 تحويل بنكي';
      case 'card': return '💳 شبكة مدى / بطاقة';
      case 'cheque': return '📑 شيك بنكي';
      default: return '💵 نقداً';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': case 'issued': return '✅ تم إصدار التأشيرة';
      case 'under_process': return '⏳ قيد المعالجة بالسفارة';
      case 'in_office': return '🏢 في المكتب (قيد التجهيز)';
      case 'pending_docs': return '⚠️ بانتظار استكمال الوثائق';
      case 'appointment_booked': return '📅 تم حجز موعد البصمة';
      case 'delivered': return '🤝 تم التسليم للعميل';
      case 'rejected': return '❌ مرفوضة من السفارة';
      case 'cancelled': return '🚫 ملغية';
      default: return status || 'قيد الإجراء';
    }
  };

  const sellPrice = Number(visa.selling_price || 0);
  const paid = Number(visa.paid_amount || 0);
  const rem = Number(visa.remaining_balance !== undefined ? visa.remaining_balance : (sellPrice - paid));
  const curr = visa.customer_currency || "SAR";

  const headerRight = [
    { label: "العنوان", value: s.companyAddress },
    { label: "الهاتف", value: s.companyPhone },
    { label: "الجوال", value: s.companyMobile },
    { label: "البريد الإلكتروني", value: s.companyEmail },
    { label: "السجل التجاري", value: s.companyCR },
    { label: "الرقم الضريبي", value: s.companyTaxNumber },
  ].filter(i => i.value);

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${title} - ${appNum}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800;900&display=swap');
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Tajawal', 'Cairo', sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 5px;
      font-size: 10pt;
      line-height: 1.4;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .voucher-container {
      width: 100%;
      max-width: 200mm;
      margin: 0 auto;
      border: 1px solid #cbd5e1;
      padding: 16px;
      border-radius: 8px;
    }
    .header-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid ${accentColor};
      padding-bottom: 12px;
      margin-bottom: 12px;
    }
    .header-right { flex: 1.2; text-align: right; font-size: 8.5pt; color: #334155; }
    .header-center { flex: 1.2; text-align: center; }
    .header-left { flex: 1.2; text-align: left; font-size: 8.5pt; color: #334155; }
    .biz-name { font-size: 15pt; font-weight: 900; color: ${accentColor}; margin-bottom: 2px; }
    .biz-sub { font-size: 9pt; font-weight: 700; color: #475569; }
    
    .doc-banner {
      background: ${accentColor};
      color: #ffffff;
      text-align: center;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13pt;
      font-weight: 800;
      margin-bottom: 14px;
      letter-spacing: 0.5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .section-box {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      margin-bottom: 12px;
      overflow: hidden;
    }
    .section-header {
      background: #f1f5f9;
      padding: 6px 10px;
      font-size: 9.5pt;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .section-body {
      padding: 10px;
      font-size: 9.5pt;
    }
    
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px 12px; }
    .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px 10px; }
    
    .field-row { display: flex; align-items: baseline; justify-content: space-between; border-bottom: 1px dashed #f1f5f9; padding-bottom: 3px; }
    .field-label { font-weight: 700; color: #475569; }
    .field-value { font-weight: 800; color: #0f172a; }
    
    .fin-table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
    }
    .fin-table th, .fin-table td {
      border: 1px solid #cbd5e1;
      padding: 7px 10px;
      text-align: center;
      font-size: 9pt;
    }
    .fin-table th {
      background: #f8fafc;
      font-weight: 800;
      color: #0f172a;
    }
    
    .notes-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 8.5pt;
      color: #92400e;
      margin-bottom: 12px;
    }
    
    .terms-box {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 8pt;
      color: #475569;
      background: #fafafa;
      line-height: 1.5;
      margin-bottom: 14px;
    }
    
    .signatures-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 20px;
      padding: 0 10px;
      text-align: center;
    }
    .sig-col { width: 28%; }
    .sig-title { font-weight: 800; font-size: 9pt; color: #1e293b; margin-bottom: 40px; }
    .sig-line { border-top: 1px solid #475569; padding-top: 4px; font-weight: 700; font-size: 8.5pt; color: #334155; }
    .stamp-box {
      border: 2px dashed #94a3b8;
      border-radius: 8px;
      height: 65px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      color: #64748b;
      font-size: 8.5pt;
    }
    
    .footer-bar {
      margin-top: 14px;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      font-size: 8pt;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  </style>
</head>
<body>
  <div class="voucher-container">
    <!-- Header -->
    <div class="header-box">
      <div class="header-right">
        <div class="biz-name">${bizName}</div>
        <div class="biz-sub">${subtitle}</div>
        ${headerRight.map(i => `<div><strong>${i.label}:</strong> ${i.value}</div>`).join('')}
      </div>
      <div class="header-center">
        ${logo}
      </div>
      <div class="header-left">
        <div style="font-weight:900; font-size:11pt; color:${accentColor}; margin-bottom:4px;">
          رقم السند: <span dir="ltr">${appNum}</span>
        </div>
        <div><strong>تاريخ الإصدار:</strong> ${visa.application_date || new Date().toISOString().slice(0, 10)}</div>
        <div><strong>الموظف المسؤول:</strong> ${visa.responsible_employee || 'قسم المعاملات والتأشيرات'}</div>
        <div><strong>طريقة السداد:</strong> <span style="font-weight:bold; color:#0f172a;">${getPaymentLabel(visa.payment_method)}</span></div>
      </div>
    </div>

    <!-- Title Banner -->
    <div class="doc-banner">
      <span>${title}</span>
      <span style="font-size:10pt; font-weight:700; background:rgba(255,255,255,0.2); padding:2px 10px; border-radius:4px;">
        الحالة: ${getStatusLabel(visa.status)}
      </span>
    </div>

    <!-- Section 1: Customer & Passenger Info -->
    <div class="section-box">
      <div class="section-header">
        <span>👤 1. بيانات العميل والمسافر (صاحب الجواز)</span>
        <span style="font-weight:normal; font-size:8.5pt;">الطرف الأول / المستفيد</span>
      </div>
      <div class="section-body">
        <div class="grid-2">
          <div class="field-row">
            <span class="field-label">اسم العميل (المفوّض):</span>
            <span class="field-value">${visa.customer_name || 'عميل نقدي عام'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">هاتف العميل:</span>
            <span class="field-value" dir="ltr">${visa.customer_phone || visa.phone || '---'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">اسم المسافر (عربي):</span>
            <span class="field-value">${visa.passenger_name_ar || visa.passenger_name || visa.customer_name || '---'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">اسم المسافر (English):</span>
            <span class="field-value" dir="ltr">${visa.passenger_name_en || '---'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">رقم جواز السفر:</span>
            <span class="field-value" dir="ltr" style="letter-spacing:1px; color:#1e3a8a;">${visa.passport_number || '---'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">الجنسية:</span>
            <span class="field-value">${visa.passenger_nationality || visa.nationality || 'يمني'}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 2: Visa Specifications -->
    <div class="section-box">
      <div class="section-header">
        <span>🛂 2. مواصفات وبيانات التأشيرة والمعاملة</span>
        <span style="font-weight:normal; font-size:8.5pt;">الجهة المنفذة والبلد</span>
      </div>
      <div class="section-body">
        <div class="grid-3">
          <div class="field-row">
            <span class="field-label">نوع التأشيرة / المعاملة:</span>
            <span class="field-value" style="color:#047857;">${visa.visa_type || 'تأشيرة عمرة'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">دولة الوجهة:</span>
            <span class="field-value">${visa.country || 'المملكة العربية السعودية'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">مدة الإقامة المصرحة:</span>
            <span class="field-value">${visa.duration_days ? `${visa.duration_days} يوم` : '30 يوم'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">تاريخ التقديم:</span>
            <span class="field-value" dir="ltr">${visa.application_date || '---'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">تاريخ السفر المتوقع:</span>
            <span class="field-value" dir="ltr">${visa.expected_travel_date || '---'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">المكتب المفوض / الشريك:</span>
            <span class="field-value">${visa.supplier_office_name || visa.supplier_agent || 'وكالتنا المباشرة'}</span>
          </div>
          ${visa.issued_visa_number ? `
          <div class="field-row" style="grid-column: span 2;">
            <span class="field-label">رقم التأشيرة الصادرة:</span>
            <span class="field-value" style="color:#047857;" dir="ltr">${visa.issued_visa_number}</span>
          </div>` : ''}
          ${visa.border_number ? `
          <div class="field-row">
            <span class="field-label">رقم الحدود:</span>
            <span class="field-value" dir="ltr">${visa.border_number}</span>
          </div>` : ''}
        </div>
      </div>
    </div>

    <!-- Section 3: Financial & Payment Info -->
    <div class="section-box">
      <div class="section-header">
        <span>💰 3. البيانات المالية وطريقة الدفع والسداد</span>
        <span style="font-weight:bold; color:${visa.payment_method === 'credit' ? '#b45309' : '#047857'};">
          ${getPaymentLabel(visa.payment_method)}
        </span>
      </div>
      <div class="section-body">
        <table class="fin-table">
          <thead>
            <tr>
              <th>بيان المعاملة والخدمة</th>
              <th>سعر الخدمة (الإجمالي)</th>
              <th>طريقة الدفع</th>
              <th>المسدد / المقبوض</th>
              <th>المتبقي (الذمة)</th>
              <th>العملة</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align:right; font-weight:700;">
                ${visa.customer_statement || `معاملة ${visa.visa_type || 'تأشيرة'} - ${visa.country || 'السعودية'} للمسافر ${visa.passenger_name_ar || visa.customer_name || ''}`}
              </td>
              <td style="font-weight:900; font-size:10pt;">${sellPrice.toLocaleString()}</td>
              <td style="font-weight:800; color:#1e293b;">${getPaymentLabel(visa.payment_method)}</td>
              <td style="font-weight:800; color:#047857;">${paid.toLocaleString()}</td>
              <td style="font-weight:800; color:${rem > 0 ? '#b91c1c' : '#047857'};">${rem.toLocaleString()}</td>
              <td style="font-weight:800;">${curr}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Section 4: Missing Docs and Notes -->
    ${(visa.missing_docs || visa.notes) ? `
    <div class="notes-box">
      ${visa.missing_docs ? `<div><strong>⚠️ الوثائق والمستندات الناقصة:</strong> ${visa.missing_docs}</div>` : ''}
      ${visa.notes ? `<div><strong>📌 الملاحظات ومواعيد البصمة:</strong> ${visa.notes}</div>` : ''}
    </div>` : ''}

    <!-- Section 5: Terms -->
    <div class="terms-box">
      <strong>تنبيهات وشروط هامة:</strong>
      <ul>
        <li>يجب على العميل والمسافر التحقق من صحة كافة البيانات المدونة في التأشيرة فور استلامها وقبل موعد السفر.</li>
        <li>الوكالة مسؤولة عن إجراءات التقديم والمتابعة الرسمية، وتخضع فترات المعالجة والموافقات لاختصاص السفارات والجهات القنصلية المختصة.</li>
        <li>يُعتبر هذا السند مستنداً رسمياً لإثبات المعاملة والقيد المالي وطريقة السداد المقيدة بالنظام.</li>
      </ul>
    </div>

    <!-- Signatures -->
    <div class="signatures-row">
      <div class="sig-col">
        <div class="sig-title">توقيع واستلام العميل</div>
        <div class="sig-line">الاسم: ...............................</div>
      </div>
      <div class="sig-col">
        <div class="stamp-box">
          الختم الرسمي المعتمد
        </div>
      </div>
      <div class="sig-col">
        <div class="sig-title">مسؤول قسم التأشيرات / الإدارة</div>
        <div class="sig-line">${visa.responsible_employee || 'المحاسب المعتمد'}</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer-bar">
      <div>نظام OmniFly Pro لإدارة السفريات والسياحة والتأشيرات</div>
      <div>تمت الطباعة بتاريخ: ${new Date().toLocaleString('ar-SA')}</div>
      <div>صفحة 1 من 1</div>
    </div>
  </div>
</body>
</html>`;
}



export function generateFinancialA4Html({ type, startDate, endDate }: any) {
  const isPL = type === 'pl';
  const title = isPL ? "قائمة الأرباح والخسائر" : "الميزانية العمومية";
  
  const fromDate = startDate ? new Date(startDate).toLocaleDateString('en-GB') : "01/01/2026";
  const toDate = endDate ? new Date(endDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');

  let rowsHtml = '';
  if (isPL) {
    rowsHtml = `
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
    `;
  } else {
    rowsHtml = `
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
    `;
  }

  return `
  <div style="font-family: 'Tajawal', sans-serif; max-width: 100%; margin: 0 auto;">
    <h2 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 20px;">${title}</h2>
    
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; font-size: 14px; font-weight: bold;">
      <div>ص 1</div>
      <div>من تاريخ ${fromDate} &nbsp;&nbsp;&nbsp; الى تاريخ ${toDate}</div>
      <div></div>
    </div>

    <table style="width: 100%; border: 2px solid #000; border-collapse: collapse; text-align: center; font-size: 14px;">
      <thead>
        <tr style="background-color: ${isPL ? '#dcfce7' : '#e0e7ff'};">
          <th style="border: 1px solid #000; padding: 10px; width: 70%;">البيان</th>
          <th style="border: 1px solid #000; padding: 10px; width: 30%;">القيمة (ريال)</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
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
  `;
}

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

    return `
      <tr>
        <td style="border: 1px solid #000; padding: 5px;" dir="ltr">${Number(ec).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
        <td style="border: 1px solid #000; padding: 5px;" dir="ltr">${Number(ed).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
        <td style="border: 1px solid #000; padding: 5px;" dir="ltr">${Number(pc).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
        <td style="border: 1px solid #000; padding: 5px;" dir="ltr">${Number(pd).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
        <td style="border: 1px solid #000; padding: 5px;" dir="ltr">${Number(obc).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
        <td style="border: 1px solid #000; padding: 5px;" dir="ltr">${Number(obd).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right;">${acc.name}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right;">${acc.code || acc.id || '-'}</td>
      </tr>
    `;
  }).join('');

  return `
  <div style="font-family: 'Tajawal', sans-serif; max-width: 100%; margin: 0 auto;">
    <h2 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 20px;">ميزان المراجعة</h2>
    
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; font-size: 14px; font-weight: bold;">
      <div>ص 1</div>
      <div>من تاريخ ${fromDate} &nbsp;&nbsp;&nbsp; الى تاريخ ${toDate}</div>
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
        ${rowsHtml}
        <tr style="background-color: #fed7aa; font-weight: bold;">
          <td style="border: 1px solid #000; padding: 5px;" dir="ltr">${Number(totalEndCredit).toLocaleString()}</td>
          <td style="border: 1px solid #000; padding: 5px;" dir="ltr">${Number(totalEndDebit).toLocaleString()}</td>
          <td style="border: 1px solid #000; padding: 5px;" dir="ltr">${Number(totalPeriodCredit).toLocaleString()}</td>
          <td style="border: 1px solid #000; padding: 5px;" dir="ltr">${Number(totalPeriodDebit).toLocaleString()}</td>
          <td style="border: 1px solid #000; padding: 5px;" dir="ltr">${Number(totalOpenCredit).toLocaleString()}</td>
          <td style="border: 1px solid #000; padding: 5px;" dir="ltr">${Number(totalOpenDebit).toLocaleString()}</td>
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
  `;
}


export function generateVoucherA4Html(params: {
  type: "receipt" | "payment";
  voucherNumber?: string | number;
  date?: string;
  safeName?: string;
  partyName?: string;
  amount?: number | string;
  amountWords?: string;
  currency?: string;
  notes?: string;
  referenceNo?: string | number;
  detailsNote?: string;
}) {
  const {
    type,
    voucherNumber = "1",
    date,
    safeName = "صندوق رئيسي",
    partyName = "",
    amount = 0,
    amountWords = "",
    currency = "SAR",
    notes = "",
    referenceNo = "1",
    detailsNote = "",
  } = params;

  const isReceipt = type === "receipt";
  const title = isReceipt ? "سند قبض" : "سند صرف";
  const partyLabel = isReceipt ? "اسم المستفيد" : "اسم المستلم";

  let currSymbol = "ر.س";
  if (currency === "YER" || currency.includes("يمني") || currency === "ر.ي") {
    currSymbol = "ر.ي";
  } else if (currency === "USD" || currency.includes("دولار") || currency === "$") {
    currSymbol = "$";
  }

  const numAmount = Number(amount) || 0;
  const formattedAmount = numAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  
  let formattedDate = "13/08/2026";
  if (date) {
    if (date.includes("-")) {
      const parts = date.split("-");
      if (parts.length === 3) {
        formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      } else {
        formattedDate = new Date(date).toLocaleDateString('en-GB');
      }
    } else {
      formattedDate = date;
    }
  }

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800;900&display=swap');
    @page { size: A4 portrait; margin: 15mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Tajawal', 'Cairo', 'Segoe UI', Tahoma, sans-serif;
      color: #000;
      margin: 0;
      padding: 10px;
      font-size: 15px;
      background: #fff;
    }
    .voucher-container {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
    }
    .main-title {
      text-align: center;
      font-size: 26px;
      font-weight: 900;
      margin-bottom: 2px;
    }
    .safe-subtitle {
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 25px;
    }
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .left-box {
      border: 1.5px solid #000;
      padding: 6px 12px;
      min-width: 180px;
      font-weight: bold;
      font-size: 15px;
      background: #fff;
    }
    .left-box-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    .right-info {
      font-size: 15px;
      font-weight: bold;
      line-height: 1.9;
    }
    .info-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .info-label {
      min-width: 100px;
    }
    .double-divider {
      border: none;
      border-top: 1.5px solid #000;
      border-bottom: 1.5px solid #000;
      height: 4px;
      margin: 16px 0 10px 0;
    }
    .table-section-title {
      font-size: 15px;
      font-weight: bold;
      margin-bottom: 6px;
      text-align: right;
    }
    .voucher-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      text-align: center;
      font-size: 14px;
    }
    .voucher-table th, .voucher-table td {
      border: 1px solid #000;
      padding: 6px 8px;
      font-weight: bold;
    }
    .voucher-table th {
      background-color: #c7d2fe;
    }
    .voucher-table td.text-right {
      text-align: right;
    }
    .signatures-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 40px;
      padding-left: 20px;
    }
    .sig-box {
      text-align: center;
      font-weight: bold;
      font-size: 15px;
      line-height: 1.8;
    }
  </style>
</head>
<body>
  <div class="voucher-container">
    <div class="main-title">${title}</div>
    <div class="safe-subtitle">${safeName}</div>

    <div class="header-content">
      <div class="right-info">
        <div class="info-row"><span class="info-label">رقم السند :</span> <span>${voucherNumber}</span></div>
        <div class="info-row"><span class="info-label">تاريخ السند :</span> <span>${formattedDate}</span></div>
        <div class="info-row"><span class="info-label">${partyLabel} :</span> <span>${partyName}</span></div>
        <div class="info-row"><span class="info-label">مبلغ وقدره :</span> <span>${amountWords}</span></div>
        <div class="info-row"><span class="info-label">البيان :</span> <span>${notes}</span></div>
      </div>

      <div class="left-box">
        <div class="left-box-row">
          <span>مبلغ السند :</span>
          <span dir="ltr">${currSymbol} (${formattedAmount})</span>
        </div>
        <div class="left-box-row">
          <span>رقم المرجع :</span>
          <span>${referenceNo}</span>
        </div>
      </div>
    </div>

    <div class="double-divider"></div>
    <div class="table-section-title">خاص بالحسابات</div>

    <table class="voucher-table">
      <thead>
        <tr>
          <th style="width: 50px;">م</th>
          <th style="width: 140px;">المبلغ</th>
          <th style="width: 260px;">اسم الحساب</th>
          <th>البيان</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td dir="ltr">${formattedAmount}</td>
          <td class="text-right">${partyName}</td>
          <td class="text-right">${detailsNote || notes}</td>
        </tr>
        <tr>
          <td colspan="2" dir="ltr" style="font-size: 15px;">${formattedAmount}</td>
          <td colspan="2" style="text-align: center;">اجمالي المبلغ</td>
        </tr>
      </tbody>
    </table>

    <div class="signatures-section">
      <div class="sig-box">
        المختص<br/>
        التوقيع
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function generateJournalVoucherA4Html(params: {
  voucherNumber?: string | number;
  date?: string;
  docType?: string;
  userName?: string;
  description?: string;
  currency?: string;
  referenceNo?: string | number;
  lines?: Array<{
    account_code?: string;
    account_name?: string;
    analytical?: string;
    description?: string;
    cost_center?: string;
    currency?: string;
    debit?: number | string;
    credit?: number | string;
  }>;
  agencyName?: string;
  agencyAddress?: string;
}) {
  const {
    voucherNumber = "3",
    date = "29/08/2026",
    docType = "نوع الوثيقة",
    userName = "علي احمد محمد اليمني",
    description = "مقابل مرتجع قيمه تاشيرة زيارة عائلية",
    currency = "ريال سعودي",
    referenceNo = "8",
    lines = [],
    agencyName = "وكالة اليمني للسفريات والسياحة",
    agencyAddress = "اليمن_رداع_الخط العام جوار مطعم حرض",
  } = params;

  let formattedDate = "29/08/2026";
  if (date) {
    if (date.includes("-")) {
      const parts = date.split("-");
      if (parts.length === 3) {
        formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      } else {
        formattedDate = new Date(date).toLocaleDateString('en-GB');
      }
    } else {
      formattedDate = date;
    }
  }

  let currName = currency;
  let currSymbol = "ر.س";
  if (currency === "YER" || currency.includes("يمني") || currency === "ر.ي") {
    currName = "ريال يمني";
    currSymbol = "ر.ي";
  } else if (currency === "USD" || currency.includes("دولار") || currency === "$") {
    currName = "دولار أمريكي";
    currSymbol = "$";
  } else if (currency === "SAR" || currency.includes("سعودي") || currency === "ر.س") {
    currName = "ريال سعودي";
    currSymbol = "ر.س";
  }

  const sampleLines = lines && lines.length > 0 ? lines : [
    {
      account_code: "41101001",
      analytical: "",
      account_name: "ايراد مبيعات البضائع",
      description: description || "مقابل مرتجع قيمه تاشيرة زيارة عائلية",
      cost_center: "",
      currency: currSymbol,
      debit: 695,
      credit: 0
    },
    {
      account_code: "11100",
      analytical: "",
      account_name: "الصندوق الرئيسي",
      description: description || "مقابل مرتجع قيمه تاشيرة زيارة عائلية",
      cost_center: "",
      currency: currSymbol,
      debit: 0,
      credit: 695
    }
  ];

  let totalDebit = 0;
  let totalCredit = 0;

  sampleLines.forEach(l => {
    totalDebit += Number(l.debit || 0);
    totalCredit += Number(l.credit || 0);
  });

  const fmt = (num: number) => {
    if (!num || num === 0) return "";
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>سند قيد يومية - ${voucherNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800;900&display=swap');
    @page { size: A4 portrait; margin: 12mm 15mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Tajawal', 'Cairo', 'Segoe UI', Tahoma, sans-serif;
      color: #000;
      margin: 0;
      padding: 5px;
      font-size: 13.5px;
      background: #fff;
      direction: rtl;
    }
    .sheet-container {
      width: 100%;
      max-width: 195mm;
      margin: 0 auto;
    }
    .top-double-bar {
      border-top: 1.5px solid #000;
      border-bottom: 1.5px solid #000;
      height: 3px;
      margin-bottom: 6px;
    }
    .top-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .page-indicator {
      font-size: 14px;
      font-weight: bold;
    }
    .main-sheet-title {
      font-size: 22px;
      font-weight: 900;
      text-align: center;
      flex: 1;
    }
    .header-metadata-grid {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
      gap: 15px;
    }
    .right-metadata-box {
      flex: 1;
      max-width: 58%;
    }
    .bordered-doc-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #000;
      margin-bottom: 6px;
      background: #fff;
    }
    .bordered-doc-table td {
      border: 1px solid #000;
      padding: 4px 8px;
      font-weight: bold;
      font-size: 13px;
    }
    .doc-type-label {
      width: 90px;
      background: #f8fafc;
      text-align: center;
    }
    .doc-type-val {
      font-weight: 800;
    }
    .doc-no-label {
      width: 70px;
      background: #f8fafc;
      text-align: center;
    }
    .doc-no-val {
      width: 50px;
      text-align: center;
      font-family: monospace;
      font-size: 14px;
    }
    .doc-date-label {
      width: 80px;
      background: #f8fafc;
      text-align: center;
    }
    .doc-date-val {
      font-family: monospace;
      font-size: 13px;
      text-align: center;
    }
    .statement-row {
      display: flex;
      align-items: flex-start;
      font-size: 13.5px;
      font-weight: bold;
      margin-top: 4px;
      gap: 10px;
    }
    .statement-label {
      min-width: 45px;
      color: #000;
    }
    .statement-val {
      color: #000;
      line-height: 1.4;
    }
    .left-metadata-info {
      min-width: 35%;
      font-size: 13.5px;
      font-weight: bold;
      line-height: 2.2;
      text-align: right;
    }
    .left-info-row {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      gap: 15px;
    }
    .left-info-label {
      min-width: 80px;
    }
    .left-info-val {
      font-family: inherit;
    }
    .jv-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #000;
      margin-top: 4px;
      margin-bottom: 25px;
      font-size: 12px;
    }
    .jv-table th {
      background-color: #c7d2fe;
      border: 1px solid #000;
      padding: 5px 4px;
      font-weight: 900;
      text-align: center;
      font-size: 12.5px;
    }
    .jv-table td {
      border: 1px solid #000;
      padding: 4px 6px;
      font-weight: bold;
      vertical-align: middle;
    }
    .jv-table td.col-idx {
      text-align: center;
      width: 32px;
    }
    .jv-table td.col-code {
      text-align: center;
      font-family: monospace;
      font-size: 12px;
      width: 85px;
    }
    .jv-table td.col-ana {
      text-align: center;
      width: 55px;
    }
    .jv-table td.col-name {
      text-align: right;
      width: 170px;
    }
    .jv-table td.col-desc {
      text-align: right;
    }
    .jv-table td.col-cc {
      text-align: center;
      width: 70px;
    }
    .jv-table td.col-curr {
      text-align: center;
      width: 50px;
    }
    .jv-table td.col-num {
      text-align: center;
      font-family: monospace;
      font-size: 13px;
      width: 75px;
    }
    .totals-row td {
      border: 1px solid #000;
      padding: 5px 6px;
      font-weight: 900;
    }
    .totals-label {
      text-align: center;
      font-size: 13px;
      font-weight: 900;
    }
    .footer-flex-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 30px;
      padding: 0 10px;
    }
    .agency-box-footer {
      border: 1.5px solid #000;
      padding: 6px 12px;
      font-weight: bold;
      font-size: 12.5px;
      line-height: 1.6;
      text-align: right;
      background: #fff;
    }
    .doc-bottom-tag {
      font-size: 13px;
      font-weight: bold;
      margin-top: 6px;
      text-align: right;
    }
    .signatures-box {
      text-align: center;
      font-weight: bold;
      font-size: 14px;
      line-height: 2.2;
      min-width: 120px;
    }
  </style>
</head>
<body>
  <div class="sheet-container">
    <!-- Top Double Line -->
    <div class="top-double-bar"></div>

    <!-- Header Row -->
    <div class="top-header-row">
      <div style="width: 50px;"></div>
      <div class="main-sheet-title">سند قيد يومية</div>
      <div class="page-indicator">ص 1</div>
    </div>

    <!-- Metadata Section -->
    <div class="header-metadata-grid">
      <!-- Right Box -->
      <div class="right-metadata-box">
        <table class="bordered-doc-table">
          <tr>
            <td class="doc-type-label">نوع الوثيقة</td>
            <td colspan="3" class="doc-type-val">${userName || "علي احمد محمد اليمني"}</td>
          </tr>
          <tr>
            <td class="doc-no-label">رقم السند</td>
            <td class="doc-no-val">${voucherNumber}</td>
            <td class="doc-date-label">تاريخ السند</td>
            <td class="doc-date-val">${formattedDate}</td>
          </tr>
        </table>

        <div class="statement-row">
          <span class="statement-label">البيان</span>
          <span class="statement-val">${description}</span>
        </div>
      </div>

      <!-- Left Info -->
      <div class="left-metadata-info">
        <div class="left-info-row">
          <span class="left-info-label">عملة القيد</span>
          <span class="left-info-val">${currName}</span>
        </div>
        <div class="left-info-row">
          <span class="left-info-label">رقم المرجع</span>
          <span class="left-info-val">${referenceNo || "—"}</span>
        </div>
      </div>
    </div>

    <!-- Table of Entries Matching Image 22 -->
    <table class="jv-table">
      <thead>
        <tr>
          <th style="width: 32px;">م</th>
          <th style="width: 85px;">رقم الحساب</th>
          <th style="width: 55px;">تحليلي</th>
          <th style="width: 170px;">اسم الحساب</th>
          <th>البيان</th>
          <th style="width: 70px;">مركز التكلفة</th>
          <th style="width: 50px;">العملة</th>
          <th style="width: 75px;">مدين</th>
          <th style="width: 75px;">دائن</th>
        </tr>
      </thead>
      <tbody>
        ${sampleLines.map((line, idx) => `
          <tr>
            <td class="col-idx">${idx + 1}</td>
            <td class="col-code">${line.account_code || ""}</td>
            <td class="col-ana">${line.analytical || ""}</td>
            <td class="col-name">${line.account_name || ""}</td>
            <td class="col-desc">${line.description || description || ""}</td>
            <td class="col-cc">${line.cost_center || ""}</td>
            <td class="col-curr">${line.currency || currSymbol}</td>
            <td class="col-num">${fmt(Number(line.debit || 0))}</td>
            <td class="col-num">${fmt(Number(line.credit || 0))}</td>
          </tr>
        `).join("")}

        <!-- Totals Row Matching Image 22 -->
        <tr class="totals-row">
          <td colspan="5" style="border: none; border-top: 1px solid #000;"></td>
          <td colspan="2" class="totals-label">اجماليات</td>
          <td class="col-num" style="background: #f8fafc; font-weight: 900;">${fmt(totalDebit)}</td>
          <td class="col-num" style="background: #f8fafc; font-weight: 900;">${fmt(totalCredit)}</td>
        </tr>
      </tbody>
    </table>

    <!-- Footer Signatures & Agency Box -->
    <div class="footer-flex-section">
      <!-- Right Signatures -->
      <div class="signatures-box">
        المختص<br/>
        التوقيع
      </div>

      <!-- Left Agency Box -->
      <div>
        <div class="agency-box-footer">
          <div>${agencyName}</div>
          <div style="font-size: 11px; margin-top: 2px;">${agencyAddress}</div>
        </div>
        <div class="doc-bottom-tag">سند قيد</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function generateVisitorsStatusReportA4Html(
  passengers: any[],
  options?: {
    customerName?: string;
    reportDate?: string;
    companyName?: string;
    filterTitle?: string;
  }
): string {
  const customerName = options?.customerName || "محمد اليمني";
  const reportDate = options?.reportDate || new Date().toISOString().slice(0, 10).replace(/-/g, "/");
  const companyName = options?.companyName || "OmniFly Pro - نظام السفريات والسياحة";

  const rowsHtml = passengers.map((p, idx) => {
    const pName = p.name_ar || p.name_en || "---";
    const pPassport = p.passport_number || "---";
    const pType = p.visa_type || "تأشيرة عمره";
    const pDuration = p.program_duration_days || p.duration_days || 90;
    const pEntryDate = (p.travel_date || p.entry_date || "").replace(/-/g, "/");
    const pRemaining = p.remaining_days !== null && p.remaining_days !== undefined ? p.remaining_days : "---";
    const pExitDate = (p.expected_exit_date || "").replace(/-/g, "/");

    const remainingNum = Number(pRemaining);
    const isDanger = !isNaN(remainingNum) && remainingNum <= 3;
    const isWarning = !isNaN(remainingNum) && remainingNum > 3 && remainingNum <= 10;

    return `
      <tr>
        <td class="col-name">${pName}</td>
        <td class="col-center font-mono">${pPassport}</td>
        <td class="col-center">${pType}</td>
        <td class="col-center font-mono font-bold">${pDuration}</td>
        <td class="col-center font-mono">${pEntryDate || "---"}</td>
        <td class="col-center font-mono font-bold ${isDanger ? 'text-danger' : isWarning ? 'text-warning' : ''}">${pRemaining}</td>
        <td class="col-center font-mono">${pExitDate || "---"}</td>
      </tr>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>تقرير حالة الزائرين - ${customerName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 12mm 15mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Cairo", "Tahoma", sans-serif;
      background: #ffffff;
      color: #0f172a;
      direction: rtl;
      font-size: 13px;
      line-height: 1.4;
      padding: 10px;
    }
    .report-container {
      width: 100%;
      max-width: 820px;
      margin: 0 auto;
      background: #fff;
    }
    .report-header-box {
      text-align: center;
      margin-bottom: 20px;
      padding-top: 10px;
    }
    .report-main-title {
      font-size: 24px;
      font-weight: 800;
      color: #000000;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    .report-customer-line {
      font-size: 16px;
      font-weight: 700;
      color: #000000;
      margin-bottom: 4px;
    }
    .report-date-line {
      font-size: 15px;
      font-weight: 700;
      color: #000000;
      margin-bottom: 12px;
    }
    table.report-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
      font-size: 13.5px;
      border: 1.5px solid #000000;
    }
    table.report-table th,
    table.report-table td {
      border: 1.5px solid #000000;
      padding: 8px 10px;
    }
    table.report-table th {
      background-color: #ffffff;
      color: #000000;
      font-weight: 800;
      font-size: 13.5px;
      text-align: center;
      white-space: normal;
      vertical-align: middle;
    }
    table.report-table td {
      color: #000000;
      font-size: 13px;
      vertical-align: middle;
    }
    .col-name {
      text-align: right;
      font-weight: 700;
      min-width: 160px;
    }
    .col-center {
      text-align: center;
    }
    .font-mono {
      font-family: inherit;
    }
    .font-bold {
      font-weight: 700;
    }
    .text-danger {
      color: #000000 !important;
      font-weight: 700;
    }
    .text-warning {
      color: #000000 !important;
      font-weight: 700;
    }
    .report-footer {
      margin-top: 25px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #475569;
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-header-box">
      <h1 class="report-main-title">تقرير حالة الزائرين</h1>
      <div class="report-customer-line">العميل ${customerName}</div>
      <div class="report-date-line">التاريخ : ${reportDate}</div>
    </div>

    <table class="report-table">
      <thead>
        <tr>
          <th>اسم المعتمر</th>
          <th>رقم الجواز</th>
          <th>النوع</th>
          <th>مده<br>السفر(فترة<br>البرنامج)</th>
          <th>تاريخ<br>الدخول(السفر)</th>
          <th>الأيام المتبقية<br>على الخروج</th>
          <th>تاريخ الخروج<br>المتوقع</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || `<tr><td colspan="7" style="text-align:center; padding: 20px;">لا يوجد بيانات للعرض</td></tr>`}
      </tbody>
    </table>

    <div class="report-footer">
      <div>إجمالي المعتمرين في التقرير: <strong>${passengers.length}</strong></div>
      <div>نظام متابعة تأشيرات العمرة والرقابة - ${companyName}</div>
      <div>صفحة 1 من 1</div>
    </div>
  </div>
</body>
</html>`;
}


