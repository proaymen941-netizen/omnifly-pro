import React, { useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, FileDown, ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2 } from "lucide-react";
import { printA4Html } from "@/lib/printUtils";

export function ReportViewerModal({ 
  isOpen, 
  onClose, 
  htmlContent, 
  title = "استعراض التقرير" 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  htmlContent: string; 
  title?: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [zoom, setZoom] = useState<number>(100);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(true);

  // Inject styles into the iframe to match printUtils and ensure high-fidelity rendering
  const fullHtml = htmlContent.includes("<!DOCTYPE html>") ? htmlContent : `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800;900&display=swap');
    body {
      font-family: 'Tajawal', 'Cairo', 'Segoe UI', Tahoma, sans-serif;
      color: #0f172a;
      background: #ffffff !important;
      margin: 0;
      padding: 20px;
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; page-break-inside: auto; }
    th, td { border: 1px solid #94a3b8; padding: 6px 10px; text-align: center; }
    th { background: #f1f5f9; font-weight: bold; color: #1e293b; }
    tr { page-break-inside: avoid; page-break-after: auto; }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;

  const handlePrint = () => {
    printA4Html(htmlContent, title);
  };

  const handleExportPdf = () => {
    const pdfTitle = title.endsWith(".pdf") ? title : `${title}_PDF`;
    printA4Html(htmlContent, pdfTitle);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-[100vw] w-full ${isFullScreen ? 'h-[100vh] max-h-[100vh]' : 'h-[92vh] max-h-[92vh] max-w-6xl'} m-0 p-0 rounded-none bg-slate-900/95 flex flex-col overflow-hidden [&>button]:hidden shadow-2xl`}>
        {/* TOP BAR */}
        <div className="bg-slate-900 border-b border-slate-800 px-5 py-3 flex flex-wrap items-center justify-between shadow-md z-10 shrink-0 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
                {title}
              </h2>
              <p className="text-[11px] text-slate-400">
                معاينة رسمية مطابقة للمواصفات القياسية A4 • تدعم الطباعة والتصدير كملف PDF
              </p>
            </div>
          </div>

          {/* Zoom and Display Controls */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setZoom(prev => Math.max(prev - 10, 60))}
              disabled={zoom <= 60}
              className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-700"
              title="تصغير"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs font-mono font-bold text-slate-200 min-w-10 text-center">
              {zoom}%
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setZoom(prev => Math.min(prev + 10, 150))}
              disabled={zoom >= 150}
              className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-700"
              title="تكبير"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setZoom(100)}
              className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
              title="إعادة ضبط الحجم (100%)"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>

          {/* Actions Bar */}
          <div className="flex items-center gap-2">
            {/* Export PDF Button */}
            <Button 
              onClick={handleExportPdf} 
              className="bg-rose-600 hover:bg-rose-700 text-white gap-2 font-bold px-4 h-9 shadow-md shadow-rose-600/30 text-xs sm:text-sm"
              title="تصدير وحفظ التقرير كملف PDF معتمد"
            >
              <FileDown className="w-4 h-4" />
              تصدير / حفظ PDF
            </Button>

            {/* Print Button */}
            <Button 
              onClick={handlePrint} 
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-bold px-4 h-9 shadow-md shadow-blue-600/30 text-xs sm:text-sm"
              title="طباعة التقرير (F3)"
            >
              <Printer className="w-4 h-4" />
              طباعة المستند A4
            </Button>

            {/* Toggle Fullscreen */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsFullScreen(prev => !prev)}
              className="h-9 px-2.5 border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              title={isFullScreen ? "تصغير النافذة" : "شاشة كاملة"}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>

            {/* Close Button */}
            <Button 
              onClick={onClose} 
              variant="outline" 
              className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-red-950/40 hover:text-red-400 hover:border-red-800 gap-1.5 font-bold px-3 h-9 text-xs sm:text-sm"
            >
              <X className="w-4 h-4" />
              إغلاق
            </Button>
          </div>
        </div>

        {/* HELPER BANNER */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 flex items-center justify-between text-[11px] text-amber-200">
          <span>💡 نصيحة الحفظ كـ PDF: عند الضغط على "تصدير / حفظ PDF"، اختر وجهة الطباعة كـ <strong>"حفظ بتنسيق PDF" (Save as PDF)</strong> من المتصفح للحصول على ملف عالي الدقة.</span>
          <span className="text-slate-400 font-mono">وضع المعاينة الشامل</span>
        </div>

        {/* IFRAME CONTAINER */}
        <div className="flex-1 overflow-auto bg-slate-950/70 p-4 sm:p-8 flex justify-center items-start">
          <div 
            style={{ 
              transform: `scale(${zoom / 100})`, 
              transformOrigin: "top center",
              transition: "transform 0.15s ease-out" 
            }}
            className="bg-white shadow-2xl max-w-[210mm] w-full min-h-[297mm] h-max border border-slate-700 rounded-sm overflow-hidden"
          >
            <iframe 
              ref={iframeRef}
              srcDoc={fullHtml} 
              className="w-full border-none min-h-[297mm]" 
              style={{ minHeight: "297mm", height: "100%" }}
              title="Report Preview"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ReportViewerModal;
