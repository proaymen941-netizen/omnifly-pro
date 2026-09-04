import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useGetUsers, useCreateUser, useUpdateUser, useDeleteUser, getGetUsersQueryKey } from "@workspace/api-client-react";
import type { User } from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Shield, UserCheck, MapPin, Info } from "lucide-react";

type FormData = {
  username: string;
  name: string;
  role: "admin" | "accountant" | "cashier" | "storekeeper" | "purchasing" | "sales" | "hr";
  password: string;
  active: boolean;
  can_discount: boolean;
  employee_id: string;
  branch_id: string;
  perm_create_invoice: boolean;
  perm_edit_invoice: boolean;
  perm_cancel_invoice: boolean;
  perm_return: boolean;
  perm_view_prices: boolean;
  perm_view_profits: boolean;
  perm_edit_stock: boolean;
  perm_stocktake: boolean;
  perm_edit_entries: boolean;
  perm_close_periods: boolean;
  perm_view_salaries: boolean;
};

const ROLES = [
  { value: "admin", label: "مدير النظام" },
  { value: "accountant", label: "محاسب" },
  { value: "cashier", label: "كاشير" },
  { value: "storekeeper", label: "أمين مخزن" },
  { value: "purchasing", label: "موظف مشتريات" },
  { value: "sales", label: "موظف مبيعات" },
  { value: "hr", label: "مسؤول موارد بشرية" },
];

