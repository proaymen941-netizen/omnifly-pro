import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Plus, Trash2, Calendar } from "lucide-react";

function fetchAuth(url: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("pos_token") ?? "";
  return fetch(url, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) } });
}
async function apiGet(url: string) { const r = await fetchAuth(url); if (!r.ok) throw new Error(await r.text()); return r.json(); }
async function apiPost(url: string, body: any) { const r = await fetchAuth(url, { method: "POST", body: JSON.stringify(body) }); if (!r.ok) throw new Error(await r.text()); return r.json(); }
async function apiDel(url: string) { const r = await fetchAuth(url, { method: "DELETE" }); if (!r.ok && r.status !== 204) throw new Error(await r.text()); }

function fmt(n?: number) { return Number(n ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function ExpensesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [category, setCategory] = useState("كهرباء");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [safeId, setSafeId] = useState("");

  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => apiGet("/api/expenses") });
  const { data: safes = [] } = useQuery({ queryKey: ["safes-list"], queryFn: () => apiGet("/api/safes") });

  const addMut = useMutation({
    mutationFn: () => apiPost("/api/expenses", {
      category,
      amount: Number(amount),
      expense_date: expenseDate,
      notes,
      safe_id: safeId ? Number(safeId) : undefined
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["safes-list"] });
      setAmount("");
      setNotes("");
      toast({ title: "تم إضافة المصروف بنجاح" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل", description: e.message })
  });

  const delMut = useMutation({
    mutationFn: (id: number) => apiDel(`/api/expenses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["safes-list"] });
      toast({ title: "تم الحذف" });
    }
  });

  const totalExpenses = ((expenses as any[]) || []).reduce((sum, e) => sum + e.amount, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="w-6 h-6" />إدارة المصروفات التشغيلية</h1>
          <div className="text-left">
            <div className="text-xs text-muted-foreground">إجمالي المصروفات</div>
            <div className="text-xl font-bold text-destructive">{fmt(totalExpenses)}</div>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">إضافة مصروف جديد</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <select value={category} onChange={e => setCategory(e.target.value)} className="border rounded-md px-3 bg-background text-sm">
              <option value="كهرباء">كهرباء</option>
              <option value="ماء">ماء</option>
              <option value="إيجار">إيجار</option>
              <option value="مرتبات">مرتبات</option>
              <option value="تشغيل وصيانة">تشغيل وصيانة</option>
              <option value="أخرى">أخرى</option>
            </select>
            <select value={safeId} onChange={e => setSafeId(e.target.value)} className="border rounded-md px-3 bg-background text-sm">
              <option value="">-- اختر الصندوق المالي --</option>
              {((safes as any[]) || []).map(s => (
                <option key={s.id} value={s.id}>{s.name} ({fmt(s.balance)} {s.currency})</option>
              ))}
            </select>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="المبلغ" />
            <Input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} />
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات اختيارية" />
            <Button onClick={() => addMut.mutate()} disabled={!amount} className="gap-1"><Plus className="w-4 h-4" />إضافة مصروف</Button>
          </CardContent>
        </Card>

        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-right p-3 font-semibold">التصنيف</th>
                <th className="text-right p-3 font-semibold">الصندوق المالي</th>
                <th className="text-right p-3 font-semibold">المبلغ</th>
                <th className="text-right p-3 font-semibold">التاريخ</th>
                <th className="text-right p-3 font-semibold">ملاحظات</th>
                <th className="text-right p-3 font-semibold">المسجل</th>
                <th className="p-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {((expenses as any[]) || []).map(e => (
                <tr key={e.id} className="hover:bg-muted/30">
                  <td className="p-3 font-medium">{e.category}</td>
                  <td className="p-3 font-bold text-muted-foreground">{e.safe_name ?? "الصندوق الرئيسي"}</td>
                  <td className="p-3 font-mono font-bold text-destructive">{fmt(e.amount)}</td>
                  <td className="p-3 text-muted-foreground flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{e.expense_date}</td>
                  <td className="p-3 text-muted-foreground">{e.notes ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{e.user_name ?? "—"}</td>
                  <td className="p-3">
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => confirm("حذف المصروف؟") && delMut.mutate(e.id)}><Trash2 className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">لا توجد مصروفات مسجلة</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
