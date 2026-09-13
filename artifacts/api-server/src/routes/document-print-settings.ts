import { Router } from "express";
import { db, logAudit } from "../lib/sqlite";
import { getAuthUser } from "./auth";

const router = Router();

try {
  db.prepare("ALTER TABLE document_print_settings ADD COLUMN header_right_text_1 TEXT DEFAULT 'معمل عبدالاسلام للخبز العربي'").run();
  db.prepare("ALTER TABLE document_print_settings ADD COLUMN header_right_text_2 TEXT DEFAULT 'عدن/المعلا'").run();
  db.prepare("ALTER TABLE document_print_settings ADD COLUMN header_right_text_3 TEXT DEFAULT '774106282'").run();
  db.prepare("ALTER TABLE document_print_settings ADD COLUMN header_left_text_1 TEXT DEFAULT 'قيس'").run();
  db.prepare("ALTER TABLE document_print_settings ADD COLUMN header_left_text_2 TEXT DEFAULT 'عدن/المعلا'").run();
  db.prepare("ALTER TABLE document_print_settings ADD COLUMN header_left_text_3 TEXT DEFAULT '771845734'").run();
} catch (e) {
  // Ignore if columns already exist
}

router.get("/document-print-settings", (_req, res) => {
  let row = db.prepare("SELECT * FROM document_print_settings WHERE id = 1").get() as any;
  if (!row) {
    db.prepare(`
      INSERT OR IGNORE INTO document_print_settings (
        id, company_name, company_subtitle, logo_url,
        customer_header_text, customer_footer_text,
        employee_header_text, employee_footer_text,
        voucher_receipt_title, voucher_payment_title, voucher_footer_text,
        report_header_text, report_footer_text, accent_color,
        header_right_text_1, header_right_text_2, header_right_text_3,
        header_left_text_1, header_left_text_2, header_left_text_3
      ) VALUES (1, 'OmniSystem Pro', 'نظام نقاط البيع وإدارة الموارد', '/omnisystem-logo.png', 'كشف حساب عميل معتمد', 'شكراً لتعاملكم معنا - يُرجى مراجعة الحسابات خلال 15 يوماً', 'كشف حساب ومسير رواتب موظف', 'إدارة الموارد البشرية - التوقيع والاعتماد', 'سند قبض', 'سند صرف', 'المحاسب _______ المدير _______ المستلم _______', 'تقرير عام شامل', 'طبع بواسطة نظام OmniSystem Pro', '#2563eb', 'معمل عبدالاسلام للخبز العربي', 'عدن/المعلا', '774106282', 'قيس', 'عدن/المعلا', '771845734')
    `).run();
    row = db.prepare("SELECT * FROM document_print_settings WHERE id = 1").get();
  }

  res.json({
    companyName: row.company_name,
    companySubtitle: row.company_subtitle,
    logoUrl: row.logo_url,
    customerHeaderText: row.customer_header_text,
    customerFooterText: row.customer_footer_text,
    employeeHeaderText: row.employee_header_text,
    employeeFooterText: row.employee_footer_text,
    voucherReceiptTitle: row.voucher_receipt_title,
    voucherPaymentTitle: row.voucher_payment_title,
    voucherFooterText: row.voucher_footer_text,
    reportHeaderText: row.report_header_text,
    reportFooterText: row.report_footer_text,
    accentColor: row.accent_color,
    headerRightText1: row.header_right_text_1,
    headerRightText2: row.header_right_text_2,
    headerRightText3: row.header_right_text_3,
    headerLeftText1: row.header_left_text_1,
    headerLeftText2: row.header_left_text_2,
    headerLeftText3: row.header_left_text_3,
  });
});

