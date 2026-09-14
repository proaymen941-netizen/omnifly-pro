const fs = require('fs');
const file = 'artifacts/api-server/src/lib/sqlite.ts';
let code = fs.readFileSync(file, 'utf-8');

// We remove the renaming logic:
// } else {
//   if (existingAcc.name !== cust.name) {
//     db.prepare("UPDATE accounts SET name = ? WHERE code = ?").run(cust.name, code);
//   }
// }

code = code.replace(
    /\} else \{\s*if \(existingAcc\.name !== cust\.name\) \{\s*db\.prepare\("UPDATE accounts SET name = \? WHERE code = \?"\)\.run\(cust\.name, code\);\s*\}\s*\}/,
    '} else {\n        // DO NOT rename existing account to customer name! The customer is linked to this account.\n      }'
);

fs.writeFileSync(file, code);
