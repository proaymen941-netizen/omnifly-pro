import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Info, HelpCircle, Shield, Star, Lightbulb, Mail, 
  BookOpen, Layers, FileText, Users, Tag, Settings, Shuffle, 
  BarChart3, TrendingUp, PieChart, Key, Phone, Laptop, Lock, User,
  Cloud, ShieldCheck, Sparkles
} from "lucide-react";
import { AppLogo, AppIcon } from "@/components/AppLogo";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then(r => r.json()).catch(() => ({})),
  });

  const licenseeName = settings?.businessName || "مؤسسة إتقان المعتمدة للتجارة والخدمات";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [activeForm, setActiveForm] = useState<"login" | "password">("login");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [licenseModalTitle, setLicenseModalTitle] = useState("");
  const [licenseModalMessage, setLicenseModalMessage] = useState("");
  const [licenseModalType, setLicenseModalType] = useState<"expired" | "unauthorized" | "generic">("generic");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [promoIndex, setPromoIndex] = useState(0);
  const promoSlides = [
    {
      title: "إصدار وإدارة التذاكر الذكي",
      desc: "شاشة حجز سريعة وسلسة تدعم حجز وإصدار تذاكر الطيران، الفنادق، التأشيرات والبرامج السياحية مع فحص الائتمان اللحظي.",
      image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80",
      icon: Laptop,
      iconColor: "text-blue-300",
    },
    {
      title: "تقارير مالية ومحاسبية دقيقة",
      desc: "راقب أرباحك، مبيعاتك وعمولات شركات الطيران والفنادق لحظة بلحظة مع ربط آلي بدفتر الأستاذ المزدوج وشجرة الحسابات.",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80",
      icon: BarChart3,
      iconColor: "text-amber-300",
    },
    {
      title: "إدارة متكاملة للسفريات والمؤسسات",
      desc: "نظام OmniFly Pro يوفر إدارة دقيقة للفروع، الصناديق، المسافرين، ومطابقة وثائق السفر والجوازات وفق أعلى المعايير.",
      image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80",
      icon: ShieldCheck,
      iconColor: "text-emerald-300",
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setPromoIndex((prev) => (prev + 1) % promoSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [promoSlides.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { data: { username, password } },
      {
        onSuccess: (data) => {
          localStorage.setItem("pos_token", data.token);
          setLocation("/travel-dashboard");
        },
        onError: (err: any) => {
          let errorMessage = "تأكد من اسم المستخدم وكلمة المرور.";
          let isLicenseBlocked = false;
          let modalTitle = "تنبيه انتهاء ترخيص النظام";
          let modalMessage = "تم انتهاء فترة صلاحيات ترخيص استخدام النظام يرجى التواصل مع إدارة النظام من أجل ترخيص الاستخدام";
          let modalType: "expired" | "unauthorized" | "generic" = "expired";

          try {
            const rawStr = typeof err === "string" ? err : (err?.message || String(err));
            let parsed: any = null;
            try { parsed = JSON.parse(rawStr); } catch (e) {}

            if (parsed?.error === "license_expired" || parsed?.code === "license_expired") {
              isLicenseBlocked = true;
              modalType = "expired";
              modalTitle = "تنبيه انتهاء ترخيص النظام";
              modalMessage = parsed.message || "تم انتهاء فترة صلاحيات ترخيص استخدام النظام يرجى التواصل مع إدارة النظام من أجل ترخيص الاستخدام";
            } else if (parsed?.error === "device_unauthorized" || parsed?.code === "device_unauthorized") {
              isLicenseBlocked = true;
              modalType = "unauthorized";
              modalTitle = "جهاز غير مصرح";
              modalMessage = "يمنع منعاً باتاً استخدام النظام بدون ترخيص استخدام، يرجى التواصل مع إدارة النظام.";
            } else if (parsed?.error === "license_blocked" || parsed?.code === "license_blocked") {
              isLicenseBlocked = true;
              modalType = "expired";
              modalTitle = "تنبيه انتهاء ترخيص النظام";
              modalMessage = parsed.message || "تم انتهاء فترة صلاحيات ترخيص استخدام النظام يرجى التواصل مع إدارة النظام من أجل ترخيص الاستخدام";
            } else if (rawStr.includes("403") || rawStr.includes("license") || rawStr.includes("انتهى") || rawStr.includes("ترخيص") || rawStr.includes("انتهاء")) {
              isLicenseBlocked = true;
              modalType = "expired";
              modalTitle = "تنبيه انتهاء ترخيص النظام";
              modalMessage = parsed?.message || "تم انتهاء فترة صلاحيات ترخيص استخدام النظام يرجى التواصل مع إدارة النظام من أجل ترخيص الاستخدام";
            } else if (parsed?.message) {
              errorMessage = parsed.message;
            }
          } catch (e) {
            isLicenseBlocked = true;
            modalType = "expired";
            modalTitle = "تنبيه انتهاء ترخيص النظام";
            modalMessage = "تم انتهاء فترة صلاحيات ترخيص استخدام النظام يرجى التواصل مع إدارة النظام من أجل ترخيص الاستخدام";
          }

          if (isLicenseBlocked) {
            setLicenseModalTitle(modalTitle);
            setLicenseModalMessage(modalMessage);
            setLicenseModalType(modalType);
            setShowLicenseModal(true);
          } else {
            toast({
              variant: "destructive",
              title: "خطأ في تسجيل الدخول",
              description: errorMessage,
            });
          }
        },
      }
    );
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast({
        variant: "destructive",
        title: "خطأ في البيانات",
        description: "يرجى إدخال اسم الحساب / المستخدم أولاً.",
      });
      return;
    }
    if (!oldPassword) {
      toast({
        variant: "destructive",
        title: "خطأ في البيانات",
        description: "يرجى إدخال كلمة المرور الحالية.",
      });
      return;
    }
    if (!newPassword || newPassword.length < 3) {
      toast({
        variant: "destructive",
        title: "خطأ في البيانات",
        description: "كلمة المرور الجديدة يجب أن تكون 3 أحرف على الأقل.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "خطأ في البيانات",
        description: "كلمة المرور الجديدة وتأكيد كلمة المرور غير متطابقين.",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          oldPassword,
          newPassword,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (e) {
        data = { error: "خطأ في استجابة الخادم" };
      }

      if (!res.ok) {
        throw new Error(data.error || "فشل تغيير كلمة المرور");
      }

      toast({
        title: "تم تغيير كلمة المرور بنجاح",
        description: "تم اعتماد كلمة المرور الجديدة. يمكنك الآن تسجيل الدخول مباشرة بها.",
      });

      setPassword(newPassword);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setActiveForm("login");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "خطأ في تغيير كلمة المرور",
        description: err.message || "حدث خطأ أثناء تعديل كلمة المرور",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#cbd5e1] flex flex-col font-sans select-none" dir="rtl">
      {/* ─── Top Windows Title Bar (إطار النافذة العلوي) ─── */}
      <div className="h-12 bg-gradient-to-r from-[#1e3a8a] to-[#0f172a] text-white flex items-center justify-between px-4 shadow-md border-b border-blue-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 p-1 flex items-center justify-center overflow-hidden border border-white/20">
            <AppIcon alt="OmniFly Pro" className="w-full h-full object-contain" />
          </div>
          <span className="font-extrabold text-sm sm:text-base tracking-wide">OmniFly Pro - نظام إدارة الطيران والسياحة والمؤسسات المتكامل</span>
        </div>
        
        {/* الترخيص لـ اسم المرخص له في المنتصف */}
        <div className="hidden md:block bg-yellow-500/10 border border-yellow-500/30 px-4 py-1 rounded text-xs text-yellow-300 font-bold">
          هذا النظام مرخص لـ: <span className="text-white font-black text-sm">{licenseeName}</span>
        </div>

        {/* أزرار تفاعلية ملونة مثل الصورة */}
        <div className="flex items-center gap-2">
          <button className="p-1 hover:bg-white/10 rounded transition-colors text-blue-300" title="معلومات النظام">
            <Info className="w-5 h-5" />
          </button>
          <button className="p-1 hover:bg-white/10 rounded transition-colors text-cyan-300" title="المساعدة والدعم">
            <HelpCircle className="w-5 h-5" />
          </button>
          <button className="p-1 hover:bg-white/10 rounded transition-colors text-emerald-300" title="حالة الأمان">
            <Shield className="w-5 h-5" />
          </button>
          <button className="p-1 hover:bg-white/10 rounded transition-colors text-yellow-300" title="المفضلة">
            <Star className="w-5 h-5" />
          </button>
          <button className="p-1 hover:bg-white/10 rounded transition-colors text-orange-400" title="المقترحات">
            <Lightbulb className="w-5 h-5" />
          </button>
          <button className="p-1 hover:bg-white/10 rounded transition-colors text-indigo-300" title="اتصل بنا">
            <Mail className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ─── Main Application Body Layout ─── */}
      <div className="flex-1 flex overflow-hidden">
        {/* 1. Left Sidebar: Promotional Showcase replacing the old fake navigation */}
        <aside className="hidden lg:flex w-80 bg-gradient-to-b from-[#f8fafc] to-[#e2e8f0] border-l border-slate-300 flex-col py-6 shadow-inner relative overflow-y-auto custom-scrollbar">
          {/* Decorative geometric background */}
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
          
          <div className="relative z-10 px-5 space-y-6">
            <div className="text-center space-y-2 mb-6">
              <div className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-2xl shadow-lg mb-2">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">OmniFly Pro</h3>
              <p className="text-sm font-bold text-blue-700">مستقبلك في إدارة الطيران والسياحة</p>
            </div>

            {/* Dynamic Promo Slider */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-slate-200 group relative transition-all duration-500 min-h-[220px] flex flex-col">
              <div className="h-32 w-full overflow-hidden relative">
                <img 
                  src={promoSlides[promoIndex].image}
                  alt={promoSlides[promoIndex].title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                
                {/* Dots indicator */}
                <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5 z-20">
                  {promoSlides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPromoIndex(idx)}
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${promoIndex === idx ? 'w-4 bg-white' : 'bg-white/50 hover:bg-white/80'}`}
                    />
                  ))}
                </div>

                <h4 className="absolute bottom-3 right-4 text-white font-bold text-sm flex items-center gap-2">
                  {React.createElement(promoSlides[promoIndex].icon, { className: `w-4 h-4 ${promoSlides[promoIndex].iconColor}` })}
                  {promoSlides[promoIndex].title}
                </h4>
              </div>
              <div className="p-4 flex-1">
                <p className="text-xs text-slate-600 leading-relaxed font-medium transition-opacity duration-500 min-h-[48px]">
                  {promoSlides[promoIndex].desc}
                </p>
              </div>
            </div>

            {/* Feature Badges */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-bold text-emerald-900 leading-tight">أمان ونسخ احتياطي مجدول</span>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex items-center gap-2">
                <Cloud className="w-5 h-5 text-indigo-600 shrink-0" />
                <span className="text-[11px] font-bold text-indigo-900 leading-tight">قاعدة بيانات سحابية متزامنة</span>
              </div>
            </div>
            
            {/* Trust Banner */}
            <div className="p-4 bg-gradient-to-l from-amber-100 to-amber-50 border border-amber-200 rounded-xl text-center shadow-sm">
              <div className="flex items-center justify-center gap-1 mb-2">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className="w-4 h-4 text-amber-500 fill-amber-500" />
                ))}
              </div>
              <p className="text-xs font-extrabold text-amber-900">أكثر من 5000 فرع ومكتب سفر يثقون في أنظمتنا</p>
            </div>
          </div>
        </aside>

        {/* 2. Center Branding Workspace (المساحة الوسطى الكبيرة بشعار أومني سيستم) */}
        <section className="flex-1 bg-gradient-to-br from-[#f8fafc] to-[#e2e8f0] flex flex-col justify-between p-6 relative">
          {/* خلفية هندسية مميزة */}
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
          
          <div className="flex-1 flex flex-col items-center justify-center text-center z-10 my-auto">
            {/* الشعار المعتمد OmniFly Pro */}
            <div className="w-48 h-48 sm:w-56 sm:h-56 bg-white p-5 rounded-3xl shadow-xl border border-slate-200 mb-6 flex items-center justify-center transform hover:scale-105 transition-transform duration-300 overflow-hidden">
              <AppLogo alt="OmniFly Pro Logo" className="w-full h-full object-contain" />
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-black text-[#0f172a] tracking-tight mb-2">
              OmniFly Pro
            </h2>
            <p className="text-sm sm:text-base font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-4 py-1.5 rounded-full shadow-sm">
              نظام إدارة الطيران، السياحة، الحسابات والعمليات المركزية المتكامل
            </p>

            {/* التواصل ومعلومات الدعم */}
            <div className="mt-8 bg-white/70 backdrop-blur-sm border border-slate-300/50 rounded-xl p-4 shadow-md max-w-sm w-full">
              <div className="flex items-center justify-center gap-2 text-slate-700 font-extrabold mb-1">
                <Phone className="w-4 h-4 text-green-600" />
                <span>التواصل مع الدعم الفني والترخيص:</span>
              </div>
              <p className="text-xl font-black text-blue-900 tracking-widest"><Num>777146387</Num></p>
            </div>
          </div>

          {/* تذييل واجهة العمل */}
          <div className="text-center text-slate-500 font-bold text-xs border-t border-slate-300/60 pt-4 z-10">
            OmniFly Pro Enterprise ERP Solutions &copy; {new Date().getFullYear()}
          </div>
        </section>

        {/* 3. Right Sidebar Control Panel (لوحة الدخول والتحكم والتبديل) */}
        <aside className="w-full sm:w-[380px] lg:w-[400px] bg-white border-r border-slate-300 flex flex-col p-6 shadow-2xl justify-center z-20">
          <div className="mb-6 text-center">
            <h3 className="text-2xl font-black text-slate-800 mb-1">تسجيل الدخول</h3>
            <p className="text-xs font-bold text-slate-500">اختر العملية المطلوبة للبدء في استخدام النظام</p>
          </div>

          {/* تبديل التبويبات التفاعلية */}
          <div className="grid grid-cols-2 gap-2 mb-6 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button 
              onClick={() => setActiveForm("login")}
              className={`py-2 px-3 rounded-md text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                activeForm === "login" 
                  ? "bg-blue-900 text-white shadow-md" 
                  : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Laptop className="w-4 h-4" />
              <span>دخول النظام</span>
            </button>
            <button 
              onClick={() => setActiveForm("password")}
              className={`py-2 px-3 rounded-md text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                activeForm === "password" 
                  ? "bg-blue-900 text-white shadow-md" 
                  : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Key className="w-4 h-4" />
              <span>تغيير كلمة السر</span>
            </button>
          </div>

          {/* نموذج تسجيل الدخول لنقطة البيع */}
          {activeForm === "login" ? (
            <Card className="border-slate-200 shadow-lg">
              <CardContent className="p-4 sm:p-5">
                <div className="mb-4 bg-blue-50 border-r-4 border-blue-900 p-3 rounded">
                  <p className="text-xs font-bold text-blue-900">أدخل بيانات الموظف أو مدير النظام للبدء في إدارة الحجوزات والعمليات.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="username" className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-800" />
                      اسم المستخدم
                    </Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="أدخل اسم المستخدم"
                      required
                      disabled={loginMutation.isPending}
                      className="text-right border-slate-300 font-bold focus:ring-blue-800 focus:border-blue-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-blue-800" />
                      كلمة المرور
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور الخاصة بك"
                      required
                      disabled={loginMutation.isPending}
                      className="text-right border-slate-300 font-bold focus:ring-blue-800 focus:border-blue-800"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-[#1e3a8a] hover:bg-blue-950 text-white font-extrabold text-sm py-2.5 shadow-md flex items-center justify-center gap-2 mt-4" 
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      <>
                        <Laptop className="w-4 h-4" />
                        <span>تسجيل الدخول للنظام</span>
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            /* نموذج تغيير كلمة السر المعتمد والمربوط بالأمان */
            <Card className="border-slate-200 shadow-lg">
              <CardContent className="p-4 sm:p-5">
                <div className="mb-4 bg-amber-50 border-r-4 border-amber-600 p-3 rounded">
                  <p className="text-xs font-bold text-amber-900 leading-relaxed">
                    أدخل الحساب، كلمة السر الحالية، وكلمة السر الجديدة، مع تأكيدها لاعتماد التغيير والتسجيل بكلمة السر الجديدة.
                  </p>
                </div>

                <form onSubmit={handlePasswordChangeSubmit} className="space-y-3.5">
                  <div className="space-y-1">
                    <Label htmlFor="pass-username" className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-amber-700" />
                      الحساب / اسم المستخدم
                    </Label>
                    <Input
                      id="pass-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="أدخل اسم المستخدم (مثال: admin)"
                      required
                      className="text-right border-slate-300 font-bold focus:ring-amber-600 focus:border-amber-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="old-pass" className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-700" />
                      كلمة السر الحالية
                    </Label>
                    <Input
                      id="old-pass"
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="أدخل كلمة السر الحالية"
                      required
                      className="text-right border-slate-300 font-bold focus:ring-amber-600 focus:border-amber-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="new-pass" className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-700" />
                      كلمة السر الجديدة
                    </Label>
                    <Input
                      id="new-pass"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="أدخل كلمة السر الجديدة"
                      required
                      className="text-right border-slate-300 font-bold focus:ring-amber-600 focus:border-amber-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="confirm-pass" className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-amber-700" />
                      اعتماد / تأكيد كلمة السر الجديدة
                    </Label>
                    <Input
                      id="confirm-pass"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="أعد إدخال كلمة السر الجديدة لتأكيدها"
                      required
                      className="text-right border-slate-300 font-bold focus:ring-amber-600 focus:border-amber-600"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isChangingPassword}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-sm py-2.5 shadow-md flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                  >
                    {isChangingPassword ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Key className="w-4 h-4" />
                    )}
                    <span>{isChangingPassword ? "جاري التغيير والاعتماد..." : "اعتماد كلمة السر الجديدة"}</span>
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="mt-8 text-center text-[10px] text-slate-400 font-extrabold">
            تصميم وتطوير بواسطة إتقان سوفت للحلول البرمجية المتكاملة
          </div>
        </aside>
      </div>

      {showLicenseModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4 font-sans" dir="rtl">
          <div className={`bg-white rounded-2xl border-4 ${licenseModalType === "expired" ? "border-amber-600" : "border-red-600"} shadow-2xl max-w-lg w-full overflow-hidden transform animate-in fade-in-50 zoom-in-95 duration-200`}>
            {/* Header */}
            <div className={`text-white p-5 flex items-center gap-4 ${
              licenseModalType === "expired" 
                ? "bg-gradient-to-r from-amber-600 to-red-700" 
                : "bg-gradient-to-r from-red-600 to-red-900"
            }`}>
              <div className="p-2.5 bg-white/10 rounded-xl">
                <Shield className="w-8 h-8 text-yellow-300 animate-bounce" />
              </div>
              <div>
                <h4 className="font-black text-lg">
                  {licenseModalTitle || (licenseModalType === "expired" ? "تنبيه: انتهاء ترخيص النظام" : "تحذير أمني: يمنع استخدام النظام بدون ترخيص")}
                </h4>
                <p className="text-xs text-white/80 font-bold">إتقان سوفت للحلول البرمجية المتكاملة</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              <div className={`p-4 rounded-xl border-r-4 ${
                licenseModalType === "expired" 
                  ? "bg-amber-50 border-amber-600 text-amber-950" 
                  : "bg-red-50 border-red-600 text-red-950"
              }`}>
                <p className="font-black text-base leading-relaxed text-right">
                  {licenseModalMessage || (
                    licenseModalType === "expired"
                      ? "لا يسمح بالدخول لأنه وقت ترخيص استخدام النظام قد انتهى، يرجى التواصل مع إدارة إتقان سوفت."
                      : "يمنع منعاً باتاً استخدام النظام بدون ترخيص. هذا الجهاز غير مصرح له بتشغيل النظام، يرجى التواصل مع إدارة إتقان سوفت."
                  )}
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3.5 text-slate-700">
                  <Phone className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
                  <div className="text-xs font-bold text-right">
                    <p className="text-slate-500 mb-1">للحصول على كود التفعيل أو ترخيص هذا الجهاز، يرجى التواصل مع:</p>
                    <p className="text-sm font-black text-blue-900">إدارة إتقان سوفت للحلول البرمجية (المهندس علاء)</p>
                  </div>
                </div>

                <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 text-center shadow-inner">
                  <p className="text-xs text-slate-500 font-extrabold mb-1.5">رقم تواصل إدارة إتقان سوفت</p>
                  <p className="text-3xl sm:text-4xl font-black text-red-600 tracking-wider tabular-nums font-mono">
                    777146387
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <Button 
                onClick={() => setShowLicenseModal(false)}
                variant="outline"
                className="border-slate-300 text-slate-700 font-extrabold px-5 py-2 rounded-lg text-xs"
              >
                إغلاق التنبيه
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// مكون بسيط لعرض الأرقام بالإنجليزية دائماً لتطابق الفواتير المطبوعة
function Num({ children }: { children: React.ReactNode }) {
  return <span className="tabular-nums font-bold font-mono">{children}</span>;
}