router.put("/document-print-settings", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user || (user.role !== "admin" && user.role !== "developer")) {
      res.status(403).json({ error: "غير مصرح لك بتعديل إعدادات النظام" });
      return;
    }

    const {
      companyName,
      companySubtitle,
      logoUrl,
      customerHeaderText,
      customerFooterText,
      employeeHeaderText,
      employeeFooterText,
      voucherReceiptTitle,
      voucherPaymentTitle,
      voucherFooterText,
      reportHeaderText,
      reportFooterText,
      accentColor,
      headerRightText1,
      headerRightText2,
      headerRightText3,
      headerLeftText1,
      headerLeftText2,
      headerLeftText3,
    } = req.body;

    console.log(`Update print settings request from user: ${user.name}`);

    if (logoUrl && logoUrl.startsWith("data:image")) {
      console.log(`New logo upload detected. Length: ${logoUrl.length} chars`);
      if (logoUrl.length > 2 * 1024 * 1024) {
        console.warn("Large logo image detected (> 2MB Base64)");
      }
    }

    const updateStmt = db.prepare(`
      UPDATE document_print_settings SET
        company_name = ?,
        company_subtitle = ?,
        logo_url = ?,
        customer_header_text = ?,
        customer_footer_text = ?,
        employee_header_text = ?,
        employee_footer_text = ?,
        voucher_receipt_title = ?,
        voucher_payment_title = ?,
        voucher_footer_text = ?,
        report_header_text = ?,
        report_footer_text = ?,
        accent_color = ?,
        header_right_text_1 = ?,
        header_right_text_2 = ?,
        header_right_text_3 = ?,
        header_left_text_1 = ?,
        header_left_text_2 = ?,
        header_left_text_3 = ?
      WHERE id = 1
    `);

    updateStmt.run(
      companyName || "OmniSystem Pro",
      companySubtitle || "",
      logoUrl || "/omnisystem-logo.png",
      customerHeaderText || "",
      customerFooterText || "",
      employeeHeaderText || "",
      employeeFooterText || "",
      voucherReceiptTitle || "سند قبض",
      voucherPaymentTitle || "سند صرف",
      voucherFooterText || "",
      reportHeaderText || "",
      reportFooterText || "",
      accentColor || "#2563eb",
      headerRightText1 || "",
      headerRightText2 || "",
      headerRightText3 || "",
      headerLeftText1 || "",
      headerLeftText2 || "",
      headerLeftText3 || ""
    );

    try {
      if (logoUrl) {
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('logoUrl', ?)").run(String(logoUrl));
      }
      if (companyName) {
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('businessName', ?)").run(String(companyName));
      }
    } catch (e) {
      console.error("Error syncing print settings to settings table:", e);
    }

    const row = db.prepare("SELECT * FROM document_print_settings WHERE id = 1").get() as any;
    
    logAudit(user.id, user.name, "تعديل إعدادات الطباعة والوثائق", `تم تحديث الهوية البصرية والنصوص بنجاح`);

    res.json({
      companyName: row.company_name,
      companySubtitle: row.company_subtitle,
      logoUrl: row.logo_url,
      customerHeaderText: row.customer_header_text,
      customerFooterText: row.customer_footer_text,
      employeeHeaderText: row.employee_header_text,
      employeeFooterText: row.employee_footer_text,
      voucherReceiptTitle: row.voucher_receipt_title,
      voucherPaymentTitle: row.voucher_payment_title,
      voucherFooterText: row.voucher_footer_text,
      reportHeaderText: row.report_header_text,
      reportFooterText: row.report_footer_text,
      accentColor: row.accent_color,
      headerRightText1: row.header_right_text_1,
      headerRightText2: row.header_right_text_2,
      headerRightText3: row.header_right_text_3,
      headerLeftText1: row.header_left_text_1,
      headerLeftText2: row.header_left_text_2,
      headerLeftText3: row.header_left_text_3,
    });
  } catch (error: any) {
    console.error("Critical error in document-print-settings PUT:", error);
    res.status(500).json({ 
      error: "حدث خطأ في الخادم أثناء حفظ الإعدادات", 
      details: error.message 
    });
  }
});

export default router;
