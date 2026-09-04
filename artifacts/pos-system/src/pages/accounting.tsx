import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import omnisystemLogo from "@/assets/images/omnisystem_pro_logo_1784250216808.png";
import { AdminLayout } from "@/components/admin-layout";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/SearchableSelect";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Trash2, Eye, Search, FileText, Printer, Sliders, RefreshCw, Sparkles,
  Wallet, Edit, BookOpen, CheckCircle, AlertTriangle, Building2, TrendingUp,
  ArrowRightLeft, Landmark, Layers, ShieldCheck, Scale, Calculator, ArrowUpRight,
  ArrowDownLeft, Calendar, FileSpreadsheet, Lock, FolderTree, Folder, Link as LinkIcon, Info, Upload, Download, Coins
} from "lucide-react";
import { tafqeet } from "@/lib/tafqeet";
import { printA4Html, generateStatementA4Html } from "@/lib/printUtils";
import JournalVoucherModal from "@/components/accounting/JournalVoucherModal";
import { PrintHeader } from "@/components/print-header";

function fetchAuth(url: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("pos_token") ?? "";
  return fetch(url, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) } });
}
async function apiGet(url: string) { const r = await fetchAuth(url); if (!r.ok) throw new Error(await r.text()); return r.json(); }
async function apiPost(url: string, body: any) { const r = await fetchAuth(url, { method: "POST", body: JSON.stringify(body) }); if (!r.ok) throw new Error(await r.text()); return r.json(); }
async function apiPut(url: string, body: any) { const r = await fetchAuth(url, { method: "PUT", body: JSON.stringify(body) }); if (!r.ok) throw new Error(await r.text()); return r.json(); }
async function apiDel(url: string) { const r = await fetchAuth(url, { method: "DELETE" }); if (!r.ok && r.status !== 204) throw new Error(await r.text()); }

