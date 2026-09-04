import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckSquare, Plus, Search, Filter, Clock, CheckCircle2,
  AlertCircle, ArrowUpRight, Trash2, Edit2, Calendar, User, Tag,
  FileText, Plane, Building2, Sparkles, Check, X
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function fetchAuth(url: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("pos_token") ?? "";
  return fetch(url, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) } });
}
async function apiGet(url: string) { const r = await fetchAuth(url); if (!r.ok) throw new Error(await r.text()); return r.json(); }
async function apiPost(url: string, body: any) { const r = await fetchAuth(url, { method: "POST", body: JSON.stringify(body) }); if (!r.ok) throw new Error(await r.text()); return r.json(); }
async function apiPut(url: string, body: any) { const r = await fetchAuth(url, { method: "PUT", body: JSON.stringify(body) }); if (!r.ok) throw new Error(await r.text()); return r.json(); }
async function apiPatch(url: string, body: any) { const r = await fetchAuth(url, { method: "PATCH", body: JSON.stringify(body) }); if (!r.ok) throw new Error(await r.text()); return r.json(); }
async function apiDelete(url: string) { const r = await fetchAuth(url, { method: "DELETE" }); if (!r.ok) throw new Error(await r.text()); return true; }

export default function TravelTasksPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState("booking_followup");
  const [priority, setPriority] = useState("medium");
  const [assignedToName, setAssignedToName] = useState("");
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [relatedEntityTitle, setRelatedEntityTitle] = useState("");
  const [notes, setNotes] = useState("");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["travel-tasks", statusFilter, priorityFilter, typeFilter, searchQuery],
    queryFn: () => {
      let url = `/api/travel/tasks?status=${statusFilter}&priority=${priorityFilter}&task_type=${typeFilter}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      return apiGet(url);
    }
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => apiGet("/api/users")
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editingTask ? apiPut(`/api/travel/tasks/${editingTask.id}`, data) : apiPost("/api/travel/tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travel-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["travel-daily-operations"] });
      closeModal();
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => apiPatch(`/api/travel/tasks/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travel-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["travel-daily-operations"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/travel/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travel-tasks"] });
    }
  });

  const openCreateModal = () => {
    setEditingTask(null);
    setTitle("");
    setDescription("");
    setTaskType("booking_followup");
    setPriority("medium");
    setAssignedToName("");
    setDueDate(new Date().toISOString().slice(0, 10));
    setRelatedEntityTitle("");
    setNotes("");
    setModalOpen(true);
  };

  const openEditModal = (task: any) => {
    setEditingTask(task);
    setTitle(task.title || "");
    setDescription(task.description || "");
    setTaskType(task.task_type || "booking_followup");
    setPriority(task.priority || "medium");
    setAssignedToName(task.assigned_to_name || "");
    setDueDate(task.due_date || new Date().toISOString().slice(0, 10));
    setRelatedEntityTitle(task.related_entity_title || "");
    setNotes(task.notes || "");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTask(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    saveMutation.mutate({
      title,
      description,
      task_type: taskType,
      priority,
      status: editingTask ? editingTask.status : "pending",
      assigned_to_name: assignedToName,
      due_date: dueDate,
      related_entity_title: relatedEntityTitle,
      notes
    });
  };

  const pendingCount = tasks.filter((t: any) => t.status === "pending").length;
  const inProgressCount = tasks.filter((t: any) => t.status === "in_progress").length;
  const completedCount = tasks.filter((t: any) => t.status === "completed").length;
  const urgentCount = tasks.filter((t: any) => t.priority === "urgent" && t.status !== "completed").length;

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <CheckSquare className="w-7 h-7 text-indigo-600" />
              إدارة مهام ومتابعات موظفي السياحة
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              متابعة تذاكر السفر، استخراج التأشيرات، تأكيد الفنادق، ومتابعة العملاء والموردين
            </p>
          </div>

          <Button
            onClick={openCreateModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-10 px-4 rounded-xl shadow-md shadow-indigo-200"
          >
            <Plus className="w-4 h-4 ml-1.5" />
            إضافة مهمة جديدة
          </Button>
        </div>

        {/* Stats KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-bold text-slate-500 block">مهام قيد الانتظار</span>
            <div className="text-2xl font-black text-slate-900 mt-2">{pendingCount}</div>
            <span className="text-[10px] text-amber-600 font-semibold">بانتظار البدء</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-bold text-slate-500 block">جاري تنفيذها</span>
            <div className="text-2xl font-black text-indigo-600 mt-2">{inProgressCount}</div>
            <span className="text-[10px] text-indigo-500 font-semibold">قيد العمل والمتابعة</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-bold text-slate-500 block">مهام عاجلة جداً</span>
            <div className="text-2xl font-black text-rose-600 mt-2">{urgentCount}</div>
            <span className="text-[10px] text-rose-500 font-semibold">تتطلب إجراء فوري</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-xs font-bold text-slate-500 block">مهام مكتملة</span>
            <div className="text-2xl font-black text-emerald-600 mt-2">{completedCount}</div>
            <span className="text-[10px] text-emerald-500 font-semibold">تم إنجازها بنجاح</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">بحث سريع</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              <Input
                placeholder="عنوان المهمة، الموظف، المرجع..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-9 pr-9 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">حالة المهمة</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 h-9 text-xs"
            >
              <option value="all">كل الحالات</option>
              <option value="pending">قيد الانتظار</option>
              <option value="in_progress">جاري التنفيذ</option>
              <option value="completed">مكتملة</option>
              <option value="cancelled">ملغاة</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">الأولوية</label>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 h-9 text-xs"
            >
              <option value="all">كل الأولويات</option>
              <option value="urgent">عاجل جداً</option>
              <option value="high">أولوية عالية</option>
              <option value="medium">متوسطة</option>
              <option value="low">منخفضة</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">نوع المتابعة</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 h-9 text-xs"
            >
              <option value="all">كل الأنواع</option>
              <option value="booking_followup">متابعة حجز وتذكرة</option>
              <option value="visa_followup">متابعة تأشيرة وسفارة</option>
              <option value="customer_request">طلب واستفسار عميل</option>
              <option value="supplier_payment">مطابقة حساب مورد</option>
              <option value="general">عام / إداري</option>
            </select>
          </div>
        </div>

        {/* Task Cards Grid */}
        {isLoading ? (
          <div className="text-center py-20 text-slate-400 font-bold">جاري تحميل المهام...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task: any) => (
              <div
                key={task.id}
                className={`bg-white border rounded-2xl p-4 shadow-sm transition-all hover:shadow-md flex flex-col justify-between ${
                  task.status === "completed"
                    ? "border-emerald-200 bg-emerald-50/20 opacity-80"
                    : task.priority === "urgent"
                    ? "border-rose-300 bg-rose-50/10"
                    : "border-slate-200"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        task.priority === "urgent"
                          ? "bg-rose-100 text-rose-800 border border-rose-200"
                          : task.priority === "high"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {task.priority === "urgent" ? "عاجل جداً" : task.priority === "high" ? "أولوية عالية" : "متوسط"}
                    </span>

                    <span className="text-[10px] font-mono text-slate-400">
                      {task.task_code || `#${task.id}`}
                    </span>
                  </div>

                  <h3
                    className={`font-black text-sm mb-1 ${
                      task.status === "completed" ? "line-through text-slate-500" : "text-slate-900"
                    }`}
                  >
                    {task.title}
                  </h3>

                  {task.description && (
                    <p className="text-xs text-slate-600 line-clamp-3 mb-3 leading-relaxed">
                      {task.description}
                    </p>
                  )}

                  {task.related_entity_title && (
                    <div className="mb-3 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-600 flex items-center gap-1.5 font-semibold">
                      <Tag className="w-3 h-3 text-indigo-500" />
                      <span>مرتبط بـ: {task.related_entity_title}</span>
                    </div>
                  )}

                  <div className="space-y-1 text-[11px] text-slate-500 mb-4 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        المسؤول:
                      </span>
                      <strong className="text-slate-800">{task.assigned_to_name || "غير محدد"}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        تاريخ الاستحقاق:
                      </span>
                      <strong className="font-mono text-slate-800">{task.due_date || "—"}</strong>
                    </div>
                  </div>
                </div>

                {/* Actions bottom bar */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {task.status !== "completed" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => statusMutation.mutate({ id: task.id, status: "completed" })}
                        className="h-8 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 font-bold"
                      >
                        <Check className="w-3.5 h-3.5 ml-1" />
                        إنجاز
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => statusMutation.mutate({ id: task.id, status: "pending" })}
                        className="h-8 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 font-semibold"
                      >
                        إعادة فتح
                      </Button>
                    )}

                    {task.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => statusMutation.mutate({ id: task.id, status: "in_progress" })}
                        className="h-8 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200 font-semibold"
                      >
                        بدء
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(task)}
                      className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors"
                      title="تعديل"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("هل أنت متأكد من حذف هذه المهمة؟")) {
                          deleteMutation.mutate(task.id);
                        }
                      }}
                      className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {tasks.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-400 font-semibold bg-white border rounded-2xl">
                لا توجد مهام مسجلة تطابق خيارات الفلترة الحالية
              </div>
            )}
          </div>
        )}

        {/* Modal: Create or Edit Task */}
        <Dialog open={modalOpen} onOpenChange={v => { if (!v) closeModal(); }}>
          <DialogContent dir="rtl" className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-black text-slate-900">
                <CheckSquare className="w-5 h-5 text-indigo-600" />
                {editingTask ? "تعديل بيانات المهمة" : "إضافة مهمة عمل ومتابعة جديدة"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSave} className="space-y-3.5 py-2 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">عنوان المهمة *</label>
                <Input
                  required
                  placeholder="مثال: متابعة إصدار تأشيرة دبي للمسافر أحمد"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">نوع المهمة</label>
                  <select
                    value={taskType}
                    onChange={e => setTaskType(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 h-9 text-xs"
                  >
                    <option value="booking_followup">حجز وتذاكر طيران</option>
                    <option value="visa_followup">تأشيرات وسفارات</option>
                    <option value="hotel_followup">فنادق وتسكين</option>
                    <option value="customer_request">استفسار عميل</option>
                    <option value="supplier_payment">مطابقة حساب مورد</option>
                    <option value="general">إداري / عام</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">الأولوية</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 h-9 text-xs"
                  >
                    <option value="urgent">عاجل جداً (Urgent)</option>
                    <option value="high">أولوية عالية (High)</option>
                    <option value="medium">متوسطة (Medium)</option>
                    <option value="low">منخفضة (Low)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">الموظف المسؤول</label>
                  <Input
                    placeholder="اسم الموظف أو المستخدم"
                    value={assignedToName}
                    onChange={e => setAssignedToName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">تاريخ الاستحقاق</label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">مرجع العملية / العميل (اختياري)</label>
                <Input
                  placeholder="مثال: حجز PNR: XY78Q / العميل: شركة الأفق"
                  value={relatedEntityTitle}
                  onChange={e => setRelatedEntityTitle(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">الوصف والملاحظات</label>
                <textarea
                  rows={3}
                  placeholder="أدخل أي تفاصيل إضافية لتنفيذ المهمة..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={closeModal} className="h-9 text-xs">
                  إلغاء
                </Button>
                <Button type="submit" disabled={saveMutation.isPending} className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                  {saveMutation.isPending ? "جاري الحفظ..." : editingTask ? "تحديث المهمة" : "إنشاء المهمة"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
