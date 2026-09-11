const fs = require('fs');
let content = fs.readFileSync('artifacts/pos-system/src/components/receipt.tsx', 'utf8');

const targetStr = `      {settings?.phone && (
        <div className="receipt-contact text-center font-bold text-[10px] text-gray-700 my-1">
          <Num>{settings.phone}</Num>
        </div>
      )}`;

const replacementStr = `      {settings?.address && (
        <div className="receipt-address text-center font-bold text-[10px] text-gray-700 my-1">
          {settings.address}
        </div>
      )}
      {settings?.phone && (
        <div className="receipt-contact text-center font-bold text-[10px] text-gray-700 my-1">
          <Num>تلفون: {settings.phone}</Num>
        </div>
      )}
      {settings?.taxNumber && (
        <div className="receipt-tax-number text-center font-bold text-[10px] text-gray-700 my-1">
          <Num>الرقم الضريبي: {settings.taxNumber}</Num>
        </div>
      )}`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync('artifacts/pos-system/src/components/receipt.tsx', content);
  console.log('receipt.tsx patched successfully');
} else {
  console.log('Could not find target string in receipt.tsx');
}
