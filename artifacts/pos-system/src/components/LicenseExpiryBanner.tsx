import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { AlertTriangle, Clock, Key, ShieldAlert, X, Copy, Check, MessageSquare, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export function LicenseExpiryBanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [activationCode, setActivationCode] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [copiedHwid, setCopiedHwid] = useState(false);

  // Check license status every 10 minutes or on load
  const { data: status } = useQuery({
    queryKey: ["license-status-banner"],
    queryFn: () => fetch("/api/license/status").then(r => r.json()).catch(() => null),
    refetchInterval: 10 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });

  const { data: deviceInfo } = useQuery({
    queryKey: ["device-info-banner"],
    queryFn: () => fetch("/api/licenses/device-info").then(r => r.json()).catch(() => null),
  });

  const remainingDays = status?.remainingDays;
  const isExpiringSoon = remainingDays !== undefined && remainingDays !== null && remainingDays <= 15 && remainingDays > 0;
  const isCritical = remainingDays !== undefined && remainingDays !== null && remainingDays <= 3 && remainingDays > 0;
  const isExpired = remainingDays !== undefined && remainingDays !== null && remainingDays <= 0;

  // Show urgent popup once per session if critical (<= 3 days)
  useEffect(() => {
    if (isCritical) {
      const hasShown = sessionStorage.getItem("omni_expiry_popup_shown");
      if (!hasShown) {
        setShowRenewModal(true);
        sessionStorage.setItem("omni_expiry_popup_shown", "true");
      }
    }
  }, [isCritical]);

  if (!status || status.blocked || (!isExpiringSoon && !isCritical) || bannerDismissed) {
    return null;
  }

  const handleCopyFingerprint = () => {
    const hwid = deviceInfo?.deviceId || status.deviceId || "";
    if (!hwid) return;
    navigator.clipboard.writeText(hwid);
    setCopiedHwid(true);
    toast({ title: "تم نسخ بصمة الجهاز 📋", description: hwid });
    setTimeout(() => setCopiedHwid(false), 3000);
  };

  const handleActivateRenewCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationCode.trim()) {
      toast({ variant: "destructive", title: "تنبيه", description: "يرجى إدخال كود التفعيل الممنوح لك" });
      return;
    }
    try {
      setIsActivating(true);
      const res = await fetch("/api/licenses/activate-with-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activation_code: activationCode.trim(),
          device_id: deviceInfo?.deviceId || status.deviceId
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "كود التفعيل غير صحيح");
      }
      toast({
        title: "تم تجديد وترخيص النظام بنجاح! 🎉✅",
        description: data.message || `تم تمديد الترخيص حتى ${data.expiresAt}`
      });
      setShowRenewModal(false);
      setActivationCode("");
      queryClient.invalidateQueries({ queryKey: ["license-status-banner"] });
      queryClient.invalidateQueries({ queryKey: ["license-status"] });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "خطأ في التفعيل",
        description: err.message || "كود الترخيص غير متوافق أو منتهي"
      });
    } finally {
      setIsActivating(false);
    }
  };

  const currentDev = deviceInfo?.deviceId || status.deviceId || "";
  const devWhatsappMsg = encodeURIComponent(
    `السلام عليكم ورحمة الله،\nأرغب في تجديد ترخيص نظام OmniFly Pro.\nاسم المنشأة: ${status.clientName || "العميل"}\nبصمة الجهاز: ${currentDev}\nتاريخ الانتهاء الحالي: ${status.expiresAt} (متبقي ${remainingDays} يوم).\nيرجى إرسال كود التجديد والترخيص.`
  );

  return (
    <>
      {/* Top Banner Alert Bar */}
      <div 
        className={`w-full text-white text-xs font-bold py-2.5 px-4 shadow-md flex items-center justify-between flex-wrap gap-2 transition-all duration-300 z-40 relative dir-rtl ${
          isCritical 
            ? "bg-gradient-to-r from-red-700 via-red-600 to-rose-800 animate-pulse" 
            : "bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700"
        }`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="p-1 bg-white/20 rounded-lg shrink-0">
            {isCritical ? <ShieldAlert className="w-4 h-4 text-yellow-300" /> : <Clock className="w-4 h-4 text-white" />}
          </div>
          <div className="leading-snug">
            <span className="font-extrabold ml-1.5">
              {isCritical ? "⚠️ تحذير عاجل: اقتراب توقف النظام!" : "🔔 تنبيه قرب انتهاء الترخيص:"}
            </span>
            <span>
              متبقي <span className="underline font-black text-yellow-200 text-sm">{remainingDays} يوم</span> على انتهاء ترخيص هذا الجهاز (تاريخ الانتهاء: <span className="font-mono">{status.expiresAt}</span>).
            </span>
            <span className="hidden md:inline mr-1 text-white/90">
              يرجى سرعة التواصل مع إدارة ومطور النظام لتجديد الترخيص قبل موعد التوقف لضمان استمرار العمل دون انقطاع.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => setShowRenewModal(true)}
            className="bg-white hover:bg-yellow-50 text-slate-900 font-black text-xs h-7 px-3 gap-1 shadow-xs rounded-lg"
          >
            <Key className="w-3.5 h-3.5 text-amber-600" />
            <span>إدخال كود التجديد</span>
          </Button>

          <a
            href={`https://wa.me/967777146387?text=${devWhatsappMsg}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs h-7 px-2.5 rounded-lg transition-colors shadow-xs"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">واتساب المطور</span>
          </a>

          <button
            onClick={() => setBannerDismissed(true)}
            className="p-1 hover:bg-white/20 rounded-md text-white/80 hover:text-white transition-colors"
            title="إخفاء التنبيه مؤقتاً"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Renew License Modal */}
      <Dialog open={showRenewModal} onOpenChange={setShowRenewModal}>
        <DialogContent className="max-w-md w-full dir-rtl rounded-3xl p-6 font-sans border-2 border-amber-500">
          <DialogHeader className="text-right space-y-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <span>تجديد وترخيص استخدام النظام (OmniFly Pro)</span>
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-600 font-medium leading-relaxed">
              ينتهي ترخيص النظام على هذا الجهاز بعد <b className="text-red-600">{remainingDays} يوم</b> (بتاريخ: {status.expiresAt}). أدخل كود التجديد الممنوح من إدارة ومطور النظام للاستمرار في استخدام النظام.
            </DialogDescription>
          </DialogHeader>

          {/* Machine Fingerprint Card */}
          <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800 space-y-1.5 text-right">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
              <span>بصمة هذا الجهاز (Hardware Device ID)</span>
              <span className="text-amber-400 font-mono">HWID</span>
            </div>
            <div className="flex items-center justify-between gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
              <span className="font-mono text-xs text-amber-300 font-black tracking-wider dir-ltr truncate">
                {currentDev || "جاري القراءة..."}
              </span>
              <Button
                type="button"
                size="sm"
                onClick={handleCopyFingerprint}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs h-6 px-2 gap-1 shrink-0"
              >
                {copiedHwid ? <Check className="w-3 h-3 text-emerald-950" /> : <Copy className="w-3 h-3" />}
                <span>{copiedHwid ? "تم النسخ" : "نسخ"}</span>
              </Button>
            </div>
            <p className="text-[10px] text-slate-400">
              أرسل هذه البصمة للمطور لإصدار كود الترخيص السحابي أو المكتبي لجهازك.
            </p>
          </div>

          {/* Activation Form */}
          <form onSubmit={handleActivateRenewCode} className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800">كود التفعيل / التجديد الممنوح من المطور *</label>
              <Input
                type="text"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value)}
                placeholder="ACT-XXXX-XXXX-XXXX أو مفتاح الترخيص"
                className="font-mono text-center text-xs h-9 font-black tracking-wider bg-white border-slate-300 text-slate-900"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="submit"
                disabled={!activationCode.trim() || isActivating}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs h-9 shadow-md"
              >
                {isActivating ? "جاري التحقق والاعتماد..." : "اعتماد وتمديد الترخيص"}
              </Button>

              <a
                href={`https://wa.me/967777146387?text=${devWhatsappMsg}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-9 px-3 rounded-md transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>طلب الكود عبر واتساب</span>
              </a>
            </div>
          </form>

          <DialogFooter className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="text-[11px] text-slate-500 font-bold">
              هاتف الدعم: <span className="font-mono text-red-600 font-black">777146387</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowRenewModal(false)}
              className="text-xs font-bold"
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
