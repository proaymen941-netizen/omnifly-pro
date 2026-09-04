import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/SearchableSelect";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Printer, FileText, Briefcase, ClipboardList, AlertCircle, FileSpreadsheet, CheckCircle2, Building, Calendar, ShieldCheck, UserCheck } from "lucide-react";
import { printA4Html, generateStatementA4Html } from "@/lib/printUtils";
import { apiGet, fmt } from "./api";
import defaultLogo from "@/assets/images/omnisystem_pro_logo_1784250216808.png";

export function ReportsTab({ initialTab }: { initialTab?: string }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(initialTab || "employee_statement");

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Fetch company & document print settings from system configuration
  const { data: docSettings } = useQuery({
    queryKey: ["document-print-settings"],
    queryFn: () => apiGet("/api/document-print-settings").catch(() => ({
      companyName: "OmniSystem Pro",
      companySubtitle: "نظام نقاط البيع وإدارة الموارد",
      logoUrl: defaultLogo,
      employeeHeaderText: "كشف حساب ومسير رواتب موظف معتمد",
      employeeFooterText: "إدارة الموارد البشرية - التوقيع والاعتماد",
      accentColor: "#2563eb",
      reportHeaderText: "تقرير عام شامل",
      reportFooterText: "طبع بواسطة نظام OmniSystem Pro",
    })),
  });

  const { data: employees = [] } = useQuery({ queryKey: ["hr-employees"], queryFn: () => apiGet("/api/hr/employees") });
  const { data: depts = [] } = useQuery({ queryKey: ["hr-depts"], queryFn: () => apiGet("/api/hr/departments") });

  // Detailed Employee Statement State
  const [statementEmpId, setStatementEmpId] = useState("");
  const [statementMonth, setStatementMonth] = useState(new Date().toISOString().slice(0, 7));
  const [statementData, setStatementData] = useState<any | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);

  // Other report states
  const { data: custodiesReport = [] } = useQuery({ queryKey: ["hr-report-custodies"], queryFn: () => apiGet("/api/hr/custodies") });
  const { data: movementsReport = [] } = useQuery({ queryKey: ["hr-report-movements"], queryFn: () => apiGet("/api/hr/tools/movements") });
  const { data: leavesReport = [] } = useQuery({ queryKey: ["hr-report-leaves"], queryFn: () => apiGet("/api/hr/leaves") });
  const { data: penaltiesReport = [] } = useQuery({ queryKey: ["hr-report-penalties"], queryFn: () => apiGet("/api/hr/penalties") });
  const { data: notesReport = [] } = useQuery({ queryKey: ["hr-report-notes"], queryFn: () => apiGet("/api/hr/notes") });

  const fetchStatement = async () => {
    if (!statementEmpId) {
      toast({ variant: "destructive", title: "الرجاء اختيار الموظف أولاً" });
      return;
    }
    setLoadingStatement(true);
    try {
      const res = await apiGet(`/api/hr/reports/statement?employee_id=${statementEmpId}&month=${statementMonth}`);
      setStatementData(res);
      toast({ title: "تم توليد الكشف المالي بنجاح", description: `الموظف: ${res.employee?.name || ""}` });
    } catch (e: any) {
      console.error("Error generating HR statement:", e);
      toast({ variant: "destructive", title: "فشل في جلب البيانات", description: e?.message || "تعذر تحميل بيانات كشف الحساب" });
    } finally {
      setLoadingStatement(false);
    }
  };

  const printArea = (elementId: string) => {
    const printContent = document.getElementById(elementId)?.innerHTML;
    if (!printContent) return;
    const title = `${docSettings?.employeeHeaderText || "كشف حساب ومسير رواتب موظف معتمد"} - ${statementData?.employee?.name || ""}`;
    const fullHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <title>${title}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          * { box-sizing: border-box; }
          body { 
            font-family: 'Tajawal', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
            padding: 0; 
            margin: 0;
            color: #0f172a; 
            background: #fff !important; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-container {
            padding: 20px;
            max-width: 210mm;
            margin: 0 auto;
          }
          @media print {
            body { padding: 0 !important; }
            .print-container { padding: 0 !important; max-width: 100% !important; }
            @page { size: A4 portrait; margin: 10mm; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="print-container">${printContent}</div>
      </body>
      </html>
    `;
    printA4Html(fullHtml, title);
  };

  const accent = docSettings?.accentColor || "#2563eb";
  const logo = docSettings?.logoUrl || defaultLogo;
  const companyName = docSettings?.companyName || "OmniSystem Pro";
  const companySubtitle = docSettings?.companySubtitle || "نظام نقاط البيع وإدارة الموارد";
  const headerTitle = docSettings?.employeeHeaderText || "كشف حساب ومسير رواتب موظف معتمد";
  const footerText = docSettings?.employeeFooterText || "إدارة الموارد البشرية - التوقيع والاعتماد";

  const basicSalary = Number(statementData?.employee?.basic_salary) || 0;
  const overtimeSum = Number(statementData?.overtimeTotal) || 0;
  const entitlementsSum = Number(statementData?.entitlementsTotal) || 0;
  const grossEntitlements = basicSalary + overtimeSum + entitlementsSum;

  const penaltiesSum = Number(statementData?.penaltiesTotal) || 0;
  const mealsSum = Number(statementData?.mealsTotal) || 0;
  const loansSum = Number(statementData?.loansTotal) || 0;
  const absencesSum = Number(statementData?.absencesTotal) || 0;
  const manualEntriesSum = Number(statementData?.manualEntriesTotal) || 0;
  const latesSum = Number(statementData?.latesTotal) || 0;

  const totalDeductions = penaltiesSum + mealsSum + loansSum + absencesSum + manualEntriesSum + latesSum;
  const finalNetSalary = Number(statementData?.netSalary) ?? (grossEntitlements - totalDeductions);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full gap-1 overflow-x-auto h-auto p-1 bg-muted">
          <TabsTrigger value="employee_statement" className="py-2 text-xs">كشف حساب موظف</TabsTrigger>
          <TabsTrigger value="custody_statement" className="py-2 text-xs">سجل العهد للموظفين</TabsTrigger>
          <TabsTrigger value="tools_movement" className="py-2 text-xs">حركة دخول وخروج الأدوات</TabsTrigger>
          <TabsTrigger value="leaves_report" className="py-2 text-xs">تقرير الإجازات</TabsTrigger>
          <TabsTrigger value="penalties_report" className="py-2 text-xs">تقرير المخالفات والجزاءات</TabsTrigger>
          <TabsTrigger value="notes_report" className="py-2 text-xs">سجل ملاحظات الأقسام</TabsTrigger>
        </TabsList>

        {/* 1. كشف حساب موظف تفصيلي */}
        <TabsContent value="employee_statement" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2"><FileText className="w-4 h-4 text-primary" />توليد كشف حساب تفصيلي شامل للموظف</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4 items-end flex-wrap">
              <div className="w-64">
                <label className="text-xs text-muted-foreground font-semibold mb-1 block">الموظف المعني</label>
                <SearchableSelect
                  options={((employees as any[]) || []).map((e: any) => ({
                    value: String(e.id),
                    label: e.name,
                    sublabel: e.position || e.department_name || "موظف",
                    badge: e.employee_number ? `#${e.employee_number}` : undefined
                  }))}
                  value={statementEmpId}
                  onChange={setStatementEmpId}
                  placeholder="ابحث واختر الموظف..."
                  searchPlaceholder="ابحث بالاسم أو الرقم..."
                />
              </div>
              <div className="w-40">
                <label className="text-xs text-muted-foreground font-semibold">شهر الاستحقاق</label>
                <Input type="month" value={statementMonth} onChange={e => setStatementMonth(e.target.value)} className="mt-1" />
              </div>
              <Button onClick={fetchStatement} size="sm" disabled={loadingStatement}>
                {loadingStatement ? "جاري التوليد..." : "توليد الكشف المالي"}
              </Button>
              {statementData && (
                <Button onClick={() => printArea("employee-statement-sheet")} size="sm" variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/10">
                  <Printer className="w-4 h-4" /> طباعة كشف الحساب
                </Button>
              )}
            </CardContent>
          </Card>

          {statementData && (
            <div className="hidden">
              <div id="employee-statement-sheet">
                {/* The new design will be generated by generateStatementA4Html */}
              </div>
            </div>
          )}
          {statementData && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="font-bold mb-4">معاينة كشف الحساب</h3>
              <div id="employee-statement-preview" className="border p-4 bg-slate-50">
                 {/* Preview logic */}
                 <p>تم تجهيز كشف الحساب للطباعة بالتنسيق الجديد.</p>
              </div>
              <Button onClick={() => {
                const html = generateStatementA4Html({
                  partyType: "employee",
                  party: {
                    name: statementData.employee?.name,
                    code: statementData.employee?.employee_code || statementData.employee?.id,
                    phone: statementData.employee?.phone,
                    department_name: statementData.employee?.department_name
                  },
                  startDate: statementMonth,
                  endDate: statementMonth,
                  previousBalance: 0,
                  currentBalance: finalNetSalary,
                  transactions: [
                    { date: statementMonth, type: "راتب", description: "راتب أساسي", debit: 0, credit: basicSalary, running_balance: basicSalary },
                    { date: statementMonth, type: "خصم", description: "إجمالي استقطاعات", debit: totalDeductions, credit: 0, running_balance: finalNetSalary }
                  ],
                  settings: docSettings,
                  docTitle: "كشف حساب موظف تفصيلي"
                });
                printA4Html(html, `كشف حساب موظف - ${statementData.employee?.name}`);
              }} size="sm" className="mt-4 gap-2">
                <Printer className="w-4 h-4" /> طباعة الكشف (A4)
              </Button>
            </div>
          )}
        </TabsContent>

        {/* 2. سجل عهد الموظفين */}
        <TabsContent value="custody_statement">
          <Card>
            <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><Briefcase className="w-4 h-4 text-amber-500" />سجل جرد ومطابقة عهد الموظفين</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr><th className="text-right p-3 font-semibold">الموظف</th><th className="text-right p-3 font-semibold">بيان العهدة</th><th className="text-right p-3 font-semibold">تاريخ التسليم</th><th className="text-right p-3 font-semibold">تاريخ الاسترداد</th><th className="text-right p-3 font-semibold">حالة العهدة</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {((custodiesReport as any[]) || []).map((c: any) => (
                    <tr key={c.id}>
                      <td className="p-3 font-medium">{c.employee_name}</td>
                      <td className="p-3 font-bold text-slate-700">{c.item_name}</td>
                      <td className="p-3 font-mono">{c.received_date}</td>
                      <td className="p-3 font-mono">{c.returned_date ?? "—"}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${c.status === "held" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                          {c.status === "held" ? "مستمرة" : "تمت إعادتها"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. حركة دخول وخروج الأدوات */}
        <TabsContent value="tools_movement">
          <Card>
            <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><ClipboardList className="w-4 h-4 text-blue-500" />سجل حركة خروج وعودة الأدوات</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr><th className="text-right p-3 font-semibold">الحركة</th><th className="text-right p-3 font-semibold">الأداة</th><th className="text-right p-3 font-semibold">الموظف</th><th className="text-right p-3 font-semibold">الكمية</th><th className="text-right p-3 font-semibold">تاريخ الحركة</th><th className="text-right p-3 font-semibold">ملاحظات</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {((movementsReport as any[]) || []).map((m: any) => (
                    <tr key={m.id}>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${m.type === "out" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                          {m.type === "out" ? "صرف" : "عودة للعهدة"}
                        </span>
                      </td>
                      <td className="p-3">{m.tool_name}</td>
                      <td className="p-3">{m.employee_name}</td>
                      <td className="p-3 font-mono font-bold">{m.quantity}</td>
                      <td className="p-3 text-muted-foreground font-mono">{m.date}</td>
                      <td className="p-3 text-xs text-muted-foreground">{m.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. تقرير الإجازات */}
        <TabsContent value="leaves_report">
          <Card>
            <CardHeader><CardTitle className="text-sm font-bold">تقرير تفصيلي بالإجازات المسجلة</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr><th className="text-right p-3 font-semibold">الموظف</th><th className="text-right p-3 font-semibold">نوع الإجازة</th><th className="text-right p-3 font-semibold">من تاريخ</th><th className="text-right p-3 font-semibold">إلى تاريخ</th><th className="text-right p-3 font-semibold">الحالة</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {((leavesReport as any[]) || []).map((l: any) => (
                    <tr key={l.id}>
                      <td className="p-3 font-semibold">{l.employee_name}</td>
                      <td className="p-3 font-medium text-blue-700">{l.type}</td>
                      <td className="p-3 font-mono">{l.start_date}</td>
                      <td className="p-3 font-mono">{l.end_date}</td>
                      <td className="p-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{l.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. تقرير المخالفات والجزاءات */}
        <TabsContent value="penalties_report">
          <Card>
            <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-500" />سجل الجزاءات المالية والمخالفات المرصودة</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr><th className="text-right p-3 font-semibold">الموظف</th><th className="text-right p-3 font-semibold">البيان</th><th className="text-right p-3 font-semibold font-mono">الخصم المالي</th><th className="text-right p-3 font-semibold">تاريخ المخالفة</th><th className="text-right p-3 font-semibold">ملاحظات</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {((penaltiesReport as any[]) || []).map((p: any) => (
                    <tr key={p.id}>
                      <td className="p-3 font-medium">{p.employee_name}</td>
                      <td className="p-3 font-bold text-red-600">{p.violation_name}</td>
                      <td className="p-3 font-mono font-black text-red-600">-{fmt(p.amount)}</td>
                      <td className="p-3 text-muted-foreground font-mono">{p.date}</td>
                      <td className="p-3 text-xs text-muted-foreground">{p.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. تقرير ملاحظات الأقسام */}
        <TabsContent value="notes_report">
          <Card>
            <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-purple-500" />سجل الملاحظات والطلبات التاريخية للأقسام</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr><th className="text-right p-3 font-semibold">القسم المعني</th><th className="text-right p-3 font-semibold">العنوان والبيان</th><th className="text-right p-3 font-semibold">تاريخ ووقت التسجيل</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {((notesReport as any[]) || []).map((n: any) => (
                    <tr key={n.id}>
                      <td className="p-3"><span className="font-bold px-2 py-1 bg-purple-50 text-purple-700 rounded-md">{n.department_name ?? "عام لكافة الأقسام"}</span></td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800">{n.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{n.content}</div>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground font-mono">{new Date(n.created_at).toLocaleString("ar-SA")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
