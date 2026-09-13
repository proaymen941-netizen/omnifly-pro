const fs = require('fs');
let code = fs.readFileSync('artifacts/pos-system/src/pages/travel-bookings.tsx', 'utf8');

code = code.replace(
/setQuickAirlineModal\(false\);\s*setForm\(f => \(\{ \.\.\.f, airline_supplier: \`\$\{newA\.name_ar\} \(\$\{newA\.name_en \|\| newA\.iata_code\}\)\` \}\)\);\s*setQuickAirlineForm\(\{ name_ar: "", name_en: "", iata_code: "", country: "السعودية" \}\);\s*\}\s*\}\);/g,
  ''
);

fs.writeFileSync('artifacts/pos-system/src/pages/travel-bookings.tsx', code);
