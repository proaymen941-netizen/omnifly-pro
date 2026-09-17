import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Phone, User, X } from "lucide-react";

export interface SkippedItem {
  id: number | string;
  name: string;
  phone: string;
  reason: string;
}

interface WhatsAppSkippedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skippedList: SkippedItem[];
  successCount: number;
  onEditPassenger?: (passengerId: number | string) => void;
}

export const WhatsAppSkippedModal: React.FC<WhatsAppSkippedModalProps> = ({
  open,
  onOpenChange,
  skippedList,
  successCount,
  onEditPassenger,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-slate-900">
                تقرير الأرقام المتخطاة تلقائياً أثناء أتمتة الواتساب
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                قام النظام بتخطي هذه السجلات لمواصلة بقية المهام دون توقف أو أخطاء لعدم صحة الرقم أو عدم اتصاله
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Summary Banner */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-emerald-800 font-bold">المهام المكتملة بنجاح</div>
                <div className="text-lg font-black text-emerald-900">{successCount} عملية</div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-amber-800 font-bold">الأرقام المتخطاة بأمان</div>
                <div className="text-lg font-black text-amber-900">{skippedList.length} رقم</div>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            ℹ️ <strong>ملاحظة تقنية:</strong> تم تخطي الأرقام التالية تلقائياً لتفادي حظر الحساب أو تعطيل سلسلة الإرسال، وتم إكمال بقية المسافرين وحفظ كافة ملفات PDF بنجاح في سجلات النظام.
          </div>

          {/* Skipped Table */}
          <div className="border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">اسم المسافر</th>
                  <th className="py-2.5 px-3">رقم الهاتف المسجل</th>
                  <th className="py-2.5 px-3">سبب التخطي</th>
                  {onEditPassenger && <th className="py-2.5 px-3 text-center">إجراء</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {skippedList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      لا توجد أرقام متخطاة، جميع أرقام المسافرين صحيحة ومؤكدة ✓
                    </td>
                  </tr>
                ) : (
                  skippedList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {item.name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700" dir="ltr">
                        {item.phone || <span className="text-rose-500 font-sans">فارغ / غير مسجل</span>}
                      </td>
                      <td className="py-2.5 px-3 text-rose-600 font-medium">
                        {item.reason}
                      </td>
                      {onEditPassenger && (
                        <td className="py-2.5 px-3 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] font-bold border-slate-300 hover:bg-slate-100"
                            onClick={() => {
                              onOpenChange(false);
                              onEditPassenger(item.id);
                            }}
                          >
                            تصحيح الرقم
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="border-t pt-3">
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs"
          >
            إغلاق ومتابعة العمل
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