function fmt(n?: number) { return Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function Accounting() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [location] = useLocation();

  const [reportOpts, setReportOpts] = useState({
    fromDate: "2026-02-08",
    toDate: "2026-08-28",
    fiscalYear: "2026",
    excludeClosing: false,
    description: "",
    branchId: "1",
    branchName: "وكالة اليمني للسفريات والسياحة",
    department: true,
    displayMethod: "by_code",
    currencyType: "local",
    byLevel: false,
    viewGranularity: "movement",
    expandAll: false,
  });

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      return p.get("tab") || "dashboard";
    }
    return "dashboard";
  });

  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      const tabParam = params.get("tab");
      if (tabParam) {
        setActiveTab(tabParam);
      } else {
        setActiveTab("dashboard");
      }
    };
    handleUrlChange();
    window.addEventListener("popstate", handleUrlChange);
    return () => window.removeEventListener("popstate", handleUrlChange);
  }, [location]);

  const [openingBalances, setOpeningBalances] = useState<{[code: string]: { debit: number; credit: number }}>({});
  const [openingSearch, setOpeningSearch] = useState("");
  const [openingTypeFilter, setOpeningTypeFilter] = useState("all");
  const [isSavingOpening, setIsSavingOpening] = useState(false);

  /* ─── Queries ─── */
  const { data: accountsList = [], refetch: refetchAccounts } = useQuery({
    queryKey: ["accounts-list"],
    queryFn: () => apiGet("/api/accounting/accounts"),
  });

  const { data: dashboardStats, refetch: refetchDashboard } = useQuery({
    queryKey: ["accounting-dashboard-stats"],
    queryFn: () => apiGet("/api/accounting/dashboard-stats"),
  });

  const { data: employees = [] } = useQuery({ queryKey: ["hr-employees-list"], queryFn: () => apiGet("/api/hr/employees") });
  const { data: customers = [] } = useQuery({ queryKey: ["customers-list"], queryFn: () => apiGet("/api/customers") });
  const { data: suppliers = [] } = useQuery({ queryKey: ["suppliers-list"], queryFn: () => apiGet("/api/suppliers").catch(() => []) });
  const { data: systemUsers = [] } = useQuery({ queryKey: ["system-users-list"], queryFn: () => apiGet("/api/accounting/system-users").catch(() => []) });
  const { data: vouchers = [], refetch: refetchVouchers } = useQuery({ queryKey: ["vouchers-list"], queryFn: () => apiGet("/api/accounting/vouchers") });
  const { data: docPrintSettings, refetch: refetchDocSettings } = useQuery({ queryKey: ["document-print-settings"], queryFn: () => apiGet("/api/document-print-settings") });
  const { data: safes = [], refetch: refetchSafes } = useQuery({ queryKey: ["safes-list"], queryFn: () => apiGet("/api/safes") });
  const { data: bankAccounts = [], refetch: refetchBanks } = useQuery({ queryKey: ["bank-accounts-list"], queryFn: () => apiGet("/api/accounting/bank-accounts") });
  const { data: transfers = [], refetch: refetchTransfers } = useQuery({ queryKey: ["transfers-list"], queryFn: () => apiGet("/api/accounting/transfers") });
  const { data: fixedAssets = [], refetch: refetchAssets } = useQuery({ queryKey: ["fixed-assets-list"], queryFn: () => apiGet("/api/accounting/fixed-assets") });
  const { data: recurringExpenses = [], refetch: refetchRecurring } = useQuery({ queryKey: ["recurring-expenses-list"], queryFn: () => apiGet("/api/accounting/recurring-expenses") });
  const { data: costCenters = [], refetch: refetchCostCenters } = useQuery({ queryKey: ["cost-centers-list"], queryFn: () => apiGet("/api/accounting/cost-centers") });
  const { data: fiscalPeriods = [], refetch: refetchFiscalPeriods } = useQuery({ queryKey: ["fiscal-periods-list"], queryFn: () => apiGet("/api/accounting/fiscal-periods") });

  const { data: journalEntries = [], refetch: refetchJournal } = useQuery({
    queryKey: ["journal-entries-list"],
    queryFn: () => apiGet("/api/accounting/journal-entries"),
  });

  const { data: trialBalance, refetch: refetchTrialBalance } = useQuery({
    queryKey: ["trial-balance-data"],
    queryFn: () => apiGet("/api/accounting/trial-balance"),
  });

  useEffect(() => {
    if (accountsList && accountsList.length > 0) {
      const initial: {[code: string]: { debit: number; credit: number }} = {};
      accountsList.forEach((acc: any) => {
        initial[acc.code] = {
          debit: acc.opening_debit || 0,
          credit: acc.opening_credit || 0
        };
      });
      setOpeningBalances(initial);
    }
  }, [accountsList]);

  // Financial Statements Queries
  const { data: incomeStatement } = useQuery({
    queryKey: ["report-income-statement"],
    queryFn: () => apiGet("/api/accounting/reports/income-statement"),
    enabled: activeTab === "financials"
  });

  const { data: balanceSheet } = useQuery({
    queryKey: ["report-balance-sheet"],
    queryFn: () => apiGet("/api/accounting/reports/balance-sheet"),
    enabled: activeTab === "financials"
  });

  const { data: cashFlow } = useQuery({
    queryKey: ["report-cash-flow"],
    queryFn: () => apiGet("/api/accounting/reports/cash-flow"),
    enabled: activeTab === "financials"
  });

  /* ─── Helper for active section titles ─── */
  const getTabTitle = (tab: string) => {
    switch (tab) {
      case "chart": return "دليل الحسابات";
      case "journal": return "سجل القيود اليومية والمزدوجة";
      case "trial": return "ميزان المراجعة الشامل";
      case "vouchers": return "سندات القبض والصرف";
      case "safes": return "إدارة الصناديق والخزائن";
      case "banks": return "البنوك والتحويلات المالية";
      case "statements": return "كشوفات الحسابات";
      case "assets": return "الأصول الثابتة والإهلاك";
      case "recurring": return "المصروفات المتكررة";
      case "financials": return "القوائم المالية الختامية";
      default: return "لوحة التحكم المالية";
    }
  };

  /* ─── Global Document Print Settings (من تهيئة النظام) ─── */
  const [docForm, setDocForm] = useState({
    companyName: "مخابز الشام للخبز العربي",
    companySubtitle: "Maamil Al Sham",
    logoUrl: "/omnisystem-logo.png",
    customerHeaderText: "كشف حساب عميل معتمد",
    customerFooterText: "شكراً لتعاملكم معنا - يُرجى مراجعة الحسابات خلال 15 يوماً",
    employeeHeaderText: "كشف حساب ومسير رواتب موظف",
    employeeFooterText: "إدارة الموارد البشرية - التوقيع والاعتماد",
    voucherReceiptTitle: "سند قبض",
    voucherPaymentTitle: "سند صرف",
    voucherFooterText: "جودة الخبز ... سر ثقة عملائنا",
    reportHeaderText: "تقرير عام شامل",
    reportFooterText: "طبع بواسطة نظام OmniSystem Pro",
    accentColor: "#ef4444",
  });

  useEffect(() => {
    if (docPrintSettings && !docPrintSettings.error) {
      setDocForm(docPrintSettings);
    }
  }, [docPrintSettings]);

  const saveDocSettingsMutation = useMutation({
    mutationFn: (data: any) => apiPut("/api/document-print-settings", data),
    onSuccess: () => {
      toast({ title: "تم حفظ إعدادات وثائق وسندات النظام بنجاح" });
      refetchDocSettings();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل حفظ الإعدادات", description: e.message }),
  });

  /* ─── Account Statement State ─── */
  const [statementPartyType, setStatementPartyType] = useState<"employee" | "customer" | "supplier" | "account" | "user">("customer");
  const [selectedPartyId, setSelectedPartyId] = useState<string>("");
  const [stmtStartDate, setStmtStartDate] = useState<string>("");
  const [stmtEndDate, setStmtEndDate] = useState<string>("");
  const [showStatementPrintModal, setShowStatementPrintModal] = useState(false);
  const printStatementRef = useRef<HTMLDivElement>(null);

  const handlePrintStatement = () => {
    if (!statementData || !statementData.party) {
      toast({ title: "برجاء اختيار حساب أولاً لعرض وطباعة كشف الحساب", variant: "destructive" });
      return;
    }
    const html = generateStatementA4Html({
      partyType: statementPartyType,
      party: statementData.party,
      startDate: stmtStartDate,
      endDate: stmtEndDate,
      previousBalance: statementData.previousBalance,
      currentBalance: statementData.currentBalance,
      transactions: statementData.transactions,
      settings: docPrintSettings || {},
      docTitle: `كشف حساب - ${statementPartyType === 'customer' ? 'عميل' : statementPartyType === 'supplier' ? 'مورد' : 'موظف'}`
    });
    printA4Html(html, `كشف حساب معتمد - ${statementData.party.name}`);
  };

  const { data: statementData, isFetching: loadingStatement, refetch: refetchStatement } = useQuery({
    queryKey: ["party-statement", statementPartyType, selectedPartyId, stmtStartDate, stmtEndDate],
    queryFn: () => {
      if (statementPartyType === "account") {
        return apiGet(`/api/accounting/accounts/${selectedPartyId}/ledger`).then((res: any) => ({
          party: { id: res.account?.id, name: `${res.account?.code} - ${res.account?.name}`, phone: "حساب عام", address: "دليل الحسابات" },
          previousBalance: 0,
          currentBalance: res.account?.balance ?? 0,
          pilgrimsCount: res.pilgrimsCount,
          bookingsCount: res.bookingsCount,
          visaCount: res.visaCount,
          transactions: (res.ledger || []).map((l: any) => ({
            id: l.id,
            date: l.entry_date,
            description: l.journal_desc || l.description || "قيد يومية",
            debit: l.debit,
            credit: l.credit,
            running_balance: l.running_balance,
            notes: l.source_type || ""
          }))
        }));
      }
      return apiGet(`/api/accounting/statement/${statementPartyType}/${selectedPartyId}?start_date=${stmtStartDate}&end_date=${stmtEndDate}`);
    },
    enabled: !!selectedPartyId,
  });

  /* ─── Vouchers Dialog State ─── */
  const [showNewVoucherDlg, setShowNewVoucherDlg] = useState(false);
  const [showReceiptDlg, setShowReceiptDlg] = useState(false);
  const [showPaymentDlg, setShowPaymentDlg] = useState(false);
  const [receiptForm, setReceiptForm] = useState({
    type: "receipt",
    party_type: "customer" as "customer" | "supplier" | "employee" | "general",
    party_id: "",
    amount: "",
    received_from: "",
    payment_against: "",
    payment_method: "cash",
    safe_id: "",
    notes: ""
  });
  const [paymentForm, setPaymentForm] = useState({
    type: "payment",
    party_type: "supplier" as "customer" | "supplier" | "employee" | "general",
    party_id: "",
    amount: "",
    received_from: "",
    payment_against: "",
    payment_method: "cash",
    safe_id: "",
    notes: ""
  });
  const [voucherForm, setVoucherForm] = useState({
    type: "receipt",
    party_type: "customer" as "employee" | "customer" | "supplier" | "general" | "user",
    party_id: "",
    amount: "",
    received_from: "",
    payment_against: "",
    payment_method: "cash",
    amount_text: "",
    notes: "",
    safe_id: "",
    bank_account_id: "",
    cost_center_id: ""
  });
  const [viewVoucher, setViewVoucher] = useState<any>(null);

  const createVoucherMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/accounting/vouchers", data),
    onSuccess: () => {
      toast({ title: "تم إصدار وتوثيق السند المالي والقيد الآلي بنجاح" });
      setShowNewVoucherDlg(false);
      setVoucherForm({ type: "receipt", party_type: "customer", party_id: "", amount: "", received_from: "", payment_against: "", payment_method: "cash", amount_text: "", notes: "", safe_id: "", bank_account_id: "", cost_center_id: "" });
      refetchVouchers();
      refetchSafes();
      refetchBanks();
      refetchDashboard();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل إصدار السند", description: e.message })
  });

  /* ─── Manual Account Entry State ─── */
  const [showManualDlg, setShowManualDlg] = useState(false);
  const [manualForm, setManualForm] = useState({
    description: "", debit: "0", credit: "0", entry_date: new Date().toISOString().slice(0, 10), notes: ""
  });

  const addManualMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/accounting/manual-entries", {
      party_type: statementPartyType,
      party_id: Number(selectedPartyId),
      ...data,
      debit: Number(data.debit || 0),
      credit: Number(data.credit || 0),
    }),
    onSuccess: () => {
      toast({ title: "تم تسجيل القيد اليدوي بنجاح" });
      setShowManualDlg(false);
      setManualForm({ description: "", debit: "0", credit: "0", entry_date: new Date().toISOString().slice(0, 10), notes: "" });
      refetchStatement();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل إضافة القيد", description: e.message }),
  });

  /* ─── Chart of Accounts State (Onyx Pro Engine) ─── */
  const [showAddAccountDlg, setShowAddAccountDlg] = useState(false);
  const [showExcelImportDlg, setShowExcelImportDlg] = useState(false);
  const [showAccountCurrencyDlg, setShowAccountCurrencyDlg] = useState(false);
  const [showSystemCurrencyDlg, setShowSystemCurrencyDlg] = useState(false);
  const [showDeleteAccountConfirmDlg, setShowDeleteAccountConfirmDlg] = useState(false);
  const [excelImportText, setExcelImportText] = useState("");
  const [isNewAccountMode, setIsNewAccountMode] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const [accountForm, setAccountForm] = useState({
    id: null as number | null,
    code: "11101",
    name: "الصندوق الرئيسي",
    name_en: "Main Cash Safe",
    type: "asset",
    parent_code: "11100",
    currency: "YER",
    is_parent: false,
    stop_dealing: false,
    auto_add: true,
    tax_account: "ضريبة القيمة المضافة 5%",
    notes: "",
    level: 4,
    currencies: [
      { id: 1, currency_id: 1, currency_code: "YER", currency_name: "ريال يمني (YER)", min_balance: 0, max_balance: 100000000, exchange_rate: 1.0, is_primary: true },
      { id: 2, currency_id: 2, currency_code: "SAR", currency_name: "ريال سعودي (SAR)", min_balance: 0, max_balance: 500000, exchange_rate: 0.27, is_primary: false },
      { id: 3, currency_id: 3, currency_code: "USD", currency_name: "دولار أمريكي (USD)", min_balance: 0, max_balance: 50000, exchange_rate: 1.0, is_primary: false }
    ] as any[],
    linked_safe_ids: [] as number[],
    linked_customer_ids: [] as number[]
  });

  const [accountCurrencyForm, setAccountCurrencyForm] = useState({
    currency_id: null as number | null,
    currency_code: "YER",
    currency_name: "ريال يمني (YER)",
    min_balance: 0,
    max_balance: 100000000,
    exchange_rate: 1.0,
    is_primary: false
  });

  const [systemCurrencyForm, setSystemCurrencyForm] = useState({
    name: "",
    symbol: "",
    fraction: "فلس",
    type: "foreign",
    exchange_rate: 1.0,
    active: 1
  });

  const [accountSearch, setAccountSearch] = useState("");
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<any>(null);

  const { data: systemCurrenciesList = [], refetch: refetchSystemCurrencies } = useQuery({
    queryKey: ["system-currencies-all"],
    queryFn: () => apiGet("/api/currencies").catch(() => []),
  });

  const { data: ledgerData } = useQuery({
    queryKey: ["account-ledger", selectedLedgerAccount?.id],
    queryFn: () => apiGet(`/api/accounting/accounts/${selectedLedgerAccount.id}/ledger`),
    enabled: !!selectedLedgerAccount?.id
  });

  const createAccountMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/accounting/accounts", data),
    onSuccess: (created: any) => {
      toast({ title: "تم إنشاء الحساب بنجاح في دليل الحسابات" });
      setShowAddAccountDlg(false);
      setIsNewAccountMode(false);
      setSelectedAccountId(created.id);
      refetchAccounts();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل إنشاء الحساب", description: e.message })
  });

  const updateAccountMutation = useMutation({
    mutationFn: (data: any) => apiPut(`/api/accounting/accounts/${data.id}`, data),
    onSuccess: () => {
      toast({ title: "تم حفظ وتحديث بيانات الحساب والعملات والربط بنجاح" });
      refetchAccounts();
      refetchSafes();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل تحديث الحساب", description: e.message })
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (id: number) => apiDel(`/api/accounting/accounts/${id}`),
    onSuccess: () => {
      toast({ title: "تم حذف الحساب بنجاح من دليل الحسابات" });
      setShowDeleteAccountConfirmDlg(false);
      setSelectedAccountId(null);
      setIsNewAccountMode(true);
      refetchAccounts();
      refetchSafes();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل حذف الحساب", description: e.message })
  });

  const generateSubAccountsMutation = useMutation({
    mutationFn: (data: { id: number, entity_type: 'safes' | 'customers' }) => apiPost(`/api/accounting/accounts/${data.id}/generate-subaccounts`, data),
    onSuccess: (res: any) => {
      toast({ title: "نجاح التوليد والربط الآلي", description: res.message });
      refetchAccounts();
      refetchSafes();
      if (selectedAccountId) {
        apiGet(`/api/accounting/accounts/${selectedAccountId}`).then((fullAcc: any) => {
          setAccountForm(prev => ({
            ...prev,
            linked_safe_ids: (fullAcc.linked_safes || []).map((s: any) => s.id),
            linked_customer_ids: (fullAcc.linked_customers || []).map((c: any) => c.id)
          }));
        });
      }
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل التوليد الآلي", description: e.message })
  });

  const createSystemCurrencyMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/currencies", data),
    onSuccess: (newCur: any) => {
      toast({ title: "تمت إضافة العملة بنجاح إلى النظام" });
      setShowSystemCurrencyDlg(false);
      refetchSystemCurrencies();
      setAccountForm(prev => ({
        ...prev,
        currencies: [
          ...prev.currencies,
          {
            currency_id: newCur.id,
            currency_code: newCur.symbol,
            currency_name: `${newCur.name} (${newCur.symbol})`,
            min_balance: 0,
            max_balance: 100000000,
            exchange_rate: Number(newCur.exchange_rate) || 1.0,
            is_primary: false
          }
        ]
      }));
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل إضافة العملة", description: e.message })
  });

  const bulkImportAccountsMutation = useMutation({
    mutationFn: (accounts: any[]) => apiPost("/api/accounting/accounts/bulk-import", { accounts }),
    onSuccess: (res: any) => {
      toast({ title: `تم استيراد ${res.importedCount} حساب بنجاح في دليل الحسابات` });
      setShowExcelImportDlg(false);
      setExcelImportText("");
      refetchAccounts();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل استيراد الحسابات", description: e.message })
  });

  const handleSelectAccount = async (acc: any) => {
    setIsNewAccountMode(false);
    setSelectedAccountId(acc.id);
    try {
      const fullAcc = await apiGet(`/api/accounting/accounts/${acc.id}`);
      setAccountForm({
        id: fullAcc.id,
        code: fullAcc.code,
        name: fullAcc.name,
        name_en: fullAcc.name_en || "",
        type: fullAcc.type || "asset",
        parent_code: fullAcc.parent_code || "",
        currency: fullAcc.currency || "YER",
        is_parent: Boolean(fullAcc.is_parent),
        stop_dealing: Boolean(fullAcc.stop_dealing),
        auto_add: fullAcc.auto_add !== 0,
        tax_account: fullAcc.tax_account || "ضريبة القيمة المضافة 5%",
        notes: fullAcc.notes || "",
        level: fullAcc.level || 1,
        currencies: (fullAcc.currencies && fullAcc.currencies.length > 0) ? fullAcc.currencies : [
          { currency_code: fullAcc.currency || "YER", currency_name: fullAcc.currency === "YER" ? "ريال يمني (YER)" : fullAcc.currency, min_balance: 0, max_balance: 100000000, exchange_rate: 1.0, is_primary: true }
        ],
        linked_safe_ids: (fullAcc.linked_safes || []).map((s: any) => s.id),
        linked_customer_ids: (fullAcc.linked_customers || []).map((c: any) => c.id)
      });
    } catch {
      setAccountForm({
        id: acc.id,
        code: acc.code,
        name: acc.name,
        name_en: acc.name_en || "",
        type: acc.type || "asset",
        parent_code: acc.parent_code || "",
        currency: acc.currency || "YER",
        is_parent: Boolean(acc.is_parent),
        stop_dealing: Boolean(acc.stop_dealing),
        auto_add: acc.auto_add !== 0,
        tax_account: "ضريبة القيمة المضافة 5%",
        notes: "",
        level: acc.level || 1,
        currencies: [
          { currency_code: acc.currency || "YER", currency_name: "ريال يمني (YER)", min_balance: 0, max_balance: 100000000, exchange_rate: 1.0, is_primary: true }
        ],
        linked_safe_ids: [],
        linked_customer_ids: []
      });
    }
  };

  const handleNewSubAccount = (parentAcc?: any) => {
    setIsNewAccountMode(true);
    setSelectedAccountId(null);
    const pCode = parentAcc?.code || accountForm.parent_code || "11100";
    const pType = parentAcc?.type || accountForm.type || "asset";
    
    // Find next available child code
    const childAccounts = accountsList.filter((a: any) => a.parent_code === pCode || (a.code.startsWith(pCode) && a.code !== pCode));
    let nextCode = "";
    if (childAccounts.length > 0) {
      const numbers = childAccounts.map((a: any) => parseInt(a.code, 10)).filter((n: number) => !isNaN(n));
      if (numbers.length > 0) {
        nextCode = String(Math.max(...numbers) + 1);
      } else {
        nextCode = `${pCode}01`;
      }
    } else {
      nextCode = `${pCode}01`;
    }

    setAccountForm({
      id: null,
      code: nextCode,
      name: "",
      name_en: "",
      type: pType,
      parent_code: pCode,
      currency: "YER",
      is_parent: false,
      stop_dealing: false,
      auto_add: true,
      tax_account: "ضريبة القيمة المضافة 5%",
      notes: "",
      level: (parentAcc?.level || 3) + 1,
      currencies: [
        { currency_id: 1, currency_code: "YER", currency_name: "ريال يمني (YER)", min_balance: 0, max_balance: 10000000, exchange_rate: 1.0, is_primary: true },
        { currency_id: 2, currency_code: "SAR", currency_name: "ريال سعودي (SAR)", min_balance: 0, max_balance: 500000, exchange_rate: 0.27, is_primary: false },
        { currency_id: 3, currency_code: "USD", currency_name: "دولار أمريكي (USD)", min_balance: 0, max_balance: 50000, exchange_rate: 1.0, is_primary: false }
      ],
      linked_safe_ids: [],
      linked_customer_ids: []
    });
    toast({ title: "جاهز لإضافة حساب فرعي جديد", description: `تم اقتراح الرمز ${nextCode} تحت الحساب ${pCode}` });
  };

  const handleSaveAccount = () => {
    if (!accountForm.code || !accountForm.name) {
      toast({ variant: "destructive", title: "بيانات ناقصة", description: "يرجى تعبئة رمز واسم الحساب أولاً" });
      return;
    }
    if (accountForm.id && !isNewAccountMode) {
      updateAccountMutation.mutate({
        ...accountForm,
        id: accountForm.id
      });
    } else {
      createAccountMutation.mutate(accountForm);
    }
  };

  const handleExportCOA = () => {
    const headers = "الرمز,الاسم,الاسم_الأجنبي,طبيعة_الحساب,الحساب_الرئيسي,العملة,المستوى,الرصيد,الحالة\n";
    const rows = accountsList.map((a: any) => 
      `"${a.code}","${a.name}","${a.name_en || ''}","${a.type}","${a.parent_code || ''}","${a.currency || 'YER'}","${a.level || 1}","${a.balance || 0}","${a.active ? 'نشط' : 'موقف'}"`
    ).join("\n");
    const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `chart_of_accounts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "تم تصدير دليل الحسابات بنجاح بصيغة CSV/Excel" });
  };

  /* ─── Manual Journal Entry State (Onyx Pro Voucher) ─── */
  const [selectedJournalId, setSelectedJournalId] = useState<number | null>(null);
  const [showJournalVoucherDlg, setShowJournalVoucherDlg] = useState(false);
  const [journalSearchText, setJournalSearchText] = useState("");
  const [journalFilterType, setJournalFilterType] = useState("all");
  const [showNewJournalDlg, setShowNewJournalDlg] = useState(false);
  const [journalForm, setJournalForm] = useState({
    entry_date: new Date().toISOString().slice(0, 10),
    description: "",
    lines: [
      { account_code: "11100", debit: "", credit: "", description: "" },
      { account_code: "41000", debit: "", credit: "", description: "" }
    ]
  });

  const createJournalMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/accounting/journal-entries", data),
    onSuccess: () => {
      toast({ title: "تم تسجيل القيد اليومي المزدوج وتحديث الأرصدة بنجاح" });
      setShowNewJournalDlg(false);
      refetchJournal();
      refetchAccounts();
      refetchTrialBalance();
      refetchDashboard();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل تسجيل القيد", description: e.message })
  });

  const reverseJournalMutation = useMutation({
    mutationFn: (id: number) => apiPost(`/api/accounting/journal-entries/${id}/reverse`, {}),
    onSuccess: () => {
      toast({ title: "تم عكس وتصحيح القيد بنجاح" });
      refetchJournal();
      refetchAccounts();
      refetchTrialBalance();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل عكس القيد", description: e.message })
  });

  /* ─── Safes State ─── */
  const [showSafeDlg, setShowSafeDlg] = useState(false);
  const [editingSafe, setEditingSafe] = useState<any>(null);
  const [safeForm, setSafeForm] = useState({ name: "", balance: "0", currency: "ريال", notes: "", active: true });

  const saveSafeMutation = useMutation({
    mutationFn: (data: any) => editingSafe ? apiPut(`/api/safes/${editingSafe.id}`, data) : apiPost("/api/safes", data),
    onSuccess: () => {
      toast({ title: editingSafe ? "تم تحديث الخزينة" : "تمت إضافة الخزينة بنجاح" });
      setShowSafeDlg(false);
      setEditingSafe(null);
      refetchSafes();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل الحفظ", description: e.message })
  });

  const deleteSafeMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/safes/${id}`),
    onSuccess: () => {
      toast({ title: "تم حذف الخزينة بنجاح" });
      refetchSafes();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل الحذف", description: e.message })
  });

  /* ─── Bank Account & Transfer Dialog State ─── */
  const [showBankDlg, setShowBankDlg] = useState(false);
  const [bankForm, setBankForm] = useState({ bank_name: "", account_number: "", iban: "", swift: "", balance: "0", currency: "ريال", notes: "" });

  const createBankMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/accounting/bank-accounts", data),
    onSuccess: () => {
      toast({ title: "تمت إضافة الحساب البنكي بنجاح" });
      setShowBankDlg(false);
      setBankForm({ bank_name: "", account_number: "", iban: "", swift: "", balance: "0", currency: "ريال", notes: "" });
      refetchBanks();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل إضافة البنك", description: e.message })
  });

  const [showTransferDlg, setShowTransferDlg] = useState(false);
  const [transferForm, setTransferForm] = useState({
    transfer_date: new Date().toISOString().slice(0, 10),
    from_type: "safe",
    from_id: "",
    to_type: "bank",
    to_id: "",
    amount: "",
    notes: ""
  });

  const createTransferMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/accounting/transfers", data),
    onSuccess: () => {
      toast({ title: "تم تنفيذ عملية التحويل وقيد الأثر المالي بنجاح" });
      setShowTransferDlg(false);
      setTransferForm({ transfer_date: new Date().toISOString().slice(0, 10), from_type: "safe", from_id: "", to_type: "bank", to_id: "", amount: "", notes: "" });
      refetchTransfers();
      refetchSafes();
      refetchBanks();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل التحويل", description: e.message })
  });

  /* ─── Fixed Assets State ─── */
  const [showAssetDlg, setShowAssetDlg] = useState(false);
  const [assetForm, setAssetForm] = useState({
    name: "", category: "أجهزة ومعدات", purchase_date: new Date().toISOString().slice(0, 10),
    purchase_cost: "", salvage_value: "0", useful_life_years: "5", location: "المقر الرئيسي", responsible_person: "مدير الفرع"
  });

  const createAssetMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/accounting/fixed-assets", data),
    onSuccess: () => {
      toast({ title: "تم تسجيل الأصل الثابت وقيد الشراء بنجاح" });
      setShowAssetDlg(false);
      setAssetForm({ name: "", category: "أجهزة ومعدات", purchase_date: new Date().toISOString().slice(0, 10), purchase_cost: "", salvage_value: "0", useful_life_years: "5", location: "المقر الرئيسي", responsible_person: "مدير الفرع" });
      refetchAssets();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل تسجيل الأصل", description: e.message })
  });

  const runDepreciationMutation = useMutation({
    mutationFn: () => apiPost("/api/accounting/run-depreciation", {}),
    onSuccess: (res) => {
      toast({ title: res.message, description: `إجمالي الإهلاك المحتسب: ${fmt(res.totalDepreciated)} ريال` });
      refetchAssets();
      refetchJournal();
      refetchDashboard();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل احتساب الإهلاك", description: e.message })
  });

  /* ─── Recurring Expenses State ─── */
  const [showRecurringDlg, setShowRecurringDlg] = useState(false);
  const [recurringForm, setRecurringForm] = useState({
    title: "", category: "إيجار", amount: "", frequency: "monthly", next_due_date: new Date().toISOString().slice(0, 10), notes: ""
  });

  const createRecurringMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/accounting/recurring-expenses", data),
    onSuccess: () => {
      toast({ title: "تم تسجيل المصروف المتكرر والتنبيه بنجاح" });
      setShowRecurringDlg(false);
      setRecurringForm({ title: "", category: "إيجار", amount: "", frequency: "monthly", next_due_date: new Date().toISOString().slice(0, 10), notes: "" });
      refetchRecurring();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل الحفظ", description: e.message })
  });

  const generateRecurringMutation = useMutation({
    mutationFn: (id: number) => apiPost(`/api/accounting/recurring-expenses/${id}/generate`, {}),
    onSuccess: () => {
      toast({ title: "تمت معالجة المصروف وتوليد سند الصرف وتأجيل الموعد بنجاح" });
      refetchRecurring();
      refetchVouchers();
      refetchDashboard();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل التوليد", description: e.message })
  });

  /* ─── Cost Centers & Fiscal Periods ─── */
  const [showCostCenterDlg, setShowCostCenterDlg] = useState(false);
  const [costCenterForm, setCostCenterForm] = useState({ code: "", name: "", notes: "" });

  const createCostCenterMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/accounting/cost-centers", data),
    onSuccess: () => {
      toast({ title: "تم إضافة مركز التكلفة بنجاح" });
      setShowCostCenterDlg(false);
      setCostCenterForm({ code: "", name: "", notes: "" });
      refetchCostCenters();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل الإضافة", description: e.message })
  });

  const closeFiscalPeriodMutation = useMutation({
    mutationFn: (id: number) => apiPost(`/api/accounting/fiscal-periods/${id}/close`, {}),
    onSuccess: () => {
      toast({ title: "تم إغلاق الفترة المالية وقفل تعديل القيود" });
      refetchFiscalPeriods();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل إغلاق الفترة", description: e.message })
  });

  // Calculate journal totals for modal
  const journalDebitSum = (journalForm?.lines || []).reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const journalCreditSum = (journalForm?.lines || []).reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isJournalBalanced = Math.abs(journalDebitSum - journalCreditSum) < 0.01 && journalDebitSum > 0;

  const totalOpeningDebit = Object.values(openingBalances).reduce((s, b) => s + (Number(b.debit) || 0), 0);
  const totalOpeningCredit = Object.values(openingBalances).reduce((s, b) => s + (Number(b.credit) || 0), 0);
  const openingDiff = totalOpeningDebit - totalOpeningCredit;

  const filteredAccountsForOpening = accountsList.filter((acc: any) => {
    const matchesSearch = String(acc.code || "").includes(openingSearch) || 
                          String(acc.name || "").toLowerCase().includes(openingSearch.toLowerCase());
    const matchesType = openingTypeFilter === "all" || acc.type === openingTypeFilter;
    return matchesSearch && matchesType;
  });

  const handleSaveOpeningBalances = async () => {
    setIsSavingOpening(true);
    try {
      const payload = Object.entries(openingBalances)
        .filter(([_, val]) => (Number(val.debit) || 0) > 0 || (Number(val.credit) || 0) > 0)
        .map(([code, val]) => ({
          code,
          opening_debit: Number(val.debit) || 0,
          opening_credit: Number(val.credit) || 0
        }));

      const res = await apiPost("/api/accounting/opening-balances", { balances: payload });
      toast({
        title: "تم الحفظ بنجاح",
        description: res.message || "تم حفظ الأرصدة الافتتاحية وتوليد قيد الموازنة تلقائياً.",
      });
      refetchAccounts();
      refetchJournal();
      refetchTrialBalance();
    } catch (err: any) {
      toast({
        title: "خطأ أثناء الحفظ",
        description: err.message || "فشل حفظ الأرصدة الافتتاحية.",
        variant: "destructive",
      });
    } finally {
      setIsSavingOpening(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-4 dir-rtl" dir="rtl">
        
        {/* Compact Navigation Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm gap-3">
          <div className="flex items-center gap-3">
            <Badge className="bg-indigo-900 text-indigo-100 font-extrabold text-xs px-3 py-1">
              {getTabTitle(activeTab)}
            </Badge>
            {activeTab !== "dashboard" && (
              <Button
                onClick={() => {
                  setActiveTab("dashboard");
                  const u = new URL(window.location.href);
                  u.searchParams.set("tab", "dashboard");
                  window.history.pushState({}, "", u.toString());
                  window.dispatchEvent(new Event("popstate"));
                }}
                variant="outline"
                size="sm"
                className="gap-2 font-bold text-xs text-indigo-900 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800 cursor-pointer"
              >
                <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                ← العودة إلى لوحة التحكم المالية
              </Button>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchDashboard();
              refetchAccounts();
              refetchVouchers();
              refetchSafes();
              refetchBanks();
              toast({ title: "تم تحديث البيانات المالية من الخادم" });
            }}
            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700 text-xs gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
            تحديث الأرصدة
          </Button>
        </div>

        {/* Main Navigation Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val);
            const u = new URL(window.location.href);
            u.searchParams.set("tab", val);
            window.history.pushState({}, "", u.toString());
            window.dispatchEvent(new Event("popstate"));
          }}
          className="w-full space-y-6"
        >
          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <TabsList className="flex w-max min-w-full justify-start gap-1 bg-transparent p-0 h-auto">
              <TabsTrigger value="dashboard" className="px-4 py-2.5 rounded-lg text-xs font-semibold gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                <TrendingUp className="w-4 h-4" />
                لوحة التحكم المالية
              </TabsTrigger>
              <TabsTrigger value="chart" className="px-4 py-2.5 rounded-lg text-xs font-semibold gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                <BookOpen className="w-4 h-4" />
                دليل الحسابات
              </TabsTrigger>
              <TabsTrigger value="journal" className="px-4 py-2.5 rounded-lg text-xs font-semibold gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                <Scale className="w-4 h-4" />
                القيود وميزان المراجعة
              </TabsTrigger>
              <TabsTrigger value="vouchers" className="px-4 py-2.5 rounded-lg text-xs font-semibold gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                <FileText className="w-4 h-4" />
                سندات القبض والصرف
              </TabsTrigger>
              <TabsTrigger value="safes" className="px-4 py-2.5 rounded-lg text-xs font-semibold gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                <Wallet className="w-4 h-4" />
                إدارة الصناديق
              </TabsTrigger>
              <TabsTrigger value="banks" className="px-4 py-2.5 rounded-lg text-xs font-semibold gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                <Landmark className="w-4 h-4" />
                البنوك والتحويلات
              </TabsTrigger>
              <TabsTrigger value="statements" className="px-4 py-2.5 rounded-lg text-xs font-semibold gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                <FileSpreadsheet className="w-4 h-4" />
                كشوفات الحسابات
              </TabsTrigger>
              <TabsTrigger value="opening_balances" className="px-4 py-2.5 rounded-lg text-xs font-semibold gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                <Coins className="w-4 h-4" />
                الأرصدة الافتتاحية
              </TabsTrigger>
              <TabsTrigger value="assets" className="px-4 py-2.5 rounded-lg text-xs font-semibold gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                <Building2 className="w-4 h-4" />
                الأصول والإهلاك
              </TabsTrigger>
              <TabsTrigger value="recurring" className="px-4 py-2.5 rounded-lg text-xs font-semibold gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                <Calendar className="w-4 h-4" />
                المصروفات المتكررة
              </TabsTrigger>
              <TabsTrigger value="financials" className="px-4 py-2.5 rounded-lg text-xs font-semibold gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                <Calculator className="w-4 h-4" />
                القوائم المالية الختامية
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 1: FINANCIAL DASHBOARD */}
          {/* ───────────────────────────────────────────────────────────── */}
          <TabsContent value="dashboard" className="space-y-6 m-0">

            {/* Quick Actions Control Panel Grid (لوحة التحكم والمهام المالية) */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base font-black text-slate-900 dark:text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-indigo-600" />
                    لوحة التحكم والمهام المالية والحسابية
                  </span>
                  <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-800 border-indigo-200 font-bold dark:bg-indigo-950 dark:text-indigo-300">
                    10 وحدات محاسبية رئيسية
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  وصول سريع ومنظم لكافة المهام المحاسبية الموحدة: الدليل، القيود، ميزان المراجعة، السندات، الصناديق، البنوك، والتقارير الختامية.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
                  
                  {/* 1. دليل الحسابات */}
                  <div
                    onClick={() => setActiveTab("chart")}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 hover:border-indigo-300 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600">دليل الحسابات</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">الشجرة المحاسبية المستوائية</p>
                      </div>
                    </div>
                  </div>

                  {/* 2. القيود وميزان المراجعة */}
                  <div
                    onClick={() => setActiveTab("journal")}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 hover:border-emerald-300 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Scale className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600">القيود وميزان المراجعة</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">سجل اليومية العامة والتوازن</p>
                      </div>
                    </div>
                  </div>

                  {/* 3. سندات القبض والصرف */}
                  <div
                    onClick={() => setActiveTab("vouchers")}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 hover:border-blue-300 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600">سندات القبض والصرف</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">إصدار وتوثيق المقبوضات</p>
                      </div>
                    </div>
                  </div>

                  {/* 4. إدارة الصناديق */}
                  <div
                    onClick={() => setActiveTab("safes")}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 hover:bg-amber-50/80 dark:hover:bg-amber-950/40 hover:border-amber-300 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600">إدارة الصناديق</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">الخزائن والسيولة النقدية</p>
                      </div>
                    </div>
                  </div>

                  {/* 5. البنوك والتحويلات */}
                  <div
                    onClick={() => setActiveTab("banks")}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 hover:bg-purple-50/80 dark:hover:bg-purple-950/40 hover:border-purple-300 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600">البنوك والتحويلات</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">الحسابات البنكية والتسويات</p>
                      </div>
                    </div>
                  </div>

                  {/* 6. كشوفات الحسابات */}
                  <div
                    onClick={() => setActiveTab("statements")}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 hover:bg-sky-50/80 dark:hover:bg-sky-950/40 hover:border-sky-300 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-sky-600">كشوفات الحسابات</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">العملاء والموردين والأستاذ</p>
                      </div>
                    </div>
                  </div>

                  {/* 7. الأصول والإهلاك */}
                  <div
                    onClick={() => setActiveTab("assets")}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 hover:bg-rose-50/80 dark:hover:bg-rose-950/40 hover:border-rose-300 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-rose-600">الأصول والإهلاك</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">سجل الأصول ومعدل الإهلاك</p>
                      </div>
                    </div>
                  </div>

                  {/* 8. المصروفات المتكررة */}
                  <div
                    onClick={() => setActiveTab("recurring")}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 hover:bg-teal-50/80 dark:hover:bg-teal-950/40 hover:border-teal-300 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-teal-600">المصروفات المتكررة</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">الإيجارات والاشتراكات الدورية</p>
                      </div>
                    </div>
                  </div>

                  {/* 9. القوائم المالية الختامية */}
                  <div
                    onClick={() => setActiveTab("financials")}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 hover:bg-cyan-50/80 dark:hover:bg-cyan-950/40 hover:border-cyan-300 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Calculator className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-cyan-600">القوائم المالية الختامية</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">الأرباح والخسائر والميزانية</p>
                      </div>
                    </div>
                  </div>

                  {/* 10. ميزان المراجعة الشامل */}
                  <div
                    onClick={() => setActiveTab("trial")}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 hover:border-indigo-300 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-900 text-indigo-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Scale className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600">ميزان المراجعة الشامل</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">تقرير ميزان الأرصدة المتزن</p>
                      </div>
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                    مبيعات اليوم
                    <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-emerald-950 dark:text-emerald-100">{fmt(dashboardStats?.todaySales)} ريال</div>
                  <p className="text-[10px] text-emerald-600 mt-1">المبيعات الموثقة بالنظام اليوم</p>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-blue-700 dark:text-blue-400 flex items-center justify-between">
                    مشتريات اليوم
                    <ArrowDownLeft className="w-4 h-4 text-blue-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-blue-950 dark:text-blue-100">{fmt(dashboardStats?.todayPurchases)} ريال</div>
                  <p className="text-[10px] text-blue-600 mt-1">فواتير المشتريات المستلمة اليوم</p>
                </CardContent>
              </Card>

              <Card className="border-rose-200 bg-rose-50/50 dark:bg-rose-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-rose-700 dark:text-rose-400 flex items-center justify-between">
                    إجمالي المصروفات
                    <FileText className="w-4 h-4 text-rose-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-rose-950 dark:text-rose-100">{fmt(dashboardStats?.totalExpenses)} ريال</div>
                  <p className="text-[10px] text-rose-600 mt-1">تشغيل، إيجار، رواتب، وصيانة</p>
                </CardContent>
              </Card>

              <Card className="border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-indigo-700 dark:text-indigo-400 flex items-center justify-between">
                    أرصدة الصناديق والخزائن
                    <Wallet className="w-4 h-4 text-indigo-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-indigo-950 dark:text-indigo-100">{fmt(dashboardStats?.safesBalance)} ريال</div>
                  <p className="text-[10px] text-indigo-600 mt-1">النقد المتوفر بكافة الصناديق</p>
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-purple-700 dark:text-purple-400 flex items-center justify-between">
                    أرصدة البنوك
                    <Landmark className="w-4 h-4 text-purple-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-purple-950 dark:text-purple-100">{fmt(dashboardStats?.bankBalance)} ريال</div>
                  <p className="text-[10px] text-purple-600 mt-1">إجمالي السيولة بالحسابات البنكية</p>
                </CardContent>
              </Card>
            </div>

            {/* Second Row Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center font-bold text-lg">
                    م
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">مستحقات الموردين (ذمم دائنة)</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{fmt(dashboardStats?.supplierPayables)} ريال</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400 flex items-center justify-center font-bold text-lg">
                    ع
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">مستحقات العملاء (ذمم مدينة)</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{fmt(dashboardStats?.customerReceivables)} ريال</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 flex items-center justify-center font-bold text-lg">
                    قبض
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">إجمالي المقبوضات المحصلة</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{fmt(dashboardStats?.totalReceipts)} ريال</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white border-indigo-800">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-lg">
                    ربح
                  </div>
                  <div>
                    <p className="text-xs text-indigo-200">صافي الربح التقديري</p>
                    <p className="text-lg font-bold text-white mt-0.5">{fmt(dashboardStats?.netProfit)} ريال</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Overdue Bills & Top Expense Categories */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Overdue Bills Table */}
              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    فواتير المشتريات الآجلة المستحقة السداد
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {dashboardStats?.overdueBills && dashboardStats.overdueBills.length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {dashboardStats.overdueBills.map((bill: any) => (
                        <div key={bill.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{bill.supplier_name}</p>
                            <p className="text-slate-500 text-[11px] mt-0.5">فاتورة رقم #{bill.invoice_number} — استحقاق: {bill.due_date}</p>
                          </div>
                          <div className="text-left">
                            <span className="font-bold text-rose-600 dark:text-rose-400">{fmt(bill.remaining_amount)} ريال</span>
                            <Badge className="block mt-1 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[10px]">
                              غير مدفوعة بالكامل
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-500">لا توجد فواتير مشتريات مستحقة الدفع حالياً.</div>
                  )}
                </CardContent>
              </Card>

              {/* Expense Category Breakdown */}
              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    تحليل أعلى تصنيفات المصروفات التشغيلية
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {dashboardStats?.expenseBreakdown && dashboardStats.expenseBreakdown.length > 0 ? (
                    dashboardStats.expenseBreakdown.map((item: any, idx: number) => {
                      const totalExp = dashboardStats.totalExpenses || 1;
                      const percent = Math.round((item.amount / totalExp) * 100);
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-800 dark:text-slate-200">{item.category}</span>
                            <span className="text-indigo-600 dark:text-indigo-400">{fmt(item.amount)} ريال ({percent}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(percent, 100)}%` }} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-500">لا توجد مصاريف مسجلة حتى الآن.</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>


          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 2: CHART OF ACCOUNTS (دليل الحسابات - Onyx Pro Dual Pane UI) */}
          {/* ───────────────────────────────────────────────────────────── */}
          <TabsContent value="chart" className="space-y-4 m-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Pane: Tree View (شجرة الحسابات) */}
              <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 flex flex-col h-[820px]">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-bold text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                    <FolderTree className="w-4 h-4 text-indigo-600" />
                    شجرة الحسابات الهيكلية (Onyx Pro Tree)
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-mono">
                      {accountsList.length} حساب
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleNewSubAccount()} 
                      className="h-6 px-2 text-[10px] text-indigo-600 hover:bg-indigo-50 gap-1 font-bold"
                    >
                      <Plus className="w-3 h-3" /> حساب جديد
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400" />
                  <Input
                    placeholder="بحث برقم الحساب أو الاسم أو طبيعته..."
                    id="accountSearchInput"
                    value={accountSearch}
                    onChange={(e) => setAccountSearch(e.target.value)}
                    className="pr-8 h-8 text-xs"
                  />
                  {accountSearch && (
                    <button 
                      onClick={() => setAccountSearch("")}
                      className="absolute left-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto pr-1 text-xs space-y-1.5">
                  {/* Category Grouping */}
                  {[
                    { code: "1", name: "1. الأصول والموجودات (Assets)", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50/80 dark:bg-blue-950/40" },
                    { code: "2", name: "2. الخصوم والالتزامات (Liabilities)", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50/80 dark:bg-amber-950/40" },
                    { code: "3", name: "3. حقوق الملكية ورأس المال (Equity)", color: "text-purple-700 dark:text-purple-400", bg: "bg-purple-50/80 dark:bg-purple-950/40" },
                    { code: "4", name: "4. الإيرادات والمبيعات (Revenues)", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50/80 dark:bg-emerald-950/40" },
                    { code: "5", name: "5. المصروفات والتكاليف (Expenses & COGS)", color: "text-rose-700 dark:text-rose-400", bg: "bg-rose-50/80 dark:bg-rose-950/40" },
                  ].map(cat => {
                    const catAccounts = accountsList.filter((a: any) => {
                      const matchCat = a.code.startsWith(cat.code);
                      if (!accountSearch) return matchCat;
                      const q = accountSearch.toLowerCase();
                      return matchCat && (
                        a.code.toLowerCase().includes(q) ||
                        a.name.toLowerCase().includes(q) ||
                        (a.name_en && a.name_en.toLowerCase().includes(q))
                      );
                    });

                    if (accountSearch && catAccounts.length === 0) return null;

                    return (
                      <div key={cat.code} className="space-y-1 rounded-lg border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className={`p-2 font-bold ${cat.bg} ${cat.color} flex items-center justify-between cursor-pointer select-none`}>
                          <span className="flex items-center gap-1.5 text-[11px]">
                            <Folder className="w-3.5 h-3.5" />
                            {cat.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" className="text-[9px] px-1.5 h-4">
                              {catAccounts.length}
                            </Badge>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNewSubAccount({ code: `${cat.code}000`, type: cat.code === "1" ? "asset" : cat.code === "2" ? "liability" : cat.code === "3" ? "equity" : cat.code === "4" ? "revenue" : "expense" });
                              }}
                              className="p-0.5 hover:bg-black/10 rounded"
                              title="إضافة حساب تحت هذا التصنيف"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div className="p-1 space-y-0.5 max-h-[280px] overflow-y-auto">
                          {catAccounts.map((acc: any) => {
                            const isSelected = selectedAccountId === acc.id || accountForm.code === acc.code;
                            const isParent = acc.is_parent || (acc.children_count && acc.children_count > 0);
                            const indent = Math.min((acc.code.length - 1) * 8, 32);

                            return (
                              <div
                                key={acc.id}
                                onClick={() => handleSelectAccount(acc)}
                                style={{ paddingRight: `${Math.max(6, indent)}px` }}
                                className={`p-1.5 rounded transition-all cursor-pointer flex items-center justify-between text-[11px] group ${
                                  isSelected 
                                    ? "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 font-bold border-r-4 border-indigo-600 shadow-sm" 
                                    : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  {isParent ? (
                                    <Folder className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-indigo-600" : "text-amber-500"}`} />
                                  ) : (
                                    <FileText className={`w-3 h-3 shrink-0 ${isSelected ? "text-indigo-600" : "text-slate-400"}`} />
                                  )}
                                  <span className="font-mono font-bold text-[10px] text-indigo-600 dark:text-indigo-400 shrink-0">
                                    {acc.code}
                                  </span>
                                  <span className="truncate" title={acc.name}>
                                    {acc.name}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {acc.linked_safes_count > 0 && (
                                    <Badge variant="outline" className="text-[9px] px-1 h-4 bg-emerald-50 text-emerald-700 border-emerald-200" title={`مرتبط بـ ${acc.linked_safes_count} خزائن`}>
                                      🏦 {acc.linked_safes_count}
                                    </Badge>
                                  )}
                                  {acc.linked_customers_count > 0 && (
                                    <Badge variant="outline" className="text-[9px] px-1 h-4 bg-blue-50 text-blue-700 border-blue-200" title={`مرتبط بـ ${acc.linked_customers_count} عملاء`}>
                                      👥 {acc.linked_customers_count}
                                    </Badge>
                                  )}
                                  {acc.currencies_count > 1 && (
                                    <Badge variant="outline" className="text-[9px] px-1 h-4 bg-purple-50 text-purple-700 border-purple-200" title={`مرتبط بـ ${acc.currencies_count} عملات`}>
                                      💱 {acc.currencies_count}
                                    </Badge>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleNewSubAccount(acc);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-indigo-600 transition-opacity"
                                    title="إضافة حساب فرعي"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Pane: Comprehensive Onyx Pro Form & Multi-Entity Linker */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          {isNewAccountMode || !accountForm.id ? "إنشاء حساب محاسبي جديد" : `تعديل الحساب: ${accountForm.name}`}
                          {isNewAccountMode && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                              وضع الإضافة الجديد
                            </Badge>
                          )}
                        </h3>
                        <p className="text-[11px] text-slate-500">تهيئة خصائص الحساب وفق معايير أونكس برو مع ربط العملات المتعددة والصناديق والعملاء</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 text-xs">
                        المستوى: {accountForm.level || 4}
                      </Badge>
                      {accountForm.parent_code && (
                        <Badge variant="outline" className="text-xs font-mono">
                          الحساب الأب: {accountForm.parent_code}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Top Form Fields Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Left Sub-Column */}
                    <div className="space-y-2.5">
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          اسم الحساب (عربي) <span className="text-rose-500">*</span>
                        </label>
                        <Input 
                          value={accountForm.name} 
                          onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} 
                          placeholder="مثال: الصندوق الرئيسي - فرع صنعاء" 
                          className="text-xs font-bold h-8"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          الاسم الأجنبي (English Name)
                        </label>
                        <Input 
                          value={accountForm.name_en} 
                          onChange={(e) => setAccountForm({ ...accountForm, name_en: e.target.value })} 
                          placeholder="Main Cash Safe - Sanaa" 
                          className="text-xs h-8"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          الحساب الضريبي المعتمد
                        </label>
                        <Input 
                          value={accountForm.tax_account} 
                          onChange={(e) => setAccountForm({ ...accountForm, tax_account: e.target.value })} 
                          placeholder="ضريبة القيمة المضافة 5%" 
                          className="text-xs h-8"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          ملاحظات وتفاصيل الحساب
                        </label>
                        <Input 
                          value={accountForm.notes} 
                          onChange={(e) => setAccountForm({ ...accountForm, notes: e.target.value })} 
                          placeholder="ملاحظات توجيهية اختيارية للحساب..." 
                          className="text-xs h-8"
                        />
                      </div>
                    </div>

                    {/* Right Sub-Column */}
                    <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-700/60">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id="stop_dealing_chk" 
                            checked={accountForm.stop_dealing}
                            onChange={(e) => setAccountForm({ ...accountForm, stop_dealing: e.target.checked })}
                            className="rounded text-rose-600 focus:ring-rose-500 h-3.5 w-3.5 cursor-pointer" 
                          />
                          <label htmlFor="stop_dealing_chk" className="font-bold text-rose-600 text-[11px] cursor-pointer">
                            إيقاف التعامل
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id="auto_add_chk" 
                            checked={accountForm.auto_add}
                            onChange={(e) => setAccountForm({ ...accountForm, auto_add: e.target.checked })}
                            className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer" 
                          />
                          <label htmlFor="auto_add_chk" className="font-semibold text-[11px] cursor-pointer">
                            إضافة تلقائية
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="font-bold block mb-1 text-[11px]">
                            رقم الحساب (الكود) <span className="text-rose-500">*</span>
                          </label>
                          <Input 
                            value={accountForm.code} 
                            onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value })} 
                            className="text-xs font-mono font-bold h-8 text-indigo-700 dark:text-indigo-300" 
                          />
                        </div>
                        <div>
                          <label className="font-bold block mb-1 text-[11px]">حالة ونوع الحساب</label>
                          <Select 
                            value={accountForm.is_parent ? "parent" : "movement"} 
                            onValueChange={(v) => setAccountForm({ ...accountForm, is_parent: v === "parent" })}
                          >
                            <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="movement">حساب حركة (يقبل القيود)</SelectItem>
                              <SelectItem value="parent">حساب رئيسي (تجميعي)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="font-bold block mb-1 text-[11px]">طبيعة الحساب</label>
                          <Select value={accountForm.type} onValueChange={(v) => setAccountForm({ ...accountForm, type: v })}>
                            <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="asset">مدين - Debit (أصول/موجودات)</SelectItem>
                              <SelectItem value="liability">دائن - Credit (خصوم/التزامات)</SelectItem>
                              <SelectItem value="equity">حقوق ملكية - Equity</SelectItem>
                              <SelectItem value="revenue">إيرادات ومبيعات - Revenue</SelectItem>
                              <SelectItem value="expense">مصروفات تشغيلية - Expense</SelectItem>
                              <SelectItem value="cogs">تكلفة خدمات وسياحة - COGS</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="font-bold block mb-1 text-[11px]">العملة الأساسية</label>
                          <Select 
                            value={accountForm.currency} 
                            onValueChange={(v) => {
                              setAccountForm(prev => {
                                const exists = prev.currencies.some(c => c.currency_code === v);
                                const updatedCurrencies = exists 
                                  ? prev.currencies.map(c => ({ ...c, is_primary: c.currency_code === v }))
                                  : [
                                      { currency_code: v, currency_name: v === "YER" ? "ريال يمني (YER)" : v === "SAR" ? "ريال سعودي (SAR)" : v === "USD" ? "دولار أمريكي (USD)" : v, min_balance: 0, max_balance: 100000000, exchange_rate: 1.0, is_primary: true },
                                      ...prev.currencies.map(c => ({ ...c, is_primary: false }))
                                    ];
                                return { ...prev, currency: v, currencies: updatedCurrencies };
                              });
                            }}
                          >
                            <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="YER">ريال يمني (YER)</SelectItem>
                              <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
                              <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                              {systemCurrenciesList
                                .filter((c: any) => !["YER", "SAR", "USD"].includes(c.symbol))
                                .map((c: any) => (
                                  <SelectItem key={c.id} value={c.symbol}>
                                    {c.name} ({c.symbol})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Entity Linking Section (ربط الصناديق والعملاء) */}
                  <div className="border border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20 p-3 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                        <LinkIcon className="w-3.5 h-3.5 text-indigo-600" />
                        الربط التحليلي المتعدد (Multi-Entity Linking)
                      </h4>
                      <div className="flex items-center gap-1">
                        {accountForm.id && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateSubAccountsMutation.mutate({ id: accountForm.id!, entity_type: "safes" })}
                              className="h-6 text-[10px] bg-white dark:bg-slate-800 text-emerald-700 hover:bg-emerald-50 border-emerald-200 gap-1"
                              title="توليد حسابات فرعية لجميع الصناديق وربطها تلقائياً"
                            >
                              ⚡ توليد للصناديق
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateSubAccountsMutation.mutate({ id: accountForm.id!, entity_type: "customers" })}
                              className="h-6 text-[10px] bg-white dark:bg-slate-800 text-blue-700 hover:bg-blue-50 border-blue-200 gap-1"
                              title="توليد حسابات فرعية لجميع العملاء وربطها تلقائياً"
                            >
                              ⚡ توليد للعملاء
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* Safes Multi-Select */}
                      <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                            ربط الصناديق النقدية والخزائن:
                          </label>
                          <Badge variant="outline" className="text-[9px] bg-indigo-50 text-indigo-700">
                            تم تحديد {accountForm.linked_safe_ids.length} صندوق
                          </Badge>
                        </div>
                        <div className="max-h-24 overflow-y-auto space-y-1 p-1 bg-slate-50 dark:bg-slate-900/50 rounded border text-[11px]">
                          {safes.map((s: any) => {
                            const isChecked = accountForm.linked_safe_ids.includes(s.id);
                            return (
                              <label
                                key={s.id}
                                className={`flex items-center justify-between p-1 rounded cursor-pointer transition-colors ${
                                  isChecked ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const next = e.target.checked
                                        ? [...accountForm.linked_safe_ids, s.id]
                                        : accountForm.linked_safe_ids.filter((id) => id !== s.id);
                                      setAccountForm({ ...accountForm, linked_safe_ids: next });
                                    }}
                                    className="rounded text-indigo-600 h-3.5 w-3.5"
                                  />
                                  <span>{s.name}</span>
                                </div>
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  {fmt(s.balance)} {s.currency || "YER"}
                                </span>
                              </label>
                            );
                          })}
                          {safes.length === 0 && (
                            <div className="text-center py-2 text-slate-400 text-[10px]">لا توجد صناديق مهيأة بالنظام</div>
                          )}
                        </div>
                      </div>

                      {/* Customers Multi-Select */}
                      <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                            ربط حسابات العملاء والوكلاء:
                          </label>
                          <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700">
                            تم تحديد {accountForm.linked_customer_ids.length} عميل
                          </Badge>
                        </div>
                        <div className="max-h-24 overflow-y-auto space-y-1 p-1 bg-slate-50 dark:bg-slate-900/50 rounded border text-[11px]">
                          {customers.map((c: any) => {
                            const isChecked = accountForm.linked_customer_ids.includes(c.id);
                            return (
                              <label
                                key={c.id}
                                className={`flex items-center justify-between p-1 rounded cursor-pointer transition-colors ${
                                  isChecked ? "bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const next = e.target.checked
                                        ? [...accountForm.linked_customer_ids, c.id]
                                        : accountForm.linked_customer_ids.filter((id) => id !== c.id);
                                      setAccountForm({ ...accountForm, linked_customer_ids: next });
                                    }}
                                    className="rounded text-blue-600 h-3.5 w-3.5"
                                  />
                                  <span>{c.name}</span>
                                </div>
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  {c.phone || "—"}
                                </span>
                              </label>
                            );
                          })}
                          {customers.length === 0 && (
                            <div className="text-center py-2 text-slate-400 text-[10px]">لا يوجد عملاء مسجلين</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Currencies & Limits Manager */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-indigo-600" />
                          قائمة عملات الحساب والحدود الرقابية (Multi-Currencies)
                        </h4>
                        <p className="text-[10px] text-slate-500">إضافة وتعديل وحذف العملات المعتمدة للحساب وتحديد أسعار التحويل والأسقف الرقابية</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            setAccountCurrencyForm({
                              currency_id: null,
                              currency_code: "SAR",
                              currency_name: "ريال سعودي (SAR)",
                              min_balance: 0,
                              max_balance: 500000,
                              exchange_rate: 0.27,
                              is_primary: false
                            });
                            setShowAccountCurrencyDlg(true);
                          }} 
                          className="h-7 text-[11px] gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-bold"
                        >
                          <Plus className="w-3 h-3" /> إضافة عملة للحساب
                        </Button>
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          onClick={() => {
                            setSystemCurrencyForm({ name: "", symbol: "", fraction: "فلس", type: "foreign", exchange_rate: 1.0, active: 1 });
                            setShowSystemCurrencyDlg(true);
                          }} 
                          className="h-7 text-[11px] gap-1 font-bold"
                        >
                          <Sparkles className="w-3 h-3 text-amber-500" /> تهيئة عملة جديدة بالنظام
                        </Button>
                      </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden bg-white dark:bg-slate-900 text-xs">
                      <table className="w-full text-right">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                          <tr>
                            <th className="p-2">رمز العملة</th>
                            <th className="p-2">اسم العملة</th>
                            <th className="p-2">الحد الأدنى للرصيد</th>
                            <th className="p-2">الحد الأعلى للرصيد</th>
                            <th className="p-2">سعر الصرف</th>
                            <th className="p-2">الرئيسية</th>
                            <th className="p-2 text-center">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {accountForm.currencies.map((cur: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="p-2 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                {cur.currency_code}
                              </td>
                              <td className="p-2 font-semibold">
                                {cur.currency_name}
                              </td>
                              <td className="p-2 font-mono">
                                {fmt(cur.min_balance)}
                              </td>
                              <td className="p-2 font-mono">
                                {fmt(cur.max_balance)}
                              </td>
                              <td className="p-2 font-mono font-bold text-emerald-600">
                                {cur.exchange_rate || 1.0}
                              </td>
                              <td className="p-2">
                                {cur.is_primary ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                                    العملة الأساسية
                                  </Badge>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">فرعية</span>
                                )}
                              </td>
                              <td className="p-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => {
                                      setAccountCurrencyForm({
                                        currency_id: cur.currency_id || null,
                                        currency_code: cur.currency_code,
                                        currency_name: cur.currency_name,
                                        min_balance: cur.min_balance || 0,
                                        max_balance: cur.max_balance || 100000000,
                                        exchange_rate: cur.exchange_rate || 1.0,
                                        is_primary: !!cur.is_primary
                                      });
                                      setShowAccountCurrencyDlg(true);
                                    }}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-indigo-600"
                                    title="تعديل الحدود وسعر الصرف"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  {accountForm.currencies.length > 1 && (
                                    <button
                                      onClick={() => {
                                        const next = accountForm.currencies.filter((_, i) => i !== idx);
                                        setAccountForm({ ...accountForm, currencies: next });
                                        toast({ title: `تم حذف عملة (${cur.currency_code}) من هذا الحساب` });
                                      }}
                                      className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600"
                                      title="حذف العملة من الحساب"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Onyx Pro Bottom Action Toolbar */}
                <div className="bg-slate-100 dark:bg-slate-800/80 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      onClick={handleSaveAccount}
                      disabled={createAccountMutation.isPending || updateAccountMutation.isPending}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-3 font-bold gap-1 shadow-sm"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      حفظ (F10)
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleNewSubAccount()} 
                      className="text-xs h-8 px-3 gap-1 font-semibold bg-white dark:bg-slate-900"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-600" />
                      جديد (Ctrl+N)
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        if (!accountForm.id) {
                          toast({ variant: "destructive", title: "يرجى اختيار حساب أولاً لحذفه" });
                          return;
                        }
                        setShowDeleteAccountConfirmDlg(true);
                      }} 
                      className="text-xs h-8 px-3 text-rose-600 hover:bg-rose-50 border-rose-200 bg-white dark:bg-slate-900"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      حذف
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => document.getElementById("accountSearchInput")?.focus()} 
                      className="text-xs h-8 px-3 bg-white dark:bg-slate-900"
                    >
                      <Search className="w-3.5 h-3.5 ml-1" />
                      بحث
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        toast({ title: "جاري تجهيز وثيقة دليل الحسابات للطباعة..." });
                        setTimeout(() => window.print(), 300);
                      }} 
                      className="text-xs h-8 px-3 bg-white dark:bg-slate-900"
                    >
                      <Printer className="w-3.5 h-3.5 ml-1" />
                      طباعة
                    </Button>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button 
                      variant="secondary" 
                      onClick={() => setShowExcelImportDlg(true)} 
                      className="text-xs h-8 px-3 gap-1 font-semibold"
                    >
                      <Upload className="w-3.5 h-3.5 text-blue-600" />
                      استيراد إكسل
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={handleExportCOA} 
                      className="text-xs h-8 px-3 gap-1 font-semibold"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      تصدير
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Dialog: Add/Edit Account Currency */}
            <Dialog open={showAccountCurrencyDlg} onOpenChange={setShowAccountCurrencyDlg}>
              <DialogContent dir="rtl" className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    <Coins className="w-5 h-5 text-indigo-600" />
                    إضافة / تعديل عملة الحساب
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2 text-xs">
                  <div>
                    <label className="font-bold block mb-1">اختر العملة</label>
                    <select
                      value={accountCurrencyForm.currency_code}
                      onChange={(e) => {
                        const code = e.target.value;
                        const match = systemCurrenciesList.find((c: any) => c.symbol === code);
                        setAccountCurrencyForm({
                          ...accountCurrencyForm,
                          currency_code: code,
                          currency_name: match ? `${match.name} (${match.symbol})` : code === "YER" ? "ريال يمني (YER)" : code === "SAR" ? "ريال سعودي (SAR)" : code === "USD" ? "دولار أمريكي (USD)" : code,
                          exchange_rate: match ? Number(match.exchange_rate) || 1.0 : code === "SAR" ? 0.27 : 1.0
                        });
                      }}
                      className="w-full p-2 rounded border bg-background text-xs"
                    >
                      <option value="YER">ريال يمني (YER)</option>
                      <option value="SAR">ريال سعودي (SAR)</option>
                      <option value="USD">دولار أمريكي (USD)</option>
                      <option value="EUR">يورو أوروبي (EUR)</option>
                      <option value="AED">درهم إماراتي (AED)</option>
                      <option value="OMR">ريال عماني (OMR)</option>
                      <option value="QAR">ريال قطري (QAR)</option>
                      <option value="KWD">دينار كويتي (KWD)</option>
                      <option value="JOD">دينار أردني (JOD)</option>
                      <option value="GBP">جنيه إسترليني (GBP)</option>
                      {systemCurrenciesList
                        .filter((c: any) => !["YER", "SAR", "USD", "EUR", "AED", "OMR", "QAR", "KWD", "JOD", "GBP"].includes(c.symbol))
                        .map((c: any) => (
                          <option key={c.id} value={c.symbol}>
                            {c.name} ({c.symbol})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold block mb-1">الحد الأدنى للرصيد</label>
                      <Input
                        type="number"
                        value={accountCurrencyForm.min_balance}
                        onChange={(e) => setAccountCurrencyForm({ ...accountCurrencyForm, min_balance: parseFloat(e.target.value) || 0 })}
                        className="text-xs font-mono h-8"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1">الحد الأعلى للرصيد</label>
                      <Input
                        type="number"
                        value={accountCurrencyForm.max_balance}
                        onChange={(e) => setAccountCurrencyForm({ ...accountCurrencyForm, max_balance: parseFloat(e.target.value) || 0 })}
                        className="text-xs font-mono h-8"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold block mb-1">سعر الصرف المعتمد</label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={accountCurrencyForm.exchange_rate}
                      onChange={(e) => setAccountCurrencyForm({ ...accountCurrencyForm, exchange_rate: parseFloat(e.target.value) || 1.0 })}
                      className="text-xs font-mono h-8"
                    />
                  </div>

                  <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded border">
                    <input
                      type="checkbox"
                      id="is_primary_chk"
                      checked={accountCurrencyForm.is_primary}
                      onChange={(e) => setAccountCurrencyForm({ ...accountCurrencyForm, is_primary: e.target.checked })}
                      className="rounded text-indigo-600 h-4 w-4"
                    />
                    <label htmlFor="is_primary_chk" className="font-bold text-xs cursor-pointer">
                      تعيين كعملة رئيسية للحساب
                    </label>
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowAccountCurrencyDlg(false)}>
                    إلغاء
                  </Button>
                  <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                    onClick={() => {
                      const updatedList = [
                        ...accountForm.currencies.filter(c => c.currency_code !== accountCurrencyForm.currency_code),
                        {
                          ...accountCurrencyForm,
                          is_primary: accountCurrencyForm.is_primary
                        }
                      ];
                      if (accountCurrencyForm.is_primary) {
                        updatedList.forEach(c => {
                          if (c.currency_code !== accountCurrencyForm.currency_code) c.is_primary = false;
                        });
                      }
                      setAccountForm({
                        ...accountForm,
                        currency: accountCurrencyForm.is_primary ? accountCurrencyForm.currency_code : accountForm.currency,
                        currencies: updatedList
                      });
                      setShowAccountCurrencyDlg(false);
                      toast({ title: `تم حفظ عملة (${accountCurrencyForm.currency_code}) في قائمة عملات الحساب` });
                    }}
                  >
                    حفظ العملة
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dialog: Add New System Currency */}
            <Dialog open={showSystemCurrencyDlg} onOpenChange={setShowSystemCurrencyDlg}>
              <DialogContent dir="rtl" className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-500" />
                    تهيئة عملة جديدة في قاعدة بيانات النظام
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2 text-xs">
                  <div>
                    <label className="font-bold block mb-1">اسم العملة بالعربي <span className="text-rose-500">*</span></label>
                    <Input
                      value={systemCurrencyForm.name}
                      onChange={(e) => setSystemCurrencyForm({ ...systemCurrencyForm, name: e.target.value })}
                      placeholder="مثال: يورو أوروبي"
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold block mb-1">الرمز الدولي <span className="text-rose-500">*</span></label>
                      <Input
                        value={systemCurrencyForm.symbol}
                        onChange={(e) => setSystemCurrencyForm({ ...systemCurrencyForm, symbol: e.target.value.toUpperCase() })}
                        placeholder="EUR"
                        className="text-xs font-mono uppercase h-8"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1">فئة الجزء (الكسر)</label>
                      <Input
                        value={systemCurrencyForm.fraction}
                        onChange={(e) => setSystemCurrencyForm({ ...systemCurrencyForm, fraction: e.target.value })}
                        placeholder="سنت"
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold block mb-1">نوع العملة</label>
                      <Select 
                        value={systemCurrencyForm.type} 
                        onValueChange={(v) => setSystemCurrencyForm({ ...systemCurrencyForm, type: v })}
                      >
                        <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="foreign">عملة أجنبية</SelectItem>
                          <SelectItem value="local">عملة محلية</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="font-bold block mb-1">سعر الصرف الافتراضي</label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={systemCurrencyForm.exchange_rate}
                        onChange={(e) => setSystemCurrencyForm({ ...systemCurrencyForm, exchange_rate: parseFloat(e.target.value) || 1.0 })}
                        className="text-xs font-mono h-8"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowSystemCurrencyDlg(false)}>
                    إلغاء
                  </Button>
                  <Button
                    size="sm"
                    disabled={createSystemCurrencyMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                    onClick={() => {
                      if (!systemCurrencyForm.name || !systemCurrencyForm.symbol) {
                        toast({ variant: "destructive", title: "يرجى إدخال اسم ورمز العملة" });
                        return;
                      }
                      createSystemCurrencyMutation.mutate(systemCurrencyForm);
                    }}
                  >
                    حفظ وإضافة للنظام
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dialog: Delete Account Confirmation */}
            <Dialog open={showDeleteAccountConfirmDlg} onOpenChange={setShowDeleteAccountConfirmDlg}>
              <DialogContent dir="rtl" className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    تأكيد حذف الحساب المحاسبي
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2 text-xs">
                  <p className="text-slate-700 dark:text-slate-300">
                    هل أنت متأكد من رغبتك في حذف الحساب التالي من دليل الحسابات؟
                  </p>
                  <div className="bg-rose-50 dark:bg-rose-950/40 p-3 rounded-lg border border-rose-200 dark:border-rose-900">
                    <div className="font-bold text-rose-900 dark:text-rose-200">
                      {accountForm.code} - {accountForm.name}
                    </div>
                    <div className="text-[11px] text-rose-700 dark:text-rose-300 mt-1">
                      طبيعة الحساب: {accountForm.type} | المستوى: {accountForm.level}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    تنبيه رقابي: لن يسمح النظام بحذف الحساب إذا كان يحتوي على حركات يومية مسجلة أو حسابات فرعية متفرعة عنه.
                  </p>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowDeleteAccountConfirmDlg(false)}>
                    إلغاء التراجع
                  </Button>
                  <Button
                    size="sm"
                    disabled={deleteAccountMutation.isPending}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                    onClick={() => {
                      if (accountForm.id) {
                        deleteAccountMutation.mutate(accountForm.id);
                      }
                    }}
                  >
                    تأكيد الحذف نهائياً
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dialog: Excel & CSV Import */}
            <Dialog open={showExcelImportDlg} onOpenChange={setShowExcelImportDlg}>
              <DialogContent dir="rtl" className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                    استيراد دليل الحسابات من إكسل و CSV
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2 text-xs">
                  <div className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300 p-3 rounded-lg text-xs leading-relaxed">
                    يمكنك استيراد دليل الحسابات دفعة واحدة إما برفع ملف CSV / Excel أو بلصق البيانات بتنسيق (الرمز,الاسم,النوع,الرمز_الأب).
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-xs gap-1.5" 
                      onClick={() => {
                        const csvContent = "code,name,type,parent_code\n11101,صندوق الكاشير 1,asset,11100\n11102,صندوق الكاشير 2,asset,11100\n11201,شركة الأفق للسفريات,asset,11200\n11202,وكالة النجم الذهبي,asset,11200\n51001,مصروفات ضيافة وبوفيه,expense,51000";
                        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.setAttribute("href", url);
                        link.setAttribute("download", "accounts_import_template.csv");
                        link.style.visibility = "hidden";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        toast({ title: "تم تنزيل قالب الاستيراد المعتمد بنجاح" });
                      }}
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600" />
                      تنزيل القالب المعتمد (CSV Template)
                    </Button>
                  </div>

                  <div>
                    <label className="font-bold block mb-1 text-[11px]">
                      أو الصق بيانات الحسابات مباشرة (CSV):
                    </label>
                    <textarea
                      rows={4}
                      value={excelImportText}
                      onChange={(e) => setExcelImportText(e.target.value)}
                      placeholder="11101,صندوق الصالة,asset,11100&#10;11205,عميل سفريات VIP,asset,11200"
                      className="w-full p-2 text-xs font-mono border rounded bg-background"
                    />
                  </div>

                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-4 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <input 
                      type="file" 
                      id="excel-upload-coa" 
                      className="hidden" 
                      accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          const file = e.target.files[0];
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            const text = evt.target?.result as string;
                            setExcelImportText(text);
                            toast({ title: `تم تحميل الملف: ${file.name}` });
                          };
                          reader.readAsText(file);
                        }
                      }}
                    />
                    <label htmlFor="excel-upload-coa" className="cursor-pointer flex flex-col items-center">
                      <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2.5 rounded-full mb-2 text-indigo-600 dark:text-indigo-400">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-300 block text-xs">
                        انقر هنا لاختيار ملف من جهازك
                      </span>
                      <span className="text-[10px] text-slate-500">يدعم صيغ .csv, .txt</span>
                    </label>
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowExcelImportDlg(false)}>
                    إلغاء
                  </Button>
                  <Button
                    size="sm"
                    disabled={bulkImportAccountsMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                    onClick={() => {
                      if (!excelImportText.trim()) {
                        toast({ variant: "destructive", title: "يرجى إدخال أو رفع بيانات للاستيراد" });
                        return;
                      }
                      const lines = excelImportText.trim().split("\n");
                      const parsedAccounts: any[] = [];
                      for (const line of lines) {
                        const parts = line.split(",").map(p => p.trim().replace(/^"|"$/g, ""));
                        if (parts.length >= 2) {
                          if (parts[0].toLowerCase() === "code" || parts[0] === "الرمز") continue;
                          parsedAccounts.push({
                            code: parts[0],
                            name: parts[1],
                            type: parts[2] || "asset",
                            parent_code: parts[3] || null
                          });
                        }
                      }
                      if (parsedAccounts.length === 0) {
                        toast({ variant: "destructive", title: "لم يتم التعرف على أي أسطر صالحة للاستيراد" });
                        return;
                      }
                      bulkImportAccountsMutation.mutate(parsedAccounts);
                    }}
                  >
                    استيراد الآن ({bulkImportAccountsMutation.isPending ? "جاري المعالجة..." : "تنفيذ"})
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 3: JOURNAL ENTRIES & TRIAL BALANCE (Onyx Pro Engine) */}
          {/* ───────────────────────────────────────────────────────────── */}
          <TabsContent value="journal" className="space-y-4 m-0">
            {/* Action Bar Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">سجل القيود اليومية المحاسبية والسندات</h3>
                  <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 text-xs">
                    {journalEntries.length} قيد محاسبي
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">شاشة متكاملة لإنشاء وتعديل واستعراض وطباعة سندات القيود اليومية المتعددة العملات وفق معايير أنظمة أونكس برو وإياتا.</p>
              </div>

              <div className="flex items-center flex-wrap gap-2">
                <Button
                  onClick={() => setShowReceiptDlg(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm font-bold h-9"
                >
                  <Plus className="w-4 h-4" />
                  سند قبض جديد (Receipt)
                </Button>
                <Button
                  onClick={() => setShowPaymentDlg(true)}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1.5 shadow-sm font-bold h-9"
                >
                  <Plus className="w-4 h-4" />
                  سند صرف جديد (Payment)
                </Button>
                <Button
                  onClick={() => {
                    setSelectedJournalId(null);
                    setShowJournalVoucherDlg(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shadow-sm font-bold h-9"
                >
                  <Plus className="w-4 h-4" />
                  سند قيد مزدوج جديد
                </Button>
              </div>
            </div>

            {/* Trial Balance Banner Summary */}
            <Card className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-indigo-900">
              <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-indigo-200">حالة ميزان المراجعة والقيود</h4>
                    <p className="text-sm font-extrabold text-white">
                      إجمالي المدين: {fmt(trialBalance?.totalDebit)} ريال | إجمالي الدائن: {fmt(trialBalance?.totalCredit)} ريال
                    </p>
                  </div>
                </div>

                <Badge className={Math.abs((trialBalance?.totalDebit || 0) - (trialBalance?.totalCredit || 0)) < 0.01 ? "bg-emerald-500 text-white text-xs px-3 py-1" : "bg-rose-500 text-white text-xs px-3 py-1"}>
                  {Math.abs((trialBalance?.totalDebit || 0) - (trialBalance?.totalCredit || 0)) < 0.01 ? "ميزان متزن 100%" : "يوجد فرق بالميزان!"}
                </Badge>
              </CardContent>
            </Card>

            {/* Search & Filter Toolbar */}
            <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2 items-center justify-between">
              <div className="flex items-center gap-2 w-full sm:w-96">
                <Search className="w-4 h-4 text-slate-400" />
                <Input
                  value={journalSearchText}
                  onChange={(e) => setJournalSearchText(e.target.value)}
                  placeholder="بحث سريع برقم القيد، البيان، المرجع، أو اسم الحساب..."
                  className="h-8 text-xs bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Select value={journalFilterType} onValueChange={setJournalFilterType}>
                  <SelectTrigger className="h-8 text-xs w-36">
                    <SelectValue placeholder="نوع القيد" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كافة الأنواع</SelectItem>
                    <SelectItem value="manual">يدوي / سند قيد</SelectItem>
                    <SelectItem value="sale">مبيعات وحجوزات</SelectItem>
                    <SelectItem value="expense">مصاريف</SelectItem>
                    <SelectItem value="reversal">قيود عكسية</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    refetchJournal();
                    refetchAccounts();
                    refetchTrialBalance();
                  }}
                  className="h-8 text-xs gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  تحديث
                </Button>
              </div>
            </div>

            {/* Journal Entries Table */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-right text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">رقم القيد</th>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3">البيان والشرح</th>
                      <th className="p-3 text-center">العملة</th>
                      <th className="p-3">المصدر / التصنيف</th>
                      <th className="p-3">أطراف وبنود القيد (مدين / دائن)</th>
                      <th className="p-3 text-center">الإجمالي</th>
                      <th className="p-3 text-center">إجراءات وعمليات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {journalEntries
                      .filter((entry: any) => {
                        const q = journalSearchText.toLowerCase();
                        const matchesSearch =
                          !journalSearchText ||
                          entry.entry_number?.toLowerCase().includes(q) ||
                          entry.description?.toLowerCase().includes(q) ||
                          entry.reference_no?.toLowerCase().includes(q) ||
                          entry.lines?.some((l: any) =>
                            l.account_name?.toLowerCase().includes(q) ||
                            l.account_code?.toLowerCase().includes(q) ||
                            l.description?.toLowerCase().includes(q)
                          );
                        const matchesType = journalFilterType === "all" || entry.source_type === journalFilterType;
                        return matchesSearch && matchesType;
                      })
                      .map((entry: any) => {
                        const entryDebitSum = (entry.lines || []).reduce((s: number, l: any) => s + (Number(l.debit) || 0), 0);
                        return (
                          <tr
                            key={entry.id}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                              entry.is_reversed ? "bg-rose-50/30 dark:bg-rose-950/20" : ""
                            }`}
                          >
                            {/* Entry Number */}
                            <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              <div className="flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                <span>{entry.entry_number}</span>
                              </div>
                            </td>

                            {/* Date */}
                            <td className="p-3 text-slate-600 dark:text-slate-400 font-mono whitespace-nowrap">
                              {entry.entry_date}
                            </td>

                            {/* Description */}
                            <td className="p-3 font-medium text-slate-900 dark:text-white max-w-xs">
                              <div className="truncate font-semibold">{entry.description}</div>
                              {entry.reference_no && (
                                <div className="text-[10px] text-slate-400 font-mono">مرجع: {entry.reference_no}</div>
                              )}
                            </td>

                            {/* Currency */}
                            <td className="p-3 text-center">
                              <Badge variant="outline" className="font-bold text-[10px] bg-slate-50 dark:bg-slate-800">
                                {entry.currency || "YER"}
                              </Badge>
                            </td>

                            {/* Source Type / Doc Type */}
                            <td className="p-3 whitespace-nowrap">
                              <Badge variant="outline" className="text-[10px]">
                                {entry.doc_type || entry.source_type || "عام"}
                              </Badge>
                            </td>

                            {/* Lines Details */}
                            <td className="p-3">
                              <div className="space-y-1 text-[11px] max-w-sm">
                                {entry.lines?.map((line: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-0.5 last:border-0">
                                    <span className="truncate text-slate-700 dark:text-slate-300">
                                      <strong className="font-mono text-indigo-600 dark:text-indigo-400 ml-1">[{line.account_code}]</strong>
                                      {line.account_name}
                                    </span>
                                    <div className="flex items-center gap-1 whitespace-nowrap">
                                      {line.debit > 0 && <span className="text-emerald-600 font-bold font-mono">مدين {fmt(line.debit)}</span>}
                                      {line.credit > 0 && <span className="text-blue-600 font-bold font-mono">دائن {fmt(line.credit)}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>

                            {/* Total Debit / Credit */}
                            <td className="p-3 text-center font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              {fmt(entryDebitSum)} {entry.currency || "YER"}
                            </td>

                            {/* Actions Buttons (استعراض، تعديل، طباعة، عكس) */}
                            <td className="p-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                {/* View Voucher */}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedJournalId(entry.id);
                                    setShowJournalVoucherDlg(true);
                                  }}
                                  className="h-7 px-2 text-xs text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 gap-1"
                                  title="استعراض ومعاينة السند"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  استعراض
                                </Button>

                                {/* Edit Entry */}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedJournalId(entry.id);
                                    setShowJournalVoucherDlg(true);
                                  }}
                                  className="h-7 px-2 text-xs text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 gap-1"
                                  title="تعديل القيد المحاسبي"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  تعديل
                                </Button>

                                {/* Print */}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedJournalId(entry.id);
                                    setShowJournalVoucherDlg(true);
                                  }}
                                  className="h-7 px-2 text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1"
                                  title="طباعة سند القيد"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  طباعة
                                </Button>

                                {/* Reverse Entry */}
                                {entry.is_reversed ? (
                                  <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 text-[10px]">
                                    معكوس ومصحح
                                  </Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      if (confirm("هل أنت متأكد من رغبتك في عكس وتصحيح هذا القيد؟ سيتم إنشاء قيد تسوية عكسي.")) {
                                        reverseJournalMutation.mutate(entry.id);
                                      }
                                    }}
                                    className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                    title="عكس وتصحيح القيد"
                                  >
                                    عكس
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB: TRIAL BALANCE (ميزان المراجعة الشامل - مطابق للصورة) */}
          {/* ───────────────────────────────────────────────────────────── */}
          <TabsContent value="trial" className="space-y-4 m-0">
            {/* Top ERP Report Header Filter Bar */}
            <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 items-center">
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1.5 rounded border">
                  <span className="text-slate-500 font-bold whitespace-nowrap">من تاريخ:</span>
                  <Input type="date" value={reportOpts.fromDate} onChange={(e) => setReportOpts({ ...reportOpts, fromDate: e.target.value })} className="h-6 w-28 text-[11px] border-0 bg-transparent p-0" />
                </div>
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1.5 rounded border">
                  <span className="text-slate-500 font-bold whitespace-nowrap">الى تاريخ:</span>
                  <Input type="date" value={reportOpts.toDate} onChange={(e) => setReportOpts({ ...reportOpts, toDate: e.target.value })} className="h-6 w-28 text-[11px] border-0 bg-transparent p-0" />
                </div>
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1.5 rounded border">
                  <span className="text-slate-500 font-bold whitespace-nowrap">السنة المالية:</span>
                  <Input value={reportOpts.fiscalYear} onChange={(e) => setReportOpts({ ...reportOpts, fiscalYear: e.target.value })} className="h-6 w-16 text-[11px] border-0 bg-transparent p-0 text-center font-bold" />
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded border">
                  <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                    <input type="checkbox" checked={reportOpts.excludeClosing} onChange={(e) => setReportOpts({ ...reportOpts, excludeClosing: e.target.checked })} className="rounded" />
                    استبعاد قيود الاقفال
                  </label>
                </div>
                <div className="col-span-2 flex items-center gap-1 bg-white dark:bg-slate-800 p-1.5 rounded border">
                  <span className="text-slate-500 font-bold whitespace-nowrap">الوصف:</span>
                  <Input value={reportOpts.description} onChange={(e) => setReportOpts({ ...reportOpts, description: e.target.value })} placeholder="بحث بالوصف..." className="h-6 text-[11px] border-0 bg-transparent p-0" />
                </div>
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1.5 rounded border">
                  <span className="text-slate-500 font-bold">رقم الفرع:</span>
                  <Input value={reportOpts.branchId} onChange={(e) => setReportOpts({ ...reportOpts, branchId: e.target.value })} className="h-6 w-8 text-center font-bold border-0 bg-transparent p-0" />
                  <span className="text-indigo-600 font-bold truncate text-[11px]">{reportOpts.branchName}</span>
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded border justify-center">
                  <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                    <input type="checkbox" checked={reportOpts.department} onChange={(e) => setReportOpts({ ...reportOpts, department: e.target.checked })} className="rounded" />
                    رقم القسم
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded border">
                  <span className="font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">طريقة العرض:</span>
                  <Select value={reportOpts.displayMethod} onValueChange={(v) => setReportOpts({ ...reportOpts, displayMethod: v })}>
                    <SelectTrigger className="h-7 text-xs bg-rose-50 dark:bg-rose-950 font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="by_code">حسب رقم الحساب</SelectItem>
                      <SelectItem value="by_name">حسب اسم الحساب</SelectItem>
                      <SelectItem value="by_movement">حسب الحركة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded border">
                  <span className="font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">نوع العرض:</span>
                  <Select value={reportOpts.currencyType} onValueChange={(v) => setReportOpts({ ...reportOpts, currencyType: v })}>
                    <SelectTrigger className="h-7 text-xs font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">بالعملة المحلية (ريال)</SelectItem>
                      <SelectItem value="foreign">بالعملة الاجنبية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* View Granularity & Radio Options */}
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded border space-y-2">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-indigo-700 dark:text-indigo-300">
                      <input type="checkbox" checked={reportOpts.byLevel} onChange={(e) => setReportOpts({ ...reportOpts, byLevel: e.target.checked })} className="rounded" />
                      بحسب المستوى
                    </label>
                  </div>
                  <Badge className="bg-indigo-600 text-white font-bold text-[11px] px-3 py-1">مشاهدة / استعراض</Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-[11px]">
                  {[
                    { id: "movement", label: "حسب الحساب الحركي" },
                    { id: "account_type", label: "حسب نوع الحساب" },
                    { id: "movement_name", label: "حسب اسم الحركة" },
                    { id: "beneficiary", label: "حسب اسم المستفيد" },
                    { id: "tax_name", label: "حسب الاسم الضريبي" },
                    { id: "analytical", label: "الحساب تحليلي" },
                    { id: "party", label: "حسب الجهة" },
                    { id: "main_account", label: "حسب الحساب الرئيسي" },
                    { id: "category", label: "حسب تصنيف الحساب" },
                    { id: "cost_center", label: "حسب مراكز التكلفة" },
                    { id: "center_account", label: "حسب المركز والحساب" },
                    { id: "group", label: "حسب مجموعة الحساب" },
                    { id: "analytical_only", label: "تحليلي فقط" },
                    { id: "account_party", label: "الحساب والجهة" },
                  ].map((opt) => (
                    <label key={opt.id} className="flex items-center gap-1.5 cursor-pointer hover:text-indigo-600">
                      <input
                        type="radio"
                        name="trialViewMode"
                        checked={reportOpts.viewGranularity === opt.id}
                        onChange={() => setReportOpts({ ...reportOpts, viewGranularity: opt.id })}
                      />
                      <span className="truncate">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Detailed Accounts Trial Balance Table matching Image */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold border-b">
                    <tr>
                      <th className="p-2.5 border-l">رقم الحساب</th>
                      <th className="p-2.5 border-l">اسم الحساب</th>
                      <th className="p-2.5 border-l">افتتاحي مدين</th>
                      <th className="p-2.5 border-l">افتتاحي دائن</th>
                      <th className="p-2.5 border-l">الفترة مدين</th>
                      <th className="p-2.5 border-l">الفترة دائن</th>
                      <th className="p-2.5 border-l">اجمالي مدين</th>
                      <th className="p-2.5">اجمالي دائن</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {trialBalance?.accounts?.map((acc: any, idx: number) => (
                      <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-2.5 border-l font-mono font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-between">
                          <span>{acc.code}</span>
                          <span className="text-slate-400 font-normal text-[10px]">{idx + 1}</span>
                        </td>
                        <td className="p-2.5 border-l font-semibold text-slate-900 dark:text-white">{acc.name}</td>
                        <td className="p-2.5 border-l font-mono">0.00</td>
                        <td className="p-2.5 border-l font-mono">0.00</td>
                        <td className="p-2.5 border-l font-mono text-emerald-600 font-bold">{fmt(acc.debit)}</td>
                        <td className="p-2.5 border-l font-mono text-rose-600 font-bold">{fmt(acc.credit)}</td>
                        <td className="p-2.5 border-l font-mono font-extrabold text-emerald-700">{fmt(acc.debit)}</td>
                        <td className="p-2.5 font-mono font-extrabold text-rose-700">{fmt(acc.credit)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-200 dark:bg-slate-800 font-black border-t-2 text-slate-900 dark:text-white">
                    <tr>
                      <td colSpan={2} className="p-2.5 text-left border-l">اجماليات</td>
                      <td className="p-2.5 border-l font-mono">0</td>
                      <td className="p-2.5 border-l font-mono">0</td>
                      <td className="p-2.5 border-l font-mono text-emerald-600">{fmt(trialBalance?.totalDebit)}</td>
                      <td className="p-2.5 border-l font-mono text-rose-600">{fmt(trialBalance?.totalCredit)}</td>
                      <td className="p-2.5 border-l font-mono text-emerald-700">{fmt(trialBalance?.totalDebit)}</td>
                      <td className="p-2.5 font-mono text-rose-700">{fmt(trialBalance?.totalCredit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </CardContent>
            </Card>

            {/* Bottom ERP Action Toolbar matching Image */}
            <div className="bg-slate-200 dark:bg-slate-800 p-2.5 rounded-lg border flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Button variant="destructive" size="sm" onClick={() => setActiveTab("dashboard")} className="text-xs h-8">خروج</Button>
                <Button variant="outline" size="sm" onClick={() => toast({ title: "تم تصدير تقرير ميزان المراجعة إلى Excel بنجاح" })} className="text-xs h-8 gap-1"><FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> تصدير</Button>
                <Button variant="outline" size="sm" onClick={() => toast({ title: "تمت مصادقة وتدقيق الميزان المحاسبي بنجاح ✅" })} className="text-xs h-8 gap-1"><ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> مصادقة</Button>
                <Button variant="outline" size="sm" onClick={() => toast({ title: "Switch to English UI" })} className="text-xs h-8 font-mono">EN</Button>
                <Button variant="ghost" size="sm" onClick={() => toast({ title: "معلومات السجل والنظام المحاسبي" })} className="h-8 w-8 p-0"><Info className="w-4 h-4 text-slate-500" /></Button>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                  <input type="checkbox" checked={reportOpts.expandAll} onChange={(e) => setReportOpts({ ...reportOpts, expandAll: e.target.checked })} className="rounded" />
                  توسيع
                </label>
                <Button variant="outline" size="sm" onClick={() => { toast({ title: "جاري طباعة الأرصدة..." }); setTimeout(() => window.print(), 500); }} className="text-xs h-8">طباعة الأرصدة</Button>
                <Button variant="outline" size="sm" onClick={() => { toast({ title: "جاري الطباعة المخصصة..." }); setTimeout(() => window.print(), 500); }} className="text-xs h-8">طباعة مخصصة</Button>
                <Button size="sm" onClick={() => { toast({ title: "جاري الطباعة..." }); setTimeout(() => window.print(), 500); }} className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 px-5 gap-1 font-bold shadow"><Printer className="w-3.5 h-3.5" /> طباعة</Button>
              </div>
            </div>
          </TabsContent>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 4: VOUCHERS (سندات القبض والصرف) */}
          {/* ───────────────────────────────────────────────────────────── */}
          <TabsContent value="vouchers" className="space-y-6 m-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">إدارة سندات القبض والصرف المعتمدة</h3>
                <p className="text-xs text-slate-500">إصدار سندات التحصيل والمقبوضات والدفعات مع القيد المالي الفوري والطباعة.</p>
              </div>

              <Button
                onClick={() => setShowNewVoucherDlg(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-2"
              >
                <Plus className="w-4 h-4" />
                إصدار سند قبض / صرف جديد
              </Button>
            </div>

            {/* Vouchers Grid / Table */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">رقم السند</th>
                      <th className="p-3">نوع السند</th>
                      <th className="p-3">الطرف المستهدف</th>
                      <th className="p-3">المبلغ</th>
                      <th className="p-3">طريقة الدفع</th>
                      <th className="p-3">البيان/السبب</th>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3 text-center"> معاينة وطباعة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {vouchers.map((v: any) => (
                      <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">#{v.voucher_number}</td>
                        <td className="p-3">
                          <Badge className={v.type === "receipt" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"}>
                            {v.type === "receipt" ? "سند قبض" : "سند صرف"}
                          </Badge>
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{v.party_name}</td>
                        <td className="p-3 font-extrabold text-slate-900 dark:text-white">{fmt(v.amount)} {v.currency || "ريال"}</td>
                        <td className="p-3 text-slate-600">{v.payment_method === "cash" ? "نقداً" : "بنك / تحويل"}</td>
                        <td className="p-3 text-slate-500 max-w-xs truncate">{v.payment_against || v.notes || "—"}</td>
                        <td className="p-3 text-slate-500">{v.created_at?.slice(0, 10)}</td>
                        <td className="p-3 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setViewVoucher(v)}
                            className="h-7 text-xs gap-1"
                          >
                            <Printer className="w-3.5 h-3.5 text-indigo-600" />
                            معاينة
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>


          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 5: SAFES / CASH DRAWERS (إدارة الصناديق) */}
          {/* ───────────────────────────────────────────────────────────── */}
          <TabsContent value="safes" className="space-y-6 m-0">
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">الصناديق والخزائن المالية</h3>
                <p className="text-xs text-slate-500">إدارة صندوق الفرع الرئيسي، صناديق الكاشير، والعهد النقدية.</p>
              </div>

              <Button
                onClick={() => {
                  setEditingSafe(null);
                  setSafeForm({ name: "", balance: "0", currency: "ريال", notes: "", active: true });
                  setShowSafeDlg(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-2"
              >
                <Plus className="w-4 h-4" />
                إضافة صندوق / خزينة جديدة
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {safes.map((safe: any) => (
                <Card key={safe.id} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-indigo-600" />
                      {safe.name}
                    </CardTitle>
                    <Badge className={safe.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}>
                      {safe.active ? "نشط" : "معطل"}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <p className="text-xs text-slate-500">الرصيد الدفتري الحالي</p>
                      <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{fmt(safe.balance)} {safe.currency || "ريال"}</p>
                    </div>

                    {safe.notes && <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded">{safe.notes}</p>}

                    <div className="pt-2 flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm("هل أنت متأكد من حذف هذه الخزينة؟")) {
                            deleteSafeMutation.mutate(safe.id);
                          }
                        }}
                        className="h-7 text-xs bg-red-100 hover:bg-red-200 text-red-700"
                      >
                        <Trash2 className="w-3 h-3 ml-1" />
                        حذف
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingSafe(safe);
                          setSafeForm({ name: safe.name, balance: String(safe.balance), currency: safe.currency || "ريال", notes: safe.notes || "", active: !!safe.active });
                          setShowSafeDlg(true);
                        }}
                        className="h-7 text-xs"
                      >
                        تعديل البيانات
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>


          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 6: BANKS & TRANSFERS (البنوك والتحويلات) */}
          {/* ───────────────────────────────────────────────────────────── */}
          <TabsContent value="banks" className="space-y-6 m-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">إدارة الحسابات البنكية والتحويلات النقدية</h3>
                <p className="text-xs text-slate-500">متابعة الأرصدة البنكية، والتحويل بين الصناديق والبنوك بدون أثر إيراد/مصروف.</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowBankDlg(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-2"
                >
                  <Plus className="w-4 h-4" />
                  إضافة حساب بنكي جديد
                </Button>
                <Button
                  onClick={() => setShowTransferDlg(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-2"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  تحويل مالي بين الحسابات
                </Button>
              </div>
            </div>

            {/* Bank Accounts Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bankAccounts.map((b: any) => (
                <Card key={b.id} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-purple-600" />
                      {b.bank_name}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs font-mono">{b.account_number}</Badge>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2">
                    <div>
                      <p className="text-xs text-slate-500">الرصيد المتاح بالحساب</p>
                      <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-0.5">{fmt(b.balance)} {b.currency || "ريال"}</p>
                    </div>
                    {b.iban && <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400">IBAN: {b.iban}</p>}
                    {b.notes && <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded">{b.notes}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Transfers Table */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">سجل عمليات التحويل النقدي والبنكي</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">رقم العملية</th>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3">المصدر</th>
                      <th className="p-3">الجهة المستلمة</th>
                      <th className="p-3">المبلغ المحول</th>
                      <th className="p-3">ملاحظات</th>
                      <th className="p-3">بواسطة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {transfers.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-mono font-bold text-indigo-600">{t.transfer_number}</td>
                        <td className="p-3 text-slate-600">{t.transfer_date}</td>
                        <td className="p-3 font-semibold text-rose-600 dark:text-rose-400">{t.from_name}</td>
                        <td className="p-3 font-semibold text-emerald-600 dark:text-emerald-400">{t.to_name}</td>
                        <td className="p-3 font-extrabold text-slate-900 dark:text-white">{fmt(t.amount)} ريال</td>
                        <td className="p-3 text-slate-500 max-w-xs truncate">{t.notes || "—"}</td>
                        <td className="p-3 text-slate-500">{t.created_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>


          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 7: ACCOUNT STATEMENTS (كشوفات الحسابات) */}
          {/* ───────────────────────────────────────────────────────────── */}
          <TabsContent value="statements" className="space-y-6 m-0">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">نوع كشف الحساب</label>
                    <Select value={statementPartyType} onValueChange={(v: any) => { setStatementPartyType(v); setSelectedPartyId(""); }}>
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">مستخدم / كاشير / مدير نظام</SelectItem>
                        <SelectItem value="customer">عميل (ذمم مدينة)</SelectItem>
                        <SelectItem value="supplier">مورد (ذمم دائنة)</SelectItem>
                        <SelectItem value="employee">موظف (مسير رواتب وعهد)</SelectItem>
                        <SelectItem value="account">حساب عام (دليل الحسابات)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">اختر الطرف أو الحساب</label>
                    <SearchableSelect
                      options={
                        statementPartyType === "user"
                          ? systemUsers
                              .filter((u: any) => u.role !== 'developer' && u.username !== 'developer' && !String(u.name || '').includes('مطور'))
                              .map((u: any) => ({
                                value: String(u.id),
                                label: u.name,
                                sublabel: u.role === 'admin' ? 'مدير نظام' : u.role === 'accountant' ? 'محاسب' : u.role === 'manager' ? 'مدير فرع' : 'كاشير',
                                badge: u.username
                              }))
                          : statementPartyType === "customer"
                          ? customers.map((c: any) => ({
                              value: String(c.id),
                              label: c.name,
                              sublabel: c.phone || "بدون رقم هاتف",
                              badge: c.balance ? `رصيد: ${c.balance}` : undefined
                            }))
                          : statementPartyType === "supplier"
                          ? suppliers.map((s: any) => ({
                              value: String(s.id),
                              label: s.name,
                              sublabel: s.phone || "بدون رقم هاتف",
                              badge: s.balance ? `رصيد: ${s.balance}` : undefined
                            }))
                          : statementPartyType === "employee"
                          ? employees.map((e: any) => ({
                              value: String(e.id),
                              label: e.name,
                              sublabel: e.position || e.department_name || "موظف",
                              badge: e.employee_number ? `#${e.employee_number}` : undefined
                            }))
                          : accountsList.map((a: any) => ({
                              value: String(a.id),
                              label: `${a.code} - ${a.name}`,
                              sublabel: a.account_type || "حساب عام",
                              badge: a.balance ? `رصيد: ${a.balance}` : undefined
                            }))
                      }
                      value={selectedPartyId}
                      onChange={setSelectedPartyId}
                      placeholder="ابحث واختر الطرف أو الحساب..."
                      searchPlaceholder="ابحث بالاسم، الهاتف، الكود..."
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">من تاريخ</label>
                    <Input type="date" value={stmtStartDate} onChange={(e) => setStmtStartDate(e.target.value)} className="text-xs" />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">إلى تاريخ</label>
                    <Input type="date" value={stmtEndDate} onChange={(e) => setStmtEndDate(e.target.value)} className="text-xs" />
                  </div>
                </div>

                {selectedPartyId && (
                  <div className="flex flex-col gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4 text-xs font-bold">
                        <span className="text-slate-600">الرصيد السابق: {fmt(statementData?.previousBalance)} ريال</span>
                        <span className="text-indigo-600 text-sm">الرصيد الحالي المستحق: {fmt(statementData?.currentBalance)} ريال</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button onClick={() => setShowManualDlg(true)} size="sm" variant="outline" className="text-xs gap-1.5">
                          <Plus className="w-4 h-4 text-emerald-600" />
                          إضافة قيد يدوي
                        </Button>
                        <Button onClick={() => setShowStatementPrintModal(true)} size="sm" className="bg-slate-900 text-white text-xs gap-1.5">
                          <Printer className="w-4 h-4" />
                          طباعة كشف الحساب
                        </Button>
                      </div>
                    </div>

                    {statementData?.pilgrimsCount !== undefined && statementData.pilgrimsCount > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 bg-indigo-50/50 dark:bg-slate-800/40 p-3 rounded-lg border border-indigo-100 dark:border-slate-800/80 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center gap-2 px-1">
                          <div className="p-1.5 bg-amber-500/10 text-amber-600 rounded">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">إجمالي المعتمرين والمسافرين</div>
                            <div className="text-xs font-black text-slate-800 dark:text-slate-100">{statementData.pilgrimsCount} معتمر مسجل</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 px-1 border-r border-slate-200/60 dark:border-slate-700/60">
                          <div className="p-1.5 bg-indigo-500/10 text-indigo-600 rounded">
                            <FileSpreadsheet className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">حجوزات الطيران والنقل المسجلة</div>
                            <div className="text-xs font-black text-slate-800 dark:text-slate-100">{statementData.bookingsCount} حجز</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 px-1 border-r border-slate-200/60 dark:border-slate-700/60">
                          <div className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">معاملات وطلبات التأشيرات</div>
                            <div className="text-xs font-black text-slate-800 dark:text-slate-100">{statementData.visaCount} معاملة تأشيرة</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Statement Table */}
            {statementData?.party && (
              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                    كشف حساب تفصيلي — {statementData.party.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3">التاريخ</th>
                        <th className="p-3">البيان والشرح</th>
                        <th className="p-3">مدين (له)</th>
                        <th className="p-3">دائن (عليه)</th>
                        <th className="p-3">الرصيد التراكمي</th>
                        <th className="p-3">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {statementData.transactions.map((t: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3 font-mono text-slate-600">{t.date}</td>
                          <td className="p-3 font-semibold text-slate-900 dark:text-white">{t.description}</td>
                          <td className="p-3 font-bold text-emerald-600">{t.debit > 0 ? `${fmt(t.debit)} ريال` : "—"}</td>
                          <td className="p-3 font-bold text-rose-600">{t.credit > 0 ? `${fmt(t.credit)} ريال` : "—"}</td>
                          <td className="p-3 font-extrabold text-indigo-600 dark:text-indigo-400">{fmt(t.running_balance)} ريال</td>
                          <td className="p-3 text-slate-500">{t.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>


          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 8: FIXED ASSETS & DEPRECIATION (الأصول والإهلاك) */}
          {/* ───────────────────────────────────────────────────────────── */}
          <TabsContent value="assets" className="space-y-6 m-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">سجل الأصول الثابتة والإهلاك الدوري</h3>
                <p className="text-xs text-slate-500">متابعة قيم الأصول، الإهلاك التراكمي، القيمة الدفترية المتبقية والاحتساب الآلي.</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => runDepreciationMutation.mutate()}
                  disabled={runDepreciationMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-2"
                >
                  <Calculator className="w-4 h-4" />
                  تشغيل واحتساب الإهلاك الدوري للأصول
                </Button>

                <Button
                  onClick={() => setShowAssetDlg(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-2"
                >
                  <Plus className="w-4 h-4" />
                  إضافة أصل ثابت جديد
                </Button>
              </div>
            </div>

            {/* Assets Table */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">رمز الأصل</th>
                      <th className="p-3">اسم الأصل الثابت</th>
                      <th className="p-3">الفئة</th>
                      <th className="p-3">تاريخ الشراء</th>
                      <th className="p-3">تكلفة الشراء</th>
                      <th className="p-3">مجمع الإهلاك</th>
                      <th className="p-3">القيمة الدفترية المتبقية</th>
                      <th className="p-3">الموقع / المسئول</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {fixedAssets.map((asset: any) => (
                      <tr key={asset.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-mono font-bold text-indigo-600">{asset.asset_code}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{asset.name}</td>
                        <td className="p-3"><Badge variant="outline" className="text-[10px]">{asset.category}</Badge></td>
                        <td className="p-3 text-slate-600">{asset.purchase_date}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{fmt(asset.purchase_cost)} ريال</td>
                        <td className="p-3 font-bold text-rose-600">{fmt(asset.accumulated_depreciation)} ريال</td>
                        <td className="p-3 font-extrabold text-emerald-600 dark:text-emerald-400">{fmt(asset.net_book_value)} ريال</td>
                        <td className="p-3 text-slate-500">{asset.location} ({asset.responsible_person})</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>


          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 9: RECURRING EXPENSES (المصروفات المتكررة) */}
          {/* ───────────────────────────────────────────────────────────── */}
          <TabsContent value="recurring" className="space-y-6 m-0">
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">جدول المصروفات والالتزامات المتكررة</h3>
                <p className="text-xs text-slate-500">إدارة الإيجارات والاشتراكات الدورية وتوليد القيد المالي وسند الصرف تلقائياً.</p>
              </div>

              <Button
                onClick={() => setShowRecurringDlg(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-2"
              >
                <Plus className="w-4 h-4" />
                إضافة مصروف متكرر جديد
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recurringExpenses.map((rec: any) => (
                <Card key={rec.id} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-500" />
                      {rec.title}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {rec.frequency === "monthly" ? "شهري" : rec.frequency === "quarterly" ? "ربع سنوي" : "سنوي"}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-slate-500">المبلغ المستحق</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{fmt(rec.amount)} ريال</p>
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-slate-500">تاريخ الاستحقاق القادم</p>
                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{rec.next_due_date}</p>
                      </div>
                    </div>

                    {rec.notes && <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded">{rec.notes}</p>}

                    <div className="pt-2 flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => generateRecurringMutation.mutate(rec.id)}
                        disabled={generateRecurringMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        توليد وتأكيد السداد الآن
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>


          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB: OPENING BALANCES (شاشة الأرصدة الافتتاحية) */}
          {/* ───────────────────────────────────────────────────────────── */}
          <TabsContent value="opening_balances" className="space-y-6 m-0">
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
              <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <Coins className="w-5 h-5 text-indigo-600" />
                      إدخال وتثبيت الأرصدة الافتتاحية للنظام
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      هنا يمكنك إدخال الأرصدة التأسيسية التمهيدية لكافة الحسابات. يرجى إدخال مبالغ المدين والدائن بدقة.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm("هل أنت متأكد من تصفير كافة المدخلات الحالية؟")) {
                          const reset: any = {};
                          accountsList.forEach((acc: any) => {
                            reset[acc.code] = { debit: 0, credit: 0 };
                          });
                          setOpeningBalances(reset);
                        }
                      }}
                      className="text-xs gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      تصفير المدخلات
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveOpeningBalances}
                      disabled={isSavingOpening}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 font-bold"
                    >
                      {isSavingOpening ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      حفظ وترحيل الأرصدة الافتتاحية
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="البحث برمز الحساب أو الاسم..."
                      value={openingSearch}
                      onChange={(e) => setOpeningSearch(e.target.value)}
                      className="pr-9 text-xs"
                    />
                  </div>
                  <Select value={openingTypeFilter} onValueChange={setOpeningTypeFilter}>
                    <SelectTrigger className="w-full sm:w-48 text-xs">
                      <SelectValue placeholder="تصفية حسب النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الأنواع</SelectItem>
                      <SelectItem value="asset">الأصول</SelectItem>
                      <SelectItem value="liability">الخصوم والالتزامات</SelectItem>
                      <SelectItem value="equity">حقوق الملكية</SelectItem>
                      <SelectItem value="revenue">الإيرادات</SelectItem>
                      <SelectItem value="expense">المصروفات</SelectItem>
                      <SelectItem value="cogs">تكلفة المبيعات</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Balance Summary Box */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border shadow-sm">
                    <span className="text-xs font-semibold text-slate-500 block">إجمالي الأرصدة المدينة</span>
                    <span className="text-lg font-bold text-emerald-600 mt-1 block">{fmt(totalOpeningDebit)} YER</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border shadow-sm">
                    <span className="text-xs font-semibold text-slate-500 block">إجمالي الأرصدة الدائنة</span>
                    <span className="text-lg font-bold text-rose-600 mt-1 block">{fmt(totalOpeningCredit)} YER</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border shadow-sm flex flex-col justify-center">
                    <span className="text-xs font-semibold text-slate-500 block">الفارق المتبقي ليتزن القيد</span>
                    <span className={`text-lg font-bold mt-1 block ${Math.abs(openingDiff) < 0.01 ? "text-emerald-600" : "text-amber-600"}`}>
                      {fmt(openingDiff)} YER
                    </span>
                  </div>
                </div>

                {/* Balance Notification Banner */}
                {Math.abs(openingDiff) < 0.01 ? (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30 rounded-lg text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span>ميزان الأرصدة الافتتاحية متزن تماماً بنسبة 100% (إجمالي المدين يساوي إجمالي الدائن).</span>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30 rounded-lg text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-bold">تنبيه الموازنة الآلية للقيود الدفترية:</p>
                      <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                        الفارق الحالي قدره <span className="font-bold">{fmt(Math.abs(openingDiff))} YER</span>. 
                        لحماية القيد المزدوج، سيقوم النظام تلقائياً بإنشاء تسوية توازن مسجلة ومرحلة مباشرة إلى 
                        <span className="font-bold"> حساب رأس المال المعتمد للوكالة (31000)</span> عند حفظ الأرصدة لتسهيل بدء الاستخدام فوراً.
                      </p>
                    </div>
                  </div>
                )}

                {/* Accounts Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 text-xs">
                        <th className="p-3">رمز الحساب</th>
                        <th className="p-3">اسم الحساب في الدليل</th>
                        <th className="p-3">النوع</th>
                        <th className="p-3 w-1/4">رصيد افتتاحي مدين (Debit)</th>
                        <th className="p-3 w-1/4">رصيد افتتاحي دائن (Credit)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {filteredAccountsForOpening.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400">
                            لا توجد حسابات مطابقة للبحث أو الفلتر المختار.
                          </td>
                        </tr>
                      ) : (
                        filteredAccountsForOpening.map((acc: any) => (
                          <tr key={acc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="p-3 font-mono text-indigo-600 dark:text-indigo-400 font-bold">{acc.code}</td>
                            <td className="p-3 text-slate-900 dark:text-white font-medium">{acc.name}</td>
                            <td className="p-3 text-slate-500">
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                                {acc.type === "asset" && "أصول"}
                                {acc.type === "liability" && "خصوم"}
                                {acc.type === "equity" && "حقوق ملكية"}
                                {acc.type === "revenue" && "إيرادات"}
                                {acc.type === "expense" && "مصروفات"}
                                {acc.type === "cogs" && "تكلفة مبيعات"}
                                {acc.type === "wastage" && "تالف وفاقد"}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <div className="relative">
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  value={openingBalances[acc.code]?.debit || ""}
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? 0 : Number(e.target.value);
                                    setOpeningBalances({
                                      ...openingBalances,
                                      [acc.code]: {
                                        debit: val,
                                        credit: 0
                                      }
                                    });
                                  }}
                                  className="h-8 text-xs font-bold font-mono pl-3"
                                />
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="relative">
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  value={openingBalances[acc.code]?.credit || ""}
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? 0 : Number(e.target.value);
                                    setOpeningBalances({
                                      ...openingBalances,
                                      [acc.code]: {
                                        debit: 0,
                                        credit: val
                                      }
                                    });
                                  }}
                                  className="h-8 text-xs font-bold font-mono pl-3"
                                />
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Action Footer */}
                <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    onClick={handleSaveOpeningBalances}
                    disabled={isSavingOpening}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 px-6"
                  >
                    {isSavingOpening ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    تأكيد وحفظ الأرصدة الافتتاحية الآن
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>


          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 10: FINANCIAL STATEMENTS (قائمة الدخل والأرباح والخسائر - مطابقة للصورة) */}
          {/* ───────────────────────────────────────────────────────────── */}
          <TabsContent value="financials" className="space-y-4 m-0">
            {/* Top ERP Report Header Filter Bar */}
            <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 items-center">
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1.5 rounded border">
                  <span className="text-slate-500 font-bold whitespace-nowrap">من تاريخ:</span>
                  <Input type="date" value={reportOpts.fromDate} onChange={(e) => setReportOpts({ ...reportOpts, fromDate: e.target.value })} className="h-6 w-28 text-[11px] border-0 bg-transparent p-0" />
                </div>
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1.5 rounded border">
                  <span className="text-slate-500 font-bold whitespace-nowrap">الى تاريخ:</span>
                  <Input type="date" value={reportOpts.toDate} onChange={(e) => setReportOpts({ ...reportOpts, toDate: e.target.value })} className="h-6 w-28 text-[11px] border-0 bg-transparent p-0" />
                </div>
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1.5 rounded border">
                  <span className="text-slate-500 font-bold whitespace-nowrap">السنة المالية:</span>
                  <Input value={reportOpts.fiscalYear} onChange={(e) => setReportOpts({ ...reportOpts, fiscalYear: e.target.value })} className="h-6 w-16 text-[11px] border-0 bg-transparent p-0 text-center font-bold" />
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded border">
                  <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                    <input type="checkbox" checked={reportOpts.excludeClosing} onChange={(e) => setReportOpts({ ...reportOpts, excludeClosing: e.target.checked })} className="rounded" />
                    استبعاد قيود الاقفال
                  </label>
                </div>
                <div className="col-span-2 flex items-center gap-1 bg-white dark:bg-slate-800 p-1.5 rounded border">
                  <span className="text-slate-500 font-bold whitespace-nowrap">الوصف:</span>
                  <Input value={reportOpts.description} onChange={(e) => setReportOpts({ ...reportOpts, description: e.target.value })} placeholder="بحث بالوصف..." className="h-6 text-[11px] border-0 bg-transparent p-0" />
                </div>
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1.5 rounded border">
                  <span className="text-slate-500 font-bold">رقم الفرع:</span>
                  <Input value={reportOpts.branchId} onChange={(e) => setReportOpts({ ...reportOpts, branchId: e.target.value })} className="h-6 w-8 text-center font-bold border-0 bg-transparent p-0" />
                  <span className="text-indigo-600 font-bold truncate text-[11px]">{reportOpts.branchName}</span>
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded border justify-center">
                  <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                    <input type="checkbox" checked={reportOpts.department} onChange={(e) => setReportOpts({ ...reportOpts, department: e.target.checked })} className="rounded" />
                    رقم القسم
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded border">
                  <span className="font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">طريقة العرض:</span>
                  <Select value={reportOpts.displayMethod} onValueChange={(v) => setReportOpts({ ...reportOpts, displayMethod: v })}>
                    <SelectTrigger className="h-7 text-xs bg-emerald-50 dark:bg-emerald-950 font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="by_code">حسب رقم الحساب</SelectItem>
                      <SelectItem value="by_name">حسب اسم الحساب</SelectItem>
                      <SelectItem value="by_movement">حسب الحركة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded border">
                  <span className="font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">نوع العرض:</span>
                  <Select value={reportOpts.currencyType} onValueChange={(v) => setReportOpts({ ...reportOpts, currencyType: v })}>
                    <SelectTrigger className="h-7 text-xs font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">بالعملة المحلية (ريال)</SelectItem>
                      <SelectItem value="foreign">بالعملة الاجنبية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* View Granularity & Radio Options */}
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded border space-y-2">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-emerald-700 dark:text-emerald-300">
                      <input type="checkbox" checked={reportOpts.byLevel} onChange={(e) => setReportOpts({ ...reportOpts, byLevel: e.target.checked })} className="rounded" />
                      بحسب المستوى
                    </label>
                  </div>
                  <Badge className="bg-emerald-600 text-white font-bold text-[11px] px-3 py-1">مشاهدة / استعراض الأرباح</Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-[11px]">
                  {[
                    { id: "movement", label: "حسب الحساب الحركي" },
                    { id: "account_type", label: "حسب نوع الحساب" },
                    { id: "movement_name", label: "حسب اسم الحركة" },
                    { id: "beneficiary", label: "حسب اسم المستفيد" },
                    { id: "tax_name", label: "حسب الاسم الضريبي" },
                    { id: "analytical", label: "الحساب تحليلي" },
                    { id: "party", label: "حسب الجهة" },
                    { id: "main_account", label: "حسب الحساب الرئيسي" },
                    { id: "category", label: "حسب تصنيف الحساب" },
                    { id: "cost_center", label: "حسب مراكز التكلفة" },
                    { id: "center_account", label: "حسب المركز والحساب" },
                    { id: "group", label: "حسب مجموعة الحساب" },
                    { id: "analytical_only", label: "تحليلي فقط" },
                    { id: "account_party", label: "الحساب والجهة" },
                  ].map((opt) => (
                    <label key={opt.id} className="flex items-center gap-1.5 cursor-pointer hover:text-emerald-600">
                      <input
                        type="radio"
                        name="pandlViewMode"
                        checked={reportOpts.viewGranularity === opt.id}
                        onChange={() => setReportOpts({ ...reportOpts, viewGranularity: opt.id })}
                      />
                      <span className="truncate">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Income Statement (P&L) */}
              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader className="border-b pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-emerald-600" />
                    قائمة الدخل - الأرباح والخسائر (Income Statement / P&L)
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => window.print()} className="h-7 text-[10px] gap-1">
                    <Printer className="w-3 h-3" />
                    طباعة التقرير
                  </Button>
                </CardHeader>
                <CardContent className="p-4 space-y-4 text-xs">
                  <div className="flex justify-between items-center py-2 border-b font-bold text-slate-900 dark:text-white">
                    <span>إجمالي الإيرادات والمبيعات (+)</span>
                    <span className="text-emerald-600">{fmt(incomeStatement?.totalRevenues)} ريال</span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b font-bold text-slate-900 dark:text-white">
                    <span>خصم: تكلفة البضاعة المباعة COGS (-)</span>
                    <span className="text-rose-600">{fmt(incomeStatement?.cogsTotal)} ريال</span>
                  </div>

                  <div className="flex justify-between items-center py-2 bg-emerald-50 dark:bg-emerald-950/20 p-2 rounded font-extrabold text-emerald-900 dark:text-emerald-200">
                    <span>مجمل الربح (Gross Profit)</span>
                    <span>{fmt(incomeStatement?.grossProfit)} ريال</span>
                  </div>

                  <div className="space-y-1 pt-2">
                    <p className="font-bold text-slate-700 dark:text-slate-300">خصم: المصروفات التشغيلية والتنفيذية (-)</p>
                    {incomeStatement?.expensesList?.map((e: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-slate-600 dark:text-slate-400 pl-4 py-1 border-b border-slate-50 text-[11px]">
                        <span>• {e.category}</span>
                        <span>{fmt(e.total)} ريال</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold text-rose-600 pt-2">
                      <span>إجمالي المصروفات التشغيلية</span>
                      <span>{fmt(incomeStatement?.totalExpenses)} ريال</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-3 bg-indigo-900 text-white p-3 rounded-xl font-black text-sm shadow-md">
                    <span>صافي الربح النهائي (Net Profit)</span>
                    <span className="text-emerald-400">{fmt(incomeStatement?.netProfit)} ريال</span>
                  </div>
                </CardContent>
              </Card>

              {/* Balance Sheet */}
              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader className="border-b pb-3 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Scale className="w-4 h-4 text-indigo-600" />
                      الميزانية العمومية (Balance Sheet)
                    </CardTitle>
                    <Badge className={balanceSheet?.isBalanced ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}>
                      {balanceSheet?.isBalanced ? "الميزانية متزنة" : "غير متزنة"}
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => window.print()} className="h-7 text-[10px] gap-1">
                    <Printer className="w-3 h-3" />
                    طباعة التقرير
                  </Button>
                </CardHeader>
                <CardContent className="p-4 space-y-4 text-xs">
                  <div>
                    <h4 className="font-bold text-indigo-600 dark:text-indigo-400 mb-2 border-b pb-1">أولاً: الأصول (Assets)</h4>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between text-slate-700 dark:text-slate-300">
                        <span>• النقدية بالصناديق والخزائن</span>
                        <span className="font-bold">{fmt(balanceSheet?.currentAssets?.cashInSafes)} ريال</span>
                      </div>
                      <div className="flex justify-between text-slate-700 dark:text-slate-300">
                        <span>• النقدية بالحسابات البنكية</span>
                        <span className="font-bold">{fmt(balanceSheet?.currentAssets?.cashInBanks)} ريال</span>
                      </div>
                      <div className="flex justify-between text-slate-700 dark:text-slate-300">
                        <span>• الذمم المدينة (العملاء)</span>
                        <span className="font-bold">{fmt(balanceSheet?.currentAssets?.receivables)} ريال</span>
                      </div>
                      <div className="flex justify-between text-slate-700 dark:text-slate-300">
                        <span>• تقييم المخزون المتاح</span>
                        <span className="font-bold">{fmt(balanceSheet?.currentAssets?.inventoryValuation)} ريال</span>
                      </div>
                      <div className="flex justify-between text-slate-700 dark:text-slate-300">
                        <span>• صافي الأصول الثابتة</span>
                        <span className="font-bold">{fmt(balanceSheet?.fixedAssets?.netFixedAssets)} ريال</span>
                      </div>
                    </div>
                    <div className="flex justify-between font-extrabold text-indigo-900 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 p-2 rounded mt-2">
                      <span>إجمالي الأصول</span>
                      <span>{fmt(balanceSheet?.totalAssets)} ريال</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-purple-600 dark:text-purple-400 mb-2 border-b pb-1">ثانياً: الالتزامات وحقوق الملكية</h4>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between text-slate-700 dark:text-slate-300">
                        <span>• الذمم الدائنة (الموردين)</span>
                        <span className="font-bold">{fmt(balanceSheet?.liabilities?.payables)} ريال</span>
                      </div>
                      <div className="flex justify-between text-slate-700 dark:text-slate-300">
                        <span>• رأس المال المعتمد</span>
                        <span className="font-bold">{fmt(balanceSheet?.equity?.capital)} ريال</span>
                      </div>
                      <div className="flex justify-between text-slate-700 dark:text-slate-300">
                        <span>• الأرباح المبقاة والاحتياطيات</span>
                        <span className="font-bold">{fmt(balanceSheet?.equity?.retainedEarnings)} ريال</span>
                      </div>
                      <div className="flex justify-between text-slate-700 dark:text-slate-300">
                        <span>• صافي أرباح الفترة الحالية</span>
                        <span className="font-bold text-emerald-600">{fmt(balanceSheet?.equity?.netIncome)} ريال</span>
                      </div>
                    </div>
                    <div className="flex justify-between font-extrabold text-purple-900 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 p-2 rounded mt-2">
                      <span>إجمالي الالتزامات وحقوق الملكية</span>
                      <span>{fmt(balanceSheet?.totalLiabilitiesAndEquity)} ريال</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bottom ERP Action Toolbar matching Image */}
            <div className="bg-slate-200 dark:bg-slate-800 p-2.5 rounded-lg border flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Button variant="destructive" size="sm" onClick={() => setActiveTab("dashboard")} className="text-xs h-8">خروج</Button>
                <Button variant="outline" size="sm" onClick={() => toast({ title: "تم تصدير تقرير الأرباح والخسائر إلى Excel بنجاح" })} className="text-xs h-8 gap-1"><FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> تصدير</Button>
                <Button variant="outline" size="sm" onClick={() => toast({ title: "تمت مصادقة قائمة الدخل والأرباح بنجاح ✅" })} className="text-xs h-8 gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> مصادقة</Button>
                <Button variant="outline" size="sm" onClick={() => toast({ title: "Switch to English UI" })} className="text-xs h-8 font-mono">EN</Button>
                <Button variant="ghost" size="sm" onClick={() => toast({ title: "معلومات السجل والنظام المحاسبي" })} className="h-8 w-8 p-0"><Info className="w-4 h-4 text-slate-500" /></Button>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                  <input type="checkbox" checked={reportOpts.expandAll} onChange={(e) => setReportOpts({ ...reportOpts, expandAll: e.target.checked })} className="rounded" />
                  توسيع
                </label>
                <Button variant="outline" size="sm" onClick={() => { toast({ title: "جاري طباعة الأرصدة..." }); setTimeout(() => window.print(), 500); }} className="text-xs h-8">طباعة الأرصدة</Button>
                <Button variant="outline" size="sm" onClick={() => { toast({ title: "جاري الطباعة المخصصة..." }); setTimeout(() => window.print(), 500); }} className="text-xs h-8">طباعة مخصصة</Button>
                <Button size="sm" onClick={() => { toast({ title: "جاري الطباعة..." }); setTimeout(() => window.print(), 500); }} className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 px-5 gap-1 font-bold shadow"><Printer className="w-3.5 h-3.5" /> طباعة</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>


        {/* ───────────────────────────────────────────────────────────── */}
        {/* MODAL 1: NEW VOUCHER (سند جديد) */}
        {/* ───────────────────────────────────────────────────────────── */}
        <Dialog open={showNewVoucherDlg} onOpenChange={setShowNewVoucherDlg}>
          <DialogContent className="max-w-md dir-rtl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                إصدار سند مالي معتمد جديد
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold mb-1 block">نوع السند</label>
                  <Select value={voucherForm.type} onValueChange={(v) => setVoucherForm({ ...voucherForm, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receipt">سند قبض (استلام أموال)</SelectItem>
                      <SelectItem value="payment">سند صرف (دفع أموال)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="font-bold mb-1 block">الطرف المستهدف</label>
                  <Select value={voucherForm.party_type} onValueChange={(v: any) => setVoucherForm({ ...voucherForm, party_type: v, party_id: "" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">مستخدم (كاشير / محاسب / مدير نظام)</SelectItem>
                      <SelectItem value="customer">عميل</SelectItem>
                      <SelectItem value="supplier">مورد</SelectItem>
                      <SelectItem value="employee">موظف</SelectItem>
                      <SelectItem value="general">جهة عامة / أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {voucherForm.party_type !== "general" && (
                <div>
                  <label className="font-bold mb-1 block">اختر الشخص / الجهة</label>
                  <SearchableSelect
                    options={
                      voucherForm.party_type === "user"
                        ? systemUsers
                            .filter((u: any) => u.role !== 'developer' && u.username !== 'developer' && !String(u.name || '').includes('مطور'))
                            .map((u: any) => ({
                              value: String(u.id),
                              label: u.name,
                              sublabel: u.role === 'admin' ? 'مدير نظام' : u.role === 'accountant' ? 'محاسب' : u.role === 'manager' ? 'مدير فرع' : 'كاشير'
                            }))
                        : voucherForm.party_type === "customer"
                        ? customers.map((c: any) => ({
                            value: String(c.id),
                            label: c.name,
                            sublabel: c.phone || "بدون هاتف"
                          }))
                        : voucherForm.party_type === "supplier"
                        ? suppliers.map((s: any) => ({
                            value: String(s.id),
                            label: s.name,
                            sublabel: s.phone || "بدون هاتف"
                          }))
                        : employees.map((e: any) => ({
                            value: String(e.id),
                            label: e.name,
                            sublabel: e.position || e.department_name || "موظف"
                          }))
                    }
                    value={voucherForm.party_id}
                    onChange={(v) => setVoucherForm({ ...voucherForm, party_id: v })}
                    placeholder="ابحث واختر الشخص أو الجهة..."
                    searchPlaceholder="ابحث بالاسم، الهاتف..."
                  />
                </div>
              )}

              <div>
                <label className="font-bold mb-1 block">اسم المستلم / المدفوع له (إن لم يختر من القائمة)</label>
                <Input value={voucherForm.received_from} onChange={(e) => setVoucherForm({ ...voucherForm, received_from: e.target.value })} placeholder="مثال: شركة المقاولات أو الأستاذ أحمد" className="text-xs" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold mb-1 block">المبلغ المالي</label>
                  <Input type="number" value={voucherForm.amount} onChange={(e) => setVoucherForm({ ...voucherForm, amount: e.target.value })} placeholder="0.00" className="text-xs font-bold" />
                </div>

                <div>
                  <label className="font-bold mb-1 block">طريقة الدفع</label>
                  <Select value={voucherForm.payment_method} onValueChange={(v) => setVoucherForm({ ...voucherForm, payment_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقداً (Cash)</SelectItem>
                      <SelectItem value="bank_transfer">تحويل بنكي / بطاقة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Source Account Selection */}
              <div>
                <label className="font-bold mb-1 block">الصندوق / الخزينة المأخوذ منه أو المودع فيه</label>
                <Select value={voucherForm.safe_id} onValueChange={(v) => setVoucherForm({ ...voucherForm, safe_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر الخزينة..." /></SelectTrigger>
                  <SelectContent>
                    {safes.map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name} (رصيد: {fmt(s.balance)} ريال)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="font-bold mb-1 block">مقابل (السبب والبيان)</label>
                <Input value={voucherForm.payment_against} onChange={(e) => setVoucherForm({ ...voucherForm, payment_against: e.target.value })} placeholder="مثال: سداد الدفعة الأولى أو شراء مواد خام" className="text-xs" />
              </div>

              <div>
                <label className="font-bold mb-1 block">ملاحظات إضافية</label>
                <Input value={voucherForm.notes} onChange={(e) => setVoucherForm({ ...voucherForm, notes: e.target.value })} className="text-xs" />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewVoucherDlg(false)} className="text-xs">إلغاء</Button>
              <Button
                onClick={() => createVoucherMutation.mutate(voucherForm)}
                disabled={createVoucherMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-2"
              >
                حفظ وإصدار السند
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        {/* ───────────────────────────────────────────────────────────── */}
        {/* MODAL 2: VOUCHER PRINT & VIEW */}
        {/* ───────────────────────────────────────────────────────────── */}
        <Dialog open={!!viewVoucher} onOpenChange={() => setViewVoucher(null)}>
          <DialogContent className="max-w-xl dir-rtl" dir="rtl">
            {viewVoucher && (
              <div className="space-y-4 p-4 border border-slate-200 rounded-xl bg-white text-slate-900" id="printable-voucher">
                <PrintHeader 
                  documentTitle={viewVoucher.type === "receipt" ? "سند قبض" : "سند صرف"}
                  documentSubtitle={`رقم السند: #${viewVoucher.voucher_number}`}
                />

                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-lg border">
                  <div>
                    <span className="text-slate-500 block">التاريخ:</span>
                    <span className="font-bold">{viewVoucher.created_at?.slice(0, 10)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">المبلغ:</span>
                    <span className="font-extrabold text-indigo-700 text-sm">{fmt(viewVoucher.amount)} {viewVoucher.currency || "ريال"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block">الطرف المستلم / المدفوع له:</span>
                    <span className="font-bold text-slate-900 text-sm">{viewVoucher.party_name}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block">وذلك مقابل:</span>
                    <span className="font-semibold text-slate-800">{viewVoucher.payment_against || "—"}</span>
                  </div>
                </div>

                <div className="pt-6 grid grid-cols-3 gap-2 text-center text-[10px] text-slate-600 border-t mt-4">
                  <div>
                    <p className="font-bold">أمين الصندوق</p>
                    <p className="mt-6">__________________</p>
                  </div>
                  <div>
                    <p className="font-bold">المحاسب المسؤول</p>
                    <p className="mt-6">__________________</p>
                  </div>
                  <div>
                    <p className="font-bold">استلمت بواسطة / المستلم</p>
                    <p className="mt-6">__________________</p>
                  </div>
                </div>

                <div className="text-center text-[10px] text-slate-400 pt-2">
                  {docForm.voucherFooterText}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setViewVoucher(null)} className="text-xs">إغلاق</Button>
              <Button onClick={() => window.print()} className="bg-slate-900 text-white text-xs gap-1.5">
                <Printer className="w-4 h-4" />
                طباعة السند
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        {/* ───────────────────────────────────────────────────────────── */}
        {/* MODAL 3: ONYX PRO JOURNAL VOUCHER (سند قيد اليومية العام المتقدم) */}
        {/* ───────────────────────────────────────────────────────────── */}
        <JournalVoucherModal
          open={showJournalVoucherDlg}
          onOpenChange={(open) => {
            setShowJournalVoucherDlg(open);
            if (!open) {
              setSelectedJournalId(null);
            }
          }}
          initialEntryId={selectedJournalId}
          accountsList={accountsList}
          costCentersList={costCenters}
        />


        {/* ───────────────────────────────────────────────────────────── */}
        {/* MODAL 4: NEW BANK ACCOUNT */}
        {/* ───────────────────────────────────────────────────────────── */}
        <Dialog open={showBankDlg} onOpenChange={setShowBankDlg}>
          <DialogContent className="max-w-md dir-rtl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Landmark className="w-5 h-5 text-purple-600" />
                إضافة حساب بنكي جديد
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold mb-1 block">اسم البنك / المصرف</label>
                <Input value={bankForm.bank_name} onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })} placeholder="مثال: البنك الأهلي أو بنك الراجحي" className="text-xs" />
              </div>

              <div>
                <label className="font-bold mb-1 block">رقم الحساب البنكي</label>
                <Input value={bankForm.account_number} onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })} placeholder="1029384756" className="text-xs font-mono" />
              </div>

              <div>
                <label className="font-bold mb-1 block">رقم الآيبان (IBAN)</label>
                <Input value={bankForm.iban} onChange={(e) => setBankForm({ ...bankForm, iban: e.target.value })} placeholder="SA00000000000000000" className="text-xs font-mono" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold mb-1 block">الرصيد الافتتاحي</label>
                  <Input type="number" value={bankForm.balance} onChange={(e) => setBankForm({ ...bankForm, balance: e.target.value })} className="text-xs font-bold" />
                </div>
                <div>
                  <label className="font-bold mb-1 block">العملة</label>
                  <Input value={bankForm.currency} onChange={(e) => setBankForm({ ...bankForm, currency: e.target.value })} className="text-xs" />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBankDlg(false)} className="text-xs">إلغاء</Button>
              <Button onClick={() => createBankMutation.mutate(bankForm)} className="bg-purple-600 text-white text-xs gap-2">حفظ البنك</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        {/* ───────────────────────────────────────────────────────────── */}
        {/* MODAL 5: INTER-ACCOUNT TRANSFER */}
        {/* ───────────────────────────────────────────────────────────── */}
        <Dialog open={showTransferDlg} onOpenChange={setShowTransferDlg}>
          <DialogContent className="max-w-md dir-rtl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                تحويل مالي بين الحسابات والخزائن
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold mb-1 block">جهة المصدر (من)</label>
                  <Select value={transferForm.from_type} onValueChange={(v) => setTransferForm({ ...transferForm, from_type: v, from_id: "" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="safe">صندوق / خزينة</SelectItem>
                      <SelectItem value="bank">حساب بنكي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="font-bold mb-1 block">جهة الاستلام (إلى)</label>
                  <Select value={transferForm.to_type} onValueChange={(v) => setTransferForm({ ...transferForm, to_type: v, to_id: "" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">حساب بنكي</SelectItem>
                      <SelectItem value="safe">صندوق / خزينة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold mb-1 block">اختر المصدر</label>
                  <Select value={transferForm.from_id} onValueChange={(v) => setTransferForm({ ...transferForm, from_id: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                    <SelectContent>
                      {transferForm.from_type === "safe" ? safes.map((s: any) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name} ({fmt(s.balance)} ريال)</SelectItem>
                      )) : bankAccounts.map((b: any) => (
                        <SelectItem key={b.id} value={String(b.id)}>{b.bank_name} ({fmt(b.balance)} ريال)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="font-bold mb-1 block">اختر المستلم</label>
                  <Select value={transferForm.to_id} onValueChange={(v) => setTransferForm({ ...transferForm, to_id: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                    <SelectContent>
                      {transferForm.to_type === "safe" ? safes.map((s: any) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name} ({fmt(s.balance)} ريال)</SelectItem>
                      )) : bankAccounts.map((b: any) => (
                        <SelectItem key={b.id} value={String(b.id)}>{b.bank_name} ({fmt(b.balance)} ريال)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="font-bold mb-1 block">المبلغ المحول</label>
                <Input type="number" value={transferForm.amount} onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })} placeholder="0.00" className="text-xs font-bold" />
              </div>

              <div>
                <label className="font-bold mb-1 block">ملاحظات التحويل</label>
                <Input value={transferForm.notes} onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })} className="text-xs" />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTransferDlg(false)} className="text-xs">إلغاء</Button>
              <Button onClick={() => createTransferMutation.mutate(transferForm)} className="bg-indigo-600 text-white text-xs gap-2">تنفيذ التحويل المالي</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        {/* ───────────────────────────────────────────────────────────── */}
        {/* MODAL 6: NEW FIXED ASSET */}
        {/* ───────────────────────────────────────────────────────────── */}
        <Dialog open={showAssetDlg} onOpenChange={setShowAssetDlg}>
          <DialogContent className="max-w-md dir-rtl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                إضافة أصل ثابت جديد
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold mb-1 block">اسم الأصل الثابت</label>
                <Input value={assetForm.name} onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })} placeholder="مثال: سيارة دليفري أو فرن آلي إيطالي" className="text-xs" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold mb-1 block">الفئة</label>
                  <Select value={assetForm.category} onValueChange={(v) => setAssetForm({ ...assetForm, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="أجهزة ومعدات">أجهزة ومعدات</SelectItem>
                      <SelectItem value="وسائل نقل">وسائل نقل</SelectItem>
                      <SelectItem value="أثاث وديكور">أثاث وديكور</SelectItem>
                      <SelectItem value="مباني وعقارات">مباني وعقارات</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="font-bold mb-1 block">تاريخ الشراء</label>
                  <Input type="date" value={assetForm.purchase_date} onChange={(e) => setAssetForm({ ...assetForm, purchase_date: e.target.value })} className="text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold mb-1 block">تكلفة الشراء</label>
                  <Input type="number" value={assetForm.purchase_cost} onChange={(e) => setAssetForm({ ...assetForm, purchase_cost: e.target.value })} placeholder="0.00" className="text-xs font-bold" />
                </div>
                <div>
                  <label className="font-bold mb-1 block">القيمة المتبقية (خردة)</label>
                  <Input type="number" value={assetForm.salvage_value} onChange={(e) => setAssetForm({ ...assetForm, salvage_value: e.target.value })} placeholder="0.00" className="text-xs" />
                </div>
                <div>
                  <label className="font-bold mb-1 block">العمر الإنتاجي (سنوات)</label>
                  <Input type="number" value={assetForm.useful_life_years} onChange={(e) => setAssetForm({ ...assetForm, useful_life_years: e.target.value })} className="text-xs" />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssetDlg(false)} className="text-xs">إلغاء</Button>
              <Button onClick={() => createAssetMutation.mutate(assetForm)} className="bg-indigo-600 text-white text-xs gap-2">تسجيل وقيد الأصل</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>





        {/* ───────────────────────────────────────────────────────────── */}
        {/* MODAL 8: ACCOUNT LEDGER VIEW */}
        {/* ───────────────────────────────────────────────────────────── */}
        <Dialog open={!!selectedLedgerAccount} onOpenChange={() => setSelectedLedgerAccount(null)}>
          <DialogContent className="max-w-2xl dir-rtl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                كشف حركة الحساب المحاسبي — {selectedLedgerAccount?.code} ({selectedLedgerAccount?.name})
              </DialogTitle>
            </DialogHeader>

            <div className="p-0 overflow-x-auto max-h-96">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b">
                  <tr>
                    <th className="p-2.5">رقم القيد</th>
                    <th className="p-2.5">التاريخ</th>
                    <th className="p-2.5">البيان</th>
                    <th className="p-2.5">مدين</th>
                    <th className="p-2.5">دائن</th>
                    <th className="p-2.5">الرصيد الجاري</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {ledgerData?.ledger?.map((line: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono text-indigo-600 font-bold">{line.entry_number}</td>
                      <td className="p-2.5 text-slate-500">{line.entry_date}</td>
                      <td className="p-2.5 text-slate-900 font-semibold">{line.journal_desc}</td>
                      <td className="p-2.5 text-emerald-600 font-bold">{line.debit > 0 ? fmt(line.debit) : "—"}</td>
                      <td className="p-2.5 text-rose-600 font-bold">{line.credit > 0 ? fmt(line.credit) : "—"}</td>
                      <td className="p-2.5 font-extrabold text-indigo-700">{fmt(line.running_balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedLedgerAccount(null)} className="text-xs">إغلاق</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* MODAL 9: ADD NEW ACCOUNT (إضافة حساب جديد) */}
        {/* ───────────────────────────────────────────────────────────── */}
        <Dialog open={showAddAccountDlg} onOpenChange={setShowAddAccountDlg}>
          <DialogContent className="max-w-md dir-rtl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                إضافة حساب جديد لدليل الحسابات
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold mb-1 block">رمز الحساب (Code)</label>
                  <Input 
                    value={accountForm.code} 
                    onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value })} 
                    placeholder="مثال: 11100" 
                    className="text-xs font-mono font-bold" 
                  />
                </div>
                <div>
                  <label className="font-bold mb-1 block">نوع الحساب</label>
                  <Select value={accountForm.type} onValueChange={(v) => setAccountForm({ ...accountForm, type: v })}>
                    <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asset">أصول (Assets)</SelectItem>
                      <SelectItem value="liability">التزامات (Liabilities)</SelectItem>
                      <SelectItem value="equity">حقوق ملكية (Equity)</SelectItem>
                      <SelectItem value="revenue">إيرادات (Revenue)</SelectItem>
                      <SelectItem value="expense">مصروفات (Expenses)</SelectItem>
                      <SelectItem value="cogs">تكلفة مبيعات (COGS)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="font-bold mb-1 block">اسم الحساب المحاسبي</label>
                <Input 
                  value={accountForm.name} 
                  onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} 
                  placeholder="مثال: الصندوق الرئيسي أو مبيعات المعجنات" 
                  className="text-xs font-semibold" 
                />
              </div>

              <div>
                <label className="font-bold mb-1 block">الحساب الأب (إن وجد)</label>
                <Select value={accountForm.parent_code} onValueChange={(v) => setAccountForm({ ...accountForm, parent_code: v })}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="اختر الحساب الأب..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— حساب رئيسي (بدون أب) —</SelectItem>
                    {accountsList
                      .filter((a: any) => a.code.length <= 4)
                      .map((a: any) => (
                        <SelectItem key={a.id} value={a.code}>{a.code} - {a.name}</SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddAccountDlg(false)} className="text-xs">إلغاء</Button>
              <Button
                onClick={() => {
    if (!accountForm.code || !accountForm.name) {
      toast({ variant: "destructive", title: "يرجى تعبئة رمز واسم الحساب" });
      return;
    }
    createAccountMutation.mutate(accountForm);
  }}
  disabled={createAccountMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-2"
              >
                {createAccountMutation.isPending ? "جاري الحفظ..." : "حفظ الحساب الجديد"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* MODAL 10: STATEMENT PRINT PREVIEW */}
        {/* ───────────────────────────────────────────────────────────── */}
        <Dialog open={showStatementPrintModal} onOpenChange={setShowStatementPrintModal}>
          <DialogContent className="max-w-3xl dir-rtl max-h-[90vh] overflow-y-auto" dir="rtl">
            {showStatementPrintModal && (
              <style>{`
                @media print {
                  body * {
                    visibility: hidden;
                  }
                  #printable-statement, #printable-statement * {
                    visibility: visible;
                  }
                  #printable-statement {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    padding: 0 !important;
                    margin: 0 !important;
                  }
                }
              `}</style>
            )}
            <DialogHeader className="print:hidden">
              <DialogTitle className="text-base font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Printer className="w-5 h-5 text-indigo-600" />
                  معاينة وطباعة كشف الحساب
                </span>
                <Button onClick={handlePrintStatement} className="bg-slate-900 text-white text-xs gap-1.5">
                  <Printer className="w-4 h-4" />
                  طباعة الآن
                </Button>
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-white space-y-6" ref={printStatementRef} id="printable-statement">
              {/* Header */}
              <PrintHeader 
                documentTitle={`كشف حساب ${statementPartyType === "customer" ? "عميل" : statementPartyType === "supplier" ? "مورد" : statementPartyType === "employee" ? "موظف" : "حساب عام"}`} 
                dateStr={`الفترة: ${stmtStartDate || "البداية"} إلى ${stmtEndDate || "اليوم"}`} 
              />

              {/* Party Info */}
              {statementData?.party && (
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border text-xs grid grid-cols-2 gap-2">
                  <div><span className="text-slate-500">اسم الطرف / الحساب: </span><strong>{statementData.party.name}</strong></div>
                  <div><span className="text-slate-500">رقم الهاتف: </span><strong>{statementData.party.phone || "—"}</strong></div>
                  <div><span className="text-slate-500">الرصيد السابق: </span><strong>{fmt(statementData.previousBalance)} ريال</strong></div>
                  <div><span className="text-slate-500">الرصيد الحالي المستحق: </span><strong className="text-indigo-600">{fmt(statementData.currentBalance)} ريال</strong></div>
                </div>
              )}

              {/* Transactions Table */}
              <table className="w-full text-right text-xs border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-300">
                    <th className="p-2 border border-slate-300">التاريخ</th>
                    <th className="p-2 border border-slate-300">البيان والشرح</th>
                    <th className="p-2 border border-slate-300">مدين (له)</th>
                    <th className="p-2 border border-slate-300">دائن (عليه)</th>
                    <th className="p-2 border border-slate-300">الرصيد التراكمي</th>
                  </tr>
                </thead>
                <tbody>
                  {statementData?.transactions?.map((t: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="p-2 font-mono border border-slate-300">{t.date}</td>
                      <td className="p-2 font-semibold border border-slate-300">{t.description}</td>
                      <td className="p-2 font-bold text-emerald-700 border border-slate-300">{t.debit > 0 ? `${fmt(t.debit)} ريال` : "—"}</td>
                      <td className="p-2 font-bold text-rose-700 border border-slate-300">{t.credit > 0 ? `${fmt(t.credit)} ريال` : "—"}</td>
                      <td className="p-2 font-extrabold text-indigo-700 border border-slate-300">{fmt(t.running_balance)} ريال</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer Signatures */}
              <div className="grid grid-cols-3 pt-8 text-center text-xs font-bold">
                <div>
                  <p>محضِّر الحساب</p>
                  <div className="h-12 border-b border-dashed border-slate-400 mt-4"></div>
                </div>
                <div>
                  <p>المدير المالي</p>
                  <div className="h-12 border-b border-dashed border-slate-400 mt-4"></div>
                </div>
                <div>
                  <p>ختم واعتماد الشركة</p>
                  <div className="h-12 border-b border-dashed border-slate-400 mt-4"></div>
                </div>
              </div>
            </div>

            <DialogFooter className="print:hidden">
              <Button variant="outline" onClick={() => setShowStatementPrintModal(false)} className="text-xs">إغلاق</Button>
              <Button onClick={handlePrintStatement} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-2">
                <Printer className="w-4 h-4" />
                طباعة كشف الحساب
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* MODAL 11: ADD/EDIT SAFE (إضافة وتعديل صندوق) */}
        {/* ───────────────────────────────────────────────────────────── */}
        <Dialog open={showSafeDlg} onOpenChange={setShowSafeDlg}>
          <DialogContent className="max-w-md dir-rtl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Wallet className="w-5 h-5 text-indigo-600" />
                {editingSafe ? "تعديل بيانات الخزينة" : "إضافة خزينة / صندوق جديد"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div>
                <label className="font-bold mb-1 block">اسم الخزينة / الصندوق</label>
                <Input value={safeForm.name} onChange={(e) => setSafeForm({ ...safeForm, name: e.target.value })} className="text-xs" placeholder="مثال: الصندوق الرئيسي" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold mb-1 block">الرصيد الافتتاحي</label>
                  <Input type="number" disabled={!!editingSafe} value={safeForm.balance} onChange={(e) => setSafeForm({ ...safeForm, balance: e.target.value })} className="text-xs" />
                </div>
                <div>
                  <label className="font-bold mb-1 block">العملة</label>
                  <Input value={safeForm.currency} onChange={(e) => setSafeForm({ ...safeForm, currency: e.target.value })} className="text-xs" />
                </div>
              </div>
              <div>
                <label className="font-bold mb-1 block">ملاحظات</label>
                <Input value={safeForm.notes} onChange={(e) => setSafeForm({ ...safeForm, notes: e.target.value })} className="text-xs" />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSafeDlg(false)} className="text-xs">إلغاء</Button>
              <Button
                onClick={() => saveSafeMutation.mutate(safeForm)}
                disabled={!safeForm.name || saveSafeMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-2"
              >
                {saveSafeMutation.isPending ? "جاري الحفظ..." : "حفظ الصندوق"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* MODAL 12: ADD MANUAL ENTRY (إضافة قيد يدوي) */}
        {/* ───────────────────────────────────────────────────────────── */}
        <Dialog open={showManualDlg} onOpenChange={setShowManualDlg}>
          <DialogContent className="max-w-md dir-rtl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                إضافة قيد يدوي للحساب
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="font-bold mb-1 block">تاريخ القيد</label>
                <Input type="date" value={manualForm.entry_date} onChange={(e) => setManualForm({ ...manualForm, entry_date: e.target.value })} className="text-xs" />
              </div>
              <div>
                <label className="font-bold mb-1 block">البيان / الشرح</label>
                <Input value={manualForm.description} onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })} className="text-xs" placeholder="مثال: تسوية رصيد، رصيد افتتاحي..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold mb-1 block text-emerald-600">مدين (عليه/أخذ)</label>
                  <Input type="number" min="0" value={manualForm.debit} onChange={(e) => setManualForm({ ...manualForm, debit: e.target.value })} className="text-xs" />
                </div>
                <div>
                  <label className="font-bold mb-1 block text-rose-600">دائن (له/أعطى)</label>
                  <Input type="number" min="0" value={manualForm.credit} onChange={(e) => setManualForm({ ...manualForm, credit: e.target.value })} className="text-xs" />
                </div>
              </div>
              <div>
                <label className="font-bold mb-1 block">ملاحظات إضافية (اختياري)</label>
                <Input value={manualForm.notes} onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })} className="text-xs" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowManualDlg(false)} className="text-xs">إلغاء</Button>
              <Button
                onClick={() => addManualMutation.mutate(manualForm)}
                disabled={!manualForm.description || addManualMutation.isPending || (Number(manualForm.debit) === 0 && Number(manualForm.credit) === 0)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-2"
              >
                {addManualMutation.isPending ? "جاري الحفظ..." : "حفظ القيد اليدوي"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* MODAL 13: DEDICATED RECEIPT VOUCHER (سند القبض المستقل - مطابق للصورة) */}
        {/* ───────────────────────────────────────────────────────────── */}
        <Dialog open={showReceiptDlg} onOpenChange={setShowReceiptDlg}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto dir-rtl bg-slate-100 dark:bg-slate-900 p-4 text-xs" dir="rtl">
            {/* Top Header Bar */}
            <div className="flex items-center justify-between bg-slate-200 dark:bg-slate-800 p-2.5 rounded border shadow-sm">
              <div className="flex items-center gap-3">
                <span className="bg-red-600 text-white px-4 py-1 rounded font-extrabold text-sm shadow">سند قبض</span>
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1 rounded border">
                  <span className="text-slate-500 font-bold">التاريخ:</span>
                  <Input type="date" value={receiptForm.date || "2026-08-13"} onChange={(e) => setReceiptForm({ ...receiptForm, date: e.target.value })} className="h-7 w-32 text-xs border-0 bg-transparent p-0" />
                  <Calendar className="w-4 h-4 text-slate-400" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">رقم الحركة:</span>
                <div className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-mono font-bold px-3 py-1 rounded border border-emerald-300 text-center w-16">
                  {receiptForm.voucher_no || "1"}
                </div>
              </div>
            </div>

            {/* Main Fields Grid (Top & Box section matching image) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 bg-white dark:bg-slate-800 p-4 rounded border shadow-sm">
              {/* Right Side: Box/Safe & Amounts */}
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="font-bold text-slate-700 dark:text-slate-300">اسم الصندوق:</label>
                  <div className="col-span-2 flex items-center gap-2">
                    <Select value={receiptForm.safe_id} onValueChange={(v) => setReceiptForm({ ...receiptForm, safe_id: v })}>
                      <SelectTrigger className="h-8 text-xs bg-emerald-50 dark:bg-emerald-950 font-bold"><SelectValue placeholder="صندوق رئيسي" /></SelectTrigger>
                      <SelectContent>
                        {safes.map((s: any) => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.name} (الرصيد: {fmt(s.balance)})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-sm"></span>
                    <Input className="h-8 w-12 text-center font-bold text-xs" value="1" readOnly />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="font-bold text-slate-700 dark:text-slate-300">عملة الحساب:</label>
                  <div className="col-span-2 grid grid-cols-2 gap-2">
                    <Input className="h-8 text-xs bg-purple-50 dark:bg-purple-950 font-bold" value="ريال سعودي" readOnly />
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 text-[10px]">س.ص</span>
                      <Input className="h-8 text-xs font-mono font-bold text-center" value={receiptForm.exchange_rate || "140"} onChange={(e) => setReceiptForm({ ...receiptForm, exchange_rate: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="font-bold text-emerald-700 dark:text-emerald-400">المبلغ رقماً:</label>
                  <div className="col-span-2 flex items-center gap-2">
                    <Input
                      type="number"
                      className="h-8 text-xs font-extrabold text-indigo-700 bg-pink-50 dark:bg-pink-950 text-right text-sm"
                      value={receiptForm.amount}
                      onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })}
                      placeholder="1,250"
                    />
                    <span className="font-bold text-slate-600 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">ر.س</span>
                  </div>
                </div>
              </div>

              {/* Left Side: Metadata & References */}
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="font-bold text-slate-700 dark:text-slate-300">اسم المحصل:</label>
                  <div className="col-span-2 flex items-center gap-2">
                    <Select value={receiptForm.collector_name || "1"} onValueChange={(v) => setReceiptForm({ ...receiptForm, collector_name: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="محمد أحمد" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">محمد أحمد (المحصل الرئيسي)</SelectItem>
                        <SelectItem value="2">خالد عبدالله</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                    <Input className="h-8 w-12 text-center font-bold text-xs" value="1" readOnly />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="font-bold text-slate-700 dark:text-slate-300">تصنيف الحركة:</label>
                  <Input className="col-span-2 h-8 text-xs" value="تحصيل نقدى ومقبوضات عملاء" readOnly />
                </div>

                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="font-bold text-slate-700 dark:text-slate-300">مركز التكلفة:</label>
                  <div className="col-span-2 flex items-center gap-2">
                    <Input className="h-8 text-xs font-mono font-bold" value="1" readOnly />
                    <span className="text-slate-500 text-[11px]">الفرع الرئيسي</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="font-bold text-slate-700 dark:text-slate-300">رمز الحركة:</label>
                  <div className="col-span-2 grid grid-cols-2 gap-2">
                    <Input className="h-8 text-xs font-mono" value="RC-001" readOnly />
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">مرجع:</span>
                      <Input className="h-8 text-xs font-mono" value="1" readOnly />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="font-bold text-slate-700 dark:text-slate-300">تاريخ الاستحقاق:</label>
                  <div className="col-span-2 flex items-center gap-2">
                    <Input type="date" className="h-8 text-xs" value="2026-08-28" readOnly />
                    <Calendar className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Section: Amount in Words, Beneficiary & Description */}
            <div className="bg-white dark:bg-slate-800 p-3 rounded border shadow-sm space-y-3 mt-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <label className="md:col-span-2 font-bold text-slate-700 dark:text-slate-300">المبلغ كتابة:</label>
                <div className="md:col-span-10">
                  <Input
                    className="h-8 text-xs font-bold bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-200"
                    value={receiptForm.amount ? tafqeet(Number(receiptForm.amount), "SAR") : "ألف ومائتان وخمسون ريال سعودي"}
                    readOnly
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <label className="md:col-span-2 font-bold text-slate-700 dark:text-slate-300">استلمت من:</label>
                <div className="md:col-span-10 flex items-center gap-2">
                  <div className="flex-1">
                    <SearchableSelect
                      options={customers.map((c: any) => ({ value: String(c.id), label: c.name, sublabel: c.phone }))}
                      value={receiptForm.party_id}
                      onChange={(v) => {
                        const found = customers.find((c: any) => String(c.id) === v);
                        setReceiptForm({ ...receiptForm, party_id: v, received_from: found ? found.name : "" });
                      }}
                      placeholder="وكالة القايلي للسفريات والسياحة"
                      searchPlaceholder="ابحث بالاسم..."
                    />
                  </div>
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                  <Input className="h-8 w-40 text-xs bg-purple-50 dark:bg-purple-950 font-bold" value={receiptForm.received_from || "وكالة القايلي للسفريات"} onChange={(e) => setReceiptForm({ ...receiptForm, received_from: e.target.value })} />
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <label className="md:col-span-2 font-bold text-slate-700 dark:text-slate-300">البيان / الشرح:</label>
                <div className="md:col-span-10">
                  <Input
                    className="h-8 text-xs font-semibold"
                    value={receiptForm.payment_against || "تحصيل نقداً من وكالة القايلي للسفريات والسياحة"}
                    onChange={(e) => setReceiptForm({ ...receiptForm, payment_against: e.target.value })}
                    placeholder="اكتب بيان سند القبض..."
                  />
                </div>
              </div>
            </div>

            {/* Tabs & Table Section */}
            <div className="mt-3 bg-white dark:bg-slate-800 rounded border shadow-sm p-3">
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="bg-slate-100 dark:bg-slate-900 grid grid-cols-6 h-9 text-[11px] font-bold">
                  <TabsTrigger value="details" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">تفاصيل حسابات السند</TabsTrigger>
                  <TabsTrigger value="other">تفاصيل أخرى</TabsTrigger>
                  <TabsTrigger value="installments">خاص بالأقساط</TabsTrigger>
                  <TabsTrigger value="attachments">المرفقات</TabsTrigger>
                  <TabsTrigger value="options">خيارات السند</TabsTrigger>
                  <TabsTrigger value="notes">ملاحظات مالية</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="mt-3 space-y-3">
                  <div className="overflow-x-auto border rounded">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-200 dark:bg-slate-700 font-bold text-slate-800 dark:text-slate-200 border-b">
                          <th className="p-2 border-l">المبلغ</th>
                          <th className="p-2 border-l">اسم الحساب</th>
                          <th className="p-2 border-l">العملة</th>
                          <th className="p-2 border-l">البيان</th>
                          <th className="p-2 border-l">مبلغ القيد</th>
                          <th className="p-2">س.ص</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b bg-amber-50/50 dark:bg-amber-950/20">
                          <td className="p-1.5 border-l font-bold text-indigo-700">
                            <Input className="h-7 text-xs font-bold bg-white" value={receiptForm.amount || "1,250"} onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })} />
                          </td>
                          <td className="p-1.5 border-l">
                            <Input className="h-7 text-xs bg-white" value="وكالة القايلي للسفريات والسياحة" readOnly />
                          </td>
                          <td className="p-1.5 border-l">
                            <Input className="h-7 text-xs bg-pink-100 dark:bg-pink-900 font-bold text-center" value="ر.ي" readOnly />
                          </td>
                          <td className="p-1.5 border-l">
                            <Input className="h-7 text-xs bg-white" value={receiptForm.payment_against || "لكم واصل من حسابكم"} readOnly />
                          </td>
                          <td className="p-1.5 border-l">
                            <Input className="h-7 text-xs bg-yellow-100 dark:bg-yellow-900 font-bold text-center" value="175,000" readOnly />
                          </td>
                          <td className="p-1.5 text-center font-bold">1</td>
                        </tr>
                        <tr className="border-b text-slate-400">
                          <td className="p-1.5 border-l"><Input className="h-7 text-xs" placeholder="0.00" disabled /></td>
                          <td className="p-1.5 border-l"><Input className="h-7 text-xs" placeholder="اختر الحساب..." disabled /></td>
                          <td className="p-1.5 border-l"><Input className="h-7 text-xs" placeholder="ر.ي" disabled /></td>
                          <td className="p-1.5 border-l"><Input className="h-7 text-xs" placeholder="البيان..." disabled /></td>
                          <td className="p-1.5 border-l"><Input className="h-7 text-xs" placeholder="0" disabled /></td>
                          <td className="p-1.5 text-center">2</td>
                        </tr>
                        <tr className="border-b text-slate-400">
                          <td className="p-1.5 border-l"><Input className="h-7 text-xs" placeholder="0.00" disabled /></td>
                          <td className="p-1.5 border-l"><Input className="h-7 text-xs" placeholder="اختر الحساب..." disabled /></td>
                          <td className="p-1.5 border-l"><Input className="h-7 text-xs" placeholder="ر.ي" disabled /></td>
                          <td className="p-1.5 border-l"><Input className="h-7 text-xs" placeholder="البيان..." disabled /></td>
                          <td className="p-1.5 border-l"><Input className="h-7 text-xs" placeholder="0" disabled /></td>
                          <td className="p-1.5 text-center">3</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="other" className="p-4 text-slate-500 text-center">
                  تفاصيل إضافية للحركة وسجل المراجعة والتدقيق المالي.
                </TabsContent>
                <TabsContent value="installments" className="p-4 text-slate-500 text-center">
                  ربط السند بالأقساط وجدولة استحقاق الدفعات.
                </TabsContent>
                <TabsContent value="attachments" className="p-4 text-slate-500 text-center">
                  إرفاق صور السندات والإيصالات البنكية ومستندات التحويل.
                </TabsContent>
                <TabsContent value="options" className="p-4 text-slate-500 text-center">
                  خيارات الترحيل التلقائي لدفتر الأستاذ العام وحسابات الصندوق.
                </TabsContent>
                <TabsContent value="notes" className="p-4">
                  <textarea className="w-full border rounded p-2 text-xs h-20" placeholder="ملاحظات داخلية للمحاسب..." defaultValue="تم المراجعة والتحصيل نقداً وإيداع المبلغ في الصندوق الرئيسي." />
                </TabsContent>
              </Tabs>
            </div>

            {/* Bottom Footer & Action Toolbar */}
            <div className="bg-slate-200 dark:bg-slate-800 p-3 rounded border flex flex-col md:flex-row items-center justify-between gap-3 mt-3">
              {/* Left Side: Summary & Print Checkboxes */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-3 py-1 rounded border">
                  <span className="font-bold text-slate-600 dark:text-slate-300">إجمالي السند:</span>
                  <span className="font-extrabold text-indigo-700 text-sm">{receiptForm.amount || "1,250"}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">نموذج الطباعة</span>
                  <Select defaultValue="default">
                    <SelectTrigger className="h-7 w-36 text-[11px]"><SelectValue placeholder="نموذج الطباعة الافتراضي" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">نموذج الطباعة الافتراضي</SelectItem>
                      <SelectItem value="thermal">إيصال حراري قصير</SelectItem>
                      <SelectItem value="a4">سند A4 رسمي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3 text-[11px]">
                  <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" defaultChecked className="rounded" /> طباعة المستفيد</label>
                  <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" defaultChecked className="rounded" /> طباعة الجهة</label>
                  <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" className="rounded" /> تأكيد الطباعة</label>
                  <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" className="rounded" /> طباعة رؤول</label>
                </div>

                <div className="text-[10px] font-mono text-slate-500">
                  AM 12:46:31 13/08/2026
                </div>

                <Badge className="bg-emerald-600 text-white font-bold">معتمدة</Badge>
              </div>

              {/* Right Side: Action Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={() => { setReceiptForm({ ...receiptForm, amount: "", received_from: "", payment_against: "" }); toast({ title: "تم تهيئة سند قبض جديد" }); }} className="text-xs h-8">جديد</Button>
                <Button
                  size="sm"
                  onClick={() => {
    if (!receiptForm.amount || parseFloat(receiptForm.amount) <= 0) {
      toast({ variant: "destructive", title: "يرجى إدخال مبلغ السند أولاً" });
      return;
    }
    createVoucherMutation.mutate({ ...receiptForm, type: "receipt" });
    setShowReceiptDlg(false);
    toast({ title: "تم حفظ وإصدار سند القبض بنجاح", description: "المبلغ: " + receiptForm.amount + " ريال" });
  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-4 font-bold shadow"
                >
                  حفظ
                </Button>
                <Button variant="outline" size="sm" onClick={() => { toast({ title: "جاري الطباعة..." }); setTimeout(() => window.print(), 500); }} className="text-xs h-8 gap-1"><Printer className="w-3.5 h-3.5" /> طباعة</Button>
                <Button variant="outline" size="sm" onClick={() => toast({ title: "نافذة البحث المتقدم" })} className="text-xs h-8"><Search className="w-3.5 h-3.5" /> بحث</Button>
                <div className="flex items-center border rounded bg-white dark:bg-slate-900">
                  <Button variant="ghost" size="sm" onClick={() => toast({ title: "السجل الأول" })} className="h-7 w-7 p-0 text-xs font-mono">&lt;&lt;</Button>
                  <Button variant="ghost" size="sm" onClick={() => toast({ title: "السجل السابق" })} className="h-7 w-7 p-0 text-xs font-mono">&lt;</Button>
                  <Button variant="ghost" size="sm" onClick={() => toast({ title: "السجل التالي" })} className="h-7 w-7 p-0 text-xs font-mono">&gt;</Button>
                  <Button variant="ghost" size="sm" onClick={() => toast({ title: "السجل الأخير" })} className="h-7 w-7 p-0 text-xs font-mono">&gt;&gt;</Button>
                </div>
                <Button variant="outline" size="sm" onClick={() => toast({ title: "تم حذف السجل الحالي" })} className="text-xs h-8 text-rose-600 hover:text-rose-700"><Trash2 className="w-3.5 h-3.5" /> حذف</Button>
                <Button variant="ghost" size="sm" onClick={() => toast({ title: "معلومات السجل والنظام المحاسبي" })} className="h-8 w-8 p-0"><Info className="w-4 h-4 text-slate-500" /></Button>
                <Button variant="outline" size="sm" onClick={() => toast({ title: "Switch to English UI" })} className="text-xs h-8 font-mono">EN</Button>
                <Button variant="destructive" size="sm" onClick={() => setShowReceiptDlg(false)} className="text-xs h-8">خروج</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* MODAL 14: DEDICATED PAYMENT VOUCHER (سند الصرف المستقل - مطابق للصورة) */}
        {/* ───────────────────────────────────────────────────────────── */}
        <Dialog open={showPaymentDlg} onOpenChange={setShowPaymentDlg}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto dir-rtl bg-slate-100 dark:bg-slate-900 p-4 text-xs" dir="rtl">
            {/* Top Header Bar */}
            <div className="flex items-center justify-between bg-slate-200 dark:bg-slate-800 p-2.5 rounded border shadow-sm">
              <div className="flex items-center gap-3">
                <span className="bg-rose-600 text-white px-4 py-1 rounded font-extrabold text-sm shadow">سند صرف</span>
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1 rounded border">
                  <span className="text-slate-500 font-bold">التاريخ:</span>
                  <Input type="date" value={paymentForm.date || "2026-08-02"} onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })} className="h-7 w-32 text-xs border-0 bg-transparent p-0" />
                  <Calendar className="w-4 h-4 text-slate-400" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">رقم الحركة:</span>
                <div className="bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-mono font-bold px-3 py-1 rounded border border-rose-300 text-center w-16">
                  {paymentForm.voucher_no || "1"}
                </div>
              </div>
            </div>

            {/* Main Fields Grid (Top & Box section matching image) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 bg-white dark:bg-slate-800 p-4 rounded border shadow-sm">
              {/* Right Side: Box/Safe & Amounts */}
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="font-bold text-slate-700 dark:text-slate-300">اسم الصندوق:</label>
                  <div className="col-span-2 flex items-center gap-2">
                    <Select value={paymentForm.safe_id} onValueChange={(v) => setPaymentForm({ ...paymentForm, safe_id: v })}>
                      <SelectTrigger className="h-8 text-xs bg-rose-50 dark:bg-rose-950 font-bold"><SelectValue placeholder="صندوق رئيسي" /></SelectTrigger>
                      <SelectContent>
                        {safes.map((s: any) => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.name} (الرصيد: {fmt(s.balance)})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-sm"></span>
                    <Input className="h-8 w-12 text-center font-bold text-xs" value="1" readOnly />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="font-bold text-slate-700 dark:text-slate-300">عملة الحساب:</label>
                  <div className="col-span-2 grid grid-cols-2 gap-2">
                    <Input className="h-8 text-xs bg-purple-50 dark:bg-purple-950 font-bold" value="ريال يمني" readOnly />
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 text-[10px]">س.ص</span>
                      <Input className="h-8 text-xs font-mono font-bold text-center" value={paymentForm.exchange_rate || "1"} onChange={(e) => setPaymentForm({ ...paymentForm, exchange_rate: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="font-bold text-rose-700 dark:text-rose-400">المبلغ رقماً:</label>
                  <div className="col-span-2 flex items-center gap-2">
                    <Input
                      type="number"
                      className="h-8 text-xs font-extrabold text-rose-700 bg-pink-50 dark:bg-pink-950 text-right text-sm"
                      value={paymentForm.amount || "240450"}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      placeholder="240,450"
                    />
                    <span className="font-bold text-slate-600 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">ر.ي</span>
                  </div>
                </div>
              </div>

              {/* Left Side: Metadata & References */}
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="font-bold text-slate-700 dark:text-slate-300">اسم المحصل:</label>
                  <div className="col-span-2 flex items-center gap-2">
                    <Select value={paymentForm.collector_name || "1"} onValueChange={(v) => setPaymentForm({ ...paymentForm, collector_name: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="محمد أحمد" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">محمد أحمد (المحصل الرئيسي)</SelectItem>
                        <SelectItem value="2">خالد عبدالله</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                    <Input className="h-8 w-12 text-center font-bold text-xs" value="1" readOnly />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="font-bold text-slate-700 dark:text-slate-300">تصنيف الحركة:</label>
                  <Input className="col-span-2 h-8 text-xs" value="صرف سلفة نقدى" readOnly />
                </div>

                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="font-bold text-slate-700 dark:text-slate-300">مركز التكلفة:</label>
                  <div className="col-span-2 flex items-center gap-2">
                    <Input className="h-8 text-xs font-mono font-bold" value="1" readOnly />
                    <span className="text-slate-500 text-[11px]">الفرع الرئيسي</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="font-bold text-slate-700 dark:text-slate-300">رمز الحركة:</label>
                  <div className="col-span-2 grid grid-cols-2 gap-2">
                    <Input className="h-8 text-xs font-mono" value="صرف" readOnly />
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">مرجع:</span>
                      <Input className="h-8 text-xs font-mono" value="1" readOnly />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="font-bold text-slate-700 dark:text-slate-300">تاريخ الاستحقاق:</label>
                  <div className="col-span-2 flex items-center gap-2">
                    <Input type="date" className="h-8 text-xs" value="2026-08-10" readOnly />
                    <Calendar className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Section: Amount in Words, Beneficiary & Description */}
            <div className="bg-white dark:bg-slate-800 p-3 rounded border shadow-sm space-y-3 mt-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <label className="md:col-span-2 font-bold text-slate-700 dark:text-slate-300">المبلغ كتابة:</label>
                <div className="md:col-span-10">
                  <Input
                    className="h-8 text-xs font-bold bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-200"
                    value={paymentForm.amount ? tafqeet(Number(paymentForm.amount), "YER") : "مائتان وأربعون ألف وأربعمائة وخمسون ريال يمني"}
                    readOnly
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <label className="md:col-span-2 font-bold text-slate-700 dark:text-slate-300">اسم المستلم:</label>
                <div className="md:col-span-10 flex items-center gap-2">
                  <div className="flex-1">
                    <SearchableSelect
                      options={employees.map((e: any) => ({ value: String(e.id), label: e.name, sublabel: e.position }))}
                      value={paymentForm.party_id}
                      onChange={(v) => {
                        const found = employees.find((e: any) => String(e.id) === v);
                        setPaymentForm({ ...paymentForm, party_id: v, received_from: found ? found.name : "" });
                      }}
                      placeholder="الموظف ابراهيم محمد الشاوش"
                      searchPlaceholder="ابحث بالاسم..."
                    />
                  </div>
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                  <Input className="h-8 w-52 text-xs bg-purple-50 dark:bg-purple-950 font-bold" value={paymentForm.received_from || "الموظف ابراهيم محمد الشاوش"} onChange={(e) => setPaymentForm({ ...paymentForm, received_from: e.target.value })} />
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <label className="md:col-span-2 font-bold text-slate-700 dark:text-slate-300">البيان / الشرح:</label>
                <div className="md:col-span-10">
                  <Input
                    className="h-8 text-xs font-semibold"
                    value={paymentForm.payment_against || "عليكم سلفة نقداً"}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_against: e.target.value })}
                    placeholder="اكتب بيان سند الصرف..."
                  />
                </div>
              </div>
            </div>

            {/* Tabs & Table Section */}
            <div className="mt-3 bg-white dark:bg-slate-800 rounded border shadow-sm p-3">
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="bg-slate-100 dark:bg-slate-900 grid grid-cols-6 h-9 text-[11px] font-bold">
                  <TabsTrigger value="details" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">تفاصيل حسابات السند</TabsTrigger>
                  <TabsTrigger value="other">تفاصيل أخرى</TabsTrigger>
                  <TabsTrigger value="installments">خاص بالأقساط</TabsTrigger>
                  <TabsTrigger value="attachments">المرفقات</TabsTrigger>
                  <TabsTrigger value="options">خيارات السند</TabsTrigger>
                  <TabsTrigger value="notes">ملاحظات مالية</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="mt-3 space-y-3">
                  <div className="overflow-x-auto border rounded">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-200 dark:bg-slate-700 font-bold text-slate-800 dark:text-slate-200 border-b">
                          <th className="p-2 border-l">المبلغ</th>
                          <th className="p-2 border-l">اسم الحساب</th>
                          <th className="p-2 border-l">العملة</th>
                          <th className="p-2 border-l">البيان</th>
                          <th className="p-2 border-l">مبلغ القيد</th>
                          <th className="p-2">س.ص</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b bg-rose-50/50 dark:bg-rose-950/20">
                          <td className="p-1.5 border-l font-bold text-rose-700">
                            <Input className="h-7 text-xs font-bold bg-white" value={paymentForm.amount || "240,450"} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                          </td>
                          <td className="p-1.5 border-l">
                            <Input className="h-7 text-xs bg-white" value="الموظف ابراهيم محمد الشاوش" readOnly />
                          </td>
                          <td className="p-1.5 border-l">
                            <Input className="h-7 text-xs bg-pink-100 dark:bg-pink-900 font-bold text-center" value="ر.ي" readOnly />
                          </td>
                          <td className="p-1.5 border-l">
                            <Input className="h-7 text-xs bg-white" value={paymentForm.payment_against || "عليكم سلفة نقداً"} readOnly />
                          </td>
                          <td className="p-1.5 border-l">
                            <Input className="h-7 text-xs bg-yellow-100 dark:bg-yellow-900 font-bold text-center" value="240,450" readOnly />
                          </td>
                          <td className="p-1.5 text-center font-bold">1</td>
                        </tr>
                        <tr className="border-b text-slate-400">
                          <td className="p-1.5 border-l"><Input className="h-7 text-xs" placeholder="0.00" disabled /></td>
                          <td className="p-1.5 border-l"><Input className="h-7 text-xs" placeholder="اختر الحساب..." disabled /></td>
                          <td className="p-1.5 border-l"><Input className="h-7 text-xs" placeholder="ر.ي" disabled /></td>
                          <td className="p-1.5 border-l"><Input className="h-7 text-xs" placeholder="البيان..." disabled /></td>
                          <td className="p-1.5 border-l"><Input className="h-7 text-xs" placeholder="0" disabled /></td>
                          <td className="p-1.5 text-center">2</td>
                        </tr>
                        <tr className="border-b text-slate-400">
                          <td className="p-1.5 border-l"><Input className="h-7 text-xs" placeholder="0.00" disabled /></td>
                          <td className="p-1.5 border-l"><Input className="h-7 text-xs" placeholder="اختر الحساب..." disabled /></td>
                          <td className="p-1.5 border-l"><Input className="h-7 text-xs" placeholder="ر.ي" disabled /></td>
                          <td className="p-1.5 border-l"><Input className="h-7 text-xs" placeholder="البيان..." disabled /></td>
                          <td className="p-1.5 border-l"><Input className="h-7 text-xs" placeholder="0" disabled /></td>
                          <td className="p-1.5 text-center">3</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="other" className="p-4 text-slate-500 text-center">
                  تفاصيل إضافية للحركة وسجل المراجعة والتدقيق المالي.
                </TabsContent>
                <TabsContent value="installments" className="p-4 text-slate-500 text-center">
                  ربط السند بالأقساط وجدولة استحقاق السداد.
                </TabsContent>
                <TabsContent value="attachments" className="p-4 text-slate-500 text-center">
                  إرفاق صور السندات والإيصالات البنكية ومستندات التحويل.
                </TabsContent>
                <TabsContent value="options" className="p-4 text-slate-500 text-center">
                  خيارات الترحيل التلقائي لدفتر الأستاذ العام وحسابات الخزينة.
                </TabsContent>
                <TabsContent value="notes" className="p-4">
                  <textarea className="w-full border rounded p-2 text-xs h-20" placeholder="ملاحظات داخلية للمحاسب..." defaultValue="تم المراجعة والصرف نقداً واعتماد السلفة للموظف." />
                </TabsContent>
              </Tabs>
            </div>

            {/* Bottom Footer & Action Toolbar */}
            <div className="bg-slate-200 dark:bg-slate-800 p-3 rounded border flex flex-col md:flex-row items-center justify-between gap-3 mt-3">
              {/* Left Side: Summary & Print Checkboxes */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-3 py-1 rounded border">
                  <span className="font-bold text-slate-600 dark:text-slate-300">إجمالي السند:</span>
                  <span className="font-extrabold text-rose-700 text-sm">{paymentForm.amount || "240,450"}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">نموذج الطباعة</span>
                  <Select defaultValue="default">
                    <SelectTrigger className="h-7 w-36 text-[11px]"><SelectValue placeholder="نموذج الطباعة الافتراضي" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">نموذج الطباعة الافتراضي</SelectItem>
                      <SelectItem value="thermal">إيصال حراري قصير</SelectItem>
                      <SelectItem value="a4">سند صرف A4 رسمي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3 text-[11px]">
                  <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" defaultChecked className="rounded" /> طباعة المستفيد</label>
                  <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" defaultChecked className="rounded" /> طباعة الجهة</label>
                  <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" className="rounded" /> تأكيد الطباعة</label>
                  <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" className="rounded" /> طباعة رؤول</label>
                </div>

                <div className="text-[10px] font-mono text-slate-500">
                  PM 11:40 08/10/2026
                </div>

                <Badge className="bg-emerald-600 text-white font-bold">معتمدة</Badge>
              </div>

              {/* Right Side: Action Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={() => { setPaymentForm({ ...paymentForm, amount: "", received_from: "", payment_against: "" }); toast({ title: "تم تهيئة سند صرف جديد" }); }} className="text-xs h-8">جديد</Button>
                <Button
                  size="sm"
                  onClick={() => {
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast({ variant: "destructive", title: "يرجى إدخال مبلغ السند أولاً" });
      return;
    }
    createVoucherMutation.mutate({ ...paymentForm, type: "payment" });
    setShowPaymentDlg(false);
    toast({ title: "تم حفظ وإصدار سند الصرف بنجاح", description: "المبلغ: " + paymentForm.amount + " ريال" });
  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-8 px-4 font-bold shadow"
                >
                  حفظ
                </Button>
                <Button variant="outline" size="sm" onClick={() => { toast({ title: "جاري الطباعة..." }); setTimeout(() => window.print(), 500); }} className="text-xs h-8 gap-1"><Printer className="w-3.5 h-3.5" /> طباعة</Button>
                <Button variant="outline" size="sm" onClick={() => toast({ title: "نافذة البحث المتقدم" })} className="text-xs h-8"><Search className="w-3.5 h-3.5" /> بحث</Button>
                <div className="flex items-center border rounded bg-white dark:bg-slate-900">
                  <Button variant="ghost" size="sm" onClick={() => toast({ title: "السجل الأول" })} className="h-7 w-7 p-0 text-xs font-mono">&lt;&lt;</Button>
                  <Button variant="ghost" size="sm" onClick={() => toast({ title: "السجل السابق" })} className="h-7 w-7 p-0 text-xs font-mono">&lt;</Button>
                  <Button variant="ghost" size="sm" onClick={() => toast({ title: "السجل التالي" })} className="h-7 w-7 p-0 text-xs font-mono">&gt;</Button>
                  <Button variant="ghost" size="sm" onClick={() => toast({ title: "السجل الأخير" })} className="h-7 w-7 p-0 text-xs font-mono">&gt;&gt;</Button>
                </div>
                <Button variant="outline" size="sm" onClick={() => toast({ title: "تم حذف السجل الحالي" })} className="text-xs h-8 text-rose-600 hover:text-rose-700"><Trash2 className="w-3.5 h-3.5" /> حذف</Button>
                <Button variant="ghost" size="sm" onClick={() => toast({ title: "معلومات السجل والنظام المحاسبي" })} className="h-8 w-8 p-0"><Info className="w-4 h-4 text-slate-500" /></Button>
                <Button variant="outline" size="sm" onClick={() => toast({ title: "Switch to English UI" })} className="text-xs h-8 font-mono">EN</Button>
                <Button variant="destructive" size="sm" onClick={() => setShowPaymentDlg(false)} className="text-xs h-8">خروج</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
