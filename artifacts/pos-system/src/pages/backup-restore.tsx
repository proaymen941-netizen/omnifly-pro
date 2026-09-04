import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useAuth } from "@/components/auth-provider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { 
  Database, 
  Download, 
  Upload, 
  RotateCcw, 
  ShieldCheck, 
  Clock, 
  Trash2, 
  HardDrive, 
  Sparkles,
  CheckCircle2,
  FolderOpen
} from "lucide-react";

export default function BackupRestorePage() {
  const { user } = useAuth();
  const isDeveloper = user?.role === "developer" || user?.username === "developer";
  const canAccessBackup = user?.role === "admin" || user?.role === "manager" || user?.role === "مدير" || user?.username === "admin" || isDeveloper;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  // Settings State
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [intervalMins, setIntervalMins] = useState("30");
  const [maxBackups, setMaxBackups] = useState("50");
  const [customPath, setCustomPath] = useState("");

  const { data: backups, refetch: refetchBackups } = useQuery({
    queryKey: ["backups"],
    queryFn: async () => {
      const token = localStorage.getItem("pos_token") ?? "";
      const res = await fetch("/api/system/backups", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: canAccessBackup
  });

  const { data: settingsData, refetch: refetchSettings } = useQuery({
    queryKey: ["backup-settings"],
    queryFn: async () => {
      const token = localStorage.getItem("pos_token") ?? "";
      const res = await fetch("/api/system/backup/settings", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: canAccessBackup
  });

  useEffect(() => {
    if (settingsData) {
      setAutoEnabled(settingsData.autoBackupEnabled ?? true);
      setIntervalMins(String(settingsData.autoBackupIntervalMinutes ?? 30));
      setMaxBackups(String(settingsData.maxRetainedBackups ?? 50));
      setCustomPath(settingsData.backupDir ?? "");
    }
  }, [settingsData]);

  const updateSettingsMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("pos_token") ?? "";
      const res = await fetch("/api/system/backup/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          enabled: autoEnabled,
          intervalMinutes: Number(intervalMins) || 30,
          maxBackups: Number(maxBackups) || 50,
          customPath: customPath.trim()
        })
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (res: any) => {
      toast({ title: "تم حفظ الإعدادات", description: res.message });
      refetchSettings();
      refetchBackups();
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    }
  });

  const createInstantBackupMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("pos_token") ?? "";
      const res = await fetch("/api/system/backup", { 
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (res) => {
      toast({ 
        title: "تم إنشاء النسخة الاحتياطية اللحظية بنجاح", 
        description: `تم حفظ الملف بأمان في: ${res.path}` 
      });
      refetchBackups();
      refetchSettings();
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "خطأ في النسخ", description: err.message });
    }
  });

  const deleteBackupMutation = useMutation({
    mutationFn: async (filename: string) => {
      const token = localStorage.getItem("pos_token") ?? "";
      const res = await fetch(`/api/system/backup/${encodeURIComponent(filename)}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (res) => {
      toast({ title: "تم الحذف", description: res.message });
      refetchBackups();
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "خطأ في الحذف", description: err.message });
    }
  });

  const restoreBackupMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("dbFile", file);
      const token = localStorage.getItem("pos_token") ?? "";
      
      const res = await fetch("/api/system/restore", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt);
      }
      return res.json();
    },
    onSuccess: (res: any) => {
      toast({ title: "تمت الاستعادة بنجاح", description: res.message });
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "فشل الاستعادة", description: err.message });
    }
  });

  const restoreLocalBackupMutation = useMutation({
    mutationFn: async (filename: string) => {
      const token = localStorage.getItem("pos_token") ?? "";
      const res = await fetch("/api/system/restore-local", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ filename })
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt);
      }
      return res.json();
    },
    onSuccess: (res: any) => {
      toast({ title: "تمت الاستعادة بنجاح", description: res.message });
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "فشل الاستعادة", description: err.message });
    }
  });

  const handleDownloadBackup = (filename?: string) => {
    const token = localStorage.getItem("pos_token") ?? "";
    const url = filename 
      ? `/api/system/backup/download/${encodeURIComponent(filename)}`
      : `/api/system/backup/download/latest`;
    
    // Trigger download via fetch to pass auth token
    fetch(url, { headers: { "Authorization": `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error("تعذر تحميل ملف النسخة الاحتياطية");
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = filename || `pos_backup_${new Date().toISOString().slice(0, 10)}.db`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
        toast({ title: "تم التنزيل", description: "تم حفظ ملف قاعدة البيانات على جهازك بنجاح" });
      })
      .catch((err) => {
        toast({ variant: "destructive", title: "خطأ", description: err.message });
      });
  };

  if (!canAccessBackup) {
    return (
      <AdminLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-xl font-bold text-red-600">غير مصرح لك بالوصول لهذه الصفحة</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto" dir="rtl">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600/30 border border-indigo-500/40 rounded-xl">
              <Database className="w-9 h-9 text-indigo-300" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">نظام النسخ الاحتياطي والحماية الشاملة</h1>
              <p className="text-slate-300 text-sm mt-1">حفظ فوري، مجدول، ومحلي لقاعدة بيانات النظام لمنع أي فقدان أو تلف للبيانات</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => createInstantBackupMutation.mutate()}
              disabled={createInstantBackupMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              {createInstantBackupMutation.isPending ? "جاري الحفظ..." : "إنشاء نسخة احتياطية الآن"}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDownloadBackup()}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold gap-2"
            >
              <Download className="w-4 h-4" />
              تنزيل ملف .db
            </Button>
          </div>
        </div>

        {/* Status & Automated Backup Engine Settings */}
        <Card className="border-indigo-100 shadow-sm">
          <CardHeader className="bg-slate-50/70 border-b pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                <Clock className="w-5 h-5 text-indigo-600" />
                محرك النسخ الاحتياطي التلقائي المستمر (Auto-Backup Engine)
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  settingsData?.autoBackupEnabled 
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300" 
                    : "bg-slate-200 text-slate-700"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${settingsData?.autoBackupEnabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}></span>
                  {settingsData?.autoBackupEnabled ? "الحماية التلقائية نشطة" : "الحماية معطلة"}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">تفعيل النسخ التلقائي</Label>
                <div className="flex items-center gap-3 p-2.5 bg-slate-50 border rounded-lg">
                  <Switch
                    checked={autoEnabled}
                    onCheckedChange={setAutoEnabled}
                  />
                  <span className="text-sm font-medium text-slate-700">
                    {autoEnabled ? "مفعّل تلقائياً" : "معطّل"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">فترة التكرار (بالدقائق)</Label>
                <select
                  value={intervalMins}
                  onChange={(e) => setIntervalMins(e.target.value)}
                  className="w-full h-10 px-3 border rounded-lg text-sm bg-white text-slate-800"
                >
                  <option value="5">كل 5 دقائق (لحظي مشدد)</option>
                  <option value="15">كل 15 دقيقة</option>
                  <option value="30">كل 30 دقيقة (موصى به)</option>
                  <option value="60">كل ساعة</option>
                  <option value="360">كل 6 ساعات</option>
                  <option value="1440">يومياً (كل 24 ساعة)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">أقصى عدد نسخ محفوظة (تدوير آلي)</Label>
                <Input
                  type="number"
                  min="5"
                  max="500"
                  value={maxBackups}
                  onChange={(e) => setMaxBackups(e.target.value)}
                  className="h-10 text-sm font-mono"
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={() => updateSettingsMutation.mutate()}
                  disabled={updateSettingsMutation.isPending}
                  className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 font-bold"
                >
                  {updateSettingsMutation.isPending ? "جاري الحفظ..." : "حفظ وضبط المحرك"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-indigo-600" />
                مسار حفظ النسخ المخصص على جهاز الكمبيوتر
              </Label>
              <div className="flex gap-2">
                <Input
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  placeholder="مثال: C:\OmniSystem_Backups أو /home/user/OmniSystem_Backups"
                  className="font-mono text-sm"
                  dir="ltr"
                />
              </div>
              <p className="text-xs text-slate-500">
                المسار النشط حالياً: <span className="font-mono font-bold text-slate-700" dir="ltr">{settingsData?.backupDir || "الافتراضي"}</span>
                {settingsData?.lastAutoBackupTime && (
                  <span className="mr-3 text-emerald-700 font-semibold">
                    • آخر نسخة تم أخذها تلقائياً: {new Date(settingsData.lastAutoBackupTime).toLocaleTimeString("ar-SA")}
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 2 Action Cards: Instant Backup & Restore Database */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Card 1: Instant Backup */}
          <Card className="border-emerald-100 shadow-sm">
            <CardHeader className="bg-emerald-50/50 border-b pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-emerald-900">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                إنشاء نسخة احتياطية فورية ولحظية
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                يتم أخذ نسخة طبق الأصل مشفرة ومكتملة من قاعدة بيانات النظام (<code className="bg-slate-100 px-1 py-0.5 rounded text-xs">pos.db</code>) متضمنة كافة الفواتير، الحسابات، قيود اليومية، المخزون، والورديات وحفظها في المجلد المخصص على جهازك.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button 
                  onClick={() => createInstantBackupMutation.mutate()} 
                  disabled={createInstantBackupMutation.isPending}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {createInstantBackupMutation.isPending ? "جاري الإنشاء..." : "إنشاء نسخة احتياطية الآن"}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleDownloadBackup()}
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold gap-2"
                >
                  <Download className="w-4 h-4" />
                  تنزيل فوري
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Restore Database */}
          <Card className="border-amber-100 shadow-sm">
            <CardHeader className="bg-amber-50/50 border-b pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-amber-900">
                <Upload className="w-5 h-5 text-amber-600" />
                استعادة قاعدة البيانات من ملف
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                يمكنك رفع ملف قاعدة البيانات (<code className="bg-slate-100 px-1 py-0.5 rounded text-xs">.db</code>) لاستعادة كافة البيانات السابقة. سيتم تحرير القفل وإعادة تشغيل الخادم والبرنامج تلقائياً لتطبيق البيانات المستعادة.
              </p>
              <input 
                type="file" 
                accept=".db" 
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} 
                className="w-full text-sm border p-2 rounded-lg bg-slate-50"
              />
              <Button 
                variant="destructive"
                onClick={() => {
                  if (!selectedFile) {
                    toast({ variant: "destructive", title: "اختر الملف", description: "الرجاء اختيار ملف قاعدة بيانات أولاً" });
                    return;
                  }
                  if (confirm("تحذير أمان: استعادة النسخة الاحتياطية ستستبدل البيانات الحالية بالكامل وتطبق بيانات الملف المستورد. هل تريد المتابعة؟")) {
                    restoreBackupMutation.mutate(selectedFile);
                  }
                }} 
                disabled={!selectedFile || restoreBackupMutation.isPending}
                className="w-full gap-2 font-bold"
              >
                <RotateCcw className="w-4 h-4" />
                {restoreBackupMutation.isPending ? "جاري الاستعادة وتطبيق البيانات..." : "استعادة وتطبيق البيانات المحددة"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Backups List Card */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50 border-b pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                <HardDrive className="w-5 h-5 text-indigo-600" />
                النسخ الاحتياطية المتوفرة على جهاز الكمبيوتر ({backups?.length || 0})
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchBackups()}
                className="text-xs"
              >
                تحديث القائمة
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {backups?.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <Database className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-sm">لا توجد نسخ احتياطية مسجلة حتى الآن.</p>
                <p className="text-xs text-slate-400 mt-1">انقر على "إنشاء نسخة احتياطية الآن" لحفظ أول نسخة من قاعدة البيانات.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {backups?.map((b: any) => (
                  <div key={b.name} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3.5 bg-slate-50/80 hover:bg-slate-100/80 transition-colors border rounded-xl">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-slate-800 truncate" dir="ltr">{b.name}</p>
                        {b.isAuto ? (
                          <span className="px-2 py-0.5 bg-sky-100 text-sky-800 text-[10px] font-bold rounded-full border border-sky-200">تلقائي</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-200">يدوي لحظي</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">تاريخ ووقت الحفظ: {new Date(b.createdAt).toLocaleString("ar-SA")}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate" dir="ltr">{b.path}</p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                      <span className="text-xs font-mono font-bold text-slate-600 bg-white px-2 py-1 border rounded whitespace-nowrap">
                        {(b.size / 1024).toFixed(1)} KB
                      </span>

                      {/* Download Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadBackup(b.name)}
                        title="تنزيل الملف على الكمبيوتر"
                        className="text-xs border-slate-200 text-slate-700 hover:bg-slate-200"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>

                      {/* Restore Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من استعادة النسخة الاحتياطية "${b.name}"؟ سيتم استبدال البيانات الحالية وتطبيق هذه النسخة.`)) {
                            restoreLocalBackupMutation.mutate(b.name);
                          }
                        }}
                        disabled={restoreLocalBackupMutation.isPending || restoreBackupMutation.isPending}
                        className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold"
                      >
                        {restoreLocalBackupMutation.isPending ? "جاري الاستعادة..." : "استعادة هذه النسخة"}
                      </Button>

                      {/* Delete Button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من رغبتك في حذف النسخة الاحتياطية "${b.name}" من القرص؟`)) {
                            deleteBackupMutation.mutate(b.name);
                          }
                        }}
                        disabled={deleteBackupMutation.isPending}
                        title="حذف من القرص"
                        className="text-xs text-red-500 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

