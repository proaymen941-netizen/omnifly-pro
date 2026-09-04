import React, { useState, useEffect } from 'react';

interface PrintHeaderProps {
  documentTitle?: string;
  documentSubtitle?: string;
  dateStr?: string;
}

export function PrintHeader({ documentTitle, documentSubtitle, dateStr }: PrintHeaderProps) {
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetch('/api/document-print-settings')
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(console.error);
  }, []);

  if (!settings) return null;

  return (
    <div className="w-full bg-white print:bg-white mb-6">
      {/* Three columns: Left text, Center Logo, Right text. (Right text goes on the right physically, but RTL layout) */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4">
        {/* Right Section (Text aligned right) */}
        <div className="text-right flex-1" style={{ width: '33%' }}>
          {settings.headerRightText1 && <h2 className="font-bold text-lg text-black">{settings.headerRightText1}</h2>}
          {settings.headerRightText2 && <p className="font-bold text-sm text-black">{settings.headerRightText2}</p>}
          {settings.headerRightText3 && <p className="font-bold text-sm text-black">{settings.headerRightText3}</p>}
        </div>

        {/* Center Section (Logo) */}
        <div className="flex-1 flex justify-center items-center" style={{ width: '34%' }}>
          {settings.logoUrl && (
            <img 
              src={settings.logoUrl} 
              alt="Logo" 
              className="max-h-24 max-w-[160px] object-contain" 
            />
          )}
        </div>

        {/* Left Section (Text aligned left) */}
        <div className="text-right flex-1" style={{ width: '33%' }}>
          {settings.headerLeftText1 && <h2 className="font-bold text-lg text-black">{settings.headerLeftText1}</h2>}
          {settings.headerLeftText2 && <p className="font-bold text-sm text-black">{settings.headerLeftText2}</p>}
          {settings.headerLeftText3 && <p className="font-bold text-sm text-black">{settings.headerLeftText3}</p>}
        </div>
      </div>
      
      {/* Document Title (e.g. كشف حساب : فلان) */}
      {(documentTitle || documentSubtitle) && (
        <div className="text-center mt-3 border-b border-black pb-2">
          {documentTitle && <h1 className="text-xl font-bold text-black">{documentTitle}</h1>}
          {documentSubtitle && <h2 className="text-lg font-bold text-black mt-1">{documentSubtitle}</h2>}
        </div>
      )}

      {/* Date Row (e.g. من تاريخ ... الى تاريخ ...) */}
      {dateStr && (
        <div className="text-center mt-2 pb-2">
          <p className="text-md font-bold text-black">{dateStr}</p>
        </div>
      )}
    </div>
  );
}
