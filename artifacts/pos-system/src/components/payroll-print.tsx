import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface PayrollStatementProps {
  data: {
    employee: {
      name: string;
      employee_number: string;
      position?: string;
      department_name?: string;
      hire_date?: string;
      phone?: string;
    };
    salary: {
      month: string;
      basic_salary: number;
      bonuses: number;
      deductions: number;
      net_salary: number;
      status: string;
      payment_date?: string;
      notes?: string;
    } | null;
    mealDeductions: Array<{
      id: number;
      amount: number;
      cashier_name: string;
      created_at: string;
      notes?: string;
    }>;
    mealTotal: number;
    attendance: Array<{ status: string; count: number }>;
    settings: Record<string, string>;
  };
}

function fmt(n?: number) {
  return Number(n ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getMonthLabel(month: string) {
  if (!month) return "";
  const [y, m] = month.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("ar-SA", { year: "numeric", month: "long" });
}

export function PayrollStatement({ data }: PayrollStatementProps) {
  const { employee, salary, mealDeductions, mealTotal, attendance, settings } = data;

  const presentDays = attendance.find(a => a.status === "present")?.count ?? 0;
  const absentDays = attendance.find(a => a.status === "absent")?.count ?? 0;
  const lateDays = attendance.find(a => a.status === "late")?.count ?? 0;

  const totalDeductions = (salary?.deductions ?? 0) + mealTotal;
  const netAfterMeals = (salary?.net_salary ?? 0) - mealTotal;

  return (
    <div
      id="payroll-print-area"
      style={{
        fontFamily: "'Tajawal', Arial, sans-serif",
        direction: "rtl",
        textAlign: "right",
        width: "210mm",
        minHeight: "297mm",
        margin: "0 auto",
        padding: "15mm 15mm 20mm 15mm",
        background: "white",
        color: "#000",
        boxSizing: "border-box",
        fontSize: "11pt",
        lineHeight: "1.6",
      }}
    >
      {/* ── رأس الصفحة ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px double #000", paddingBottom: "12px", marginBottom: "16px" }}>
        {/* اليسار: معلومات التواصل */}
        <div style={{ fontSize: "9pt", color: "#333", lineHeight: "1.8" }}>
          {settings.phone && <div>📞 {settings.phone}</div>}
          {settings.address && <div>📍 {settings.address}</div>}
          {settings.taxNumber && <div>ر.ض: {settings.taxNumber}</div>}
        </div>

        {/* الوسط: شعار + اسم المطعم */}
        <div style={{ textAlign: "center", flex: 1 }}>
          {settings.printLogo === "true" && settings.logoUrl && (
            <img src={settings.logoUrl} alt="شعار" style={{ maxHeight: "60px", maxWidth: "100px", objectFit: "contain", marginBottom: "6px" }} />
          )}
          <div style={{ fontSize: "20pt", fontWeight: "900", letterSpacing: "1px" }}>{settings.businessName ?? "المطعم"}</div>
          <div style={{ fontSize: "13pt", fontWeight: "bold", color: "#555", marginTop: "4px" }}>كشف حساب موظف</div>
        </div>

        {/* اليمين: تاريخ الإصدار */}
        <div style={{ fontSize: "9pt", color: "#333", lineHeight: "1.8", textAlign: "left" }}>
          <div>تاريخ الإصدار:</div>
          <div style={{ fontWeight: "bold" }}>{new Date().toLocaleDateString("ar-SA")}</div>
          {salary?.month && (
            <>
              <div style={{ marginTop: "4px" }}>الشهر:</div>
              <div style={{ fontWeight: "bold" }}>{getMonthLabel(salary.month)}</div>
            </>
          )}
        </div>
      </div>

      {/* ── معلومات الموظف ── */}
      <div style={{
        background: "#f8f9fa",
        border: "1px solid #dee2e6",
        borderRadius: "6px",
        padding: "12px 16px",
        marginBottom: "16px",
      }}>
        <div style={{ fontSize: "12pt", fontWeight: "900", borderBottom: "1px solid #dee2e6", paddingBottom: "6px", marginBottom: "10px", color: "#1e3a5f" }}>
          بيانات الموظف
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px 20px", fontSize: "10pt" }}>
          <div><span style={{ color: "#666" }}>الاسم: </span><strong>{employee.name}</strong></div>
          <div><span style={{ color: "#666" }}>الرقم الوظيفي: </span><strong>{employee.employee_number}</strong></div>
          <div><span style={{ color: "#666" }}>المنصب: </span><strong>{employee.position ?? "—"}</strong></div>
          <div><span style={{ color: "#666" }}>القسم: </span><strong>{employee.department_name ?? "—"}</strong></div>
          <div><span style={{ color: "#666" }}>تاريخ التعيين: </span><strong>{employee.hire_date ?? "—"}</strong></div>
          <div><span style={{ color: "#666" }}>الهاتف: </span><strong>{employee.phone ?? "—"}</strong></div>
        </div>
      </div>

      {/* ── الراتب ── */}
      {salary ? (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "12pt", fontWeight: "900", borderBottom: "2px solid #000", paddingBottom: "4px", marginBottom: "10px", color: "#1e3a5f" }}>
            تفاصيل الراتب — {getMonthLabel(salary.month)}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5pt" }}>
            <thead>
              <tr style={{ background: "#1e3a5f", color: "white" }}>
                <th style={{ padding: "8px 12px", textAlign: "right", width: "50%" }}>البند</th>
                <th style={{ padding: "8px 12px", textAlign: "center", width: "25%" }}>النوع</th>
                <th style={{ padding: "8px 12px", textAlign: "left", width: "25%" }}>المبلغ</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #dee2e6" }}>
                <td style={{ padding: "7px 12px", fontWeight: "bold" }}>الراتب الأساسي</td>
                <td style={{ padding: "7px 12px", textAlign: "center" }}>
                  <span style={{ background: "#d1fae5", color: "#065f46", padding: "2px 8px", borderRadius: "4px", fontSize: "9pt" }}>إضافة</span>
                </td>
                <td style={{ padding: "7px 12px", textAlign: "left", fontFamily: "monospace", fontWeight: "bold" }}>{fmt(salary.basic_salary)}</td>
              </tr>
              {salary.bonuses > 0 && (
                <tr style={{ borderBottom: "1px solid #dee2e6", background: "#f0fdf4" }}>
                  <td style={{ padding: "7px 12px" }}>البدلات والمكافآت</td>
                  <td style={{ padding: "7px 12px", textAlign: "center" }}>
                    <span style={{ background: "#d1fae5", color: "#065f46", padding: "2px 8px", borderRadius: "4px", fontSize: "9pt" }}>إضافة</span>
                  </td>
                  <td style={{ padding: "7px 12px", textAlign: "left", fontFamily: "monospace", color: "#16a34a" }}>+{fmt(salary.bonuses)}</td>
                </tr>
              )}
              {salary.deductions > 0 && (
                <tr style={{ borderBottom: "1px solid #dee2e6", background: "#fff7f7" }}>
                  <td style={{ padding: "7px 12px" }}>الخصومات</td>
                  <td style={{ padding: "7px 12px", textAlign: "center" }}>
                    <span style={{ background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: "4px", fontSize: "9pt" }}>خصم</span>
                  </td>
                  <td style={{ padding: "7px 12px", textAlign: "left", fontFamily: "monospace", color: "#dc2626" }}>-{fmt(salary.deductions)}</td>
                </tr>
              )}
              {mealTotal > 0 && (
                <tr style={{ borderBottom: "1px solid #dee2e6", background: "#fff7f7" }}>
                  <td style={{ padding: "7px 12px" }}>خصم الوجبات ({mealDeductions.length} وجبة)</td>
                  <td style={{ padding: "7px 12px", textAlign: "center" }}>
                    <span style={{ background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: "4px", fontSize: "9pt" }}>خصم</span>
                  </td>
                  <td style={{ padding: "7px 12px", textAlign: "left", fontFamily: "monospace", color: "#dc2626" }}>-{fmt(mealTotal)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr style={{ background: "#1e3a5f", color: "white", fontWeight: "900", fontSize: "12pt" }}>
                <td colSpan={2} style={{ padding: "10px 12px" }}>صافي الراتب</td>
                <td style={{ padding: "10px 12px", textAlign: "left", fontFamily: "monospace" }}>{fmt(netAfterMeals)}</td>
              </tr>
            </tfoot>
          </table>
          <div style={{ marginTop: "6px", fontSize: "9pt", color: "#666" }}>
            الحالة: <strong>{salary.status === "paid" ? `✅ مصروف${salary.payment_date ? ` بتاريخ ${salary.payment_date}` : ""}` : "⏳ معلق"}</strong>
          </div>
        </div>
      ) : (
        <div style={{ border: "1px solid #fde68a", background: "#fffbeb", borderRadius: "6px", padding: "12px", marginBottom: "16px", fontSize: "10pt", color: "#92400e" }}>
          ⚠️ لا يوجد سجل راتب لهذا الشهر
        </div>
      )}

      {/* ── تفصيل وجبات الموظفين ── */}
      {mealDeductions.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "11pt", fontWeight: "bold", borderBottom: "1px solid #ccc", paddingBottom: "4px", marginBottom: "8px" }}>
            تفصيل خصم الوجبات
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9.5pt" }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th style={{ padding: "5px 8px", textAlign: "right" }}>التاريخ</th>
                <th style={{ padding: "5px 8px", textAlign: "right" }}>الكاشير</th>
                <th style={{ padding: "5px 8px", textAlign: "right" }}>ملاحظات</th>
                <th style={{ padding: "5px 8px", textAlign: "left" }}>المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {mealDeductions.map(md => (
                <tr key={md.id} style={{ borderBottom: "1px dashed #e5e7eb" }}>
                  <td style={{ padding: "4px 8px" }}>{new Date(md.created_at).toLocaleDateString("ar-SA")}</td>
                  <td style={{ padding: "4px 8px" }}>{md.cashier_name}</td>
                  <td style={{ padding: "4px 8px", fontSize: "9pt", color: "#666" }}>{md.notes ?? "—"}</td>
                  <td style={{ padding: "4px 8px", textAlign: "left", fontFamily: "monospace", color: "#dc2626" }}>{fmt(md.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── ملخص الحضور ── */}
      {attendance.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "11pt", fontWeight: "bold", borderBottom: "1px solid #ccc", paddingBottom: "4px", marginBottom: "8px" }}>
            ملخص الحضور والانصراف
          </div>
          <div style={{ display: "flex", gap: "20px", fontSize: "10pt" }}>
            <div style={{ textAlign: "center", background: "#d1fae5", borderRadius: "6px", padding: "8px 16px" }}>
              <div style={{ fontWeight: "900", fontSize: "16pt", color: "#065f46" }}>{presentDays}</div>
              <div style={{ color: "#065f46" }}>حاضر</div>
            </div>
            <div style={{ textAlign: "center", background: "#fee2e2", borderRadius: "6px", padding: "8px 16px" }}>
              <div style={{ fontWeight: "900", fontSize: "16pt", color: "#991b1b" }}>{absentDays}</div>
              <div style={{ color: "#991b1b" }}>غائب</div>
            </div>
            <div style={{ textAlign: "center", background: "#fef3c7", borderRadius: "6px", padding: "8px 16px" }}>
              <div style={{ fontWeight: "900", fontSize: "16pt", color: "#92400e" }}>{lateDays}</div>
              <div style={{ color: "#92400e" }}>متأخر</div>
            </div>
          </div>
        </div>
      )}

      {/* ── ملاحظات الراتب ── */}
      {salary?.notes && (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "10px 14px", marginBottom: "16px", fontSize: "10pt" }}>
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>ملاحظات:</div>
          <div>{salary.notes}</div>
        </div>
      )}

      {/* ── التوقيعات ── */}
      <div style={{ marginTop: "30px", display: "flex", justifyContent: "space-between", borderTop: "2px solid #000", paddingTop: "20px" }}>
        <div style={{ textAlign: "center", width: "30%" }}>
          <div style={{ borderTop: "1px solid #000", paddingTop: "6px", fontSize: "9pt", color: "#555" }}>توقيع الموظف</div>
          <div style={{ marginTop: "2px", fontSize: "9pt" }}>{employee.name}</div>
        </div>
        <div style={{ textAlign: "center", width: "30%" }}>
          <div style={{ borderTop: "1px solid #000", paddingTop: "6px", fontSize: "9pt", color: "#555" }}>مدير الموارد البشرية</div>
        </div>
        <div style={{ textAlign: "center", width: "30%" }}>
          <div style={{ borderTop: "1px solid #000", paddingTop: "6px", fontSize: "9pt", color: "#555" }}>المدير العام</div>
        </div>
      </div>

      <div style={{ marginTop: "16px", fontSize: "8pt", color: "#999", textAlign: "center", borderTop: "1px dashed #ccc", paddingTop: "8px" }}>
        {settings.businessName} — {settings.address} — {settings.phone}
      </div>
    </div>
  );
}

export function PayrollPrintButton({ employeeId, month, employeeName }: { employeeId: number; month: string; employeeName: string }) {
  const token = localStorage.getItem("pos_token") ?? "";

  const handlePrint = async () => {
    const resp = await fetch(`/api/hr/salary-statement/${employeeId}/${month}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) { alert("فشل في جلب البيانات"); return; }
    const data = await resp.json();

    // فتح نافذة طباعة جديدة
    const printWin = window.open("", "_blank", "width=900,height=700");
    if (!printWin) { alert("يرجى السماح بالنوافذ المنبثقة"); return; }

    const { employee, salary, mealDeductions, mealTotal, attendance, settings: s } = data;
    const getMonthLabel = (m: string) => {
      if (!m) return "";
      const [y, mo] = m.split("-");
      return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("ar-SA", { year: "numeric", month: "long" });
    };
    const f = (n?: number) => Number(n ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const presentDays = (attendance as any[]).find((a: any) => a.status === "present")?.count ?? 0;
    const absentDays = (attendance as any[]).find((a: any) => a.status === "absent")?.count ?? 0;
    const lateDays = (attendance as any[]).find((a: any) => a.status === "late")?.count ?? 0;
    const netAfterMeals = (salary?.net_salary ?? 0) - mealTotal;

    printWin.document.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>كشف حساب — ${employee.name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Tajawal', Arial, sans-serif; direction: rtl; text-align: right; color: #000; font-size: 11pt; line-height: 1.6; margin: 0; padding: 0; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 7px 10px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px double #000; padding-bottom: 12px; margin-bottom: 16px; }
  .header-center { text-align: center; flex: 1; }
  .biz-name { font-size: 22pt; font-weight: 900; }
  .doc-title { font-size: 13pt; font-weight: bold; color: #555; margin-top: 4px; }
  .section-title { font-size: 12pt; font-weight: 900; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 10px; color: #1e3a5f; }
  .info-box { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px 20px; font-size: 10pt; }
  .badge-add { background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 4px; font-size: 9pt; }
  .badge-ded { background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 9pt; }
  .salary-table thead tr { background: #1e3a5f; color: white; }
  .salary-table tfoot tr { background: #1e3a5f; color: white; font-weight: 900; font-size: 12pt; }
  .sig-row { margin-top: 30px; display: flex; justify-content: space-between; border-top: 2px solid #000; padding-top: 20px; }
  .sig-box { text-align: center; width: 30%; }
  .sig-line { border-top: 1px solid #000; padding-top: 6px; font-size: 9pt; color: #555; }
  .footer { margin-top: 16px; font-size: 8pt; color: #999; text-align: center; border-top: 1px dashed #ccc; padding-top: 8px; }
  .attendance-grid { display: flex; gap: 20px; font-size: 10pt; }
  .att-box { text-align: center; border-radius: 6px; padding: 8px 16px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="header">
  <div style="font-size:9pt;color:#333;line-height:1.8">
    ${s.phone ? `<div>📞 ${s.phone}</div>` : ""}
    ${s.address ? `<div>📍 ${s.address}</div>` : ""}
    ${s.taxNumber ? `<div>ر.ض: ${s.taxNumber}</div>` : ""}
  </div>
  <div class="header-center">
    ${s.printLogo === "true" && s.logoUrl ? `<img src="${s.logoUrl}" style="max-height:60px;max-width:100px;object-fit:contain;margin-bottom:6px" alt="">` : ""}
    <div class="biz-name">${s.businessName ?? "المطعم"}</div>
    <div class="doc-title">كشف حساب موظف</div>
  </div>
  <div style="font-size:9pt;color:#333;line-height:1.8;text-align:left">
    <div>تاريخ الإصدار:</div>
    <div style="font-weight:bold">${new Date().toLocaleDateString("ar-SA")}</div>
    ${salary?.month ? `<div style="margin-top:4px">الشهر:</div><div style="font-weight:bold">${getMonthLabel(salary.month)}</div>` : ""}
  </div>
</div>

<div class="info-box">
  <div class="section-title" style="border-bottom:1px solid #dee2e6;margin-bottom:10px">بيانات الموظف</div>
  <div class="info-grid">
    <div><span style="color:#666">الاسم: </span><strong>${employee.name}</strong></div>
    <div><span style="color:#666">الرقم الوظيفي: </span><strong>${employee.employee_number}</strong></div>
    <div><span style="color:#666">المنصب: </span><strong>${employee.position ?? "—"}</strong></div>
    <div><span style="color:#666">القسم: </span><strong>${employee.department_name ?? "—"}</strong></div>
    <div><span style="color:#666">تاريخ التعيين: </span><strong>${employee.hire_date ?? "—"}</strong></div>
    <div><span style="color:#666">الهاتف: </span><strong>${employee.phone ?? "—"}</strong></div>
  </div>
</div>

${salary ? `
<div style="margin-bottom:16px">
  <div class="section-title">تفاصيل الراتب — ${getMonthLabel(salary.month)}</div>
  <table class="salary-table" style="border:1px solid #dee2e6">
    <thead><tr>
      <th style="text-align:right;width:50%">البند</th>
      <th style="text-align:center;width:25%">النوع</th>
      <th style="text-align:left;width:25%">المبلغ</th>
    </tr></thead>
    <tbody>
      <tr style="border-bottom:1px solid #dee2e6">
        <td style="font-weight:bold">الراتب الأساسي</td>
        <td style="text-align:center"><span class="badge-add">إضافة</span></td>
        <td style="text-align:left;font-family:monospace;font-weight:bold">${f(salary.basic_salary)}</td>
      </tr>
      ${salary.bonuses > 0 ? `<tr style="border-bottom:1px solid #dee2e6;background:#f0fdf4">
        <td>البدلات والمكافآت</td>
        <td style="text-align:center"><span class="badge-add">إضافة</span></td>
        <td style="text-align:left;font-family:monospace;color:#16a34a">+${f(salary.bonuses)}</td>
      </tr>` : ""}
      ${salary.deductions > 0 ? `<tr style="border-bottom:1px solid #dee2e6;background:#fff7f7">
        <td>الخصومات</td>
        <td style="text-align:center"><span class="badge-ded">خصم</span></td>
        <td style="text-align:left;font-family:monospace;color:#dc2626">-${f(salary.deductions)}</td>
      </tr>` : ""}
      ${mealTotal > 0 ? `<tr style="border-bottom:1px solid #dee2e6;background:#fff7f7">
        <td>خصم الوجبات (${mealDeductions.length} وجبة)</td>
        <td style="text-align:center"><span class="badge-ded">خصم</span></td>
        <td style="text-align:left;font-family:monospace;color:#dc2626">-${f(mealTotal)}</td>
      </tr>` : ""}
    </tbody>
    <tfoot><tr>
      <td colspan="2">صافي الراتب</td>
      <td style="text-align:left;font-family:monospace">${f(netAfterMeals)}</td>
    </tr></tfoot>
  </table>
  <div style="margin-top:6px;font-size:9pt;color:#666">
    الحالة: <strong>${salary.status === "paid" ? `✅ مصروف${salary.payment_date ? " بتاريخ " + salary.payment_date : ""}` : "⏳ معلق"}</strong>
  </div>
</div>` : `<div style="border:1px solid #fde68a;background:#fffbeb;border-radius:6px;padding:12px;margin-bottom:16px;font-size:10pt;color:#92400e">
  ⚠️ لا يوجد سجل راتب لهذا الشهر
</div>`}

${mealDeductions.length > 0 ? `
<div style="margin-bottom:16px">
  <div style="font-size:11pt;font-weight:bold;border-bottom:1px solid #ccc;padding-bottom:4px;margin-bottom:8px">تفصيل خصم الوجبات</div>
  <table style="border:1px solid #e5e7eb;font-size:9.5pt">
    <thead style="background:#f3f4f6"><tr>
      <th style="text-align:right">التاريخ</th>
      <th style="text-align:right">الكاشير</th>
      <th style="text-align:right">ملاحظات</th>
      <th style="text-align:left">المبلغ</th>
    </tr></thead>
    <tbody>
      ${mealDeductions.map((md: any) => `<tr style="border-bottom:1px dashed #e5e7eb">
        <td style="padding:4px 8px">${new Date(md.created_at).toLocaleDateString("ar-SA")}</td>
        <td style="padding:4px 8px">${md.cashier_name}</td>
        <td style="padding:4px 8px;font-size:9pt;color:#666">${md.notes ?? "—"}</td>
        <td style="padding:4px 8px;text-align:left;font-family:monospace;color:#dc2626">${f(md.amount)}</td>
      </tr>`).join("")}
    </tbody>
  </table>
</div>` : ""}

${attendance.length > 0 ? `
<div style="margin-bottom:16px">
  <div style="font-size:11pt;font-weight:bold;border-bottom:1px solid #ccc;padding-bottom:4px;margin-bottom:8px">ملخص الحضور والانصراف</div>
  <div class="attendance-grid">
    <div class="att-box" style="background:#d1fae5">
      <div style="font-weight:900;font-size:16pt;color:#065f46">${presentDays}</div>
      <div style="color:#065f46">حاضر</div>
    </div>
    <div class="att-box" style="background:#fee2e2">
      <div style="font-weight:900;font-size:16pt;color:#991b1b">${absentDays}</div>
      <div style="color:#991b1b">غائب</div>
    </div>
    <div class="att-box" style="background:#fef3c7">
      <div style="font-weight:900;font-size:16pt;color:#92400e">${lateDays}</div>
      <div style="color:#92400e">متأخر</div>
    </div>
  </div>
</div>` : ""}

${salary?.notes ? `<div style="border:1px solid #e5e7eb;border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:10pt">
  <div style="font-weight:bold;margin-bottom:4px">ملاحظات:</div>
  <div>${salary.notes}</div>
</div>` : ""}

<div class="sig-row">
  <div class="sig-box"><div class="sig-line">توقيع الموظف</div><div style="margin-top:2px;font-size:9pt">${employee.name}</div></div>
  <div class="sig-box"><div class="sig-line">مدير الموارد البشرية</div></div>
  <div class="sig-box"><div class="sig-line">المدير العام</div></div>
</div>
<div class="footer">${s.businessName ?? ""} — ${s.address ?? ""} — ${s.phone ?? ""}</div>
</body></html>`);

    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 800);
  };

  return (
    <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={handlePrint}>
      <Printer className="w-3 h-3" />كشف الحساب
    </Button>
  );
}