export default function Users() {
  const { data: users = [], isLoading } = useGetUsers();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<FormData>({
    username: "",
    name: "",
    role: "cashier",
    password: "",
    active: true,
    can_discount: false,
    employee_id: "",
    branch_id: "",
    perm_create_invoice: true,
    perm_edit_invoice: true,
    perm_cancel_invoice: true,
    perm_return: true,
    perm_view_prices: true,
    perm_view_profits: false,
    perm_edit_stock: false,
    perm_stocktake: false,
    perm_edit_entries: false,
    perm_close_periods: false,
    perm_view_salaries: false
  });

  // Fetch branches and employees dynamically
  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ["branches"],
    queryFn: () => fetch("/api/branches").then(res => res.json()).catch(() => [])
  });

  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ["employees"],
    queryFn: () => fetch("/api/hr/employees").then(res => res.json()).catch(() => [])
  });

  const openAdd = () => {
    setEditing(null);
    setForm({
      username: "",
      name: "",
      role: "cashier",
      password: "",
      active: true,
      can_discount: false,
      employee_id: "",
      branch_id: "",
      perm_create_invoice: true,
      perm_edit_invoice: true,
      perm_cancel_invoice: true,
      perm_return: true,
      perm_view_prices: true,
      perm_view_profits: false,
      perm_edit_stock: false,
      perm_stocktake: false,
      perm_edit_entries: false,
      perm_close_periods: false,
      perm_view_salaries: false
    });
    setShowDialog(true);
  };

  const openEdit = (u: any) => {
    setEditing(u);
    setForm({
      username: u.username,
      name: u.name,
      role: u.role || "cashier",
      password: "",
      active: u.active,
      can_discount: u.can_discount !== undefined ? Boolean(u.can_discount) : false,
      employee_id: u.employee_id ? String(u.employee_id) : "",
      branch_id: u.branch_id ? String(u.branch_id) : "",
      perm_create_invoice: u.perm_create_invoice !== undefined ? Boolean(u.perm_create_invoice) : true,
      perm_edit_invoice: u.perm_edit_invoice !== undefined ? Boolean(u.perm_edit_invoice) : true,
      perm_cancel_invoice: u.perm_cancel_invoice !== undefined ? Boolean(u.perm_cancel_invoice) : true,
      perm_return: u.perm_return !== undefined ? Boolean(u.perm_return) : true,
      perm_view_prices: u.perm_view_prices !== undefined ? Boolean(u.perm_view_prices) : true,
      perm_view_profits: u.perm_view_profits !== undefined ? Boolean(u.perm_view_profits) : false,
      perm_edit_stock: u.perm_edit_stock !== undefined ? Boolean(u.perm_edit_stock) : false,
      perm_stocktake: u.perm_stocktake !== undefined ? Boolean(u.perm_stocktake) : false,
      perm_edit_entries: u.perm_edit_entries !== undefined ? Boolean(u.perm_edit_entries) : false,
      perm_close_periods: u.perm_close_periods !== undefined ? Boolean(u.perm_close_periods) : false,
      perm_view_salaries: u.perm_view_salaries !== undefined ? Boolean(u.perm_view_salaries) : false
    });
    setShowDialog(true);
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: getGetUsersQueryKey() });

  const handleRoleChange = (r: any) => {
    let perms = {
      perm_create_invoice: false,
      perm_edit_invoice: false,
      perm_cancel_invoice: false,
      perm_return: false,
      perm_view_prices: false,
      perm_view_profits: false,
      perm_edit_stock: false,
      perm_stocktake: false,
      perm_edit_entries: false,
      perm_close_periods: false,
      perm_view_salaries: false
    };

    if (r === "admin" || r === "developer") {
      perms = {
        perm_create_invoice: true,
        perm_edit_invoice: true,
        perm_cancel_invoice: true,
        perm_return: true,
        perm_view_prices: true,
        perm_view_profits: true,
        perm_edit_stock: true,
        perm_stocktake: true,
        perm_edit_entries: true,
        perm_close_periods: true,
        perm_view_salaries: true
      };
    } else if (r === "accountant") {
      perms = {
        perm_create_invoice: true,
        perm_edit_invoice: true,
        perm_cancel_invoice: true,
        perm_return: true,
        perm_view_prices: true,
        perm_view_profits: true,
        perm_edit_stock: false,
        perm_stocktake: false,
        perm_edit_entries: true,
        perm_close_periods: true,
        perm_view_salaries: true
      };
    } else if (r === "storekeeper") {
      perms.perm_view_prices = true;
      perms.perm_edit_stock = true;
      perms.perm_stocktake = true;
    } else if (r === "purchasing") {
      perms.perm_view_prices = true;
      perms.perm_edit_stock = true;
      perms.perm_create_invoice = true;
    } else if (r === "sales") {
      perms.perm_view_prices = true;
      perms.perm_create_invoice = true;
      perms.perm_edit_invoice = true;
    } else if (r === "cashier") {
      perms.perm_create_invoice = true;
      perms.perm_view_prices = true;
    } else if (r === "hr") {
      perms.perm_view_salaries = true;
    }

    setForm({
      ...form,
      role: r,
      can_discount: (r === "admin" || r === "accountant"),
      ...perms
    });
  };

  const handleSave = () => {
    if (!form.username || !form.name || (!editing && !form.password)) return;

    // Package request body
    const payload: any = {
      username: form.username,
      name: form.name,
      role: form.role,
      active: form.active,
      can_discount: form.role === "admin" || form.role === "accountant" ? true : form.can_discount,
      employee_id: form.employee_id ? Number(form.employee_id) : null,
      branch_id: form.branch_id ? Number(form.branch_id) : null,
      perm_create_invoice: form.perm_create_invoice,
      perm_edit_invoice: form.perm_edit_invoice,
      perm_cancel_invoice: form.perm_cancel_invoice,
      perm_return: form.perm_return,
      perm_view_prices: form.perm_view_prices,
      perm_view_profits: form.perm_view_profits,
      perm_edit_stock: form.perm_edit_stock,
      perm_stocktake: form.perm_stocktake,
      perm_edit_entries: form.perm_edit_entries,
      perm_close_periods: form.perm_close_periods,
      perm_view_salaries: form.perm_view_salaries
    };

    if (editing) {
      if (form.password) {
        payload.password = form.password;
      }
      updateMutation.mutate({ id: editing.id, data: payload }, {
        onSuccess: () => {
          invalidate();
          setShowDialog(false);
          toast({ title: "تم التحديث بنجاح", description: `تم تحديث بيانات وصلاحيات المستخدم ${form.name}` });
        },
        onError: (err: any) => {
          const errMsg = err?.response?.data?.error || err?.message || "فشل في التحديث";
          toast({ variant: "destructive", title: "فشل في التحديث", description: errMsg });
        }
      });
    } else {
      payload.password = form.password;
      createMutation.mutate({ data: payload }, {
        onSuccess: () => {
          invalidate();
          setShowDialog(false);
          toast({ title: "تمت الإضافة بنجاح", description: `تم إنشاء المستخدم ${form.name}` });
        },
        onError: (err: any) => {
          const errMsg = err?.response?.data?.error || err?.message || "فشل في الإضافة";
          toast({ variant: "destructive", title: "فشل في الإضافة", description: errMsg });
        }
      });
    }
  };

  const handleDelete = (u: User) => {
    if (!confirm(`هل أنت متأكد من حذف المستخدم "${u.name}"؟`)) return;
    deleteMutation.mutate({ id: u.id }, {
      onSuccess: () => {
        invalidate();
        toast({ title: "تم الحذف بنجاح" });
      },
      onError: (err: any) => {
        const errMsg = err?.response?.data?.error || err?.message || "فشل في الحذف";
        toast({
          variant: "destructive",
          title: "فشل في الحذف",
          description: errMsg
        });
      }
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">نظام إدارة المستخدمين والأمان</h1>
            <p className="text-xs text-slate-500 mt-0.5">التحكم في الحسابات، الصلاحيات الدقيقة، وربط المستخدمين بالموظفين والفروع</p>
          </div>
          <Button onClick={openAdd} className="gap-2 bg-blue-700 hover:bg-blue-800"><Plus className="w-4 h-4" />إضافة مستخدم</Button>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">جاري التحميل...</div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-right p-3 font-semibold">المستخدم</th>
                  <th className="text-right p-3 font-semibold">اسم الدخول</th>
                  <th className="text-right p-3 font-semibold">الدور الوظيفي</th>
                  <th className="text-right p-3 font-semibold">الموظف المرتبط</th>
                  <th className="text-right p-3 font-semibold">الفرع المرتبط</th>
                  <th className="text-center p-3 font-semibold">صلاحية الخصم</th>
                  <th className="text-right p-3 font-semibold">الحالة</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u: any) => {
                  const hasDiscountPerm = Boolean(u.can_discount ?? (u.role === "admin" || u.role === "accountant" || u.role === "developer"));
                  const emp = employees.find((e: any) => e.id === u.employee_id);
                  const br = branches.find((b: any) => b.id === u.branch_id);
                  const roleLabel = ROLES.find(r => r.value === u.role)?.label || u.role;

                  return (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">
                        <div>
                          <div>{u.name}</div>
                          {u.full_name && u.full_name !== u.name && (
                            <div className="text-[11px] text-slate-400">{u.full_name}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-muted-foreground">{u.username}</td>
                      <td className="p-3">
                        <Badge variant={u.role === "admin" ? "default" : u.role === "accountant" ? "outline" : "secondary"}>
                          {roleLabel}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-600">
                        {emp ? (
                          <span className="inline-flex items-center gap-1 text-xs">
                            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                            {emp.name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">غير مرتبط بموظف</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600">
                        {br ? (
                          <span className="inline-flex items-center gap-1 text-xs">
                            <MapPin className="w-3.5 h-3.5 text-amber-600" />
                            {br.name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">غير مرتبط بفرع</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {hasDiscountPerm ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            مسموح بالخصم
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-300">
                            ممنوع
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant={u.active ? "outline" : "destructive"} className={u.active ? "text-green-600 border-green-600" : ""}>
                          {u.active ? "نشط" : "موقوف"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => openEdit(u)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="تعديل"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(u)} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="حذف"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">لا يوجد مستخدمون</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent dir="rtl" className="max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-700" />
              {editing ? `تعديل مستخدم وصلاحياته: ${editing.name}` : "إضافة مستخدم جديد وصلاحياته"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Left Column: Account Details & Bindings */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-700 border-b pb-1">البيانات الأساسية</h3>
              
              <div className="space-y-1">
                <label className="text-xs font-semibold">الاسم الكامل للمستخدم *</label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="مثال: أحمد محمد" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">اسم المستخدم للدخول *</label>
                <Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} dir="ltr" placeholder="مثال: cashier1" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">كلمة المرور {editing ? "(اتركها فارغة للإبقاء)" : "*"}</label>
                <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} dir="ltr" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">الدور الوظيفي الرئيسي</label>
                <select
                  value={form.role}
                  onChange={e => handleRoleChange(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">ربط بموظف (الموارد البشرية)</label>
                <select
                  value={form.employee_id}
                  onChange={e => setForm({ ...form, employee_id: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">-- غير مرتبط بموظف --</option>
                  {employees.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.position})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">ربط بفرع</label>
                <select
                  value={form.branch_id}
                  onChange={e => setForm({ ...form, branch_id: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">-- غير مرتبط بفرع --</option>
                  {branches.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">حالة الحساب</p>
                    <p className="text-[10px] text-slate-500">تمكين أو تعطيل دخول المستخدم</p>
                  </div>
                  <Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} />
                </div>
                
                <div className="flex items-center justify-between border-t pt-2">
                  <div>
                    <p className="text-xs font-bold text-slate-800">صلاحية الخصم المباشر (POS)</p>
                    <p className="text-[10px] text-slate-500">الخصم دون إذن المدير</p>
                  </div>
                  <Switch
                    checked={form.role === "admin" || form.role === "accountant" ? true : form.can_discount}
                    disabled={form.role === "admin" || form.role === "accountant"}
                    onCheckedChange={v => setForm({ ...form, can_discount: v })}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Precise / Granular Permissions Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-1">
                <h3 className="text-sm font-bold text-slate-700">الصلاحيات التفصيلية الدقيقة</h3>
                <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-bold">مخصص للمستخدم</span>
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {/* Section 1: Sales */}
                <div className="space-y-2 border-b pb-2">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">المبيعات والفواتير</h4>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">إنشاء الفواتير</span>
                    <Switch checked={form.perm_create_invoice} onCheckedChange={v => setForm({ ...form, perm_create_invoice: v })} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">تعديل الفواتير</span>
                    <Switch checked={form.perm_edit_invoice} onCheckedChange={v => setForm({ ...form, perm_edit_invoice: v })} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">إلغاء أو حذف الفواتير</span>
                    <Switch checked={form.perm_cancel_invoice} onCheckedChange={v => setForm({ ...form, perm_cancel_invoice: v })} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">معالجة المرتجعات</span>
                    <Switch checked={form.perm_return} onCheckedChange={v => setForm({ ...form, perm_return: v })} />
                  </div>
                </div>

                {/* Section 2: Financial Views */}
                <div className="space-y-2 border-b pb-2">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">الأسعار والأرباح</h4>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">عرض قوائم الأسعار والتكاليف</span>
                    <Switch checked={form.perm_view_prices} onCheckedChange={v => setForm({ ...form, perm_view_prices: v })} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">عرض الأرباح والتقارير المالية الحساسة</span>
                    <Switch checked={form.perm_view_profits} onCheckedChange={v => setForm({ ...form, perm_view_profits: v })} />
                  </div>
                </div>

                {/* Section 3: Stock */}
                <div className="space-y-2 border-b pb-2">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">المستودعات والمخزون</h4>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">تعديل كميات المخزون وتوريد المواد</span>
                    <Switch checked={form.perm_edit_stock} onCheckedChange={v => setForm({ ...form, perm_edit_stock: v })} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">القيام بعمليات الجرد السنوي/الدوري</span>
                    <Switch checked={form.perm_stocktake} onCheckedChange={v => setForm({ ...form, perm_stocktake: v })} />
                  </div>
                </div>

                {/* Section 4: Accounting */}
                <div className="space-y-2 border-b pb-2">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">المحاسبة والعمليات المالية</h4>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">تعديل وإنشاء القيود اليومية يدوياً</span>
                    <Switch checked={form.perm_edit_entries} onCheckedChange={v => setForm({ ...form, perm_edit_entries: v })} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">إغلاق الفترات المحاسبية</span>
                    <Switch checked={form.perm_close_periods} onCheckedChange={v => setForm({ ...form, perm_close_periods: v })} />
                  </div>
                </div>

                {/* Section 5: HR Salaries */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">الموارد البشرية والرواتب</h4>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">الاطلاع على رواتب الموظفين والمسيرات</span>
                    <Switch checked={form.perm_view_salaries} onCheckedChange={v => setForm({ ...form, perm_view_salaries: v })} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs flex gap-2 text-blue-800">
            <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <p>تُطبق هذه الصلاحيات فوراً عند حفظ البيانات. تغيير الصلاحيات للمستخدم النشط يتطلب منه إعادة تسجيل الدخول لتطبيق الإعدادات الجديدة على جلسته.</p>
          </div>

          <DialogFooter className="gap-2 border-t pt-3 mt-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={!form.username || !form.name} className="bg-blue-700 hover:bg-blue-800">
              حفظ وتطبيق الصلاحيات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
