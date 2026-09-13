const fs = require('fs');
let content = fs.readFileSync('/app/applet/artifacts/pos-system/src/components/admin-layout.tsx', 'utf8');

const target = `            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-900 px-2.5 py-1 rounded-lg text-xs font-semibold">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>فرع الرياض الرئيسي</span>
            </div>`;

const replacement = `            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-900 px-2.5 py-1 rounded-lg text-xs font-semibold">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{settings?.businessName || "فرع الرياض الرئيسي"}</span>
            </div>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('/app/applet/artifacts/pos-system/src/components/admin-layout.tsx', content, 'utf8');
  console.log('AdminLayout updated!');
} else {
  console.log('Target not found');
}
