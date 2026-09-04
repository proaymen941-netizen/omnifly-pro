import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Eye, Search, RotateCcw, X, DollarSign, Package, Calendar, FileSearch } from "lucide-react";

function fetchAuth(url: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("pos_token") ?? "";
  return fetch(url, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) } });
}
async function apiGet(url: string) { const r = await fetchAuth(url); if (!r.ok) throw new Error(await r.text()); return r.json(); }
async function apiPost(url: string, body: any) { const r = await fetchAuth(url, { method: "POST", body: JSON.stringify(body) }); if (!r.ok) throw new Error(await r.text()); return r.json(); }
async function apiDel(url: string) { const r = await fetchAuth(url, { method: "DELETE" }); if (!r.ok && r.status !== 204) throw new Error(await r.text()); }

function fmt(n?: number) { return Number(n ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

type ReturnItem = { product_id: number | null; product_name: string; quantity: number; unit_price: number };

function NewReturnDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ invoice_number: "", reason: "", payment_method: "cash", notes: "" });
  const [items, setItems] = useState<ReturnItem[]>([]);

  /* ─── Invoice lookup state ─── */
  const [lookupInput, setLookupInput] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [foundOrder, setFoundOrder] = useState<any>(null);
  const [lookupError, setLookupError] = useState("");

  const handleLookup = async () => {
    const inv = lookupInput.trim();
    if (!inv) return;
    setLookupLoading(true);
    setLookupError("");
    setFoundOrder(null);
    try {
      const order = await apiGet(`/api/orders/by-invoice/${encodeURIComponent(inv)}`);
      setFoundOrder(order);
      setForm(f => ({ ...f, invoice_number: order.invoiceNumber }));
      /* Auto-populate items with full quantities */
      setItems((order.items ?? []).map((i: any) => ({
        product_id: i.productId ?? null,
        product_name: i.productName,
        quantity: i.quantity,
        unit_price: i.unitPrice,
      })));
    } catch {
      setLookupError("لم يتم العثور على الفاتورة. تأكد من رقم الفاتورة.");
    } finally {
      setLookupLoading(false);
    }
  };

  const clearLookup = () => {
    setFoundOrder(null);
    setLookupInput("");
    setLookupError("");
    setItems([]);
    setForm(f => ({ ...f, invoice_number: "" }));
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const total = items.reduce((sum, it) => sum + it.unit_price * it.quantity, 0);

  const createMut = useMutation({
    mutationFn: () => apiPost("/api/returns", {
      ...form,
      order_id: foundOrder?.id ?? null,
      items,
    }),
    onSuccess: () => {
      toast({ title: "تم إنشاء المرتجع بنجاح" });
      onSuccess();
      onClose();
      setForm({ invoice_number: "", reason: "", payment_method: "cash", notes: "" });
      setItems([]);
      setFoundOrder(null);
      setLookupInput("");
      setLookupError("");
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل في إنشاء المرتجع", description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><RotateCcw className="w-5 h-5" />مرتجع جديد</DialogTitle></DialogHeader>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">

          {/* ─── Invoice Lookup ─── */}
          <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/20">
            <h3 className="font-semibold text-sm flex items-center gap-2"><FileSearch className="w-4 h-4" />البحث برقم الفاتورة (اختياري)</h3>
            <div className="flex gap-2">
              <Input
                value={lookupInput}
                onChange={e => setLookupInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLookup()}
                placeholder="مثال: INV-0001"
                className="flex-1"
                disabled={!!foundOrder}
              />
              {!foundOrder ? (
                <Button onClick={handleLookup} disabled={!lookupInput.trim() || lookupLoading} variant="outline" className="gap-1">
                  <Search className="w-4 h-4" />{lookupLoading ? "جاري البحث..." : "بحث"}
                </Button>
              ) : (
                <Button onClick={clearLookup} variant="outline" className="gap-1 text-destructive">
                  <X className="w-4 h-4" />مسح
                </Button>
              )}
            </div>
            {lookupError && <p className="text-sm text-destructive">{lookupError}</p>}
            {foundOrder && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                <div className="font-semibold text-green-800 mb-1">✓ تم العثور على الفاتورة</div>
                <div className="flex flex-wrap gap-4 text-green-700">
                  <span>رقم الفاتورة: <strong>{foundOrder.invoiceNumber}</strong></span>
                  <span>التاريخ: {new Date(foundOrder.createdAt).toLocaleDateString("ar-SA")}</span>
                  <span>الإجمالي: <strong>{fmt(foundOrder.total)}</strong></span>
                  {foundOrder.userName && <span>الكاشير: {foundOrder.userName}</span>}
                </div>
              </div>
            )}
          </div>

          {/* ─── Return Info ─── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">رقم الفاتورة الأصلية *</label>
              <Input
                value={form.invoice_number}
                onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))}
                placeholder="INV-0001"
                className="mt-1"
                readOnly={!!foundOrder}
              />
            </div>
            <div>
              <label className="text-sm font-medium">سبب الإرجاع</label>
              <Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="مثال: منتج معيب" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">طريقة استرداد المبلغ</label>
              <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقداً</SelectItem>
                  <SelectItem value="card">شبكة</SelectItem>
                  <SelectItem value="credit">رصيد للعميل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">ملاحظات</label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="اختيارية" className="mt-1" />
            </div>
          </div>

          {/* ─── Items ─── */}
          <div className="border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">المنتجات المرتجعة</h3>
              {foundOrder && items.length > 0 && (
                <span className="text-xs text-muted-foreground">عدّل الكميات للإرجاع الجزئي</span>
              )}
            </div>

            {items.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 rounded">
                  <tr>
                    <th className="text-right p-2 font-semibold">المنتج</th>
                    <th className="text-right p-2 font-semibold">الكمية المرتجعة</th>
                    <th className="text-right p-2 font-semibold">السعر</th>
                    <th className="text-right p-2 font-semibold">الإجمالي</th>
                    <th className="p-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((it, idx) => {
                    const origItem = foundOrder?.items?.find((oi: any) => oi.productName === it.product_name);
                    const maxQty = origItem?.quantity ?? 9999;
                    return (
                      <tr key={idx}>
                        <td className="p-2">{it.product_name}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={it.quantity}
                              min="1"
                              max={maxQty}
                              onChange={e => {
                                const v = Math.min(Number(e.target.value), maxQty);
                                setItems(prev => prev.map((item, i) => i === idx ? { ...item, quantity: v } : item));
                              }}
                              className="w-16 h-7 text-sm"
                            />
                            {origItem && <span className="text-xs text-muted-foreground">/ {maxQty}</span>}
                          </div>
                        </td>
                        <td className="p-2 font-mono">{fmt(it.unit_price)}</td>
                        <td className="p-2 font-mono font-semibold text-destructive">{fmt(it.unit_price * it.quantity)}</td>
                        <td className="p-2"><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(idx)}><X className="w-3 h-3" /></Button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                {foundOrder ? "جميع المنتجات تمت إزالتها. أضف منتجات يدوياً." : "ابحث عن فاتورة لاستيراد المنتجات، أو أضفها يدوياً"}
              </div>
            )}

            {items.length > 0 && (
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="font-semibold">إجمالي المبلغ المسترد:</span>
                <span className="font-bold text-lg text-destructive">{fmt(total)}</span>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => createMut.mutate()} disabled={!form.invoice_number || items.length === 0 || createMut.isPending} className="gap-2">
            <RotateCcw className="w-4 h-4" />تأكيد المرتجع
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ViewReturnDialog({ ret, onClose }: { ret: any; onClose: () => void }) {
  if (!ret) return null;
  const pmLabel: Record<string, string> = { cash: "نقداً", card: "شبكة", credit: "رصيد للعميل" };
  return (
    <Dialog open={!!ret} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader><DialogTitle>تفاصيل المرتجع — {ret.return_number}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">رقم الفاتورة: </span><span className="font-medium">{ret.invoice_number}</span></div>
            <div><span className="text-muted-foreground">التاريخ: </span><span className="font-medium">{new Date(ret.created_at).toLocaleDateString("ar-SA")}</span></div>
            <div><span className="text-muted-foreground">السبب: </span><span className="font-medium">{ret.reason ?? "—"}</span></div>
            <div><span className="text-muted-foreground">طريقة الاسترداد: </span><span className="font-medium">{pmLabel[ret.payment_method] ?? ret.payment_method}</span></div>
            <div><span className="text-muted-foreground">الكاشير: </span><span className="font-medium">{ret.cashier_name}</span></div>
            {ret.notes && <div className="col-span-2"><span className="text-muted-foreground">ملاحظات: </span><span className="font-medium">{ret.notes}</span></div>}
          </div>
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-2 font-semibold">المنتج</th>
                  <th className="text-right p-2 font-semibold">الكمية</th>
                  <th className="text-right p-2 font-semibold">السعر</th>
                  <th className="text-right p-2 font-semibold">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(ret.items ?? []).map((it: any) => (
                  <tr key={it.id}>
                    <td className="p-2">{it.product_name}</td>
                    <td className="p-2">{it.quantity}</td>
                    <td className="p-2 font-mono">{fmt(it.unit_price)}</td>
                    <td className="p-2 font-mono text-destructive font-semibold">{fmt(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center pt-2 font-bold text-lg">
            <span>إجمالي المبلغ المسترد:</span>
            <span className="text-destructive">{fmt(ret.total_refund)}</span>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>إغلاق</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Returns() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [viewRet, setViewRet] = useState<any>(null);

  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  if (search) params.set("search", search);

  const { data: returns_ = [], isLoading } = useQuery({ queryKey: ["returns", startDate, endDate, search], queryFn: () => apiGet(`/api/returns?${params}`) });
  const { data: summary } = useQuery({ queryKey: ["returns-summary"], queryFn: () => apiGet("/api/returns-summary") });

  const delMut = useMutation({
    mutationFn: (id: number) => apiDel(`/api/returns/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["returns"] }); qc.invalidateQueries({ queryKey: ["returns-summary"] }); toast({ title: "تم الحذف" }); },
    onError: () => toast({ variant: "destructive", title: "فشل في الحذف" }),
  });

  const pmLabel: Record<string, string> = { cash: "نقداً", card: "شبكة", credit: "رصيد" };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">نظام المرتجعات</h1>
          <Button onClick={() => setShowNew(true)} className="gap-2"><Plus className="w-4 h-4" />مرتجع جديد</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4" />مرتجعات اليوم</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(summary as any)?.todayCount ?? 0}</div>
              <div className="text-sm text-destructive font-mono">{fmt((summary as any)?.todayTotal)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><DollarSign className="w-4 h-4" />مرتجعات الشهر</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(summary as any)?.monthCount ?? 0}</div>
              <div className="text-sm text-destructive font-mono">{fmt((summary as any)?.monthTotal)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Package className="w-4 h-4" />إجمالي المرتجعات</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{(summary as any)?.totalCount ?? 0}</div></CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث برقم الفاتورة أو المرتجع..." className="w-52" />
          </div>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-36" />
          <span className="text-muted-foreground">—</span>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-36" />
          {(startDate || endDate || search) && (
            <Button variant="ghost" size="sm" onClick={() => { setStartDate(""); setEndDate(""); setSearch(""); }}>مسح</Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">جاري التحميل...</div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-right p-3 font-semibold">رقم المرتجع</th>
                  <th className="text-right p-3 font-semibold">رقم الفاتورة</th>
                  <th className="text-right p-3 font-semibold">التاريخ</th>
                  <th className="text-right p-3 font-semibold">السبب</th>
                  <th className="text-right p-3 font-semibold">الاسترداد</th>
                  <th className="text-right p-3 font-semibold">المبلغ</th>
                  <th className="text-right p-3 font-semibold">الكاشير</th>
                  <th className="p-3 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(returns_ as any[]).map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs text-primary">{r.return_number}</td>
                    <td className="p-3 font-mono text-xs">{r.invoice_number}</td>
                    <td className="p-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString("ar-SA")}</td>
                    <td className="p-3">{r.reason ?? "—"}</td>
                    <td className="p-3"><Badge variant="outline">{pmLabel[r.payment_method] ?? r.payment_method}</Badge></td>
                    <td className="p-3 font-mono font-bold text-destructive">{fmt(r.total_refund)}</td>
                    <td className="p-3 text-muted-foreground">{r.cashier_name}</td>
                    <td className="p-3">
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => setViewRet(r)}><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => confirm(`حذف المرتجع ${r.return_number}؟`) && delMut.mutate(r.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(returns_ as any[]).length === 0 && (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">لا توجد مرتجعات</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <NewReturnDialog open={showNew} onClose={() => setShowNew(false)} onSuccess={() => { qc.invalidateQueries({ queryKey: ["returns"] }); qc.invalidateQueries({ queryKey: ["returns-summary"] }); }} />
        <ViewReturnDialog ret={viewRet} onClose={() => setViewRet(null)} />
      </div>
    </AdminLayout>
  );
}
