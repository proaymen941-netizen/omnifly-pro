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
}) {
  const { partyType, party, startDate, endDate, previousBalance = 0, currentBalance = 0, transactions = [], settings = {}, docTitle } = params;
  
  const bizName = settings.companyName || "OmniSystem Pro";
  
  // التحكم في عرض عناصر الترويسة
  const showLogo = settings.printLogo !== "false";
  const logo = (showLogo && settings.logoUrl) ? `<img src="${settings.logoUrl}" style="max-height:80px;object-fit:contain;" alt="Logo" />` : "";
  
  // بيانات الطرف (الجهة اليمنى واليسرى من الترويسة)
  const headerRight = [
    { label: "العنوان", value: settings.companyAddress },
    { label: "الهاتف", value: settings.companyPhone },
    { label: "الجوال", value: settings.companyMobile },
    { label: "البريد الإلكتروني", value: settings.companyEmail },
    { label: "الموقع الإلكتروني", value: settings.companyWebsite },
    { label: "رقم السجل التجاري", value: settings.companyCR },
  ].filter(item => item.value);

  // تحديث تسميات الجهة اليسرى ديناميكياً حسب نوع الطرف
  const partyLabels: Record<string, {name: string, code: string}> = {
    customer: { name: "اسم العميل", code: "رقم العميل" },
    supplier: { name: "اسم المورد", code: "رقم المورد" },
    employee: { name: "اسم الموظف", code: "الرقم الوظيفي" },
  };
  const labels = partyLabels[partyType] || { name: "اسم الطرف", code: "الرقم" };

  const headerLeft = [
    { label: "رقم الكشف", value: "---" },
    { label: "التاريخ", value: new Date().toLocaleDateString('ar-SA') },
    { label: labels.name, value: party?.name },
    { label: labels.code, value: party?.code || party?.id },
  ];

  const partyTypeLabels: Record<string, string> = {
    customer: "كشف حساب العميل",
    supplier: "كشف حساب المورد",
    employee: "كشف حساب الموظف",
    account: "كشف حساب دفتر الأستاذ",
    user: "كشف حساب مستخدم"
  };

  const title = docTitle || partyTypeLabels[partyType] || "كشف حساب";

  let totalDebit = 0;
  let totalCredit = 0;
  transactions.forEach((t: any) => {
    totalDebit += Number(t.debit || 0);
    totalCredit += Number(t.credit || 0);
  });

  const fmt = (v: number) => Number(v || 0).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${title} - ${party?.name || ''}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Cairo', sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 10pt; }
    .stmt-container { width: 100%; max-width: 210mm; margin: 0 auto; }
    
    /* الترويسة */
    .header-box { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 15px; gap: 20px; }
    .header-right { flex: 1; text-align: right; font-size: 9pt; }
    .header-left { flex: 1; text-align: left; font-size: 9pt; }
    .header-center { flex: 1; text-align: center; }
    .header-right div, .header-left div { margin-bottom: 3px; }
    .biz-name { font-size: 14pt; font-weight: 900; color: #0f172a; margin-bottom: 5px; }
    
    /* العنوان */
    .doc-badge { font-size: 16pt; font-weight: 800; text-align: center; margin: 10px 0; border-bottom: 2px solid #0f172a; display: inline-block; width: 100%; padding-bottom: 5px; }
    
    /* بيانات الطرف (إذا لزم) */
    .party-card { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 9.5pt; margin-bottom: 15px; }
    
    /* الجدول */
    .stmt-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    .stmt-table th, .stmt-table td { border: 1px solid #000; padding: 8px; text-align: center; }
    .stmt-table th { background-color: #0f172a !important; color: #ffffff !important; }
    
    /* التذييل */
    .footer-section { margin-top: 20px; }
    .signatures-row { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }
    .sig-line { border-top: 1px solid #000; width: 150px; margin: 0 auto; padding-top: 5px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="stmt-container">
    <div class="header-box">
      <div class="header-right">
        <div class="biz-name">${bizName}</div>
        ${headerRight.map(i => i.value ? `<div><strong>${i.label}:</strong> ${i.value}</div>` : '').join('')}
      </div>
      <div class="header-center">
        ${logo}
      </div>
      <div class="header-left">
        ${headerLeft.map(i => `<div><strong>${i.label}:</strong> ${i.value}</div>`).join('')}
      </div>
    </div>

    <div class="doc-badge">${title}</div>

    <table class="stmt-table">
      <thead>
        <tr>
          <th>رقم</th>
          <th>التاريخ</th>
          <th>نوع السند</th>
          <th>التفاصيل</th>
          <th>عليه</th>
          <th>له</th>
          <th>الرصيد</th>
        </tr>
      </thead>
      <tbody>
        ${transactions.length > 0 ? transactions.map((t: any, idx: number) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${t.date || ''}</td>
            <td>${t.type || '---'}</td>
            <td style="text-align: right;">${t.description || ''}</td>
            <td>${fmt(t.debit || 0)}</td>
            <td>${fmt(t.credit || 0)}</td>
            <td>${fmt(t.running_balance || 0)}</td>
          </tr>
        `).join('') : `<tr><td colspan="7">لا توجد حركات</td></tr>`}
      </tbody>
      <tfoot>
        <tr style="font-weight: bold;">
          <td colspan="4" style="text-align: left;">الإجمالي:</td>
          <td>${fmt(totalDebit)}</td>
          <td>${fmt(totalCredit)}</td>
          <td>${fmt(currentBalance)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="footer-section">
      <div><strong>ملاحظات:</strong></div>
      <div style="border-bottom: 1px dotted #000; height: 30px; width: 100%;"></div>
      
      <div class="signatures-row">
        <div><div>إعداد</div><div class="sig-line">الاسم / التوقيع</div></div>
        <div style="border: 1px solid #000; padding: 20px;">ختم المؤسسة</div>
        <div><div>اعتماد</div><div class="sig-line">الاسم / التوقيع</div></div>
      </div>
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


