const fs = require('fs');

const content = `import React, { useState, useEffect } from 'react';

interface PrintHeaderProps {
  documentTitle?: string;
  documentSubtitle?: string;
  dateStr?: string;
}

export function PrintHeader({ documentTitle, documentSubtitle, dateStr }: PrintHeaderProps) {
  const [docSettings, setDocSettings] = useState<any>(null);
  const [genSettings, setGenSettings] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/document-print-settings').then(res => res.json()),
      fetch('/api/settings').then(res => res.json())
    ])
    .then(([docData, genData]) => {
      setDocSettings(docData);
      setGenSettings(genData);
    })
    .catch(console.error);
  }, []);

  if (!docSettings && !genSettings) return null;

  const bName = genSettings?.businessName || docSettings?.companyName || docSettings?.headerRightText1;
  const bAddress = genSettings?.address || docSettings?.headerRightText2;
  const bPhone = genSettings?.phone || docSettings?.headerRightText3;
  const bTax = genSettings?.taxNumber;
  const logo = genSettings?.logoUrl || docSettings?.logoUrl;

  return (
    <div className="w-full bg-white print:bg-white mb-6">
      {/* Three columns: Left text, Center Logo, Right text. (Right text goes on the right physically, but RTL layout) */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4">
        
        {/* Right Section (Text aligned right) */}
        <div className="text-right flex-1" style={{ width: '33%' }}>
          {bName && <h2 className="font-bold text-lg text-black">{bName}</h2>}
          {bAddress && <p className="font-bold text-sm text-black">{bAddress}</p>}
          {bPhone && <p className="font-bold text-sm text-black">{bPhone}</p>}
          {bTax && <p className="font-bold text-sm text-black">الرقم الضريبي: {bTax}</p>}
        </div>

        {/* Center Section (Logo) */}
        <div className="flex-1 flex justify-center items-center" style={{ width: '34%' }}>
          {logo && (
            <img 
              src={logo} 
              alt="Logo" 
              className="max-h-24 max-w-[160px] object-contain" 
            />
          )}
        </div>

        {/* Left Section (Text aligned left) */}
        <div className="text-right flex-1" style={{ width: '33%' }}>
          {docSettings?.headerLeftText1 && <h2 className="font-bold text-lg text-black">{docSettings.headerLeftText1}</h2>}
          {docSettings?.headerLeftText2 && <p className="font-bold text-sm text-black">{docSettings.headerLeftText2}</p>}
          {docSettings?.headerLeftText3 && <p className="font-bold text-sm text-black">{docSettings.headerLeftText3}</p>}
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
`;

fs.writeFileSync('artifacts/pos-system/src/components/print-header.tsx', content);
