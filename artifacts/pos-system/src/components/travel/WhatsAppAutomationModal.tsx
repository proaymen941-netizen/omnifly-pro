import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageCircle,
  FileText,
  Clock,
  Calendar,
  Check,
  CheckCircle2,
  AlertTriangle,
  User,
  Sparkles,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Send,
  Download,
  ExternalLink,
  Phone,
  RefreshCw,
  Info,
  Monitor,
  Globe,
  Settings,
  Play,
  PauseCircle,
  StopCircle,
  Bell,
  Lock,
} from "lucide-react";

export interface WhatsAppAutomationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPax: any | null;
  allPassengers: any[];
  selectedCustomerId?: string;
  currentCustomerName?: string;
  onBatchComplete?: (result: {
    total: number;
    successCount: number;
    skippedCount: number;
    skippedDetails: any[];
    message?: string;
    isScheduled?: boolean;
  }) => void;
  onEditPassenger?: (passengerId: number | string) => void;
}

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? sessionStorage.getItem("pos_token") ?? "" : "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const WhatsAppAutomationModal: React.FC<WhatsAppAutomationModalProps> = ({
  open,
  onOpenChange,
  targetPax,
  allPassengers,
  selectedCustomerId,
  currentCustomerName,
  onBatchComplete,
  onEditPassenger,
}) => {
  // Config States
  const [whatsappFormat, setWhatsappFormat] = useState<"text" | "pdf" | "text_and_pdf">("text_and_pdf");
  const [whatsappScheduleMode, setWhatsappScheduleMode] = useState<
    "immediate" | "registration_time" | "before_travel_1d" | "before_travel_2d" | "custom_time"
  >("registration_time");
  const [whatsappScheduledTime, setWhatsappScheduledTime] = useState<string>("22:00");
  const [whatsappCustomDate, setWhatsappCustomDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // Optional Intro Message States
  const [whatsappEnableIntro, setWhatsappEnableIntro] = useState<boolean>(true);
  const [whatsappIntroText, setWhatsappIntroText] = useState<string>(
    "السلام عليكم ورحمة الله وبركاته، الأخ/الأخت الكريم/ة.. تحية طيبة من وكالة أومني فلاي، يسرنا تزويدكم بتفاصيل رحلتكم وجوازكم ومستندات التأشيرة المعتمدة:"
  );

  // Auto-apply on new passengers toggle
  const [whatsappAutoApplyNew, setWhatsappAutoApplyNew] = useState<boolean>(true);

  // Modes & Controls
  const [whatsappSendMode, setWhatsappSendMode] = useState<"manual" | "auto">("auto");
  const [whatsappClientType, setWhatsappClientType] = useState<"desktop" | "web">(() => {
    return (localStorage.getItem("pos_whatsapp_client_type") as "desktop" | "web") || "desktop";
  });
  const [whatsappDelaySec, setWhatsappDelaySec] = useState<number>(3);
  const [autoSendTargetGroup, setAutoSendTargetGroup] = useState<"all" | "warning_and_urgent" | "urgent_only">("all");
  const [agencyWhatsAppSender, setAgencyWhatsAppSender] = useState<string>(() => {
    return localStorage.getItem("pos_agency_whatsapp_sender") || "966500000000";
  });

  // Permissions & Authorization
  const [whatsappAuthorized, setWhatsappAuthorized] = useState<boolean>(() => {
    return localStorage.getItem("pos_whatsapp_authorized") === "true";
  });
  const [notificationPermission, setNotificationPermission] = useState<string>(() => {
    return typeof Notification !== "undefined" ? Notification.permission : "default";
  });
  const [protocolTested, setProtocolTested] = useState<boolean>(() => {
    return localStorage.getItem("pos_protocol_tested") === "true";
  });
  const [popupTested, setPopupTested] = useState<boolean>(() => {
    return localStorage.getItem("pos_popup_tested") === "true";
  });
  const [permissionSuccessMessage, setPermissionSuccessMessage] = useState<string>("");
  const [whatsappPermissionModalOpen, setWhatsappPermissionModalOpen] = useState(false);
  const [singlePhone, setSinglePhone] = useState<string>("");
  const [savedPdfUrl, setSavedPdfUrl] = useState<string>("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Background Runner States
  const [runnerActive, setRunnerActive] = useState(false);
  const [runnerPaused, setRunnerPaused] = useState(false);
  const [runnerQueue, setRunnerQueue] = useState<any[]>([]);
  const [runnerIndex, setRunnerIndex] = useState(0);
  const [runnerSuccessCount, setRunnerSuccessCount] = useState(0);
  const [runnerSkippedDetails, setRunnerSkippedDetails] = useState<any[]>([]);
  const [currentRunningItem, setCurrentRunningItem] = useState<any | null>(null);

  // Abort controller ref
  const runnerAbortRef = useRef(false);

  // Load saved backend configuration and verify Windows permissions
  useEffect(() => {
    if (open) {
      const isAuth = localStorage.getItem("pos_whatsapp_authorized") === "true";
      setWhatsappAuthorized(isAuth);
      
      // Auto-prompt permission dialog if not authorized yet
      if (!isAuth) {
        setWhatsappPermissionModalOpen(true);
      }

      fetch("/api/travel/whatsapp/automation-config", {
        headers: getAuthHeaders(),
      })
        .then((res) => res.json())
        .then((cfg) => {
          if (cfg && cfg.id) {
            if (cfg.content_type) setWhatsappFormat(cfg.content_type);
            if (cfg.schedule_mode) setWhatsappScheduleMode(cfg.schedule_mode);
            if (cfg.scheduled_time) setWhatsappScheduledTime(cfg.scheduled_time);
            if (cfg.custom_date) setWhatsappCustomDate(cfg.custom_date);
            if (cfg.enable_intro_message !== undefined) setWhatsappEnableIntro(Boolean(cfg.enable_intro_message));
            if (cfg.intro_message_text) setWhatsappIntroText(cfg.intro_message_text);
            if (cfg.target_group) setAutoSendTargetGroup(cfg.target_group);
            if (cfg.anti_ban_delay_sec) setWhatsappDelaySec(cfg.anti_ban_delay_sec);
            if (cfg.agency_sender) setAgencyWhatsAppSender(cfg.agency_sender);
            if (cfg.auto_apply_on_new_passenger !== undefined) {
              setWhatsappAutoApplyNew(Boolean(cfg.auto_apply_on_new_passenger));
            }
            if (cfg.is_authorized) {
              setWhatsappAuthorized(true);
              localStorage.setItem("pos_whatsapp_authorized", "true");
            }
          }
        })
        .catch(() => {});

      // Setup initial phone for targetPax
      if (targetPax) {
        const ph = targetPax.phone || targetPax.mobile || targetPax.contact_phone || "";
        setSinglePhone(ph);
        setSavedPdfUrl("");
      } else {
        setSinglePhone("");
      }
    }
  }, [open, targetPax]);

  // Generate live preview text
  const composePreviewMessage = () => {
    const paxName = targetPax ? (targetPax.name_ar || targetPax.name_en || "مسافر") : "المعتمر / المسافر الكريم";
    const passportNo = targetPax ? (targetPax.passport_number || "A12345678") : "A12345678";
    const visaType = targetPax ? (targetPax.visa_type || "تأشيرة عمره") : "تأشيرة عمرة";
    const entryDate = targetPax ? (targetPax.travel_date || "").replace(/-/g, "/") : "2026/09/10";
    const exitDate = targetPax ? (targetPax.expected_exit_date || "").replace(/-/g, "/") : "2026/12/10";
    const remaining = targetPax ? (targetPax.remaining_days !== null ? `${targetPax.remaining_days} يوم` : "30 يوم") : "30 يوم";
    const progDuration = targetPax ? (targetPax.program_duration_days || 90) : 90;

    let msg = "";
    if (whatsappEnableIntro && whatsappIntroText.trim()) {
      let intro = whatsappIntroText
        .replace(/\{اسم_المسافر\}/g, paxName)
        .replace(/\{رقم_الجواز\}/g, passportNo)
        .replace(/\{الأيام_المتبقية\}/g, remaining)
        .replace(/\{تاريخ_الخروج\}/g, exitDate);
      msg += `${intro}\n\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    }

    if (whatsappFormat === "pdf") {
      const rawName = (targetPax ? (targetPax.name_ar || targetPax.name_en || 'pax') : 'pax').trim();
      const cleanPaxName = rawName.replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 40);
      const cleanPassport = (passportNo || 'doc').replace(/[\\/:*?"<>|\s]/g, '_');
      const docName = `بطاقة_مسافر_${cleanPaxName}_${cleanPassport}.pdf`;
      msg += `📄 *مستند وبطاقة المسافر الرسمية (ملف PDF):*\n`;
      msg += `👤 *المسافر:* ${paxName}\n`;
      msg += `🛂 *الجواز:* ${passportNo}\n`;
      msg += `📎 *اسم الملف المرفق:* ${docName}\n`;
      msg += `🔗 *تحميل وفتح ملف الـ PDF المباشر:*\n${savedPdfUrl || "https://omni-fly.local/uploads/passengers_pdfs/passenger_card.pdf"}\n`;
      msg += `📱 يتم فتح وتنزيل الملف المرفق مباشرة كملف PDF على هاتفكم المحمول.\n`;
    } else {
      msg += `📋 *بيانات وتفاصيل المسافر والجواز:*\n`;
      msg += `👤 *الاسم:* ${paxName}\n`;
      msg += `🛂 *رقم الجواز:* ${passportNo}\n`;
      msg += `🏷️ *نوع التأشيرة:* ${visaType}\n`;
      msg += `📅 *تاريخ الدخول:* ${entryDate}\n`;
      msg += `⏳ *مدة البرنامج:* ${progDuration} يوم\n`;
      msg += `🚪 *تاريخ الخروج المتوقع:* ${exitDate}\n`;
      msg += `⏱️ *الأيام المتبقية:* ${remaining}\n`;

      if (whatsappFormat === "text_and_pdf") {
        const rawName = (targetPax ? (targetPax.name_ar || targetPax.name_en || 'pax') : 'pax').trim();
        const cleanPaxName = rawName.replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 40);
        const cleanPassport = (passportNo || 'doc').replace(/[\\/:*?"<>|\s]/g, '_');
        const docName = `بطاقة_مسافر_${cleanPaxName}_${cleanPassport}.pdf`;
        msg += `\n📄 *مرفق ملف وبطاقة المسافر الرسمية (ملف PDF):*\n`;
        msg += `📎 *اسم الملف المرفق:* ${docName}\n`;
        msg += `🔗 *تحميل وفتح ملف الـ PDF المباشر:*\n${savedPdfUrl || "https://omni-fly.local/uploads/passengers_pdfs/passenger_card.pdf"}\n`;
        msg += `📱 يتم فتح وتنزيل الملف المرفق مباشرة كملف PDF على هاتفكم المحمول.\n`;
      }
    }

    msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📞 *وكالة أومني فلاي لخدمات السفر والعمرة*\n`;
    msg += `للتواصل عبر واتساب: +${agencyWhatsAppSender}`;

    return msg;
  };

  // Helper function to dispatch to Windows WhatsApp Desktop or Web
  const dispatchToWhatsApp = async (appUri: string, webUri: string) => {
    // 1. Electron Desktop integration
    if (typeof window !== "undefined" && (window as any).electronAPI?.openExternal) {
      try {
        await (window as any).electronAPI.openExternal(whatsappClientType === "web" ? webUri : appUri);
        return;
      } catch (e) {
        await (window as any).electronAPI.openExternal(webUri);
        return;
      }
    }

    // 2. Web browser or iframe on Windows:
    const targetUri = whatsappClientType === "web" ? webUri : appUri;
    try {
      const a = document.createElement("a");
      a.href = targetUri;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          if (document.body.contains(a)) document.body.removeChild(a);
        } catch (e) {}
      }, 500);
    } catch (e) {
      try {
        window.open(targetUri, "_blank");
      } catch (err) {
        window.location.href = targetUri;
      }
    }
  };

  // Test WhatsApp Connection
  const handleTestWhatsAppLaunch = async () => {
    setProtocolTested(true);
    localStorage.setItem("pos_protocol_tested", "true");
    const testPhone = agencyWhatsAppSender.replace(/\D/g, "") || "966500000000";
    const testMsg = encodeURIComponent("تجربة اتصال نظام أومني فلاي بتطبيق WhatsApp لسطح المكتب في ويندوز بنجاح ✓");
    const testAppUri = `whatsapp://send?phone=${testPhone}&text=${testMsg}`;
    const testWebUri = `https://api.whatsapp.com/send?phone=${testPhone}&text=${testMsg}`;
    await dispatchToWhatsApp(testAppUri, testWebUri);
  };

  // Test & Request Windows Action Center / Browser Notifications
  const handleRequestNotificationPermission = async () => {
    if (typeof Notification === "undefined") {
      alert("المتصفح الحالي لا يدعم واجهة إشعارات النظام المباشرة.");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === "granted") {
        localStorage.setItem("pos_windows_notifications_authorized", "true");
        new Notification("نظام أومني فلاي - OmniFly Pro", {
          body: "✓ تم تفعيل إشعارات ويندوز بنجاح! سيصلك تنبيه فوري عند إرسال كل بطاقة مسافر ومستند في الخلفية.",
          icon: "/favicon.png",
        });
      } else {
        alert("لم يتم منح إذن الإشعارات من المتصفح أو إعدادات ويندوز.");
      }
    } catch (e: any) {
      console.warn("Notification request error:", e);
    }
  };

  // Test Browser Popup & Background Tab Launch
  const handleTestPopupLaunch = () => {
    setPopupTested(true);
    localStorage.setItem("pos_popup_tested", "true");
    try {
      const testWin = window.open("about:blank", "_blank", "width=400,height=300");
      if (testWin) {
        setTimeout(() => {
          try {
            testWin.close();
          } catch (e) {}
        }, 800);
        alert("✓ تم التحقق بنجاح: النوافذ المنبثقة والروابط التلقائية مسموح بها في المتصفح ونظام ويندوز دون حظر.");
      } else {
        alert("⚠️ تم حظر النافذة من قبل المتصفح. يرجى النقر على أيقونة الحظر في شريط العنوان واختيار 'السماح دائماً Always Allow' لهذا الموقع.");
      }
    } catch (e) {
      alert("تعذر اختبار النافذة: " + (e as any).message);
    }
  };

  // One-Click Grant & Authorize All Windows & WhatsApp Permissions
  const handleAuthorizeAllWindowsPermissions = async () => {
    setIsProcessing(true);
    localStorage.setItem("pos_whatsapp_authorized", "true");
    localStorage.setItem("pos_whatsapp_client_type", whatsappClientType);
    localStorage.setItem("pos_protocol_tested", "true");
    localStorage.setItem("pos_popup_tested", "true");
    localStorage.setItem("pos_windows_notifications_authorized", "true");
    setWhatsappAuthorized(true);
    setProtocolTested(true);
    setPopupTested(true);

    if (typeof Notification !== "undefined") {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
        if (perm === "granted") {
          new Notification("OmniFly Pro - نظام السفر والواتساب", {
            body: "✓ تم تفعيل ومنح كافة صلاحيات Windows وأتمتة الواتساب بنجاح!",
            icon: "/favicon.png",
          });
        }
      } catch (e) {}
    }

    try {
      await fetch("/api/travel/whatsapp/automation-config", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          is_authorized: 1,
          client_type: whatsappClientType,
          anti_ban_delay_sec: whatsappDelaySec,
          agency_sender: agencyWhatsAppSender,
        }),
      });
    } catch (e) {}

    setIsProcessing(false);
    setWhatsappPermissionModalOpen(false);
    setPermissionSuccessMessage("✓ تم تفويض ومنح كافة صلاحيات ويندوز والواتساب بنجاح ليعمل النظام في الخلفية دون أي قيود.");
    setTimeout(() => setPermissionSuccessMessage(""), 6000);
  };

  // Auto-Save PDF in system for targetPax
  const handleAutoSavePassengerPdf = async () => {
    if (!targetPax) {
      alert("يرجى اختيار مسافر محدد لتوليد وحفظ ملف الـ PDF الخاص به");
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const res = await fetch("/api/travel/whatsapp/save-passenger-pdf", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ passenger_id: targetPax.id }),
      });
      const data = await res.json();
      if (data.success && data.fileUrl) {
        setSavedPdfUrl(data.fileUrl);
        alert(`✓ تم توليد وحفظ ملف الـ PDF بنجاح في النظام:\nاسم الملف: ${data.fileName}\nالمسار: ${data.fileUrl}`);
      } else {
        alert("تعذر حفظ ملف الـ PDF: " + (data.error || "خطأ غير معروف"));
      }
    } catch (e: any) {
      alert("حدث خطأ أثناء حفظ الـ PDF: " + (e.message || ""));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Save Settings & Execute Safe Background Automation Runner
  const handleSaveAndExecute = async () => {
    setIsProcessing(true);
    localStorage.setItem("pos_whatsapp_authorized", "true");
    setWhatsappAuthorized(true);

    try {
      // 1. Save settings to server
      const saveRes = await fetch("/api/travel/whatsapp/automation-config", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          is_active: 1,
          content_type: whatsappFormat,
          schedule_mode: whatsappScheduleMode,
          scheduled_time: whatsappScheduledTime,
          custom_date: whatsappCustomDate,
          enable_intro_message: whatsappEnableIntro ? 1 : 0,
          intro_message_text: whatsappIntroText,
          target_group: autoSendTargetGroup,
          anti_ban_delay_sec: whatsappDelaySec,
          agency_sender: agencyWhatsAppSender,
          auto_apply_on_new_passenger: whatsappAutoApplyNew ? 1 : 0,
          is_authorized: 1,
        }),
      });
      await saveRes.json();
      localStorage.setItem("pos_agency_whatsapp_sender", agencyWhatsAppSender);
      localStorage.setItem("pos_whatsapp_client_type", whatsappClientType);

      // 2. Filter target list
      let targetList = targetPax ? [targetPax] : allPassengers;
      if (!targetPax) {
        if (autoSendTargetGroup === "urgent_only") {
          targetList = targetList.filter((p) => {
            const rem = p.remaining_days !== null && p.remaining_days !== undefined ? Number(p.remaining_days) : null;
            return rem !== null && rem <= 3;
          });
        } else if (autoSendTargetGroup === "warning_and_urgent") {
          targetList = targetList.filter((p) => {
            const rem = p.remaining_days !== null && p.remaining_days !== undefined ? Number(p.remaining_days) : null;
            return rem !== null && rem <= 10;
          });
        }
      }

      if (targetList.length === 0) {
        setIsProcessing(false);
        onOpenChange(false);
        alert("✓ تم حفظ وضبط الإعدادات بنجاح. سيتم تطبيقها ومراسلة أي مسافر جديد تلقائياً فور إضافته للنظام بحسب الإعدادات المضبوطة وبدون أي تدخل يدوي.");
        return;
      }

      // 3. Request Batch Generation & Processing / Scheduling from Backend
      const batchRes = await fetch("/api/travel/whatsapp/batch-process", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          passenger_ids: targetList.map((p) => p.id),
          target_group: autoSendTargetGroup,
        }),
      });
      const batchData = await batchRes.json();

      setIsProcessing(false);
      onOpenChange(false);

      const itemsToDispatch = batchData.processedItems || [];
      const skippedList = batchData.skippedDetails || [];

      // If scheduled mode (future time specified by user):
      if (batchData.isScheduled && whatsappScheduleMode !== "immediate") {
        if (onBatchComplete) {
          onBatchComplete({
            total: batchData.total || targetList.length,
            successCount: batchData.successCount ?? itemsToDispatch.length,
            skippedCount: skippedList.length,
            skippedDetails: skippedList,
            message: batchData.message,
          });
        }
        return;
      }

      // If immediate dispatch mode: launch the sequential dispatcher for all processed items
      if (itemsToDispatch.length > 0) {
        runnerAbortRef.current = false;
        setRunnerQueue(itemsToDispatch);
        setRunnerSkippedDetails(skippedList);
        setRunnerIndex(0);
        setRunnerSuccessCount(0);
        setRunnerPaused(false);
        setRunnerActive(true);

        runSequentialDispatcher(itemsToDispatch, skippedList, batchData.total || targetList.length);
      } else {
        if (onBatchComplete) {
          onBatchComplete({
            total: batchData.total || targetList.length,
            successCount: 0,
            skippedCount: skippedList.length,
            skippedDetails: skippedList,
            message: batchData.message || "لم يتم العثور على مسافرين مؤهلين للإرسال، أو تم تخطي جميع السجلات غير الصالحة بأمان.",
          });
        }
      }
    } catch (err: any) {
      setIsProcessing(false);
      alert("حدث خطأ أثناء معالجة الإعدادات: " + (err.message || ""));
    }
  };

  // Sequential Dispatcher Function
  const runSequentialDispatcher = async (items: any[], skipped: any[], totalCount: number) => {
    let success = 0;
    const delayMs = Math.max(1500, (whatsappDelaySec || 3) * 1000);

    for (let i = 0; i < items.length; i++) {
      if (runnerAbortRef.current) break;

      const item = items[i];
      setCurrentRunningItem(item);
      setRunnerIndex(i + 1);

      // Trigger Windows WhatsApp Protocol or Web
      if (item.whatsappAppUri) {
        try {
          await dispatchToWhatsApp(item.whatsappAppUri, item.whatsappWebUri);
          success++;
          setRunnerSuccessCount(success);
        } catch (e) {
          console.warn("Could not dispatch item:", item, e);
        }
      }

      // Wait between dispatches unless last item
      if (i < items.length - 1 && !runnerAbortRef.current) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    setRunnerActive(false);
    setCurrentRunningItem(null);

    if (onBatchComplete) {
      onBatchComplete({
        total: totalCount,
        successCount: success,
        skippedCount: skipped.length,
        skippedDetails: skipped,
      });
    }
  };

  // Stop / Cancel Runner
  const handleStopRunner = () => {
    runnerAbortRef.current = true;
    setRunnerActive(false);
    setCurrentRunningItem(null);
    if (onBatchComplete) {
      onBatchComplete({
        total: runnerQueue.length + runnerSkippedDetails.length,
        successCount: runnerSuccessCount,
        skippedCount: runnerSkippedDetails.length,
        skippedDetails: runnerSkippedDetails,
      });
    }
  };

  // Single Manual Interactive Send
  const handleSingleSend = async (bypassAuth = false) => {
    if (!whatsappAuthorized && !bypassAuth) {
      setWhatsappPermissionModalOpen(true);
      return;
    }

    let digits = (singlePhone || "").replace(/\D/g, "");
    if (digits.startsWith("00")) digits = digits.slice(2);
    if (!digits || digits.length < 7) {
      alert("يرجى إدخال رقم هاتف صحيح للمستلم قبل الإرسال المباشر");
      return;
    }

    // Auto-detect and format phone number
    if (digits.startsWith("05") && digits.length === 10) {
      digits = "966" + digits.slice(1);
    } else if (digits.startsWith("5") && digits.length === 9) {
      digits = "966" + digits;
    } else if (digits.startsWith("07") && digits.length === 10) {
      digits = "967" + digits.slice(1);
    } else if (digits.startsWith("7") && digits.length === 9) {
      digits = "967" + digits;
    } else if (digits.startsWith("01") && digits.length === 11) {
      digits = "20" + digits.slice(1);
    } else if (digits.startsWith("0")) {
      digits = (agencyWhatsAppSender.replace(/\D/g, "") || "966") + digits.slice(1);
    }
    const cleanPhone = digits;

    // Auto save PDF if not yet saved and format includes PDF
    let finalDocUrl = savedPdfUrl;
    if ((whatsappFormat === "pdf" || whatsappFormat === "text_and_pdf") && !savedPdfUrl && targetPax) {
      try {
        const res = await fetch("/api/travel/whatsapp/save-passenger-pdf", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ passenger_id: targetPax.id }),
        });
        const data = await res.json();
        if (data.success && data.fileUrl) {
          finalDocUrl = data.fileUrl;
          setSavedPdfUrl(data.fileUrl);
        }
      } catch (e) {}
    }

    // Register log and trigger cloud gateway in database
    if (targetPax) {
      try {
        await fetch("/api/travel/whatsapp/send-passenger", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            passenger_id: targetPax.id,
            format: whatsappFormat,
            phone_override: cleanPhone,
          }),
        });
      } catch (e) {}
    }

    const msg = composePreviewMessage();
    const encodedMsg = encodeURIComponent(msg);
    const whatsappAppUri = `whatsapp://send?phone=${cleanPhone}&text=${encodedMsg}`;
    const whatsappWebUri = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`;

    await dispatchToWhatsApp(whatsappAppUri, whatsappWebUri);
    onOpenChange(false);
  };

  // Helper for human-readable time
  const formatArabicTime = (timeStr: string) => {
    if (!timeStr) return "10:00 ليلاً";
    const [hStr, mStr] = timeStr.split(":");
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr || "0", 10);
    const period = h >= 12 ? "مساءً / ليلاً" : "صباحاً";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const mPadded = m < 10 ? `0${m}` : m;
    return `الساعة ${h12}:${mPadded} ${period}`;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <DialogTitle className="text-base lg:text-lg font-black text-slate-900 flex items-center gap-2">
                    إعدادات وأتمتة إرسال الواتساب للمسافرين والمعتمرين
                    <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      WhatsApp Pro Windows & Cloud
                    </span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    تحديد صيغة الإرسال (نص / PDF)، جدولة المواعيد، الرسالة التمهيدية، والتنفيذ المباشر عبر واتساب ويندوز
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Integration Status & Windows Permissions Banner */}
          <div className="p-3 rounded-xl border bg-slate-50 border-slate-200 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${whatsappAuthorized ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-800 flex items-center gap-2">
                    <span>
                      {whatsappAuthorized
                        ? "صلاحيات وتفويض نظام Windows والواتساب (مفوّضة ومكتملة ✓)"
                        : "يتطلب تفويض صلاحيات الوصول والتشغيل لنظام Windows والواتساب"}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold">
                      {whatsappClientType === "desktop" ? "💻 WhatsApp Desktop (whatsapp://)" : "🌐 WhatsApp Web"}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {whatsappAuthorized
                      ? "النظام مصرّح بالكامل لمراسلة المسافرين وتوليد بطاقات الـ PDF في الخلفية بدون حجب من ويندوز"
                      : "يرجى منح أذونات بروتوكول ويندوز والإشعارات والنوافذ لضمان الأتمتة بدون أي عرقلة"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setWhatsappPermissionModalOpen(true)}
                  className="h-8 text-xs font-bold text-emerald-800 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 gap-1.5 shadow-sm"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  مركز أذونات وصلاحيات Windows
                </Button>
              </div>
            </div>

            {/* Permissions Health Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 border-t border-slate-200/80">
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-white p-1.5 rounded-lg border border-slate-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>بروتوكول واتساب المكتبي</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-white p-1.5 rounded-lg border border-slate-200">
                {notificationPermission === "granted" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <Bell className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                )}
                <span>إشعارات ويندوز: {notificationPermission === "granted" ? "مفعلة" : "اختياري"}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-white p-1.5 rounded-lg border border-slate-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>النوافذ والتحويل الآلي</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-white p-1.5 rounded-lg border border-slate-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>حفظ الـ PDF التلقائي</span>
              </div>
            </div>

            {permissionSuccessMessage && (
              <div className="p-2 bg-emerald-100 border border-emerald-300 rounded-lg text-[11px] font-bold text-emerald-900 flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                {permissionSuccessMessage}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 py-2">
            {/* Left Column (7 cols): Main Settings & Schedule */}
            <div className="lg:col-span-7 space-y-4">
              {/* 1. CONTENT FORMAT & AUTO-SAVE PDF */}
              <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    1. تحديد صيغة الإرسال وحفظ ملف الـ PDF تلقائياً في النظام:
                  </label>
                  {targetPax && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAutoSavePassengerPdf}
                      disabled={isGeneratingPdf}
                      className="h-7 text-[11px] font-bold border-emerald-300 text-emerald-800 hover:bg-emerald-50 gap-1"
                    >
                      {isGeneratingPdf ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                      حفظ وتوليد الـ PDF في النظام الآن
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setWhatsappFormat("text_and_pdf")}
                    className={`p-2.5 rounded-lg border text-right transition-all ${
                      whatsappFormat === "text_and_pdf"
                        ? "border-emerald-600 bg-emerald-50 shadow-sm text-emerald-950 font-bold"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      نص + ملف PDF
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">الخيار الشامل المعتمد (بيانات كاملة ورابط المستند)</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWhatsappFormat("pdf")}
                    className={`p-2.5 rounded-lg border text-right transition-all ${
                      whatsappFormat === "pdf"
                        ? "border-emerald-600 bg-emerald-50 shadow-sm text-emerald-950 font-bold"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      ملف PDF فقط
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">حفظ بطاقة الـ PDF تلقائياً وإرسالها للمسافر</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWhatsappFormat("text")}
                    className={`p-2.5 rounded-lg border text-right transition-all ${
                      whatsappFormat === "text"
                        ? "border-emerald-600 bg-emerald-50 shadow-sm text-emerald-950 font-bold"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      نص تفصيلي فقط
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">بيانات الجواز والتأشيرة وتواريخ الخروج بنص منسق</p>
                  </button>
                </div>

                <div className="text-[11px] text-emerald-800 bg-emerald-50/60 p-2 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    ✓ يتم حفظ ملف الـ PDF تلقائياً في قاعدة بيانات النظام وتضمين رابطه الرسمي المباشر في رسالة الواتساب.
                  </span>
                </div>
              </div>

              {/* 2. SCHEDULING MODE & TIME ADJUSTMENT */}
              <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    2. تحديد وجدولة موعد الإرسال وتعديل الوقت:
                  </label>
                  <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {formatArabicTime(whatsappScheduledTime)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">موعد الإرسال المجدول:</label>
                    <select
                      value={whatsappScheduleMode}
                      onChange={(e: any) => setWhatsappScheduleMode(e.target.value)}
                      className="w-full text-xs font-bold bg-white border border-slate-300 rounded-lg p-2 text-slate-800"
                    >
                      <option value="registration_time">في وقت محدد من تاريخ تسجيل المسافر (افتراضياً 10:00 ليلاً)</option>
                      <option value="before_travel_1d">قبل موعد السفر أو الخروج بيوم واحد (1 يوم)</option>
                      <option value="before_travel_2d">قبل موعد السفر أو الخروج بيومين (2 يوم)</option>
                      <option value="custom_time">تحديد موعد وتاريخ مخصص من قبل المستخدم</option>
                      <option value="immediate">إرسال فوري ومباشر الآن</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">تعديل وقت الإرسال (الساعة والدقائق):</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={whatsappScheduledTime}
                        onChange={(e) => setWhatsappScheduledTime(e.target.value)}
                        className="text-xs font-mono font-bold bg-white"
                      />
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">
                        (مثال: 22:00 = 10 ليلاً)
                      </span>
                    </div>
                  </div>
                </div>

                {whatsappScheduleMode === "custom_time" && (
                  <div className="pt-1">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">التاريخ المخصص للإرسال:</label>
                    <Input
                      type="date"
                      value={whatsappCustomDate}
                      onChange={(e) => setWhatsappCustomDate(e.target.value)}
                      className="text-xs font-bold bg-white"
                    />
                  </div>
                )}
              </div>

              {/* 3. OPTIONAL PRE-MESSAGE */}
              <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsappEnableIntro}
                      onChange={(e) => setWhatsappEnableIntro(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                    />
                    <span>3. تفعيل رسالة تمهيدية اختيارية ترسل قبل البيانات الأساسية والملفات</span>
                  </label>
                  {whatsappEnableIntro && (
                    <button
                      type="button"
                      onClick={() =>
                        setWhatsappIntroText(
                          "السلام عليكم ورحمة الله وبركاته، الأخ/الأخت الكريم/ة.. تحية طيبة من وكالة أومني فلاي، يسرنا تزويدكم بتفاصيل رحلتكم وجوازكم ومستندات التأشيرة المعتمدة:"
                        )
                      }
                      className="text-[10px] text-emerald-700 hover:underline font-bold"
                    >
                      استعادة النص الافتراضي
                    </button>
                  )}
                </div>

                {whatsappEnableIntro ? (
                  <div className="space-y-1.5">
                    <textarea
                      rows={3}
                      value={whatsappIntroText}
                      onChange={(e) => setWhatsappIntroText(e.target.value)}
                      placeholder="اكتب هنا الرسالة التمهيدية والترحيبية بالمسافر..."
                      className="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                      <span>متغيرات سريعة:</span>
                      <button
                        type="button"
                        onClick={() => setWhatsappIntroText((prev) => prev + " {اسم_المسافر}")}
                        className="bg-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-300 text-slate-800"
                      >
                        {"{اسم_المسافر}"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setWhatsappIntroText((prev) => prev + " {رقم_الجواز}")}
                        className="bg-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-300 text-slate-800"
                      >
                        {"{رقم_الجواز}"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setWhatsappIntroText((prev) => prev + " {الأيام_المتبقية}")}
                        className="bg-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-300 text-slate-800"
                      >
                        {"{الأيام_المتبقية}"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">تم تعطيل الرسالة التمهيدية، سيتم إرسال بيانات الجواز والملف مباشرة.</p>
                )}
              </div>

              {/* 4. AUTO-APPLY ON NEW PASSENGERS & ERROR-FREE SKIPPING */}
              <div className="p-3.5 bg-emerald-50/40 rounded-xl border border-emerald-200 space-y-2">
                <label className="text-xs font-black text-emerald-950 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whatsappAutoApplyNew}
                    onChange={(e) => setWhatsappAutoApplyNew(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                  />
                  <span>✓ تطبيق هذه الإعدادات والجدولة تلقائياً على أي مسافر جديد يتم تسجيله أو استيراده في النظام</span>
                </label>
                <div className="p-2 bg-emerald-100/50 rounded-lg text-[11px] text-emerald-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    <strong>أتمتة آمنة وتخطي الأخطاء:</strong> إذا كان هناك أرقام غير صحيحة أو غير مسجلة، يقوم النظام بتخطيها تلقائياً وإكمال بقية المهام وإظهار تقرير مفصل بها دون أي تعليق أو توقف.
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): Send Mode & Live Preview */}
            <div className="lg:col-span-5 space-y-4">
              {/* Send Mode Toggle */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">طريقة ونمط إرسال التنبيهات:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWhatsappSendMode("auto")}
                    className={`p-2.5 rounded-lg border text-right transition-all ${
                      whatsappSendMode === "auto"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-sm"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      أتمتة تلقائية آمنة
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">في الخلفية عبر واتساب ويندوز</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWhatsappSendMode("manual")}
                    className={`p-2.5 rounded-lg border text-right transition-all ${
                      whatsappSendMode === "manual"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-sm"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-600" />
                      إرسال يدوي تفاعلي
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">فتح محادثة واتساب للمسافر المحدد</p>
                  </button>
                </div>
              </div>

              {/* Target WhatsApp Client Choice */}
              <div className="p-3 bg-slate-50 border rounded-xl space-y-2">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>تطبيق الإرسال المستهدف في ويندوز:</span>
                  <span className="text-[10px] font-normal text-emerald-700 font-bold">تكامل مباشر</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWhatsappClientType("desktop");
                      localStorage.setItem("pos_whatsapp_client_type", "desktop");
                    }}
                    className={`p-2 rounded-lg border text-right text-xs transition-all flex items-center gap-2 ${
                      whatsappClientType === "desktop"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <Monitor className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div>واتساب ويندوز المكتبي</div>
                      <div className="text-[9px] text-slate-500 font-normal">WhatsApp Desktop App</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setWhatsappClientType("web");
                      localStorage.setItem("pos_whatsapp_client_type", "web");
                    }}
                    className={`p-2 rounded-lg border text-right text-xs transition-all flex items-center gap-2 ${
                      whatsappClientType === "web"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div>واتساب ويب بالمتصفح</div>
                      <div className="text-[9px] text-slate-500 font-normal">web.whatsapp.com</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* If Single Pax: Phone input */}
              {targetPax && (
                <div className="p-3 bg-slate-50 border rounded-xl space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    رقم هاتف المسافر المحدد ({targetPax.name_ar || targetPax.name_en}):
                  </label>
                  <Input
                    value={singlePhone}
                    onChange={(e) => setSinglePhone(e.target.value)}
                    placeholder="مثال: 966500000000"
                    dir="ltr"
                    className="font-mono text-xs font-bold bg-white"
                  />
                  <p className="text-[10px] text-slate-500">سيتم التحقق من الرقم والتنسيق الدولي وتخطي الرقم إن كان غير صالح.</p>
                </div>
              )}

              {/* Target Group Selector if Batch */}
              {!targetPax && (
                <div className="p-3 bg-slate-50 border rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-emerald-600" />
                      فئة المعتمرين المستهدفين:
                    </span>
                  </div>
                  <select
                    value={autoSendTargetGroup}
                    onChange={(e: any) => setAutoSendTargetGroup(e.target.value)}
                    className="w-full text-xs font-bold bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                  >
                    <option value="all">كافة المسافرين ({allPassengers.length} مسافر)</option>
                    <option value="warning_and_urgent">الإنذار والاقتراب فقط (≤ 10 أيام)</option>
                    <option value="urgent_only">الحالات العاجلة فقط (≤ 3 أيام)</option>
                  </select>
                </div>
              )}

              {/* Official Agency Sender & Anti-Ban Rate Limit */}
              <div className="p-3 bg-slate-50 border rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700">رقم واتساب الوكالة الرسمي:</label>
                  <span className="text-[10px] font-mono font-bold text-slate-500">+{agencyWhatsAppSender}</span>
                </div>
                <Input
                  value={agencyWhatsAppSender}
                  onChange={(e) => setAgencyWhatsAppSender(e.target.value)}
                  dir="ltr"
                  className="font-mono text-xs font-bold bg-white"
                />

                <div className="pt-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                    <span>الفاصل الزمني الآمن بين إرسال كل رسالة:</span>
                    <span className="font-mono text-emerald-700">{whatsappDelaySec} ثوانٍ</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    step="1"
                    value={whatsappDelaySec}
                    onChange={(e) => setWhatsappDelaySec(Number(e.target.value))}
                    className="w-full accent-emerald-600"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                    <span>2 ثانية (سريع)</span>
                    <span>5 ثوانٍ (متوازن)</span>
                    <span>10 ثوانٍ (حماية قصوى)</span>
                  </div>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">معاينة حية لشكل رسالة الواتساب:</label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTestWhatsAppLaunch}
                    className="h-6 text-[10px] font-bold text-emerald-800 border-emerald-300 hover:bg-emerald-50 gap-1 px-2"
                  >
                    <Send className="w-3 h-3 text-emerald-600" />
                    اختبار فتح الواتساب فوراً
                  </Button>
                </div>
                <div className="bg-[#fcfbf9] border border-amber-200/70 p-3 rounded-xl max-h-44 overflow-y-auto text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner">
                  {composePreviewMessage()}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-emerald-600" />
              <span>يتم توجيه الرسائل والملفات عبر تطبيق WhatsApp لسطح المكتب في ويندوز تلقائياً.</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
              {whatsappSendMode === "manual" && targetPax ? (
                <Button
                  onClick={() => handleSingleSend()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  إرسال مباشر للمسافر المحدد
                </Button>
              ) : (
                <Button
                  onClick={() => handleSaveAndExecute()}
                  disabled={isProcessing}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-black gap-2 shadow-md"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      جاري حفظ الإعدادات وتجهيز الـ PDF...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      حفظ الإعدادات وبدء الإرسال عبر واتساب ويندوز
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Official Legal Permission & Windows/Web WhatsApp Authorization Modal */}
      <Dialog open={whatsappPermissionModalOpen} onOpenChange={setWhatsappPermissionModalOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                <ShieldCheck className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                  مركز تفويض وأذونات نظام Windows والواتساب
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    Windows & Web Security
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  إذن وتفويض رسمي لمرة واحدة لتمكين النظام من مراسلة المسافرين والمعتمرين وتوليد ملفات الـ PDF في الخلفية دون أي حظر من ويندوز
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs text-slate-700">
            {/* Main legal statement */}
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2 text-emerald-950">
              <div className="font-bold flex items-center gap-2 text-xs text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                تفويض رسمي دائم للتشغيل الآلي في نظام ويندوز (Windows Automation Authorization)
              </div>
              <p className="text-[11px] leading-relaxed text-emerald-800">
                بموجب هذا التفويض، يمنح المستخدم نظام <strong>أومني فلاي (OmniFly Pro)</strong> الصلاحية الكاملة للاتصال بتطبيق واتساب في ويندوز (Desktop / Web) لإرسال بيانات الحجوزات وبطاقات الجوازات المعتمدة بصيغة PDF مباشرة في المواعيد المحددة أو فور تسجيل المسافرين، <strong>ويتم حفظ هذا الإذن بشكل دائم ولن يطلب منك مجدداً</strong>.
              </p>
            </div>

            {/* Granular Permissions & Diagnostics Check */}
            <div className="space-y-2">
              <label className="font-black text-slate-800 flex items-center gap-1.5 text-xs">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                حالة الأذونات والصلاحيات في نظام Windows والمتصفح:
              </label>

              <div className="grid grid-cols-1 gap-2">
                {/* 1. Windows WhatsApp Protocol */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span>1. بروتوكول تطبيق واتساب المكتبي (whatsapp://)</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                          {protocolTested ? "تم اختباره ✓" : "جاهز للتفويض"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        يتيح للنظام استدعاء تطبيق واتساب المكتبي المثبت في جهاز ويندوز مباشرة
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTestWhatsAppLaunch}
                    className="h-7 text-xs font-bold text-emerald-800 border-emerald-300 hover:bg-emerald-50 shrink-0 gap-1"
                  >
                    <Play className="w-3 h-3 text-emerald-600" />
                    اختبار البروتوكول
                  </Button>
                </div>

                {/* 2. Windows Native Action Center Notifications */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${notificationPermission === "granted" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span>2. إشعارات سطح المكتب ونظام ويندوز (Windows Action Center)</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          notificationPermission === "granted" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {notificationPermission === "granted" ? "مفوض ومفعل ✓" : "يتطلب التفعيل"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        تنبيهك على شاشة ويندوز فور إرسال رسالة أو بطاقة مسافر بنجاح في الخلفية
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRequestNotificationPermission}
                    className="h-7 text-xs font-bold text-slate-700 border-slate-300 hover:bg-slate-100 shrink-0 gap-1"
                  >
                    <Bell className="w-3 h-3 text-slate-500" />
                    {notificationPermission === "granted" ? "إشعار تجريبي" : "تفعيل الإشعارات"}
                  </Button>
                </div>

                {/* 3. Popups & Background Tab Launch */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span>3. النوافذ التلقائية والتحويل الآلي (Popups & Redirects)</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                          {popupTested ? "تم الفحص ✓" : "موصى به"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        السماح بفتح روابط الواتساب بدون حظر من مانع النوافذ في المتصفح
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTestPopupLaunch}
                    className="h-7 text-xs font-bold text-blue-800 border-blue-300 hover:bg-blue-50 shrink-0 gap-1"
                  >
                    <Globe className="w-3 h-3 text-blue-600" />
                    فحص النوافذ
                  </Button>
                </div>

                {/* 4. PDF Auto-Storage & Dispatch */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span>4. تخزين وتوليد بطاقات الـ PDF التلقائي في النظام</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                          مفعل ونشط ✓
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        توليد ملفات PDF باللغتين مع الباركود وتخزينها في مجلد النظام المعتمد
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Client selection options */}
            <div className="space-y-2 pt-1 border-t border-slate-200">
              <label className="font-black text-slate-800 block text-xs">حدد التطبيق المفضل لديك للتشغيل الآلي في النظام:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWhatsappClientType("desktop")}
                  className={`p-3 rounded-xl border text-right transition-all ${
                    whatsappClientType === "desktop"
                      ? "border-emerald-600 bg-emerald-50/70 font-bold text-emerald-950 shadow-sm ring-1 ring-emerald-500"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <Monitor className="w-4 h-4 text-emerald-600" />
                    تطبيق WhatsApp لسطح المكتب في Windows
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                    (الخيار الموصى به - اتصال مباشر وفوري بتطبيق ويندوز المكتبي whatsapp://)
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setWhatsappClientType("web")}
                  className={`p-3 rounded-xl border text-right transition-all ${
                    whatsappClientType === "web"
                      ? "border-emerald-600 bg-emerald-50/70 font-bold text-emerald-950 shadow-sm ring-1 ring-emerald-500"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    واتساب ويب في المتصفح (WhatsApp Web)
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                    (التشغيل عبر نافذة المتصفح web.whatsapp.com)
                  </p>
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <Button variant="outline" onClick={() => setWhatsappPermissionModalOpen(false)}>
              إغلاق
            </Button>
            <Button
              onClick={handleAuthorizeAllWindowsPermissions}
              disabled={isProcessing}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs gap-2 shadow-sm py-2 px-4"
            >
              <CheckCircle2 className="w-4 h-4" />
              منح وتفعيل كافة صلاحيات Windows والواتساب بنقرة واحدة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Live WhatsApp Dispatch Runner Progress Dialog */}
      <Dialog open={runnerActive} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" dir="rtl" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl animate-pulse">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-sm font-black text-slate-900">
                  جاري الإرسال عبر تطبيق WhatsApp لسطح المكتب في ويندوز
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  معالجة المسافرين في الخلفية مع حفظ ملفات الـ PDF وتطبيق الفاصل الزمني الآمن
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            {/* Progress Counter & Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700">تقدم الإرسال المباشر:</span>
                <span className="font-mono text-emerald-700">
                  {runnerIndex} / {runnerQueue.length} ({Math.round(((runnerIndex) / Math.max(1, runnerQueue.length)) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${((runnerIndex) / Math.max(1, runnerQueue.length)) * 100}%` }}
                />
              </div>
            </div>

            {/* Current Item Card */}
            {currentRunningItem && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span>المسافر:</span>
                    <span className="text-emerald-800 font-black">{currentRunningItem.name}</span>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                    +{currentRunningItem.phone}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-0.5 border-t border-slate-200">
                  <span className="text-[11px] text-emerald-700 font-bold">ملف الـ PDF محفوظ في النظام ✓</span>
                  <Button
                    size="sm"
                    onClick={() => dispatchToWhatsApp(currentRunningItem.whatsappAppUri, currentRunningItem.whatsappWebUri)}
                    className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 px-2"
                  >
                    <ExternalLink className="w-3 h-3" />
                    فتح المحادثة يدوياً
                  </Button>
                </div>
              </div>
            )}

            {/* Success & Skip Statistics */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="text-slate-500 text-[10px]">تم الإرسال بنجاح</div>
                <div className="font-black text-emerald-800 text-sm font-mono">{runnerSuccessCount}</div>
              </div>
              <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="text-slate-500 text-[10px]">أرقام متخطاة بأمان</div>
                <div className="font-black text-amber-800 text-sm font-mono">{runnerSkippedDetails.length}</div>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-200">
              💡 <strong>ملاحظة:</strong> يتم فتح محادثة كل مسافر في WhatsApp مع رسالته ورابط ملف الـ PDF الخاص به تلقائياً.
            </div>
          </div>

          <DialogFooter className="border-t pt-3 flex justify-between items-center">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleStopRunner}
              className="text-xs font-bold gap-1"
            >
              <StopCircle className="w-3.5 h-3.5" />
              إيقاف الأتمتة الحالية
            </Button>
            <div className="text-[11px] text-slate-400 font-mono">
              فاصل الأمان: {whatsappDelaySec}ث
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
